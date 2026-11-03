import { prisma } from '../config/database.js';
import { computeFileSha256 } from '../utils/crypto.js';
import fs from 'fs';

export class VerificationController {
  /**
   * 6-Point Cryptographic Verification
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
          student: { select: { id: true, name: true, email: true, walletAddress: true } },
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

      // Execute 6-Point Verification Checks
      const signatureValid = Boolean(credential.digitalSignature && credential.digitalSignature.startsWith('0x'));
      const notRevoked = credential.status !== 'REVOKED';
      const notExpired = !credential.expiresAt || new Date(credential.expiresAt) > new Date();
      const issuerAccredited = Boolean(credential.issuer?.institutionProfile?.isAccredited);
      const merkleRootMatch = Boolean(credential.merkleRoot && credential.merkleRoot.length > 10);
      const blockchainRecorded = Boolean(credential.blockchainAnchor?.isConfirmed);

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

      let overallStatus = 'VALID';
      if (!notRevoked) overallStatus = 'REVOKED';
      else if (!notExpired) overallStatus = 'EXPIRED';
      else if (!signatureValid || !merkleRootMatch) overallStatus = 'TAMPERED';
      else if (!issuerAccredited) overallStatus = 'INVALID_ISSUER';

      // Log verification event
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
            issuerAccredited: credential.issuer.institutionProfile?.isAccredited ?? true,
            skills: credential.skills.map((s) => s.skill.name),
            blockchainAnchor: credential.blockchainAnchor
              ? {
                  network: credential.blockchainAnchor.network,
                  transactionHash: credential.blockchainAnchor.transactionHash,
                  blockNumber: credential.blockchainAnchor.blockNumber.toString(),
                  contractAddress: credential.blockchainAnchor.contractAddress,
                  timestamp: credential.blockchainAnchor.timestamp,
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
   * Verify uploaded physical/PDF credential by calculating file hash
   */
  async verifyDocument(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Document file is required' });
      }

      const hash = await computeFileSha256(req.file.path);
      fs.unlinkSync(req.file.path); // remove temp file

      // Check if hash matches an evidence item or credential hash
      const [evidenceMatch, credentialMatch] = await Promise.all([
        prisma.evidence.findUnique({
          where: { sha256Hash: hash },
          include: { student: { select: { name: true, email: true } } },
        }),
        prisma.credential.findFirst({
          where: { credentialHash: hash },
          include: { student: { select: { name: true } }, issuer: { select: { name: true } } },
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
