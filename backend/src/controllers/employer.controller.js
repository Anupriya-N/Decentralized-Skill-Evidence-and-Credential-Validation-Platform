import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export class EmployerController {
  /**
   * Recruiter dashboard overview
   */
  async getDashboard(req, res, next) {
    try {
      const [totalCandidates, verifiedCredentialsCount, totalSkills] = await Promise.all([
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.credential.count({ where: { status: 'ACTIVE' } }),
        prisma.skill.count({ where: { isActive: true } }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalCandidates,
          verifiedCredentialsCount,
          totalSkills,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search candidate talent pool by skills, institution, keyword
   */
  async searchCandidates(req, res, next) {
    try {
      const { skills, search, page = 1, limit = 10 } = req.query;

      const take = parseInt(limit, 10);
      const skip = (parseInt(page, 10) - 1) * take;

      const where = {
        role: 'STUDENT',
        isActive: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { studentProfile: { degreeProgram: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (skills) {
        const skillList = String(skills).split(',').map((s) => s.trim().toLowerCase());
        where.studentProfile = {
          skills: {
            some: {
              skill: {
                name: { in: skillList, mode: 'insensitive' },
              },
            },
          },
        };
      }

      const [total, students] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
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
              select: { id: true, title: true, badgeLevel: true },
            },
          },
          skip,
          take,
        }),
      ]);

      const sanitized = students.map((s) => {
        const { passwordHash, ...safe } = s;
        return safe;
      });

      res.status(200).json({
        success: true,
        data: {
          total,
          page: parseInt(page, 10),
          totalPages: Math.ceil(total / take),
          candidates: sanitized,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single candidate full profile
   */
  async getCandidate(req, res, next) {
    try {
      const { id } = req.params;

      const candidate = await prisma.user.findUnique({
        where: { id },
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
              issuer: { select: { name: true, institutionProfile: true } },
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

      if (!candidate || candidate.role !== 'STUDENT') {
        throw new NotFoundError('Candidate not found');
      }

      const { passwordHash, ...safe } = candidate;

      res.status(200).json({
        success: true,
        data: safe,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const employerController = new EmployerController();
