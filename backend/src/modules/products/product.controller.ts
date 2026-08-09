import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../errors/httpError';
import {
  createProductSchema,
  productListQuerySchema,
  recordStockMovementSchema,
  updateProductSchema,
} from './product.schema';
import {
  createProduct,
  getProductDetail,
  listProducts,
  listStockMovements,
  recordStockMovement,
  updateProduct,
} from './product.service';

function parseId(request: Request) {
  const id = request.params.id;

  if (Array.isArray(id) || !id) {
    throw new HttpError(400, 'Product id is required');
  }

  return id;
}

export async function createProductController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedBody = createProductSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Invalid product payload', parsedBody.error.flatten());
    }

    const product = await createProduct(parsedBody.data);

    response.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function listProductsController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedQuery = productListQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      throw new HttpError(400, 'Invalid query parameters', parsedQuery.error.flatten());
    }

    const result = await listProducts(parsedQuery.data);

    response.json({
      success: true,
      message: 'Products retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductDetailController(request: Request, response: Response, next: NextFunction) {
  try {
    const product = await getProductDetail(parseId(request));

    response.json({
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProductController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedBody = updateProductSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Invalid product payload', parsedBody.error.flatten());
    }

    const product = await updateProduct(parseId(request), parsedBody.data);

    response.json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

export async function recordStockMovementController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedBody = recordStockMovementSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Invalid stock movement payload', parsedBody.error.flatten());
    }

    if (!request.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const movement = await recordStockMovement({
      ...parsedBody.data,
      productId: parseId(request),
      createdById: request.user.id,
    });

    response.status(201).json({
      success: true,
      message: 'Stock movement recorded successfully',
      data: movement,
    });
  } catch (error) {
    next(error);
  }
}

export async function listStockMovementsController(request: Request, response: Response, next: NextFunction) {
  try {
    const productId = parseId(request);
    const page = parseInt(request.query.page as string) || 1;
    const limit = parseInt(request.query.limit as string) || 10;

    const result = await listStockMovements(productId, page, limit);

    response.json({
      success: true,
      message: 'Stock movements retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
