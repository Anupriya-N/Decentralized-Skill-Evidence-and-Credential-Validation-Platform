import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export class StudentController {
  /**
   * Get student dashboard overview metrics
   */
  async getDashboard(req, res, next) {
    try {
      const studentId = req.user.id;

      const [totalCredentials, verifiedCredentials, pendingEvidence, skillsCount, recentCredentials, recentEvidence] =
        await Promise.all([
          prisma.credential.count({ where: { studentId } }),
          prisma.credential.count({ where: { studentId, status: 'ACTIVE' } }),
          prisma.evidence.count({ where: { studentId, status: 'PENDING_REVIEW' } }),
          prisma.studentSkill.count({
            where: { student: { userId: studentId } },
          }),
          prisma.credential.findMany({
            where: { studentId },
            include: { issuer: { select: { name: true } }, skills: { include: { skill: true } } },
            orderBy: { issuedAt: 'desc' },
            take: 5,
          }),
          prisma.evidence.findMany({
            where: { studentId },
            orderBy: { createdAt: 'desc' },
            take: 5,
          }),
        ]);

      res.status(200).json({
        success: true,
        data: {
          totalCredentials,
          verifiedCredentials,
          pendingEvidence,
          skillsCount,
          recentCredentials,
          recentEvidence,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student skills with proficiency and endorsements
   */
  async getSkills(req, res, next) {
    try {
      const studentId = req.user.id;

      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: studentId },
        include: {
          skills: {
            include: {
              skill: true,
            },
            orderBy: { score: 'desc' },
          },
        },
      });

      if (!studentProfile) {
        return res.status(200).json({ success: true, data: [] });
      }

      res.status(200).json({
        success: true,
        data: studentProfile.skills,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get public student portfolio by vanity slug or userId
   */
  async getPublicPortfolio(req, res, next) {
    try {
      const { identifier } = req.params;

      const student = await prisma.user.findFirst({
        where: {
          OR: [
            { id: identifier },
            { studentProfile: { portfolioSlug: identifier } },
          ],
        },
        include: {
          profile: true,
          studentProfile: {
            include: {
              skills: {
                include: { skill: true },
              },
            },
          },
          receivedCredentials: {
            where: { status: 'ACTIVE' },
            include: {
              issuer: {
                select: {
                  name: true,
                  institutionProfile: { select: { institutionName: true, isAccredited: true } },
                },
              },
              skills: { include: { skill: true } },
              blockchainAnchor: true,
            },
          },
          evidenceItems: {
            where: { status: 'APPROVED' },
            include: { skills: { include: { skill: true } } },
          },
        },
      });

      if (!student) {
        throw new NotFoundError('Student portfolio not found');
      }

      const { passwordHash, ...publicData } = student;

      res.status(200).json({
        success: true,
        data: publicData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update student profile
   */
  async updateProfile(req, res, next) {
    try {
      const studentId = req.user.id;
      const { bio, headline, githubUsername, linkedinProfile, isPortfolioPublic } = req.body;

      await prisma.$transaction([
        prisma.profile.upsert({
          where: { userId: studentId },
          update: { bio, headline },
          create: { userId: studentId, bio, headline },
        }),
        prisma.studentProfile.upsert({
          where: { userId: studentId },
          update: { githubUsername, linkedinProfile, isPortfolioPublic },
          create: { userId: studentId, githubUsername, linkedinProfile, isPortfolioPublic },
        }),
      ]);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const studentController = new StudentController();
