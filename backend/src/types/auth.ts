import type { JwtPayload } from 'jsonwebtoken';
import type { Role } from './roles';

export interface AuthTokenPayload extends JwtPayload {
  userId: string;
  role: Role;
}

export interface AuthUser {
  id: string;
  role: Role;
}