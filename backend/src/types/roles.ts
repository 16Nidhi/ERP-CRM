export const ROLES = ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] as const;

export type Role = (typeof ROLES)[number];