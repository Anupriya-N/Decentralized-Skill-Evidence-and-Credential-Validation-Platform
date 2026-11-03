import fs from 'fs';
import { prisma } from '../config/database.js';
import { computeFileSha256 } from '../utils/crypto.js';
import { groqService } from '../integrations/ai/groq.service.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import pdfParse from 'pdf-parse';

export class EvidenceController {
  /**
   * Upload evidence artifact, compute SHA-256 hash, run AI extraction
   */
  async upload(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('Evidence file is required');
      }

      const studentId = req.user.id;
      const { title, description, evidenceType = 'PROJECT', skillIds } = req.body;

      const filePath = req.file.path;
      const sha256Hash = await computeFileSha256(filePath);

      // Check if hash already registered (duplicate file check)
      const existing = await prisma.evidence.findUnique({
        where: { sha256Hash },
      });

      if (existing) {
        // Remove uploaded file to avoid duplicate storage
        fs.unlinkSync(filePath);
        return res.status(409).json({
          success: false,
          message: 'An identical evidence document has already been uploaded to CertiTrust',
          data: existing,
        });
      }

      // If PDF, extract text for Groq AI
      let extractedSkills = [];
      let aiConfidence = 0.9;
      if (req.file.mimetype === 'application/pdf') {
        try {
          const dataBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(dataBuffer);
          if (pdfData.text && pdfData.text.trim().length > 20) {
            const aiResult = await groqService.extractSkills(pdfData.text);
            extractedSkills = aiResult.skills || [];
          }
        } catch (pdfErr) {
          console.warn('PDF text parse notice:', pdfErr.message);
        }
      }

      const fileUrl = `/uploads/evidence/${req.file.filename}`;

      // Parse skill IDs if passed as JSON string
      let parsedSkillIds = [];
      if (skillIds) {
        try {
          parsedSkillIds = typeof skillIds === 'string' ? JSON.parse(skillIds) : skillIds;
        } catch (e) {
          parsedSkillIds = [];
        }
      }

      const evidence = await prisma.evidence.create({
        data: {
          studentId,
          title: title || req.file.originalname,
          description,
          evidenceType,
          status: 'PENDING_REVIEW',
          fileUrl,
          fileName: req.file.originalname,
          fileSizeBytes: req.file.size,
          mimeType: req.file.mimetype,
          sha256Hash,
          extractedSkills: extractedSkills.map((s) => s.name || s),
          aiConfidence,
          skills: {
            create: parsedSkillIds.map((id) => ({
              skillId: id,
              relevanceScore: 1.0,
            })),
          },
        },
        include: {
          skills: { include: { skill: true } },
        },
      });

      // Record audit event
      await prisma.auditLog.create({
        data: {
          userId: studentId,
          action: 'EVIDENCE_SUBMITTED',
          entity: 'EVIDENCE',
          entityId: evidence.id,
          details: { title: evidence.title, hash: sha256Hash },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Evidence document uploaded and hashed successfully',
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student's evidence records
   */
  async getMyEvidence(req, res, next) {
    try {
      const studentId = req.user.id;
      const evidence = await prisma.evidence.findMany({
        where: { studentId },
        include: {
          skills: { include: { skill: true } },
          reviews: {
            include: { reviewer: { select: { name: true, role: true } } },
          },
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

  /**
   * Review evidence (Institution or Admin)
   */
  async review(req, res, next) {
    try {
      const { id } = req.params;
      const reviewerId = req.user.id;
      const { status, score, feedback } = req.body;

      if (!['APPROVED', 'REJECTED', 'UNDER_REVIEW'].includes(status)) {
        throw new BadRequestError('Invalid review status');
      }

      const evidence = await prisma.evidence.findUnique({
        where: { id },
        include: { student: true, skills: true },
      });

      if (!evidence) {
        throw new NotFoundError('Evidence item not found');
      }

      const [updatedEvidence] = await prisma.$transaction([
        prisma.evidence.update({
          where: { id },
          data: { status },
        }),
        prisma.evidenceReview.create({
          data: {
            evidenceId: id,
            reviewerId,
            decision: status,
            score: score ? parseFloat(score) : null,
            feedback,
          },
        }),
      ]);

      // If approved, update student skill proficiency scores
      if (status === 'APPROVED') {
        const studentProfile = await prisma.studentProfile.findUnique({
          where: { userId: evidence.studentId },
        });

        if (studentProfile) {
          for (const evSkill of evidence.skills) {
            await prisma.studentSkill.upsert({
              where: {
                studentId_skillId: {
                  studentId: studentProfile.id,
                  skillId: evSkill.skillId,
                },
              },
              update: {
                isVerified: true,
                score: { increment: 5.0 },
              },
              create: {
                studentId: studentProfile.id,
                skillId: evSkill.skillId,
                proficiency: 'INTERMEDIATE',
                score: 75.0,
                isVerified: true,
              },
            });
          }
        }

        // Notify student
        await prisma.notification.create({
          data: {
            userId: evidence.studentId,
            type: 'EVIDENCE_APPROVED',
            title: 'Evidence Verified & Approved',
            message: `Your evidence "${evidence.title}" has been verified by ${req.user.rawUser?.name || 'institution'}.`,
            actionUrl: '/student/evidence',
          },
        });
      }

      res.status(200).json({
        success: true,
        message: `Evidence has been ${status.toLowerCase()}`,
        data: updatedEvidence,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const evidenceController = new EvidenceController();
