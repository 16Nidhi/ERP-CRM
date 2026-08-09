import prisma from '../../lib/prisma';
import { HttpError } from '../../errors/httpError';
import type { CustomerStatus, CustomerType } from '../../types/customer';

type CreateCustomerInput = {
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  customerType: CustomerType;
  address?: string;
  status?: CustomerStatus;
  followUpDate?: Date;
  notes?: string;
};

type UpdateCustomerInput = Partial<CreateCustomerInput>;

type ListCustomersInput = {
  page: number;
  limit: number;
  search: string;
};

function buildSearchFilter(search: string) {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { name: { contains: search } },
      { mobile: { contains: search } },
      { businessName: { contains: search } },
    ],
  };
}

export async function createCustomer(data: CreateCustomerInput) {
  return prisma.customer.create({
    data: {
      ...data,
      email: data.email ?? null,
      businessName: data.businessName ?? null,
      gstNumber: data.gstNumber ?? null,
      address: data.address ?? null,
      followUpDate: data.followUpDate ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function listCustomers({ page, limit, search }: ListCustomersInput) {
  const where = buildSearchFilter(search);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        businessName: true,
        gstNumber: true,
        customerType: true,
        address: true,
        status: true,
        followUpDate: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            followUps: true,
          },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getCustomerDetail(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      followUps: {
        orderBy: { followUpAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!customer) {
    throw new HttpError(404, 'Customer not found');
  }

  return customer;
}

export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  await getCustomerDetail(id);

  return prisma.customer.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.mobile !== undefined ? { mobile: data.mobile } : {}),
      ...(data.email !== undefined ? { email: data.email ?? null } : {}),
      ...(data.businessName !== undefined ? { businessName: data.businessName ?? null } : {}),
      ...(data.gstNumber !== undefined ? { gstNumber: data.gstNumber ?? null } : {}),
      ...(data.customerType !== undefined ? { customerType: data.customerType } : {}),
      ...(data.address !== undefined ? { address: data.address ?? null } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.followUpDate !== undefined ? { followUpDate: data.followUpDate ?? null } : {}),
      ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
    },
  });
}

export async function addCustomerFollowUp(customerId: string, createdById: string, note: string) {
  await getCustomerDetail(customerId);

  return prisma.customerFollowUp.create({
    data: {
      customerId,
      createdById,
      note,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
