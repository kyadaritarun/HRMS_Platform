import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './errorHandler.js';

export function tenantMatchMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  }

  // Super admin has platform-wide scope
  if (req.user.role === Role.PRODUCT_SUPER_ADMIN) {
    return next();
  }

  // Tenant users must have a company
  if (!req.user.companyId) {
    return next(new AppError(403, 'NO_COMPANY_ASSIGNED', 'User does not belong to any tenant company'));
  }

  // If company was resolved from host/header, verify company match
  if (req.company) {
    if (req.user.companyId !== req.company.id) {
      return next(new AppError(403, 'CROSS_TENANT_FORBIDDEN', 'Access across tenant boundaries is forbidden'));
    }

    if (!req.company.subIsActive) {
      return next(new AppError(403, 'SUBSCRIPTION_INACTIVE', 'Company subscription is inactive or expired'));
    }
  }

  next();
}
