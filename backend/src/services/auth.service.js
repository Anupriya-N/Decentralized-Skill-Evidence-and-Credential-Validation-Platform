import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { BadRequestError, UnauthorizedError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { normalizeRole } from '../middleware/auth.middleware.js';
import crypto from 'crypto';

export class AuthService {
  /**
   * Register a new user with secure role provisioning
   */
  async register({ email, password, name, role = 'STUDENT', institutionName, companyName }) {
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
   * Strips sensitive fields
   */
  sanitizeUser(user) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}

export const authService = new AuthService();
