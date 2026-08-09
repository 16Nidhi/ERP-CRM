import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../errors/httpError';
import { addFollowUpSchema, createCustomerSchema, customerListQuerySchema, updateCustomerSchema } from './customer.schema';
import { addCustomerFollowUp, createCustomer, getCustomerDetail, listCustomers, updateCustomer } from './customer.service';

function parseId(request: Request) {
  const id = request.params.id;

  if (Array.isArray(id) || !id) {
    throw new HttpError(400, 'Customer id is required');
  }

  return id;
}

export async function createCustomerController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedBody = createCustomerSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Invalid customer payload', parsedBody.error.flatten());
    }

    const customer = await createCustomer(parsedBody.data);

    response.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function listCustomersController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedQuery = customerListQuerySchema.safeParse(request.query);

    if (!parsedQuery.success) {
      throw new HttpError(400, 'Invalid pagination query', parsedQuery.error.flatten());
    }

    const result = await listCustomers(parsedQuery.data);

    response.json({
      success: true,
      message: 'Customers retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerDetailController(request: Request, response: Response, next: NextFunction) {
  try {
    const customer = await getCustomerDetail(parseId(request));

    response.json({
      success: true,
      message: 'Customer retrieved successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomerController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedBody = updateCustomerSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Invalid customer payload', parsedBody.error.flatten());
    }

    const customer = await updateCustomer(parseId(request), parsedBody.data);

    response.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function addCustomerFollowUpController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedBody = addFollowUpSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Invalid follow-up payload', parsedBody.error.flatten());
    }

    if (!request.user) {
      throw new HttpError(401, 'Authentication required');
    }

    const followUp = await addCustomerFollowUp(parseId(request), request.user.id, parsedBody.data.note);

    response.status(201).json({
      success: true,
      message: 'Follow-up added successfully',
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
}
