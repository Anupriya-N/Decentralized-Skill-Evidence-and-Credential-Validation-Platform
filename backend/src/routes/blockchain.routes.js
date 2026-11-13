import { Router } from 'express';
import { blockchainService } from '../services/blockchain.service.js';
import { verificationController } from '../controllers/verification.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { BadRequestError } from '../utils/errors.js';

const router = Router();

/**
 * Public: Get blockchain network status and contract configuration
 */
router.get('/status', async (_req, res, next) => {
  try {
    const status = await blockchainService.getStatus();
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Public: Verify credential on blockchain (compatibility route for frontend /blockchain/verify/:credentialId)
 */
router.get('/verify/:credentialId', (req, res, next) => {
  req.params.identifier = req.params.credentialId;
  return verificationController.verifyCredential(req, res, next);
});

/**
 * Authenticated: Register / Anchor cryptographic proof on-chain (Institutional or Admin relayer)
 */
router.post('/register-proof', authenticate, authorize('INSTITUTION', 'ADMIN'), async (req, res, next) => {
  try {
    const { credentialId, sha256Digest } = req.body;
    if (!credentialId || !sha256Digest) {
      throw new BadRequestError('credentialId and sha256Digest are required');
    }

    const anchorResult = await blockchainService.anchorCredential(
      sha256Digest,
      req.user.institutionProfile?.id || req.user.id
    );

    res.status(anchorResult.success ? 201 : 503).json({
      success: anchorResult.success,
      data: anchorResult,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
