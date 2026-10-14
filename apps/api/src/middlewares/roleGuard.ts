import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './errorHandler.js';

export function roleGuard(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    // Super admin bypasses company-level role checks
    if (req.user.role === Role.PRODUCT_SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN_ROLE',
          `Access forbidden for role ${req.user.role}. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
