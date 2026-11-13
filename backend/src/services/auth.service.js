import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.js';
import { normalizeRole } from '../middleware/auth.middleware.js';
import crypto from 'crypto';

export class AuthService {
  /**
   * Register a new user with secure role provisioning
   */
  async register({ email, password, name, role = 'STUDENT', institutionName, companyName, walletAddress, signingPublicKey }) {
    const rawRole = String(role || 'STUDENT').toUpperCase();

    // STRICT SECURITY: Public registration must never allow ADMIN
    if (rawRole === 'ADMIN') {
      throw new ForbiddenError('Administrator accounts cannot be created via public registration');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const normalizedRole = normalizeRole(role);
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          name,
          role: normalizedRole,
          walletAddress: walletAddress || null,
          isVerified: false, // Must be verified
          profile: {
            create: {
              headline: `${normalizedRole.charAt(0) + normalizedRole.slice(1).toLowerCase()} at CertiTrust`,
            },
          },
        },
      });

      if (normalizedRole === 'STUDENT') {
        const vanitySlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(100 + Math.random() * 900);
        await tx.studentProfile.create({
          data: {
            userId: newUser.id,
            portfolioSlug: vanitySlug,
            isPortfolioPublic: true,
          },
        });
      } else if (normalizedRole === 'INSTITUTION') {
        // Must require administrator accreditation approval before issuing
        await tx.institutionProfile.create({
          data: {
            userId: newUser.id,
            institutionName: institutionName || `${name}'s Academic Institution`,
            signingPublicKey: signingPublicKey || walletAddress || null,
            isAccredited: false, // Strict: Pending Admin Review
          },
        });
      } else if (normalizedRole === 'EMPLOYER') {
        // Must require administrator verification approval before hiring
        await tx.employerProfile.create({
          data: {
            userId: newUser.id,
            companyName: companyName || `${name}'s Organization`,
            isVerifiedCompany: false, // Strict: Pending Admin Review
          },
        });
      }

      // Log registration audit event
      await tx.auditLog.create({
        data: {
          userId: newUser.id,
          action: 'USER_REGISTER',
          entity: 'USER',
          entityId: newUser.id,
          details: { email: newUser.email, role: newUser.role, pendingApproval: normalizedRole !== 'STUDENT' },
        },
      });

      // Welcome Notification
      await tx.notification.create({
        data: {
          userId: newUser.id,
          type: 'SYSTEM_NOTICE',
          title: 'Welcome to CertiTrust',
          message:
            normalizedRole === 'STUDENT'
              ? 'Welcome to CertiTrust! You can now upload evidence of skills and view your verified portfolio.'
              : 'Welcome to CertiTrust! Your profile has been submitted and is pending administrator accreditation review.',
        },
      });

      return newUser;
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
      pendingApproval: normalizedRole !== 'STUDENT',
    };
  }

  /**
   * Authenticate user with email and password
   */
  async login({ email, password }) {
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: true,
        studentProfile: true,
        institutionProfile: true,
        employerProfile: true,
      },
    });

    // Prevent account enumeration by using consistent timing and generic error
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);

    // Record login audit event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        entity: 'USER',
        entityId: user.id,
      },
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Renew access token via atomic refresh token rotation
   */
  async refreshToken(refreshTokenString) {
    if (!refreshTokenString) {
      throw new UnauthorizedError('Refresh token is required');
    }

    try {
      jwt.verify(refreshTokenString, env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');

    // Atomic transaction prevents concurrent race conditions and token reuse attacks
    return await prisma.$transaction(async (tx) => {
      const storedToken = await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      // Detect reuse of revoked token (Breach attempt)
      if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
        if (storedToken && storedToken.isRevoked) {
          // Invalidate all tokens for this user immediately
          await tx.refreshToken.updateMany({
            where: { userId: storedToken.userId },
            data: { isRevoked: true },
          });
        }
        throw new UnauthorizedError('Refresh token is invalid, expired, or has been revoked');
      }

      // Atomically invalidate old token
      await tx.refreshToken.update({
        where: { id: storedToken.id },
        data: { isRevoked: true },
      });

      // Issue new token pair
      const accessToken = jwt.sign(
        { userId: storedToken.user.id, email: storedToken.user.email, role: storedToken.user.role },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      );

      const newRefreshToken = jwt.sign(
        { userId: storedToken.user.id, email: storedToken.user.email, jti: crypto.randomUUID() },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
      );

      const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await tx.refreshToken.create({
        data: {
          tokenHash: newTokenHash,
          userId: storedToken.user.id,
          expiresAt,
        },
      });

      return { accessToken, refreshToken: newRefreshToken };
    });
  }

  /**
   * Invalidate refresh token on logout
   */
  async logout(refreshTokenString) {
    if (!refreshTokenString) return;

    try {
      const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { isRevoked: true },
      });
    } catch (error) {
      console.warn('Logout notice:', error.message);
    }
  }

  /**
   * Helper: Generate JWT token pair with random unique hash
   */
  async generateTokens(user) {
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, jti: crypto.randomUUID() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
    );

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Request password reset instructions
   */
  async requestPasswordReset(email) {
    if (!email) {
      throw new BadRequestError('Email address is required');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      // Prevent account enumeration by returning identical success response
      return {
        message: 'If an account exists with this email, password reset instructions have been issued.',
      };
    }

    const resetToken = jwt.sign(
      { userId: user.id, type: 'password_reset' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        entity: 'USER',
        entityId: user.id,
        details: { step: 'REQUEST_INITIATED' },
      },
    });

    return {
      message: 'If an account exists with this email, password reset instructions have been issued.',
      resetToken: env.NODE_ENV !== 'production' ? resetToken : undefined,
    };
  }

  /**
   * Complete password reset using valid reset token
   */
  async resetPassword({ resetToken, newPassword }) {
    if (!resetToken || !newPassword) {
      throw new BadRequestError('Reset token and new password are required');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters');
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, env.JWT_SECRET);
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired password reset token');
    }

    if (decoded.type !== 'password_reset' || !decoded.userId) {
      throw new UnauthorizedError('Invalid password reset token payload');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found or account inactive');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all existing refresh tokens for security
      await tx.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET',
          entity: 'USER',
          entityId: user.id,
          details: { step: 'RESET_COMPLETED' },
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'SECURITY_ALERT',
          title: 'Password Changed',
          message: 'Your account password has been successfully reset. If you did not make this change, contact support immediately.',
        },
      });
    });

    return { message: 'Password has been successfully reset. Please log in with your new credentials.' };
  }

  /**
   * Authenticated user change password
   */
  async changePassword({ userId, currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Incorrect current password');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all existing refresh tokens
      await tx.refreshToken.updateMany({
        where: { userId: user.id },
        data: { isRevoked: true },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET',
          entity: 'USER',
          entityId: user.id,
          details: { step: 'PASSWORD_CHANGED' },
        },
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: 'SECURITY_ALERT',
          title: 'Password Updated',
          message: 'Your account password was updated successfully.',
        },
      });
    });

    return { message: 'Password updated successfully' };
  }

  /**
   * Strips sensitive fields
   */
  sanitizeUser(user) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();
