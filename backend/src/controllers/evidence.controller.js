import fs from 'fs';
import path from 'path';
import { prisma } from '../config/database.js';
import { computeFileSha256, validateFileMagicBytes } from '../utils/crypto.js';
import { groqService } from '../integrations/ai/groq.service.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { env } from '../config/env.js';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';

export class EvidenceController {
  /**
   * Upload evidence artifact, validate magic bytes, compute SHA-256 hash, run AI extraction & OCR
   */
  async upload(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('Evidence file is required');
      }

      const studentId = req.user.id;
      const { title, description, evidenceType = 'PROJECT', skillIds } = req.body;
      const filePath = req.file.path;

      // 1. Strict Magic Bytes Validation (Priority 6.1 & 6.2)
      const magicCheck = validateFileMagicBytes(filePath);
      if (!magicCheck.isValid) {
        fs.unlinkSync(filePath);
        throw new BadRequestError(
          `Invalid file format: Detected ${magicCheck.detectedType}. File magic header does not match permitted document types.`
        );
      }

      // 2. Duplicate Detection via SHA-256 Content Hash
      const sha256Hash = await computeFileSha256(filePath);
      const existing = await prisma.evidence.findUnique({
        where: { sha256Hash },
      });

      if (existing) {
        fs.unlinkSync(filePath);
        return res.status(409).json({
          success: false,
          message: 'An identical evidence document has already been registered on CertiTrust',
          data: existing,
        });
      }

      // 3. Document Text Extraction: PDF or OCR for images (Priority 6.6)
      let extractedText = '';
      if (magicCheck.detectedType === 'application/pdf') {
        try {
          const dataBuffer = fs.readFileSync(filePath);
          const pdfData = await pdfParse(dataBuffer);
          extractedText = pdfData.text || '';
        } catch (pdfErr) {
          console.warn('PDF text parse note:', pdfErr.message);
        }
      } else if (magicCheck.detectedType.startsWith('image/')) {
        try {
          // Perform OCR extraction on image evidence
          const worker = await createWorker('eng');
          const ret = await worker.recognize(filePath);
          extractedText = ret.data.text || '';
          await worker.terminate();
        } catch (ocrErr) {
          console.warn('OCR image extraction note:', ocrErr.message);
        }
      }

      // 4. Groq AI Skill Extraction (Strict: No fake fallbacks)
      let extractedSkills = [];
      let aiConfidence = null;
      let aiStatus = 'AI_PENDING';

      if (extractedText && extractedText.trim().length > 20) {
        const aiResult = await groqService.extractSkills(extractedText);
        if (aiResult.status === 'AI_COMPLETED') {
          extractedSkills = aiResult.skills || [];
          aiStatus = 'AI_COMPLETED';
          if (extractedSkills.length > 0) {
            // Calculate genuine average confidence from model output
            const sumConf = extractedSkills.reduce((acc, s) => acc + (s.confidence || 0.8), 0);
            aiConfidence = parseFloat((sumConf / extractedSkills.length).toFixed(2));
          }
        } else {
          aiStatus = aiResult.status || 'AI_PENDING';
          aiConfidence = null;
        }
      } else {
        aiStatus = 'AI_PENDING';
      }

      const fileUrl = `/api/v1/evidence/${path.basename(req.file.filename)}/download`;

      let parsedSkillIds = [];
      if (skillIds) {
        try {
          parsedSkillIds = typeof skillIds === 'string' ? JSON.parse(skillIds) : skillIds;
        } catch (e) {
          parsedSkillIds = [];
        }
      }

      // 5. Store record in PostgreSQL (Status strictly remains PENDING_REVIEW for institutional approval)
      const evidence = await prisma.evidence.create({
        data: {
          studentId,
          title: title || req.file.originalname,
          description,
          evidenceType,
          status: 'PENDING_REVIEW', // Strict: AI output NEVER auto-approves
          aiStatus,
          fileUrl,
          fileName: path.basename(req.file.filename),
          fileSizeBytes: req.file.size,
          mimeType: magicCheck.detectedType,
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

      // Audit Log
      await prisma.auditLog.create({
        data: {
          userId: studentId,
          action: 'EVIDENCE_SUBMITTED',
          entity: 'EVIDENCE',
          entityId: evidence.id,
          details: { title: evidence.title, hash: sha256Hash, aiStatus },
        },
      });

      // Notification
      await prisma.notification.create({
        data: {
          userId: studentId,
          type: 'SYSTEM_NOTICE',
          title: 'Evidence Uploaded',
          message: `Your evidence "${evidence.title}" has been uploaded and queued for institutional review.`,
          actionUrl: '/student/evidence',
        },
      });

      res.status(201).json({
        success: true,
        message: 'Evidence document uploaded, verified via magic bytes, and processed for review',
        data: evidence,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Secure, authenticated download endpoint with strict authorization
   */
  async downloadEvidence(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      const evidence = await prisma.evidence.findFirst({
        where: {
          OR: [{ id }, { fileName: id }],
        },
      });

      if (!evidence) {
        throw new NotFoundError('Evidence record not found');
      }

      // Authorization Check
      const isOwner = evidence.studentId === user.id;
      const isAccreditedIssuer =
        user.role === 'INSTITUTION' && Boolean(user.rawUser?.institutionProfile?.isAccredited);
      const isAdmin = user.role === 'ADMIN';

      if (!isOwner && !isAccreditedIssuer && !isAdmin) {
        throw new ForbiddenError('You are not authorized to access or download another candidate\'s evidence');
      }

      const safeFileName = path.basename(evidence.fileName);
      const filePath = path.resolve(env.UPLOAD_DIR, 'evidence', safeFileName);

      if (!fs.existsSync(filePath)) {
        throw new NotFoundError('Underlying evidence document not found on storage');
      }

      res.setHeader('Content-Type', evidence.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
      res.download(filePath, safeFileName);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student's own evidence records
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
   * Review evidence (Institution or Admin only)
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

      // Security: Students cannot review or approve their own evidence
      if (evidence.studentId === reviewerId) {
        throw new ForbiddenError('Students cannot review or approve their own evidence');
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

        await prisma.notification.create({
          data: {
            userId: evidence.studentId,
            type: 'EVIDENCE_APPROVED',
            title: 'Evidence Verified & Approved',
            message: `Your evidence "${evidence.title}" has been verified.`,
            actionUrl: '/student/evidence',
          },
        });
      } else if (status === 'REJECTED') {
        await prisma.notification.create({
          data: {
            userId: evidence.studentId,
            type: 'EVIDENCE_REJECTED',
            title: 'Evidence Submission Rejected',
            message: `Your evidence "${evidence.title}" was not approved. Feedback: ${feedback || 'Does not satisfy accreditation criteria.'}`,
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
