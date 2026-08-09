import { Router } from 'express';
import { authenticateRequest, requireRole } from '../../middleware/auth';
import {
  cancelChallanController,
  confirmChallanController,
  createChallanController,
  getChallanDetailController,
  listChallansController,
} from './challan.controller';

const router = Router();

router.use(authenticateRequest);

router.get('/', requireRole('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), listChallansController);
router.get('/:id', requireRole('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'), getChallanDetailController);

router.post('/', requireRole('ADMIN', 'SALES'), createChallanController);
router.post('/:id/confirm', requireRole('ADMIN', 'SALES'), confirmChallanController);
router.post('/:id/cancel', requireRole('ADMIN', 'SALES'), cancelChallanController);

export default router;
