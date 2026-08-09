import { z } from 'zod';

export const CHALLAN_STATUSES = ['DRAFT', 'CONFIRMED', 'CANCELLED'] as const;

export const createChallanSchema = z.object({
  customerId: z.string().trim().min(1, 'Customer id is required'),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1, 'Product id is required'),
        quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
      }),
    )
    .min(1, 'At least one item is required'),
});

export const challanListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  status: z.enum(CHALLAN_STATUSES, { message: 'Please choose a valid challan status' }).optional(),
  search: z.string().trim().optional().default(''),
});
