import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export function normalizeRole(roleStr) {
  if (!roleStr) return 'STUDENT';
  const upper = String(roleStr).toUpperCase();
  if (upper === 'ISSUER' || upper === 'INSTITUTION') return 'INSTITUTION';
  if (upper === 'RECRUITER' || upper === 'EMPLOYER') return 'EMPLOYER';
  if (upper === 'STUDENT') return 'STUDENT';
  if (upper === 'ADMIN') return 'ADMIN';
  return upper;
}

export async function authenticate(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired');
      }
      throw new UnauthorizedError('Invalid authentication token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        profile: true,
        studentProfile: true,
        institutionProfile: true,
        employerProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account not found or deactivated');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      rawUser: user,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...allowedRoles) {
  const normalizedAllowedRoles = allowedRoles.map((r) => normalizeRole(r));

  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('User is not authenticated'));
    }

    if (!normalizedAllowedRoles.includes(normalizeRole(req.user.role))) {
      return next(
        new ForbiddenError(
          `User role '${req.user.role}' is not authorized to access this resource`
        )
      );
    }

    next();
  };
}
