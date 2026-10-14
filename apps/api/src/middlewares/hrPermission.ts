import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './errorHandler.js';

export function hrPermission(key: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (req.user.role === Role.PRODUCT_SUPER_ADMIN || req.user.role === Role.COMPANY_ADMIN) {
      return next();
    }

    if (req.user.role === Role.HR) {
      const perms = req.user.hrPermissions as string[] | null | undefined;
      // null or empty array means full HR access
      if (!perms || !Array.isArray(perms) || perms.length === 0 || perms.includes(key)) {
        return next();
      }

      return next(
        new AppError(
          403,
          'HR_PERMISSION_DENIED',
          `You do not have permission '${key}' assigned to your HR role.`
        )
      );
    }

    return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
  };
}
