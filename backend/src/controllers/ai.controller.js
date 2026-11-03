import { groqService } from '../integrations/ai/groq.service.js';
import { prisma } from '../config/database.js';
import { BadRequestError } from '../utils/errors.js';

export class AiController {
  /**
   * Extract skills from unstructured text using Groq
   */
  async extractSkills(req, res, next) {
    try {
      const { text } = req.body;
      if (!text || text.trim().length === 0) {
        throw new BadRequestError('Text content is required for skill extraction');
      }

      const result = await groqService.extractSkills(text);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Compare candidate skills against target role
   */
  async analyzeGap(req, res, next) {
    try {
      const { jobTitle, requiredSkills, studentId } = req.body;

      if (!jobTitle || !Array.isArray(requiredSkills)) {
        throw new BadRequestError('jobTitle and requiredSkills array are required');
      }

      let candidateSkillNames = [];

      if (studentId) {
        const student = await prisma.user.findUnique({
          where: { id: studentId },
          include: {
            studentProfile: {
              include: { skills: { include: { skill: true } } },
            },
          },
        });
        if (student?.studentProfile?.skills) {
          candidateSkillNames = student.studentProfile.skills.map((s) => s.skill.name);
        }
      } else if (req.user?.id) {
        const student = await prisma.user.findUnique({
          where: { id: req.user.id },
          include: {
            studentProfile: {
              include: { skills: { include: { skill: true } } },
            },
          },
        });
        if (student?.studentProfile?.skills) {
          candidateSkillNames = student.studentProfile.skills.map((s) => s.skill.name);
        }
      }

      const analysis = await groqService.analyzeSkillGap(jobTitle, requiredSkills, candidateSkillNames);

      res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Conversational AI Assistant
   */
  async chat(req, res, next) {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        throw new BadRequestError('Messages array is required');
      }

      const reply = await groqService.chatAssistant(messages);

      res.status(200).json({
        success: true,
        data: {
          role: 'assistant',
          content: reply,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AiController();
