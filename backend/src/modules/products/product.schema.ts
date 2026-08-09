import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required'),
  sku: z.string().trim().min(1, 'SKU is required'),
  category: z.string().trim().optional().nullable(),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
  currentStock: z.coerce.number().int().min(0, 'Current stock cannot be negative').default(0),
  minStockAlert: z.coerce.number().int().min(0, 'Min stock alert cannot be negative').default(0),
  location: z.string().trim().optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional().default(''),
});

export const recordStockMovementSchema = z.object({
  quantity: z.coerce.number().int().positive('Quantity must be positive'),
  movementType: z.enum(['IN', 'OUT'], { message: 'Invalid movement type' }),
  reason: z.string().trim().min(1, 'Reason is required'),
});
