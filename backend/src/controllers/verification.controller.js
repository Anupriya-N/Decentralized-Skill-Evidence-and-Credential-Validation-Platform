import { prisma } from '../config/database.js';
import {
  computeFileSha256,
  normalizeCredentialPayload,
  computeSha256,
  verifyCredentialSignature,
  verifyMerkleProof,
} from '../utils/crypto.js';
import { blockchainService } from '../services/blockchain.service.js';
import fs from 'fs';

export class VerificationController {
  /**
   * 6-Point Cryptographic & Real Blockchain Verification Audit.
   * Priority 3: Strictly requires live on-chain contract read.
   * NEVER returns VALID based solely on PostgreSQL database records.
   */
  async verifyCredential(req, res, next) {
    try {
      const { identifier } = req.params;
      const verifierId = req.user?.id || null;

      const credential = await prisma.credential.findFirst({
        where: {
          OR: [
            { id: identifier },
            { certificateNumber: identifier },
            { credentialHash: identifier },
          ],
        },
        include: {
          student: { select: { id: true, name: true, walletAddress: true } },
          issuer: {
            include: {
              institutionProfile: true,
            },
          },
          skills: { include: { skill: true } },
          blockchainAnchor: true,
        },
      });

      if (!credential) {
        return res.status(404).json({
          success: false,
          status: 'NOT_FOUND',
          message: 'No credential matches the provided identifier or cryptographic hash.',
          data: {
            overallStatus: 'NOT_FOUND',
            verificationScore: 0,
            checks: {
              signatureValid: false,
              notRevoked: false,
              notExpired: false,
              issuerAccredited: false,
              merkleRootMatch: false,
              blockchainRecorded: false,
            },
          },
        });
      }

      // 1. Independent Payload Normalization & Hash Recalculation
      const normalizedPayload = normalizeCredentialPayload({
        certificateNumber: credential.certificateNumber,
        studentId: credential.studentId,
        issuerId: credential.issuerId,
        title: credential.title,
        type: credential.type,
        badgeLevel: credential.badgeLevel,
        grade: credential.grade,
        courseCode: credential.courseCode,
        issuedAt: credential.issuedAt,
      });

      const recalculatedHash = computeSha256(normalizedPayload);
      const hashIntegrity = credential.credentialHash === recalculatedHash;

      // 2. Genuine ECDSA Signature Verification against registered issuer identity
      const expectedIssuerAddress =
        credential.issuer.walletAddress || credential.issuer?.institutionProfile?.signingPublicKey;

      const signatureResult = verifyCredentialSignature(
        normalizedPayload,
        credential.digitalSignature,
        expectedIssuerAddress
      );
      const signatureValid = signatureResult.isValid;

      // 3. Merkle Root Integrity (Mathematical proof verification)
      const merkleProofArray = Array.isArray(credential.blockchainAnchor?.merkleProof)
        ? credential.blockchainAnchor.merkleProof
        : [];
      const merkleRootMatch = credential.merkleRoot
        ? verifyMerkleProof(recalculatedHash, merkleProofArray, credential.merkleRoot)
        : false;

      // 4. Revocation Status Check (Database status: locally revoked is ALWAYS treated as revoked)
      let notRevoked = credential.status !== 'REVOKED' && !credential.revokedAt;

      // 5. Expiration Date Check
      const notExpired = !credential.expiresAt || new Date(credential.expiresAt) > new Date();

      // 6. Issuer Accreditation Check
      const issuerAccredited = Boolean(credential.issuer?.institutionProfile?.isAccredited);

      // 7. Live On-Chain Contract Verification (Priority 3: Strictly requires live contract read)
      let blockchainRecorded = false;
      let onChainAudit = { checked: false, status: 'NOT_ATTEMPTED' };

      if (credential.credentialHash) {
        const onChainStatus = await blockchainService.verifyOnChain(credential.credentialHash, expectedIssuerAddress);
        onChainAudit = onChainStatus;

        if (onChainStatus.checked) {
          if (onChainStatus.revoked) {
            notRevoked = false;
          }
          blockchainRecorded = Boolean(onChainStatus.isConfirmed);
        } else {
          // Priority 3.1 & 3.9: NEVER fall back to database isConfirmed. Must remain false if live contract unavailable.
          blockchainRecorded = false;
        }
      }

      const checks = {
        signatureValid,
        notRevoked,
        notExpired,
        issuerAccredited,
        merkleRootMatch,
        blockchainRecorded,
      };

      const totalChecks = 6;
      const passedCount = Object.values(checks).filter(Boolean).length;
      const verificationScore = Math.round((passedCount / totalChecks) * 100);

      // Strictly evaluate overall status (Priority 3.9, 3.10, 3.11)
      let overallStatus = 'VALID';
      if (!notRevoked) {
        overallStatus = 'REVOKED';
      } else if (!notExpired) {
        overallStatus = 'EXPIRED';
      } else if (!hashIntegrity || !merkleRootMatch) {
        overallStatus = 'TAMPERED';
      } else if (!signatureValid) {
        overallStatus = 'INVALID_SIGNATURE';
      } else if (!issuerAccredited) {
        overallStatus = 'INVALID_ISSUER';
      } else if (!blockchainRecorded) {
        // Cryptographically signed and verified in DB, but awaiting live on-chain contract confirmation
        overallStatus = 'PENDING_BLOCKCHAIN';
      }

      // Record internal verification log
      await prisma.verificationLog.create({
        data: {
          credentialId: credential.id,
          verifierId,
          verificationType: req.query.type === 'qr' ? 'QR_CODE' : 'PORTAL',
          status: overallStatus,
          checksPassed: checks,
          verificationScore,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      // Priority 5: Public sanitization omitting student email and internal database logs
      res.status(200).json({
        success: true,
        data: {
          overallStatus,
          verificationScore,
          checks,
          onChainVerification: {
            liveCheckPerformed: onChainAudit.checked,
            status: onChainAudit.status,
            onChainRevoked: onChainAudit.revoked || false,
            issuerMatched: onChainAudit.isIssuerMatch || false,
          },
          credential: {
            id: credential.id,
            certificateNumber: credential.certificateNumber,
            title: credential.title,
            description: credential.description,
            type: credential.type,
            badgeLevel: credential.badgeLevel,
            grade: credential.grade,
            issuedAt: credential.issuedAt,
            expiresAt: credential.expiresAt,
            revokedAt: credential.revokedAt,
            revocationReason: credential.revocationReason,
            onChainRevocationStatus: credential.onChainRevocationStatus,
            credentialHash: credential.credentialHash,
            studentName: credential.student.name,
            studentWallet: credential.student.walletAddress,
            issuerName: credential.issuer.name,
            issuerAccredited: credential.issuer.institutionProfile?.isAccredited ?? false,
            skills: credential.skills.map((s) => s.skill.name),
            blockchainAnchor: credential.blockchainAnchor
              ? {
                  network: credential.blockchainAnchor.network,
                  transactionHash: credential.blockchainAnchor.transactionHash,
                  blockNumber: credential.blockchainAnchor.blockNumber ? credential.blockchainAnchor.blockNumber.toString() : null,
                  contractAddress: credential.blockchainAnchor.contractAddress,
                  timestamp: credential.blockchainAnchor.timestamp,
                  isConfirmed: blockchainRecorded,
                  status: blockchainRecorded ? 'CONFIRMED' : 'PENDING_BLOCKCHAIN',
                }
              : null,
          },
          verifiedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify uploaded document by re-hashing binary contents
   */
  async verifyDocument(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Document file is required' });
      }

      const hash = await computeFileSha256(req.file.path);
      fs.unlinkSync(req.file.path);

      const [evidenceMatch, credentialMatch] = await Promise.all([
        prisma.evidence.findUnique({
          where: { sha256Hash: hash },
          select: {
            id: true,
            title: true,
            evidenceType: true,
            status: true,
            createdAt: true,
            student: { select: { id: true, name: true } },
          },
        }),
        prisma.credential.findFirst({
          where: { credentialHash: hash },
          select: {
            id: true,
            certificateNumber: true,
            title: true,
            status: true,
            badgeLevel: true,
            issuedAt: true,
            student: { select: { id: true, name: true } },
            issuer: { select: { id: true, name: true } },
          },
        }),
      ]);

      if (credentialMatch) {
        return res.status(200).json({
          success: true,
          matchFound: true,
          matchType: 'CREDENTIAL',
          fileHash: hash,
          data: credentialMatch,
        });
      }

      if (evidenceMatch) {
        return res.status(200).json({
          success: true,
          matchFound: true,
          matchType: 'EVIDENCE',
          fileHash: hash,
          data: evidenceMatch,
        });
      }

      res.status(200).json({
        success: true,
        matchFound: false,
        fileHash: hash,
        message: 'No recorded blockchain credential or verified evidence matches this file hash.',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const verificationController = new VerificationController();
