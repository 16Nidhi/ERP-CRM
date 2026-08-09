import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../errors/httpError';
import { challanListQuerySchema, createChallanSchema } from './challan.schema';
import { cancelChallan, confirmChallan, createChallan, getChallanDetail, listChallans } from './challan.service';

function parseId(request: Request) {
  const id = request.params.id;

  if (Array.isArray(id) || !id) {
    throw new HttpError(400, 'Challan id is required');
  }

  return id;
}

export async function createChallanController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedBody = createChallanSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Invalid challan payload', parsedBody.error.flatten());
    }

    if (!request.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const challan = await createChallan({
      ...parsedBody.data,
      createdById: request.user.id,
    });

    response.status(201).json({
      success: true,
      message: 'Challan created successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
}

export async function listChallansController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedQuery = challanListQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      throw new HttpError(400, 'Invalid query parameters', parsedQuery.error.flatten());
    }

    const result = await listChallans(parsedQuery.data);

    response.json({
      success: true,
      message: 'Challans retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getChallanDetailController(request: Request, response: Response, next: NextFunction) {
  try {
    const challan = await getChallanDetail(parseId(request));

    response.json({
      success: true,
      message: 'Challan retrieved successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmChallanController(request: Request, response: Response, next: NextFunction) {
  try {
    if (!request.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const challan = await confirmChallan(parseId(request), request.user.id);

    response.json({
      success: true,
      message: 'Challan confirmed successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelChallanController(request: Request, response: Response, next: NextFunction) {
  try {
    const challan = await cancelChallan(parseId(request));

    response.json({
      success: true,
      message: 'Challan cancelled successfully',
      data: challan,
    });
  } catch (error) {
    next(error);
  }
}
