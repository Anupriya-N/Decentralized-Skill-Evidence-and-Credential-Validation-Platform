import { Router } from 'express';
import { skillsController } from '../controllers/skills.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', (req, res, next) => skillsController.listSkills(req, res, next));
router.post('/', authenticate, authorize('INSTITUTION', 'ADMIN'), (req, res, next) =>
  skillsController.createSkill(req, res, next)
);
router.post('/:studentSkillId/endorse', authenticate, (req, res, next) =>
  skillsController.endorseSkill(req, res, next)
);

export default router;
