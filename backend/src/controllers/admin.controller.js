import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';

export class AdminController {
  /**
   * System-wide platform metrics
   */
  async getDashboard(req, res, next) {
    try {
      const [
        totalUsers,
        totalStudents,
        totalInstitutions,
        totalEmployers,
        totalCredentials,
        activeCredentials,
        revokedCredentials,
        totalVerifications,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: 'STUDENT' } }),
        prisma.user.count({ where: { role: 'INSTITUTION' } }),
        prisma.user.count({ where: { role: 'EMPLOYER' } }),
        prisma.credential.count(),
        prisma.credential.count({ where: { status: 'ACTIVE' } }),
        prisma.credential.count({ where: { status: 'REVOKED' } }),
        prisma.verificationLog.count(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          users: {
            total: totalUsers,
            students: totalStudents,
            institutions: totalInstitutions,
            employers: totalEmployers,
          },
          credentials: {
            total: totalCredentials,
            active: activeCredentials,
            revoked: revokedCredentials,
          },
          verifications: {
            total: totalVerifications,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List users with role filter
   */
  async getUsers(req, res, next) {
    try {
      const { role, page = 1, limit = 15 } = req.query;

      const take = parseInt(limit, 10);
      const skip = (parseInt(page, 10) - 1) * take;

      const where = {};
      if (role) where.role = role.toUpperCase();

      const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isVerified: true,
            isActive: true,
            createdAt: true,
            institutionProfile: true,
            employerProfile: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          total,
          page: parseInt(page, 10),
          totalPages: Math.ceil(total / take),
          users,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update institution accreditation
   */
  async updateAccreditation(req, res, next) {
    try {
      const { id } = req.params;
      const { isAccredited, accreditationBody, accreditationNumber } = req.body;

      const profile = await prisma.institutionProfile.findFirst({
        where: {
          OR: [{ id }, { userId: id }],
        },
      });

      if (!profile) {
        throw new NotFoundError('Institution profile not found');
      }

      const updated = await prisma.institutionProfile.update({
        where: { id: profile.id },
        data: {
          isAccredited: Boolean(isAccredited),
          ...(accreditationBody && { accreditationBody }),
          ...(accreditationNumber && { accreditationNumber }),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: isAccredited ? 'INSTITUTION_ACCREDITED' : 'INSTITUTION_SUSPENDED',
          entity: 'INSTITUTION',
          entityId: profile.id,
          details: { isAccredited },
        },
      });

      res.status(200).json({
        success: true,
        message: `Institution accreditation updated to ${isAccredited ? 'ACTIVE' : 'SUSPENDED'}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List system audit logs
   */
  async getAuditLogs(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const take = parseInt(limit, 10);
      const skip = (parseInt(page, 10) - 1) * take;

      const [total, logs] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.findMany({
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          total,
          page: parseInt(page, 10),
          totalPages: Math.ceil(total / take),
          logs,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
