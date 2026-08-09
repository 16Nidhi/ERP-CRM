import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../errors/httpError';
import type { AuthTokenPayload } from '../types/auth';
import type { Role } from '../types/roles';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return secret;
}

export function authenticateRequest(request: Request, _response: Response, next: NextFunction) {
  const authorizationHeader = request.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    next(new HttpError(401, 'Missing authorization token'));
    return;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();

  if (!token) {
    next(new HttpError(401, 'Missing authorization token'));
    return;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;

    if (!decoded.userId || !decoded.role) {
      next(new HttpError(401, 'Invalid authorization token'));
      return;
    }

    request.user = { id: decoded.userId, role: decoded.role };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired authorization token'));
  }
}

export function requireRole(...allowedRoles: Role[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      next(new HttpError(401, 'Authentication required'));
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      next(new HttpError(403, 'You do not have access to this resource'));
      return;
    }

    next();
  };
}