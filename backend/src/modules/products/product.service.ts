import prisma from '../../lib/prisma';
import { HttpError } from '../../errors/httpError';
import type { Prisma } from '@prisma/client';

type CreateProductInput = {
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location?: string | null;
};

type UpdateProductInput = Partial<CreateProductInput>;

type ListProductsInput = {
  page: number;
  limit: number;
  search: string;
};

type RecordStockMovementInput = {
  productId: string;
  quantity: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdById: string;
};

function buildSearchFilter(search: string) {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { name: { contains: search } },
      { sku: { contains: search } },
      { category: { contains: search } },
    ],
  };
}

export async function createProduct(data: CreateProductInput) {
  const existingProduct = await prisma.product.findUnique({
    where: { sku: data.sku },
  });

  if (existingProduct) {
    throw new HttpError(400, `Product with SKU ${data.sku} already exists`);
  }

  return prisma.product.create({
    data,
  });
}

export async function listProducts({ page, limit, search }: ListProductsInput) {
  const where = buildSearchFilter(search);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  const itemsWithAlert = items.map((product: any) => ({
    ...product,
    lowStock: product.currentStock <= product.minStockAlert,
  }));

  return {
    items: itemsWithAlert,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductDetail(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  return {
    ...product,
    lowStock: product.currentStock <= product.minStockAlert,
  };
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new HttpError(404, 'Product not found');
  }

  if (data.sku && data.sku !== product.sku) {
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existingProduct) {
      throw new HttpError(400, `Product with SKU ${data.sku} already exists`);
    }
  }

  return prisma.product.update({
    where: { id },
    data,
  });
}

export async function recordStockMovement(data: RecordStockMovementInput) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const product = await tx.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      throw new HttpError(404, 'Product not found');
    }

    let newStock = product.currentStock;
    if (data.movementType === 'IN') {
      newStock += data.quantity;
    } else {
      newStock -= data.quantity;
    }

    if (newStock < 0) {
      throw new HttpError(400, `Insufficient stock. Current: ${product.currentStock}, Requested: ${data.quantity}`);
    }

    // Update product stock
    await tx.product.update({
      where: { id: data.productId },
      data: { currentStock: newStock },
    });

    // Record movement
    return tx.stockMovement.create({
      data: {
        productId: data.productId,
        quantity: data.quantity,
        movementType: data.movementType,
        reason: data.reason,
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  });
}

export async function listStockMovements(productId: string, page: number, limit: number) {
  await getProductDetail(productId);

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    }),
    prisma.stockMovement.count({
      where: { productId },
    }),
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
