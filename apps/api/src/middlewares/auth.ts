import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { AppError } from './errorHandler.js';
import { User, Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'uptrix-secret-jwt-key-2026-super-secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'uptrix-secret-jwt-refresh-key-2026-super-secure';

export interface TokenPayload {
  userId: number;
  email: string;
  role: Role;
  companyId: number | null;
}

export function generateTokens(user: { id: number; email: string; role: Role; companyId: number | null }) {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    let token: string | undefined = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication token required'));
    }

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (jwtErr: any) {
      return next(new AppError(401, 'TOKEN_EXPIRED_OR_INVALID', 'Token is invalid or expired', jwtErr.message));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        _count: {
          select: { reports: true },
        },
      },
    });

    if (!user || !user.isActive) {
      return next(new AppError(401, 'USER_INACTIVE_OR_NOT_FOUND', 'User account is not found or inactive'));
    }

    const { passwordHash, _count, ...userWithoutPassword } = user;
    req.user = {
      ...userWithoutPassword,
      isManager: _count.reports > 0,
    };

    next();
  } catch (error) {
    next(error);
  }
}
