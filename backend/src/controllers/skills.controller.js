import { prisma } from '../config/database.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class SkillsController {
  /**
   * List all standardized skills
   */
  async listSkills(req, res, next) {
    try {
      const { category, search } = req.query;

      const where = { isActive: true };
      if (category) where.category = category;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ];
      }

      const skills = await prisma.skill.findMany({
        where,
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: skills,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add a new standardized skill (Institution or Admin)
   */
  async createSkill(req, res, next) {
    try {
      const { name, code, category, description } = req.body;

      if (!name || !code) {
        throw new BadRequestError('Skill name and code are required');
      }

      const skill = await prisma.skill.create({
        data: {
          name,
          code: code.toUpperCase(),
          category: category || 'OTHER',
          description,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Skill created successfully',
        data: skill,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Endorse a student's skill
   */
  async endorseSkill(req, res, next) {
    try {
      const { studentSkillId } = req.params;

      const studentSkill = await prisma.studentSkill.findUnique({
        where: { id: studentSkillId },
      });

      if (!studentSkill) {
        throw new NotFoundError('Student skill record not found');
      }

      const updated = await prisma.studentSkill.update({
        where: { id: studentSkillId },
        data: {
          endorsementCount: { increment: 1 },
          score: Math.min(100, studentSkill.score + 1.5),
        },
      });

      res.status(200).json({
        success: true,
        message: 'Skill endorsed successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const skillsController = new SkillsController();
