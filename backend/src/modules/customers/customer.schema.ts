import { z } from 'zod';
import { CUSTOMER_STATUSES, CUSTOMER_TYPES } from '../../types/customer';

const nullableText = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const optionalDateTime = z
  .union([z.string().datetime({ message: 'Please provide a valid ISO date-time string' }), z.date()])
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) {
      return undefined;
    }

    return value instanceof Date ? value : new Date(value);
  });

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  mobile: z.string().trim().min(1, 'Mobile number is required'),
  email: z.string().trim().email('Please provide a valid email address').optional().or(z.literal('')).transform((value) => (value ? value : undefined)),
  businessName: nullableText,
  gstNumber: nullableText,
  customerType: z.enum(CUSTOMER_TYPES, { message: 'Please choose a valid customer type' }),
  address: nullableText,
  status: z.enum(CUSTOMER_STATUSES, { message: 'Please choose a valid customer status' }).optional().default('LEAD'),
  followUpDate: optionalDateTime,
  notes: nullableText,
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional().default(''),
});

export const addFollowUpSchema = z.object({
  note: z.string().trim().min(1, 'Follow-up note is required'),
});
