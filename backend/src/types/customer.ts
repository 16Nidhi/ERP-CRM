export const CUSTOMER_TYPES = ['RETAIL', 'WHOLESALE', 'DISTRIBUTOR'] as const;
export const CUSTOMER_STATUSES = ['LEAD', 'ACTIVE', 'INACTIVE'] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];