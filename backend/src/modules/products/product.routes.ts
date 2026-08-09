import { Router } from 'express';
import { authenticateRequest, requireRole } from '../../middleware/auth';
import {
  createProductController,
  getProductDetailController,
  listProductsController,
  listStockMovementsController,
  recordStockMovementController,
  updateProductController,
} from './product.controller';

const router = Router();

router.use(authenticateRequest);

router.get('/', listProductsController);
router.get('/:id', getProductDetailController);
router.get('/:id/stock-movements', listStockMovementsController);

router.post('/', requireRole('ADMIN', 'WAREHOUSE'), createProductController);
router.put('/:id', requireRole('ADMIN', 'WAREHOUSE'), updateProductController);
router.post('/:id/stock-movements', requireRole('ADMIN', 'WAREHOUSE'), recordStockMovementController);

export default router;
