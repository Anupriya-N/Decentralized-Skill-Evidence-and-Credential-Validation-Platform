import { authService } from '../services/auth.service.js';
import { prisma } from '../config/database.js';

export class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Account successfully registered',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const result = await authService.login(req.body);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const token = req.body.refreshToken || req.cookies?.refreshToken;
      const result = await authService.refreshToken(token);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const token = req.body.refreshToken || req.cookies?.refreshToken;
      await authService.logout(token);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: {
          profile: true,
          studentProfile: {
            include: {
              skills: {
                include: { skill: true },
              },
            },
          },
          institutionProfile: true,
          employerProfile: true,
        },
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        data: authService.sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
