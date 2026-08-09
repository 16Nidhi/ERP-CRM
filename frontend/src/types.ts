export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
export type StockMovementType = 'IN' | 'OUT';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export type Paginated<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type Customer = {
  id: string;
  name: string;
  mobile: string;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  customerType: CustomerType;
  address?: string | null;
  status: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  followUps?: CustomerFollowUp[];
  _count?: { followUps: number };
};

export type CustomerFollowUp = {
  id: string;
  customerId: string;
  note: string;
  followUpAt: string;
  createdAt: string;
  createdBy?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: string | number;
  currentStock: number;
  minStockAlert: number;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
  lowStock?: boolean;
};

export type StockMovement = {
  id: string;
  productId: string;
  quantity: number;
  movementType: StockMovementType;
  reason: string;
  createdAt: string;
  createdBy?: Pick<User, 'id' | 'name' | 'role'>;
};

export type ChallanItem = {
  id: string;
  productId: string;
  quantity: number;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: string | number;
};

export type Challan = {
  id: string;
  challanNumber: string;
  customerId: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdById: string;
  createdAt: string;
  confirmedAt?: string | null;
  customer?: Partial<Customer>;
  createdBy?: Pick<User, 'id' | 'name' | 'email' | 'role'>;
  items?: ChallanItem[];
  _count?: { items: number };
};
