import { Router } from 'express';
import { institutionController } from '../controllers/institution.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(authorize('INSTITUTION', 'ADMIN'));

router.get('/dashboard', (req, res, next) => institutionController.getDashboard(req, res, next));
router.get('/credentials', (req, res, next) => institutionController.getIssuedCredentials(req, res, next));
router.post('/credentials/batch', (req, res, next) => institutionController.batchIssue(req, res, next));
router.post('/batch-issue', (req, res, next) => institutionController.batchIssue(req, res, next));
router.get('/evidence/pending', (req, res, next) => institutionController.getPendingEvidence(req, res, next));

// Institutional MetaMask wallet verification and EIP-712 routes
router.get('/wallet/challenge', (req, res, next) => institutionController.getWalletChallenge(req, res, next));
router.post('/wallet/link', (req, res, next) => institutionController.linkWallet(req, res, next));
router.get('/eip712-params', (req, res, next) => institutionController.getEip712Params(req, res, next));
router.post('/authorize-on-chain', authorize('ADMIN'), (req, res, next) => institutionController.authorizeOnChain(req, res, next));
router.post('/deauthorize-on-chain', authorize('ADMIN'), (req, res, next) => institutionController.deauthorizeOnChain(req, res, next));

export default router;
