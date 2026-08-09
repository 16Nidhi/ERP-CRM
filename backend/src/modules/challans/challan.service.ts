import type { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { HttpError } from '../../errors/httpError';
import type { CHALLAN_STATUSES } from './challan.schema';

type ChallanStatus = (typeof CHALLAN_STATUSES)[number];

type CreateChallanInput = {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  createdById: string;
};

type ListChallansInput = {
  page: number;
  limit: number;
  status?: ChallanStatus;
  search: string;
};

function buildSearchFilter(search: string) {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { challanNumber: { contains: search } },
      {
        customer: {
          name: { contains: search },
        },
      },
    ],
  };
}

function getSnapshotInclude() {
  return {
    customer: {
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
      },
    },
    createdBy: {
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    },
    items: {
      select: {
        id: true,
        productId: true,
        quantity: true,
        productNameSnapshot: true,
        skuSnapshot: true,
        unitPriceSnapshot: true,
      },
    },
  } satisfies Prisma.ChallanInclude;
}

async function generateChallanNumber(tx: Prisma.TransactionClient) {
  const challans = await tx.challan.findMany({
    select: { challanNumber: true },
  });

  const maxNumber = challans.reduce((max, challan) => {
    const match = /^CH-(\d+)$/.exec(challan.challanNumber);

    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 0);

  return `CH-${String(maxNumber + 1).padStart(4, '0')}`;
}

export async function createChallan(data: CreateChallanInput) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const customer = await tx.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new HttpError(404, 'Customer not found');
    }

    const productIds = data.items.map((item) => item.productId);
    const products = await tx.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    const productsById = new Map(products.map((product) => [product.id, product]));

    for (const item of data.items) {
      if (!productsById.has(item.productId)) {
        throw new HttpError(404, `Product not found: ${item.productId}`);
      }
    }

    const totalQuantity = data.items.reduce((total, item) => total + item.quantity, 0);
    const challanNumber = await generateChallanNumber(tx);

    return tx.challan.create({
      data: {
        challanNumber,
        customerId: data.customerId,
        createdById: data.createdById,
        totalQuantity,
        status: 'DRAFT',
        items: {
          create: data.items.map((item) => {
            const product = productsById.get(item.productId);

            if (!product) {
              throw new HttpError(404, `Product not found: ${item.productId}`);
            }

            return {
              productId: item.productId,
              quantity: item.quantity,
              productNameSnapshot: product.name,
              skuSnapshot: product.sku,
              unitPriceSnapshot: product.unitPrice,
            };
          }),
        },
      },
      include: getSnapshotInclude(),
    });
  });
}

export async function listChallans({ page, limit, status, search }: ListChallansInput) {
  const searchFilter = buildSearchFilter(search);
  const where = {
    ...(status ? { status } : {}),
    ...(searchFilter ? searchFilter : {}),
  };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            businessName: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    }),
    prisma.challan.count({ where }),
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

export async function getChallanDetail(id: string) {
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: getSnapshotInclude(),
  });

  if (!challan) {
    throw new HttpError(404, 'Challan not found');
  }

  return challan;
}

export async function confirmChallan(id: string, confirmedById: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const challan = await tx.challan.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!challan) {
      throw new HttpError(404, 'Challan not found');
    }

    if (challan.status === 'CONFIRMED') {
      throw new HttpError(400, 'Challan is already confirmed');
    }

    if (challan.status === 'CANCELLED') {
      throw new HttpError(400, 'Cancelled challans cannot be confirmed');
    }

    const productIds = challan.items.map((item) => item.productId);
    const products = await tx.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    for (const item of challan.items) {
      const product = productsById.get(item.productId);

      if (!product) {
        throw new HttpError(404, `Product not found: ${item.productId}`);
      }

      if (product.currentStock < item.quantity) {
        throw new HttpError(
          400,
          `Cannot confirm: ${item.productNameSnapshot} requires ${item.quantity} units, only ${product.currentStock} available`,
        );
      }
    }

    for (const item of challan.items) {
      const updatedProduct = await tx.product.updateMany({
        where: {
          id: item.productId,
          currentStock: {
            gte: item.quantity,
          },
        },
        data: {
          currentStock: {
            decrement: item.quantity,
          },
        },
      });

      if (updatedProduct.count !== 1) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        const available = product?.currentStock ?? 0;

        throw new HttpError(
          400,
          `Cannot confirm: ${item.productNameSnapshot} requires ${item.quantity} units, only ${available} available`,
        );
      }

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          movementType: 'OUT',
          reason: 'Challan confirmed',
          createdById: confirmedById,
        },
      });
    }

    return tx.challan.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      include: getSnapshotInclude(),
    });
  });
}

export async function cancelChallan(id: string) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const challan = await tx.challan.findUnique({
      where: { id },
    });

    if (!challan) {
      throw new HttpError(404, 'Challan not found');
    }

    if (challan.status === 'CONFIRMED') {
      throw new HttpError(400, 'Confirmed challans cannot be cancelled');
    }

    if (challan.status === 'CANCELLED') {
      throw new HttpError(400, 'Challan is already cancelled');
    }

    return tx.challan.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
      include: getSnapshotInclude(),
    });
  });
}
