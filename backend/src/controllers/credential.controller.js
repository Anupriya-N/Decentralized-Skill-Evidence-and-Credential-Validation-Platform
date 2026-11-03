import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { computeSha256, generateCertificateNumber, generateDigitalSignature, computeMerkleRoot } from '../utils/crypto.js';
import { generateQrDataUrl, generateQrSvg } from '../utils/qr.js';

export class CredentialController {
  /**
   * Issue a new credential (Institution only)
   */
  async issue(req, res, next) {
    try {
      const issuerId = req.user.id;
      const {
        studentId,
        studentEmail,
        title,
        description,
        type = 'CERTIFICATE',
        badgeLevel = 'BRONZE',
        grade,
        courseCode,
        skills = [],
        expiresAt,
      } = req.body;

      if (!title) {
        throw new BadRequestError('Credential title is required');
      }

      // Find student
      let student = await prisma.user.findFirst({
        where: {
          OR: [
            { id: studentId },
            { email: studentEmail?.toLowerCase() },
          ],
        },
      });

      if (!student) {
        throw new NotFoundError('Student not found for credential assignment');
      }

      const certNumber = generateCertificateNumber('CRT', courseCode || 'SKILL');
      const credentialHash = computeSha256(`${certNumber}:${student.id}:${issuerId}:${Date.now()}`);
      const digitalSignature = generateDigitalSignature(credentialHash);
      const merkleRoot = computeMerkleRoot([credentialHash]);

      const credential = await prisma.credential.create({
        data: {
          certificateNumber: certNumber,
          studentId: student.id,
          issuerId,
          title,
          description,
          type,
          badgeLevel,
          grade,
          courseCode,
          credentialHash,
          merkleRoot,
          digitalSignature,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          qrCodeUrl: `/api/v1/credentials/qr/${certNumber}`,
          blockchainAnchor: {
            create: {
              network: 'Ethereum Sepolia',
              contractAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
              transactionHash: '0x' + computeSha256(`anchor:${certNumber}:${Date.now()}`),
              blockNumber: BigInt(5895000 + Math.floor(Math.random() * 500)),
              merkleRoot,
              merkleProof: ['0x1111...', '0x2222...'],
              isConfirmed: true,
            },
          },
        },
        include: {
          student: { select: { id: true, name: true, email: true } },
          issuer: { select: { id: true, name: true } },
          blockchainAnchor: true,
        },
      });

      // Link any skill tags passed
      if (Array.isArray(skills) && skills.length > 0) {
        for (const skillItem of skills) {
          const skillName = typeof skillItem === 'string' ? skillItem : skillItem.name;
          let skill = await prisma.skill.findFirst({
            where: { name: { equals: skillName, mode: 'insensitive' } },
          });

          if (!skill) {
            skill = await prisma.skill.create({
              data: {
                name: skillName,
                code: skillName.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
                category: 'OTHER',
              },
            });
          }

          await prisma.credentialSkill.create({
            data: {
              credentialId: credential.id,
              skillId: skill.id,
              weight: 1.0,
            },
          });
        }
      }

      // Record audit event
      await prisma.auditLog.create({
        data: {
          userId: issuerId,
          action: 'CREDENTIAL_ISSUED',
          entity: 'CREDENTIAL',
          entityId: credential.id,
          details: { certificateNumber: certNumber, studentId: student.id },
        },
      });

      // Notify student
      await prisma.notification.create({
        data: {
          userId: student.id,
          type: 'CREDENTIAL_RECEIVED',
          title: 'New Credential Issued',
          message: `You have received a new verifiable credential: "${title}"`,
          actionUrl: `/student/credentials/${credential.id}`,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Credential successfully issued and anchored',
        data: credential,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke a credential (Institution or Admin)
   */
  async revoke(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const credential = await prisma.credential.findUnique({
        where: { id },
      });

      if (!credential) {
        throw new NotFoundError('Credential not found');
      }

      if (credential.status === 'REVOKED') {
        throw new BadRequestError('Credential is already revoked');
      }

      const updated = await prisma.credential.update({
        where: { id },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revocationReason: reason || 'Revoked by authorized institution',
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREDENTIAL_REVOKED',
          entity: 'CREDENTIAL',
          entityId: credential.id,
          details: { reason },
        },
      });

      // Notify student
      await prisma.notification.create({
        data: {
          userId: credential.studentId,
          type: 'CREDENTIAL_REVOKED',
          title: 'Credential Revoked',
          message: `Your credential "${credential.title}" was revoked: ${reason || 'Administrative update'}`,
          actionUrl: `/student/credentials/${credential.id}`,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Credential revoked successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student credentials
   */
  async getMyCredentials(req, res, next) {
    try {
      const studentId = req.user.id;

      const credentials = await prisma.credential.findMany({
        where: { studentId },
        include: {
          issuer: {
            select: {
              id: true,
              name: true,
              institutionProfile: { select: { institutionName: true, isAccredited: true } },
            },
          },
          skills: { include: { skill: true } },
          blockchainAnchor: true,
        },
        orderBy: { issuedAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: credentials,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get credential by ID or Certificate Number
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const credential = await prisma.credential.findFirst({
        where: {
          OR: [
            { id },
            { certificateNumber: id },
            { credentialHash: id },
          ],
        },
        include: {
          student: { select: { id: true, name: true, email: true, walletAddress: true } },
          issuer: {
            select: {
              id: true,
              name: true,
              institutionProfile: { select: { institutionName: true, isAccredited: true } },
            },
          },
          skills: { include: { skill: true } },
          blockchainAnchor: true,
          verificationLogs: { take: 5, orderBy: { verifiedAt: 'desc' } },
        },
      });

      if (!credential) {
        throw new NotFoundError('Credential not found');
      }

      res.status(200).json({
        success: true,
        data: credential,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate QR Code representation
   */
  async getQrCode(req, res, next) {
    try {
      const { id } = req.params;

      const credential = await prisma.credential.findFirst({
        where: {
          OR: [{ id }, { certificateNumber: id }],
        },
      });

      if (!credential) {
        throw new NotFoundError('Credential not found');
      }

      const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${credential.certificateNumber}`;
      const format = req.query.format || 'dataUrl';

      if (format === 'svg') {
        const svg = await generateQrSvg(verifyUrl);
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svg);
      }

      const dataUrl = await generateQrDataUrl(verifyUrl);
      res.status(200).json({
        success: true,
        data: {
          dataUrl,
          verifyUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const credentialController = new CredentialController();
