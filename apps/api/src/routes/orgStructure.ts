import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// GET /org-structure
router.get('/', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;

    const [departments, users] = await Promise.all([
      prisma.department.findMany({
        where: { companyId },
        include: { children: true },
      }),
      prisma.user.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          jobTitle: true,
          managerId: true,
          departmentId: true,
          profilePhoto: true,
        },
      }),
    ]);

    // Build manager -> direct reports tree
    const userMap = new Map(users.map((u) => [u.id, { ...u, reports: [] as any[] }]));
    const rootLeaders: any[] = [];

    for (const u of users) {
      const node = userMap.get(u.id)!;
      if (u.managerId && userMap.has(u.managerId)) {
        userMap.get(u.managerId)!.reports.push(node);
      } else {
        rootLeaders.push(node);
      }
    }

    return res.json({
      departments,
      hierarchy: rootLeaders,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
