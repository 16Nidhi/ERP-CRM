import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../../errors/httpError';
import { loginSchema } from './auth.schema';
import { loginWithEmailAndPassword } from './auth.service';

export async function loginController(request: Request, response: Response, next: NextFunction) {
  try {
    const parsedBody = loginSchema.safeParse(request.body);

    if (!parsedBody.success) {
      throw new HttpError(400, 'Invalid login payload', parsedBody.error.flatten());
    }

    const authResult = await loginWithEmailAndPassword(parsedBody.data.email, parsedBody.data.password);

    response.json({
      success: true,
      message: 'Login successful',
      data: authResult,
    });
  } catch (error) {
    next(error);
  }
}