import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';

export function policyComplianceMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.user && req.user.mustChangePassword) {
    const allowedPaths = ['/auth/change-password', '/auth/logout', '/api/v1/auth/change-password', '/api/v1/auth/logout'];
    const currentPath = req.baseUrl + req.path;

    const isAllowed = allowedPaths.some((p) => currentPath.endsWith(p) || req.path.includes('change-password') || req.path.includes('logout'));

    if (!isAllowed) {
      return next(
        new AppError(
          403,
          'PASSWORD_CHANGE_REQUIRED',
          'First login password change required. Please change your password before proceeding.'
        )
      );
    }
  }

  next();
}
