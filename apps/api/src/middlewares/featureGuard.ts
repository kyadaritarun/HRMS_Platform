import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './errorHandler.js';

export function featureGuard(featureKey: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (req.user.role === Role.PRODUCT_SUPER_ADMIN) {
      return next();
    }

    const enabledFeatures = (req.company?.package?.enabledFeatures as string[]) || [];

    if (!enabledFeatures.includes(featureKey)) {
      return next(
        new AppError(
          403,
          'FEATURE_LOCKED',
          `The feature '${featureKey}' is not included in your current subscription tier.`
        )
      );
    }

    next();
  };
}
