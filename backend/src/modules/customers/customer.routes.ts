import { Router } from 'express';
import { authenticateRequest, requireRole } from '../../middleware/auth';
import { addCustomerFollowUpController, createCustomerController, getCustomerDetailController, listCustomersController, updateCustomerController } from './customer.controller';

const router = Router();

router.use(authenticateRequest);

router.get('/', listCustomersController);
router.get('/:id', getCustomerDetailController);
router.post('/', requireRole('ADMIN', 'SALES'), createCustomerController);
router.put('/:id', requireRole('ADMIN', 'SALES'), updateCustomerController);
router.post('/:id/followups', requireRole('ADMIN', 'SALES'), addCustomerFollowUpController);

export default router;