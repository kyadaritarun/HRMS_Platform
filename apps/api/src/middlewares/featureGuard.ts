import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './errorHandler.js';
import prisma from '../lib/prisma.js';

export function featureGuard(featureKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (req.user.role === Role.PRODUCT_SUPER_ADMIN) {
      return next();
    }

    if (!req.company && req.user.companyId) {
      try {
        const comp = await prisma.company.findUnique({
          where: { id: req.user.companyId },
          include: { package: true },
        });
        if (comp) {
          req.company = comp as any;
        }
      } catch {
        // continue
      }
    }

    // If company does not have a package assigned, allow access by default
    if (req.company && !req.company.packageId) {
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
