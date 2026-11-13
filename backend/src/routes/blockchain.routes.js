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
 * Authenticated: Register / Anchor cryptographic proof on-chain.
 * RESTRICTED TO ADMIN ONLY (TASK 2): Normal institutional issuance MUST use
 * registerCredentialWithSignature via verified EIP-712 institutional signature.
 * Direct registration without EIP-712 is restricted to owner-only administrative maintenance and controlled dev ops.
 */
router.post('/register-proof', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { credentialId, sha256Digest } = req.body;
    if (!credentialId || !sha256Digest) {
      throw new BadRequestError('credentialId and sha256Digest are required');
    }

    const issuerAddress =
      req.user.rawUser?.walletAddress ||
      req.user.rawUser?.institutionProfile?.signingPublicKey ||
      null;

    const anchorResult = await blockchainService.anchorCredential(
      sha256Digest,
      issuerAddress
    );

    const isOk = Boolean(anchorResult.success || anchorResult.isConfirmed);
    res.status(isOk ? 201 : 503).json({
      success: isOk,
      data: anchorResult,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
