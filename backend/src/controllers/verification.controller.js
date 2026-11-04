import { prisma } from '../config/database.js';
import {
  computeFileSha256,
  normalizeCredentialPayload,
  computeSha256,
  verifyCredentialSignature,
  verifyMerkleRootMatch,
} from '../utils/crypto.js';
import { blockchainService } from '../services/blockchain.service.js';
import fs from 'fs';

export class VerificationController {
  /**
   * 6-Point Cryptographic & Blockchain Verification Audit
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

      // 2. Genuine ECDSA Signature Verification
      const expectedIssuerAddress =
        credential.issuer.walletAddress || credential.issuer?.institutionProfile?.signingPublicKey;

      const signatureResult = verifyCredentialSignature(
        normalizedPayload,
        credential.digitalSignature,
        expectedIssuerAddress
      );
      const signatureValid = signatureResult.isValid;

      // 3. Merkle Root Integrity (Recalculated mathematically, no string length check)
      const merkleRootMatch = credential.merkleRoot
        ? verifyMerkleRootMatch(recalculatedHash, credential.merkleRoot)
        : false;

      // 4. Revocation Status Check (Database + On-chain)
      let notRevoked = credential.status !== 'REVOKED' && !credential.revokedAt;

      // 5. Expiration Date Check
      const notExpired = !credential.expiresAt || new Date(credential.expiresAt) > new Date();

      // 6. Issuer Accreditation Check
      const issuerAccredited = Boolean(credential.issuer?.institutionProfile?.isAccredited);

      // 7. On-chain Verification (Sepolia smart contract check)
      let blockchainRecorded = false;
      const onChainStatus = await blockchainService.verifyOnChain(credential.credentialHash, expectedIssuerAddress);

      if (onChainStatus.checked) {
        if (onChainStatus.revoked) {
          notRevoked = false;
        }
        blockchainRecorded = onChainStatus.isConfirmed;
      } else {
        // If contract not configured, reflect actual anchor status
        blockchainRecorded = Boolean(credential.blockchainAnchor?.isConfirmed);
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

      // Strictly evaluate overall status
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
        // If all cryptographic & database checks pass but blockchain is not yet anchored
        overallStatus = 'PENDING_BLOCKCHAIN';
      }

      // Record audit verification log without exposing to public
      await prisma.verificationLog.create({
        data: {
          credentialId: credential.id,
          verifierId,
          verificationType: req.query.type === 'qr' ? 'QR_CODE' : 'PORTAL',
          status: overallStatus === 'VALID' ? 'VALID' : (overallStatus === 'REVOKED' ? 'REVOKED' : 'EXPIRED'),
          checksPassed: checks,
          verificationScore,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      // Data Privacy: Clean response omitting private student email and internal logs
      res.status(200).json({
        success: true,
        data: {
          overallStatus,
          verificationScore,
          checks,
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
                  isConfirmed: credential.blockchainAnchor.isConfirmed,
                  status: credential.blockchainAnchor.status,
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
   * Verify uploaded physical document by re-hashing binary contents
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
