import { prisma } from '../config/database.js';
import { blockchainService } from './blockchain.service.js';

export class JobsService {
  constructor() {
    this.intervalHandle = null;
    this.isRunning = false;
  }

  /**
   * Safe cleanup of expired refresh tokens
   */
  async cleanupExpiredTokens() {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true, createdAt: { lt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } },
          ],
        },
      });
      return { cleanedCount: result.count };
    } catch (err) {
      console.warn('JobsService [cleanupExpiredTokens] notice:', err.message);
      return { cleanedCount: 0, error: err.message };
    }
  }

  /**
   * Automatic status transition for expired credentials
   */
  async checkExpiredCredentials() {
    try {
      const now = new Date();
      const expired = await prisma.credential.updateMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            not: null,
            lt: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });
      return { expiredCount: expired.count };
    } catch (err) {
      console.warn('JobsService [checkExpiredCredentials] notice:', err.message);
      return { expiredCount: 0, error: err.message };
    }
  }

  /**
   * Reconcile pending blockchain anchors against live network provider
   */
  async reconcilePendingAnchors() {
    try {
      const pendingAnchors = await prisma.blockchainAnchor.findMany({
        where: {
          status: 'PENDING_BLOCKCHAIN',
          transactionHash: { not: null },
        },
        take: 5,
      });

      if (!pendingAnchors.length) {
        return { reconciledCount: 0 };
      }

      let reconciledCount = 0;

      for (const anchor of pendingAnchors) {
        if (!anchor.transactionHash || anchor.transactionHash.startsWith('simulated_')) {
          continue;
        }

        try {
          if (!blockchainService.provider) break;

          // Quick 2.5-second timeout to avoid RPC hang
          const receiptPromise = blockchainService.provider.getTransactionReceipt(anchor.transactionHash);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('RPC query timeout')), 2500)
          );

          const receipt = await Promise.race([receiptPromise, timeoutPromise]);
          if (receipt) {
            if (receipt.status === 1) {
              await prisma.blockchainAnchor.update({
                where: { id: anchor.id },
                data: {
                  isConfirmed: true,
                  status: 'CONFIRMED',
                  blockNumber: BigInt(receipt.blockNumber),
                  gasUsed: receipt.gasUsed ? BigInt(receipt.gasUsed) : null,
                },
              });
              reconciledCount++;
            } else if (receipt.status === 0) {
              await prisma.blockchainAnchor.update({
                where: { id: anchor.id },
                data: {
                  status: 'FAILED',
                },
              });
            }
          }
        } catch (txErr) {
          // If RPC is throwing 522/offline or timeout, abort remaining checks for this cycle
          console.warn(`JobsService: anchor ${anchor.id} tx check skipped:`, txErr.message);
          break;
        }
      }

      return { reconciledCount };
    } catch (err) {
      console.warn('JobsService [reconcilePendingAnchors] notice:', err.message);
      return { reconciledCount: 0, error: err.message };
    }
  }

  /**
   * Reconcile locally revoked credentials with on-chain status
   */
  async reconcilePendingRevocations() {
    try {
      const pendingRevocations = await prisma.credential.findMany({
        where: {
          status: 'REVOKED',
          onChainRevocationStatus: 'REVOKE_PENDING',
        },
        include: {
          issuer: {
            include: { institutionProfile: true },
          },
        },
        take: 5,
      });

      if (!pendingRevocations.length) {
        return { reconciledCount: 0 };
      }

      let reconciledCount = 0;

      for (const cred of pendingRevocations) {
        try {
          const expectedIssuer = cred.issuer.walletAddress || cred.issuer.institutionProfile?.signingPublicKey;
          
          const verifyPromise = blockchainService.verifyOnChain(cred.credentialHash, expectedIssuer);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('RPC verify timeout')), 2500)
          );

          const status = await Promise.race([verifyPromise, timeoutPromise]);

          if (status.checked && status.revoked) {
            await prisma.credential.update({
              where: { id: cred.id },
              data: {
                onChainRevocationStatus: 'REVOKE_CONFIRMED',
              },
            });
            reconciledCount++;
          }
        } catch (recErr) {
          console.warn(`JobsService: revocation check for ${cred.id} skipped:`, recErr.message);
          break;
        }
      }

      return { reconciledCount };
    } catch (err) {
      console.warn('JobsService [reconcilePendingRevocations] notice:', err.message);
      return { reconciledCount: 0, error: err.message };
    }
  }

  /**
   * Run full background reconciliation cycle
   */
  async runReconciliationCycle() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const [tokens, credentials, anchors, revocations] = await Promise.all([
        this.cleanupExpiredTokens(),
        this.checkExpiredCredentials(),
        this.reconcilePendingAnchors(),
        this.reconcilePendingRevocations(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        tokens,
        credentials,
        anchors,
        revocations,
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start periodic job runner
   */
  startJobs(intervalMs = 300000) {
    if (this.intervalHandle) return;

    this.intervalHandle = setInterval(() => {
      this.runReconciliationCycle().catch((err) => {
        console.warn('JobsService periodic cycle failed:', err.message);
      });
    }, intervalMs);

    if (this.intervalHandle.unref) {
      this.intervalHandle.unref();
    }
  }

  /**
   * Graceful shutdown of background jobs
   */
  stopJobs() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}

export const jobsService = new JobsService();
