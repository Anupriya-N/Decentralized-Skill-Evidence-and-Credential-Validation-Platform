import { prisma } from '../config/database.js';
import { BadRequestError, ForbiddenError } from '../utils/errors.js';
import {
  computeSha256,
  generateCertificateNumber,
  normalizeCredentialPayload,
  signCredentialPayload,
  computeMerkleRoot,
} from '../utils/crypto.js';
import { env } from '../config/env.js';

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
            student: { select: { id: true, name: true, walletAddress: true } },
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

      // Check accreditation
      const isAccredited = req.user.role === 'ADMIN' || Boolean(req.user.rawUser?.institutionProfile?.isAccredited);
      if (!isAccredited) {
        throw new ForbiddenError('Only accredited institutions are authorized to issue credentials');
      }

      // Retrieve institutional signing key
      const signingKey =
        req.user.rawUser?.institutionProfile?.signingPrivateKey ||
        process.env.INSTITUTION_SIGNING_KEY ||
        env.BLOCKCHAIN_PRIVATE_KEY;

      if (!signingKey || signingKey.length < 64) {
        throw new BadRequestError(
          'Institutional ECDSA private signing key is not configured. Cannot generate genuine cryptographic signature.'
        );
      }

      const created = [];
      for (const item of items) {
        let student = await prisma.user.findFirst({
          where: {
            OR: [
              { email: item.studentEmail?.toLowerCase() },
              { id: item.studentId },
            ],
          },
        });

        if (!student) {
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

        if (student.role !== 'STUDENT') {
          continue; // Skip non-student targets
        }

        const certNum = generateCertificateNumber('INST', item.courseCode || 'GEN');
        const issuedDate = new Date();

        const normalizedPayload = normalizeCredentialPayload({
          certificateNumber: certNum,
          studentId: student.id,
          issuerId,
          title: item.title,
          type: item.type || 'CERTIFICATE',
          badgeLevel: item.badgeLevel || 'BRONZE',
          grade: item.grade || 'Pass',
          courseCode: item.courseCode,
          issuedAt: issuedDate,
        });

        const credHash = computeSha256(normalizedPayload);
        const { signature } = await signCredentialPayload(normalizedPayload, signingKey);

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
            issuedAt: issuedDate,
            credentialHash: credHash,
            digitalSignature: signature,
            merkleRoot: computeMerkleRoot([credHash]),
            qrCodeUrl: `${env.FRONTEND_URL}/verify/${certNum}`,
            blockchainAnchor: {
              create: {
                network: 'Ethereum Sepolia',
                contractAddress: null,
                transactionHash: null,
                blockNumber: null,
                merkleRoot: computeMerkleRoot([credHash]),
                merkleProof: [credHash],
                isConfirmed: false,
                status: 'PENDING_BLOCKCHAIN',
              },
            },
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
          student: { select: { id: true, name: true } },
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
