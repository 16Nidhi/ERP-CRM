import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
import { HttpError } from '../../errors/httpError';
import type { AuthTokenPayload } from '../../types/auth';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return secret;
}

function getSaltRounds() {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '10');

  return Number.isFinite(saltRounds) && saltRounds > 0 ? saltRounds : 10;
}

export async function loginWithEmailAndPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const payload: AuthTokenPayload = {
    userId: user.id,
    role: user.role,
  };

  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, getSaltRounds());
}