import { prisma } from '../config/database.js';
import { NotFoundError } from '../utils/errors.js';
import { blockchainService } from '../services/blockchain.service.js';
import { ethers } from 'ethers';

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
   * Update institution accreditation (Admin only)
   */
  async updateAccreditation(req, res, next) {
    try {
      const { id } = req.params;
      const { isAccredited, accreditationBody, accreditationNumber, signingPublicKey, walletAddress } = req.body;

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
          ...(signingPublicKey && { signingPublicKey }),
        },
      });

      if (walletAddress) {
        await prisma.user.update({
          where: { id: profile.userId },
          data: { walletAddress },
        }).catch(() => {});
      }

      // Task 8: If suspension, deauthorize issuer on-chain; if accreditation approved and wallet provided, authorize on-chain
      let onChainActionStatus = null;
      const targetWallet = walletAddress || signingPublicKey || profile.signingPublicKey;
      if (targetWallet && ethers.isAddress(targetWallet) && blockchainService.isConfigured && blockchainService.contract) {
        try {
          if (!isAccredited) {
            const deauthRes = await blockchainService.deauthorizeIssuer(targetWallet);
            onChainActionStatus = deauthRes.status;
          } else {
            const authRes = await blockchainService.authorizeIssuer(targetWallet);
            onChainActionStatus = authRes.status;
          }
        } catch (bcErr) {
          console.warn('Admin on-chain authorization sync notice:', bcErr.message);
        }
      }

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: isAccredited ? 'INSTITUTION_ACCREDITED' : 'INSTITUTION_SUSPENDED',
          entity: 'INSTITUTION',
          entityId: profile.id,
          details: { isAccredited, onChainActionStatus },
        },
      });

      // Notify institution
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'ACCREDITATION_UPDATED',
          title: isAccredited ? 'Accreditation Approved' : 'Accreditation Status Updated',
          message: isAccredited
            ? 'Your institution has been officially accredited. You may now cryptographically issue verifiable credentials.'
            : 'Your institution accreditation status has been suspended or updated by platform administrators.',
        },
      });

      res.status(200).json({
        success: true,
        message: `Institution accreditation updated to ${isAccredited ? 'APPROVED' : 'SUSPENDED'}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update employer verification (Admin only)
   */
  async updateEmployerVerification(req, res, next) {
    try {
      const { id } = req.params;
      const { isVerifiedCompany } = req.body;

      const profile = await prisma.employerProfile.findFirst({
        where: {
          OR: [{ id }, { userId: id }],
        },
      });

      if (!profile) {
        throw new NotFoundError('Employer profile not found');
      }

      const updated = await prisma.employerProfile.update({
        where: { id: profile.id },
        data: {
          isVerifiedCompany: Boolean(isVerifiedCompany),
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: isVerifiedCompany ? 'INSTITUTION_ACCREDITED' : 'INSTITUTION_SUSPENDED',
          entity: 'EMPLOYER',
          entityId: profile.id,
          details: { isVerifiedCompany },
        },
      });

      // Notify employer
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'ACCREDITATION_UPDATED',
          title: isVerifiedCompany ? 'Employer Verification Approved' : 'Employer Status Updated',
          message: isVerifiedCompany
            ? 'Your employer organization has been verified. You may now access candidate profiles and search talent pool.'
            : 'Your employer organization verification status has been updated by administrators.',
        },
      });

      res.status(200).json({
        success: true,
        message: `Employer company verification status updated to ${isVerifiedCompany ? 'VERIFIED' : 'PENDING'}`,
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
