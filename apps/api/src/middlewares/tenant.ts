import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AppError } from './errorHandler.js';

const RESERVED_SUBDOMAINS = ['app', 'api', 'admin', 'www', 'hrms', 'hrms_server', 'hrms-server', 'server'];

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const hostHeader = req.headers.host || '';
    const hostWithoutPort = hostHeader.split(':')[0].toLowerCase();

    // Direct header override (for testing or API clients)
    const headerSubdomain = req.headers['x-company-subdomain'] as string | undefined;
    const headerCompanyId = req.headers['x-company-id'] ? Number(req.headers['x-company-id']) : undefined;

    let subdomain: string | null = null;
    let customDomain: string | null = null;

    if (headerSubdomain) {
      subdomain = headerSubdomain;
    } else if (headerCompanyId && !isNaN(headerCompanyId)) {
      // Will resolve directly by ID below
    } else {
      const parts = hostWithoutPort.split('.');
      if (parts.length >= 3) {
        const potentialSub = parts[0];
        if (!RESERVED_SUBDOMAINS.includes(potentialSub)) {
          subdomain = potentialSub;
        }
      } else if (parts.length === 2 && !['localhost', 'example'].includes(parts[1])) {
        customDomain = hostWithoutPort;
      }
    }

    if (headerCompanyId) {
      const company = await prisma.company.findUnique({
        where: { id: headerCompanyId },
        include: { package: true },
      });
      if (company) {
        req.company = company as any;
        return next();
      }
    }

    if (subdomain) {
      const company = await prisma.company.findUnique({
        where: { subdomain },
        include: { package: true },
      });

      if (company) {
        if (!company.isActive) {
          return next(new AppError(403, 'COMPANY_INACTIVE', 'Company tenant is inactive.'));
        }
        req.company = company as any;
        return next();
      }
    } else if (customDomain) {
      const company = await prisma.company.findUnique({
        where: { customDomain },
        include: { package: true },
      });

      if (company) {
        if (!company.isActive) {
          return next(new AppError(403, 'COMPANY_INACTIVE', 'Company tenant is inactive.'));
        }
        req.company = company as any;
        return next();
      }
    }

    // If host has no company resolved, leave req.company undefined (e.g. for superadmin routes or public routes)
    next();
  } catch (error) {
    next(error);
  }
}
