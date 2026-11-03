import { prisma } from '../config/database.js';
import { BadRequestError } from '../utils/errors.js';
import { computeSha256, generateCertificateNumber, generateDigitalSignature, computeMerkleRoot } from '../utils/crypto.js';

export class InstitutionController {
  /**
   * Get institution dashboard stats
   */
  async getDashboard(req, res, next) {
    try {
      const issuerId = req.user.id;

      const [totalIssued, activeCredentials, revokedCredentials, pendingEvidence] =
        await Promise.all([
          prisma.credential.count({ where: { issuerId } }),
          prisma.credential.count({ where: { issuerId, status: 'ACTIVE' } }),
          prisma.credential.count({ where: { issuerId, status: 'REVOKED' } }),
          prisma.evidence.count({ where: { status: 'PENDING_REVIEW' } }),
        ]);

      res.status(200).json({
        success: true,
        data: {
          totalIssued,
          activeCredentials,
          revokedCredentials,
          pendingEvidence,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get credentials issued by this institution
   */
  async getIssuedCredentials(req, res, next) {
    try {
      const issuerId = req.user.id;
      const { status, search, page = 1, limit = 10 } = req.query;

      const where = { issuerId };
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { certificateNumber: { contains: search, mode: 'insensitive' } },
          { student: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const take = parseInt(limit, 10);
      const skip = (parseInt(page, 10) - 1) * take;

      const [total, credentials] = await Promise.all([
        prisma.credential.count({ where }),
        prisma.credential.findMany({
          where,
          include: {
            student: { select: { id: true, name: true, email: true, walletAddress: true } },
            skills: { include: { skill: true } },
            blockchainAnchor: true,
          },
          orderBy: { issuedAt: 'desc' },
          skip,
          take,
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          total,
          page: parseInt(page, 10),
          totalPages: Math.ceil(total / take),
          credentials,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch issue credentials to multiple students
   */
  async batchIssue(req, res, next) {
    try {
      const issuerId = req.user.id;
      const { items } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestError('Items array of credentials is required');
      }

      const created = [];
      for (const item of items) {
        // Resolve student by email or ID
        let student = await prisma.user.findFirst({
          where: {
            OR: [
              { email: item.studentEmail?.toLowerCase() },
              { id: item.studentId },
            ],
          },
        });

        if (!student) {
          // If student doesn't exist, create student placeholder
          student = await prisma.user.create({
            data: {
              email: item.studentEmail.toLowerCase(),
              name: item.studentName || item.studentEmail.split('@')[0],
              passwordHash: 'placeholder-needs-reset',
              role: 'STUDENT',
              studentProfile: {
                create: {
                  portfolioSlug: item.studentEmail.split('@')[0] + '-' + Math.floor(100 + Math.random() * 900),
                },
              },
            },
          });
        }

        const certNum = generateCertificateNumber('INST', item.courseCode || 'GEN');
        const credHash = computeSha256(`${certNum}:${student.id}:${issuerId}:${Date.now()}`);
        const signature = generateDigitalSignature(credHash);

        const cred = await prisma.credential.create({
          data: {
            certificateNumber: certNum,
            studentId: student.id,
            issuerId,
            title: item.title,
            description: item.description,
            type: item.type || 'CERTIFICATE',
            badgeLevel: item.badgeLevel || 'BRONZE',
            grade: item.grade || 'Pass',
            courseCode: item.courseCode,
            credentialHash: credHash,
            digitalSignature: signature,
            merkleRoot: computeMerkleRoot([credHash]),
            qrCodeUrl: `/api/v1/credentials/qr/${certNum}`,
          },
        });

        created.push(cred);
      }

      res.status(201).json({
        success: true,
        message: `Successfully issued ${created.length} credentials in batch`,
        data: created,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending evidence submissions for this institution
   */
  async getPendingEvidence(req, res, next) {
    try {
      const evidence = await prisma.evidence.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: {
          student: { select: { id: true, name: true, email: true } },
          skills: { include: { skill: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const institutionController = new InstitutionController();
