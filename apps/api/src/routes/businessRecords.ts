import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { roleGuard } from '../middlewares/roleGuard.js';
import { AppError } from '../middlewares/errorHandler.js';

export const businessCompanyRouter = Router();
export const businessPayrollRouter = Router();

// Apply security middlewares
businessCompanyRouter.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);
businessPayrollRouter.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// ============================================================================
// 1. OFFER LETTERS
// ============================================================================

// GET /api/v1/company/offer-letters
businessCompanyRouter.get('/offer-letters', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { status, search } = req.query;

    const where: any = { companyId };
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { candidateName: { contains: q, mode: 'insensitive' } },
        { candidateEmail: { contains: q, mode: 'insensitive' } },
        { jobTitle: { contains: q, mode: 'insensitive' } },
        { letterCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const offerLetters = await prisma.offerLetter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      offerLetters: offerLetters.map((ol) => ({
        id: ol.letterCode || `OL-${ol.id}`,
        dbId: ol.id,
        candidateName: ol.candidateName,
        candidateEmail: ol.candidateEmail,
        candidatePhone: ol.candidatePhone,
        jobTitle: ol.jobTitle,
        department: ol.department,
        annualCtc: Number(ol.annualCtc),
        monthlySalary: Number(ol.monthlySalary),
        joiningDate: ol.joiningDate ? ol.joiningDate.toISOString().split('T')[0] : '',
        status: ol.status,
        createdAt: ol.createdAt.toISOString().split('T')[0],
        terms: ol.terms,
        breakdown: ol.breakdown,
        customComponents: ol.customComponents,
        attachedFiles: ol.attachedFiles,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/company/offer-letters
businessCompanyRouter.post('/offer-letters', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const {
      candidateName,
      candidateEmail,
      candidatePhone,
      jobTitle,
      department,
      annualCtc,
      monthlySalary,
      joiningDate,
      status,
      terms,
      breakdown,
      customComponents,
      attachedFiles,
    } = req.body;

    if (!candidateName || !candidateEmail || !jobTitle) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'candidateName, candidateEmail, and jobTitle are required'));
    }

    const count = await prisma.offerLetter.count({ where: { companyId } });
    const letterCode = `OL-${new Date().getFullYear()}-${String(count + 101).padStart(3, '0')}`;

    const created = await prisma.offerLetter.create({
      data: {
        letterCode,
        companyId,
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim().toLowerCase(),
        candidatePhone: candidatePhone || '',
        jobTitle: jobTitle.trim(),
        department: department || '',
        annualCtc: Number(annualCtc) || 0,
        monthlySalary: Number(monthlySalary) || 0,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        status: status || 'DRAFT',
        terms: terms || {},
        breakdown: breakdown || {},
        customComponents: customComponents || [],
        attachedFiles: attachedFiles || [],
      },
    });

    return res.status(201).json({
      success: true,
      offerLetter: {
        id: created.letterCode,
        dbId: created.id,
        candidateName: created.candidateName,
        candidateEmail: created.candidateEmail,
        candidatePhone: created.candidatePhone,
        jobTitle: created.jobTitle,
        department: created.department,
        annualCtc: Number(created.annualCtc),
        monthlySalary: Number(created.monthlySalary),
        joiningDate: created.joiningDate ? created.joiningDate.toISOString().split('T')[0] : '',
        status: created.status,
        createdAt: created.createdAt.toISOString().split('T')[0],
        terms: created.terms,
        breakdown: created.breakdown,
        customComponents: created.customComponents,
        attachedFiles: created.attachedFiles,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/company/offer-letters/:id/status
businessCompanyRouter.patch('/offer-letters/:id/status', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const idParam = req.params.id;
    const { status } = req.body;

    const existing = await prisma.offerLetter.findFirst({
      where: {
        companyId,
        OR: [
          { letterCode: idParam },
          ...(isNaN(Number(idParam)) ? [] : [{ id: Number(idParam) }]),
        ],
      },
    });

    if (!existing) {
      return next(new AppError(404, 'NOT_FOUND', 'Offer letter not found'));
    }

    const updated = await prisma.offerLetter.update({
      where: { id: existing.id },
      data: { status },
    });

    return res.json({ success: true, offerLetter: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/company/offer-letters/:id
businessCompanyRouter.delete('/offer-letters/:id', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const idParam = req.params.id;

    const existing = await prisma.offerLetter.findFirst({
      where: {
        companyId,
        OR: [
          { letterCode: idParam },
          ...(isNaN(Number(idParam)) ? [] : [{ id: Number(idParam) }]),
        ],
      },
    });

    if (!existing) {
      return next(new AppError(404, 'NOT_FOUND', 'Offer letter not found'));
    }

    await prisma.offerLetter.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: 'Offer letter deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 2. EXIT MANAGEMENT & NOC CLEARANCE
// ============================================================================

// GET /api/v1/company/exit-management
businessCompanyRouter.get('/exit-management', roleGuard('COMPANY_ADMIN', 'HR', 'FINANCE', 'IT'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { status, search } = req.query;

    const where: any = { companyId };
    if (status && status !== 'ALL') {
      where.status = String(status);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { employeeName: { contains: q, mode: 'insensitive' } },
        { employeeEmail: { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
        { exitCode: { contains: q, mode: 'insensitive' } },
      ];
    }

    const exits = await prisma.exitRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      exitRecords: exits.map((ex) => ({
        id: ex.exitCode || `EXIT-${ex.id}`,
        dbId: ex.id,
        employeeId: ex.employeeId,
        employeeName: ex.employeeName,
        employeeEmail: ex.employeeEmail,
        department: ex.department,
        jobTitle: ex.jobTitle,
        joiningDate: ex.joiningDate ? ex.joiningDate.toISOString().split('T')[0] : '',
        resignationDate: ex.resignationDate ? ex.resignationDate.toISOString().split('T')[0] : '',
        noticePeriodDays: ex.noticePeriodDays,
        lastWorkingDay: ex.lastWorkingDay ? ex.lastWorkingDay.toISOString().split('T')[0] : '',
        reason: ex.reason,
        status: ex.status,
        monthlySalary: Number(ex.monthlySalary),
        leaveBalanceDays: Number(ex.leaveBalanceDays),
        nocClearance: ex.nocClearance,
        ffSettlement: ex.ffSettlement,
        createdAt: ex.createdAt.toISOString().split('T')[0],
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/company/exit-management
businessCompanyRouter.post('/exit-management', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const {
      employeeId,
      employeeName,
      employeeEmail,
      department,
      jobTitle,
      joiningDate,
      resignationDate,
      noticePeriodDays,
      lastWorkingDay,
      reason,
      status,
      monthlySalary,
      leaveBalanceDays,
      nocClearance,
      ffSettlement,
    } = req.body;

    if (!employeeId || !employeeName) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'employeeId and employeeName are required'));
    }

    const count = await prisma.exitRecord.count({ where: { companyId } });
    const exitCode = `EXIT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const created = await prisma.exitRecord.create({
      data: {
        exitCode,
        companyId,
        employeeId: Number(employeeId),
        employeeName: employeeName.trim(),
        employeeEmail: employeeEmail || '',
        department: department || '',
        jobTitle: jobTitle || '',
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        resignationDate: resignationDate ? new Date(resignationDate) : new Date(),
        noticePeriodDays: Number(noticePeriodDays) || 30,
        lastWorkingDay: lastWorkingDay ? new Date(lastWorkingDay) : null,
        reason: reason || '',
        status: status || 'RESIGNED',
        monthlySalary: Number(monthlySalary) || 0,
        leaveBalanceDays: Number(leaveBalanceDays) || 0,
        nocClearance: nocClearance || {
          it: { cleared: false, remarks: '' },
          admin: { cleared: false, remarks: '' },
          finance: { cleared: false, remarks: '' },
          hr: { cleared: false, remarks: '' },
        },
        ffSettlement: ffSettlement || {},
      },
    });

    return res.status(201).json({
      success: true,
      exitRecord: {
        id: created.exitCode,
        dbId: created.id,
        employeeId: created.employeeId,
        employeeName: created.employeeName,
        employeeEmail: created.employeeEmail,
        department: created.department,
        jobTitle: created.jobTitle,
        joiningDate: created.joiningDate ? created.joiningDate.toISOString().split('T')[0] : '',
        resignationDate: created.resignationDate ? created.resignationDate.toISOString().split('T')[0] : '',
        noticePeriodDays: created.noticePeriodDays,
        lastWorkingDay: created.lastWorkingDay ? created.lastWorkingDay.toISOString().split('T')[0] : '',
        reason: created.reason,
        status: created.status,
        monthlySalary: Number(created.monthlySalary),
        leaveBalanceDays: Number(created.leaveBalanceDays),
        nocClearance: created.nocClearance,
        ffSettlement: created.ffSettlement,
        createdAt: created.createdAt.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/company/exit-management/:id
businessCompanyRouter.patch('/exit-management/:id', roleGuard('COMPANY_ADMIN', 'HR', 'FINANCE', 'IT'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const idParam = req.params.id;

    const existing = await prisma.exitRecord.findFirst({
      where: {
        companyId,
        OR: [
          { exitCode: idParam },
          ...(isNaN(Number(idParam)) ? [] : [{ id: Number(idParam) }]),
        ],
      },
    });

    if (!existing) {
      return next(new AppError(404, 'NOT_FOUND', 'Exit record not found'));
    }

    const { status, nocClearance, ffSettlement, lastWorkingDay, reason } = req.body;
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (nocClearance !== undefined) updateData.nocClearance = nocClearance;
    if (ffSettlement !== undefined) updateData.ffSettlement = ffSettlement;
    if (lastWorkingDay !== undefined) updateData.lastWorkingDay = lastWorkingDay ? new Date(lastWorkingDay) : null;
    if (reason !== undefined) updateData.reason = reason;

    const updated = await prisma.exitRecord.update({
      where: { id: existing.id },
      data: updateData,
    });

    return res.json({ success: true, exitRecord: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/company/exit-management/:id
businessCompanyRouter.delete('/exit-management/:id', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const idParam = req.params.id;

    const existing = await prisma.exitRecord.findFirst({
      where: {
        companyId,
        OR: [
          { exitCode: idParam },
          ...(isNaN(Number(idParam)) ? [] : [{ id: Number(idParam) }]),
        ],
      },
    });

    if (!existing) {
      return next(new AppError(404, 'NOT_FOUND', 'Exit record not found'));
    }

    await prisma.exitRecord.delete({ where: { id: existing.id } });
    return res.json({ success: true, message: 'Exit record deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 3. COMPANY ASSET REGISTRY & ONBOARDING CHECKLISTS
// ============================================================================

// GET /api/v1/company/assets
businessCompanyRouter.get('/assets', roleGuard('COMPANY_ADMIN', 'HR', 'IT'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const assets = await prisma.companyAsset.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      assets: assets.map((a) => ({
        id: `ast-${a.id}`,
        dbId: a.id,
        tag: a.tag,
        name: a.name,
        category: a.category,
        serialNumber: a.serialNumber,
        assignedToEmployeeId: a.assignedToEmployeeId,
        assignedToName: a.assignedToName,
        assignedDate: a.assignedDate ? a.assignedDate.toISOString().split('T')[0] : '',
        condition: a.condition,
        status: a.status,
        notes: a.notes,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/company/assets
businessCompanyRouter.post('/assets', roleGuard('COMPANY_ADMIN', 'HR', 'IT'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const {
      tag,
      name,
      category,
      serialNumber,
      assignedToEmployeeId,
      assignedToName,
      assignedDate,
      condition,
      status,
      notes,
    } = req.body;

    if (!name || !category) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'name and category are required'));
    }

    let assetTag = tag?.trim();
    if (!assetTag) {
      const count = await prisma.companyAsset.count({ where: { companyId } });
      const prefix = category.substring(0, 3).toUpperCase();
      assetTag = `AST-${prefix}-${String(count + 101).padStart(3, '0')}`;
    }

    const created = await prisma.companyAsset.create({
      data: {
        companyId,
        tag: assetTag,
        name: name.trim(),
        category: category.toUpperCase(),
        serialNumber: serialNumber || '',
        assignedToEmployeeId: assignedToEmployeeId ? Number(assignedToEmployeeId) : null,
        assignedToName: assignedToName || null,
        assignedDate: assignedDate ? new Date(assignedDate) : null,
        condition: condition || 'NEW',
        status: status || (assignedToEmployeeId ? 'ASSIGNED' : 'IN_STOCK'),
        notes: notes || '',
      },
    });

    return res.status(201).json({
      success: true,
      asset: {
        id: `ast-${created.id}`,
        dbId: created.id,
        tag: created.tag,
        name: created.name,
        category: created.category,
        serialNumber: created.serialNumber,
        assignedToEmployeeId: created.assignedToEmployeeId,
        assignedToName: created.assignedToName,
        assignedDate: created.assignedDate ? created.assignedDate.toISOString().split('T')[0] : '',
        condition: created.condition,
        status: created.status,
        notes: created.notes,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/company/assets/:id
businessCompanyRouter.patch('/assets/:id', roleGuard('COMPANY_ADMIN', 'HR', 'IT'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const rawId = req.params.id.replace(/^ast-/, '');
    const numId = Number(rawId);

    if (isNaN(numId)) {
      return next(new AppError(400, 'INVALID_ID', 'Invalid asset ID'));
    }

    const {
      tag,
      name,
      category,
      serialNumber,
      assignedToEmployeeId,
      assignedToName,
      assignedDate,
      condition,
      status,
      notes,
    } = req.body;

    const updated = await prisma.companyAsset.update({
      where: { id: numId },
      data: {
        ...(tag && { tag: tag.trim() }),
        ...(name && { name: name.trim() }),
        ...(category && { category: category.toUpperCase() }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(assignedToEmployeeId !== undefined && { assignedToEmployeeId: assignedToEmployeeId ? Number(assignedToEmployeeId) : null }),
        ...(assignedToName !== undefined && { assignedToName }),
        ...(assignedDate !== undefined && { assignedDate: assignedDate ? new Date(assignedDate) : null }),
        ...(condition && { condition }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    return res.json({ success: true, asset: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/company/assets/:id
businessCompanyRouter.delete('/assets/:id', roleGuard('COMPANY_ADMIN', 'HR', 'IT'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const rawId = req.params.id.replace(/^ast-/, '');
    const numId = Number(rawId);

    await prisma.companyAsset.deleteMany({ where: { id: numId, companyId } });
    return res.json({ success: true, message: 'Asset deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/company/onboarding-progress
businessCompanyRouter.get('/onboarding-progress', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const [records, company] = await Promise.all([
      prisma.onboardingProgress.findMany({ where: { companyId } }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
      }),
    ]);

    const progressMap: Record<string, boolean> = {};
    for (const r of records) {
      progressMap[`${r.employeeId}_${r.taskId}`] = r.completed;
    }

    const companySettings = (company?.settings as any) || {};
    const tasks = companySettings.onboardingTasks || null;

    return res.json({ success: true, progressMap, records, tasks });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/company/onboarding-tasks
businessCompanyRouter.get('/onboarding-tasks', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const settings = (company?.settings as any) || {};
    return res.json({ success: true, tasks: settings.onboardingTasks || [] });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/company/onboarding-tasks
businessCompanyRouter.put('/onboarding-tasks', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { tasks } = req.body;

    if (!Array.isArray(tasks)) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'tasks must be an array'));
    }

    const sanitizedTasks = tasks
      .map((t: any, idx: number) => ({
        id: String(t.id || `task_${Date.now()}_${idx}`),
        title: String(t.title || '').trim(),
        description: String(t.description || '').trim(),
        category: ['IT', 'HR', 'FINANCE', 'FACILITIES', 'GENERAL'].includes(t.category)
          ? t.category
          : 'HR',
      }))
      .filter((t: any) => t.title.length > 0);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true },
    });
    const currentSettings = (company?.settings && typeof company.settings === 'object' ? company.settings : {}) as any;
    currentSettings.onboardingTasks = sanitizedTasks;

    await prisma.company.update({
      where: { id: companyId },
      data: { settings: currentSettings },
    });

    return res.json({ success: true, tasks: sanitizedTasks });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/company/onboarding-progress/toggle
businessCompanyRouter.post('/onboarding-progress/toggle', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { employeeId, taskId, completed, notes } = req.body;

    if (!employeeId || !taskId) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'employeeId and taskId are required'));
    }

    const empId = Number(employeeId);
    const isCompleted = Boolean(completed);

    const record = await prisma.onboardingProgress.upsert({
      where: {
        companyId_employeeId_taskId: {
          companyId,
          employeeId: empId,
          taskId: String(taskId),
        },
      },
      update: {
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedBy: isCompleted ? `${req.user!.firstName || req.user!.username}` : null,
        ...(notes && { notes }),
      },
      create: {
        companyId,
        employeeId: empId,
        taskId: String(taskId),
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : null,
        completedBy: isCompleted ? `${req.user!.firstName || req.user!.username}` : null,
        notes: notes || '',
      },
    });

    return res.json({ success: true, record });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 4. HR ISSUED LETTERS
// ============================================================================

// GET /api/v1/company/hr-letters
businessCompanyRouter.get('/hr-letters', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const letters = await prisma.hrLetter.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      issuedLetters: letters.map((l) => ({
        id: l.letterCode || `LTR-${l.id}`,
        dbId: l.id,
        type: l.type,
        employeeName: l.employeeName,
        employeeId: l.employeeId,
        designation: l.designation,
        department: l.department,
        issueDate: l.issueDate ? l.issueDate.toISOString().split('T')[0] : '',
        referenceNumber: l.referenceNumber,
        contentSnapshot: l.contentSnapshot,
        signatoryName: l.signatoryName,
        signatoryDesignation: l.signatoryDesignation,
        createdAt: l.createdAt.toISOString().split('T')[0],
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/company/hr-letters
businessCompanyRouter.post('/hr-letters', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const {
      type,
      employeeName,
      employeeId,
      designation,
      department,
      issueDate,
      referenceNumber,
      contentSnapshot,
      signatoryName,
      signatoryDesignation,
    } = req.body;

    if (!type || !employeeName) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'type and employeeName are required'));
    }

    const count = await prisma.hrLetter.count({ where: { companyId } });
    const letterCode = `LTR-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const created = await prisma.hrLetter.create({
      data: {
        letterCode,
        companyId,
        type,
        employeeName: employeeName.trim(),
        employeeId: employeeId ? String(employeeId) : '',
        designation: designation || '',
        department: department || '',
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        referenceNumber: referenceNumber || `UPTX/HR/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
        contentSnapshot: contentSnapshot || {},
        signatoryName: signatoryName || '',
        signatoryDesignation: signatoryDesignation || '',
      },
    });

    return res.status(201).json({
      success: true,
      issuedLetter: {
        id: created.letterCode,
        dbId: created.id,
        type: created.type,
        employeeName: created.employeeName,
        employeeId: created.employeeId,
        designation: created.designation,
        department: created.department,
        issueDate: created.issueDate ? created.issueDate.toISOString().split('T')[0] : '',
        referenceNumber: created.referenceNumber,
        contentSnapshot: created.contentSnapshot,
        signatoryName: created.signatoryName,
        signatoryDesignation: created.signatoryDesignation,
        createdAt: created.createdAt.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/company/hr-letters/:id
businessCompanyRouter.delete('/hr-letters/:id', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const idParam = req.params.id;

    await prisma.hrLetter.deleteMany({
      where: {
        companyId,
        OR: [
          { letterCode: idParam },
          ...(isNaN(Number(idParam)) ? [] : [{ id: Number(idParam) }]),
        ],
      },
    });

    return res.json({ success: true, message: 'HR letter deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 5. SHIFT ROSTER WEEKLY ASSIGNMENTS
// ============================================================================

// GET /api/v1/company/roster
businessCompanyRouter.get('/roster', roleGuard('COMPANY_ADMIN', 'HR', 'EMPLOYEE', 'IT', 'FINANCE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { startDate, endDate } = req.query;

    const where: any = { companyId };
    if (startDate && endDate) {
      where.date = {
        gte: String(startDate),
        lte: String(endDate),
      };
    }

    const assignments = await prisma.rosterAssignment.findMany({ where });
    const rosterMap: Record<string, string> = {};
    for (const a of assignments) {
      rosterMap[`${a.employeeId}_${a.date}`] = a.shiftTiming;
    }

    return res.json({ success: true, rosterMap, assignments });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/company/roster/bulk-assign
businessCompanyRouter.post('/roster/bulk-assign', roleGuard('COMPANY_ADMIN', 'HR'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { assignments } = req.body;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'assignments array is required'));
    }

    const updates = await Promise.all(
      assignments.map((item: any) =>
        prisma.rosterAssignment.upsert({
          where: {
            companyId_employeeId_date: {
              companyId,
              employeeId: Number(item.employeeId),
              date: String(item.date),
            },
          },
          update: {
            shiftTiming: String(item.shiftTiming),
            shiftId: item.shiftId ? String(item.shiftId) : null,
          },
          create: {
            companyId,
            employeeId: Number(item.employeeId),
            date: String(item.date),
            shiftTiming: String(item.shiftTiming),
            shiftId: item.shiftId ? String(item.shiftId) : null,
          },
        })
      )
    );

    return res.json({ success: true, count: updates.length });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 6. PAYROLL: SALARY LOANS & ADVANCES
// ============================================================================

// GET /api/v1/payroll/loans
businessPayrollRouter.get('/loans', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const isFinanceOrAdmin = ['COMPANY_ADMIN', 'FINANCE', 'PRODUCT_SUPER_ADMIN'].includes(req.user!.role);

    const where: any = { companyId };
    if (!isFinanceOrAdmin) {
      where.employeeId = req.user!.id;
    }

    const loans = await prisma.loanAdvance.findMany({
      where,
      orderBy: { appliedDate: 'desc' },
    });

    return res.json({
      success: true,
      loans: loans.map((ln) => ({
        id: ln.loanCode || `LN-${ln.id}`,
        dbId: ln.id,
        employeeId: ln.employeeId,
        employeeName: ln.employeeName,
        employeeEmail: ln.employeeEmail,
        department: ln.department,
        type: ln.type,
        principalAmount: Number(ln.principalAmount),
        tenureMonths: ln.tenureMonths,
        monthlyEmi: Number(ln.monthlyEmi),
        totalRepaid: Number(ln.totalRepaid),
        balanceRemaining: Number(ln.balanceRemaining),
        reason: ln.reason,
        status: ln.status,
        appliedDate: ln.appliedDate.toISOString().split('T')[0],
        approvedDate: ln.approvedDate ? ln.approvedDate.toISOString().split('T')[0] : undefined,
        disbursedDate: ln.disbursedDate ? ln.disbursedDate.toISOString().split('T')[0] : undefined,
        utrNumber: ln.utrNumber || undefined,
        rejectionReason: ln.rejectionReason || undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/payroll/loans
businessPayrollRouter.post('/loans', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const isFinanceOrAdmin = ['COMPANY_ADMIN', 'FINANCE', 'PRODUCT_SUPER_ADMIN'].includes(req.user!.role);

    const targetEmpId = isFinanceOrAdmin && req.body.employeeId ? Number(req.body.employeeId) : req.user!.id;
    const targetUser = await prisma.user.findFirst({
      where: { id: targetEmpId, companyId },
      include: { department: true },
    });

    if (!targetUser) {
      return next(new AppError(404, 'NOT_FOUND', 'Target employee not found in workspace'));
    }

    const { type, amount, tenureMonths, reason } = req.body;
    const principal = Number(amount) || 0;
    const months = Number(tenureMonths) || 1;
    const emi = Math.round(principal / months);

    const count = await prisma.loanAdvance.count({ where: { companyId } });
    const loanCode = `LN-${new Date().getFullYear()}-${String(count + 101).padStart(3, '0')}`;

    const created = await prisma.loanAdvance.create({
      data: {
        loanCode,
        companyId,
        employeeId: targetEmpId,
        employeeName: `${targetUser.firstName} ${targetUser.lastName}`.trim() || targetUser.username,
        employeeEmail: targetUser.email,
        department: targetUser.department?.name || 'General',
        type: type || 'EMERGENCY_ADVANCE',
        principalAmount: principal,
        tenureMonths: months,
        monthlyEmi: emi,
        balanceRemaining: principal,
        reason: reason || '',
        status: 'PENDING',
      },
    });

    return res.status(201).json({
      success: true,
      loan: {
        id: created.loanCode,
        dbId: created.id,
        employeeId: created.employeeId,
        employeeName: created.employeeName,
        employeeEmail: created.employeeEmail,
        department: created.department,
        type: created.type,
        principalAmount: Number(created.principalAmount),
        tenureMonths: created.tenureMonths,
        monthlyEmi: Number(created.monthlyEmi),
        totalRepaid: Number(created.totalRepaid),
        balanceRemaining: Number(created.balanceRemaining),
        reason: created.reason,
        status: created.status,
        appliedDate: created.appliedDate.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/payroll/loans/:id
businessPayrollRouter.patch('/loans/:id', roleGuard('COMPANY_ADMIN', 'FINANCE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const idParam = req.params.id;

    const existing = await prisma.loanAdvance.findFirst({
      where: {
        companyId,
        OR: [
          { loanCode: idParam },
          ...(isNaN(Number(idParam)) ? [] : [{ id: Number(idParam) }]),
        ],
      },
    });

    if (!existing) {
      return next(new AppError(404, 'NOT_FOUND', 'Loan request not found'));
    }

    const { status, utrNumber, rejectionReason, totalRepaid } = req.body;
    const updateData: any = {};
    if (status) {
      updateData.status = status;
      if (status === 'APPROVED' && !existing.approvedDate) {
        updateData.approvedDate = new Date();
      }
      if (status === 'DISBURSED' && !existing.disbursedDate) {
        updateData.disbursedDate = new Date();
      }
    }
    if (utrNumber !== undefined) updateData.utrNumber = utrNumber;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (totalRepaid !== undefined) {
      const repaid = Number(totalRepaid);
      updateData.totalRepaid = repaid;
      updateData.balanceRemaining = Math.max(0, Number(existing.principalAmount) - repaid);
    }

    const updated = await prisma.loanAdvance.update({
      where: { id: existing.id },
      data: updateData,
    });

    return res.json({ success: true, loan: updated });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 7. PAYROLL: TAX DECLARATIONS & PROOFS
// ============================================================================

// GET /api/v1/payroll/tax-declarations
businessPayrollRouter.get('/tax-declarations', async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const financialYear = String(req.query.financialYear || '2026-2027');

    // Fetch active employees
    const employees = await prisma.user.findMany({
      where: { companyId, isActive: true },
      include: { department: true },
    });

    // Fetch stored declarations
    const declarations = await prisma.taxDeclaration.findMany({
      where: { companyId, financialYear },
    });

    const declMap = new Map(declarations.map((d) => [d.employeeId, d]));

    const merged = employees.map((emp) => {
      const decl = declMap.get(emp.id);
      const grossSalary = emp.monthlySalary ? Number(emp.monthlySalary) * 12 : 0;
      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`.trim() || emp.username,
        email: emp.email,
        pan: (emp.bankDetails as any)?.pan || '',
        department: emp.department?.name || 'General',
        regime: (decl?.regime || 'NEW_REGIME') as 'OLD_REGIME' | 'NEW_REGIME',
        grossSalary: decl?.grossSalary ? Number(decl.grossSalary) : grossSalary,
        section80CDeclared: decl ? Number(decl.section80CDeclared) : 0,
        section80CVerified: decl ? Number(decl.section80CVerified) : 0,
        section80DDeclared: decl ? Number(decl.section80DDeclared) : 0,
        section80DVerified: decl ? Number(decl.section80DVerified) : 0,
        hraDeclared: decl ? Number(decl.hraDeclared) : 0,
        hraVerified: decl ? Number(decl.hraVerified) : 0,
        homeLoanInterestDeclared: decl ? Number(decl.homeLoanInterestDeclared) : 0,
        homeLoanInterestVerified: decl ? Number(decl.homeLoanInterestVerified) : 0,
        status: (decl?.status || 'PENDING_REVIEW') as 'PENDING_REVIEW' | 'VERIFIED' | 'LOCKED',
        proofFilesCount: Array.isArray(decl?.proofFiles) ? (decl!.proofFiles as any[]).length : 0,
      };
    });

    return res.json({ success: true, records: merged });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/payroll/tax-declarations/verify
businessPayrollRouter.post('/tax-declarations/verify', roleGuard('COMPANY_ADMIN', 'FINANCE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { employeeId, financialYear = '2026-2027', section80CVerified, section80DVerified, hraVerified, homeLoanInterestVerified } = req.body;

    if (!employeeId) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'employeeId is required'));
    }

    const empId = Number(employeeId);

    const record = await prisma.taxDeclaration.upsert({
      where: {
        companyId_employeeId_financialYear: {
          companyId,
          employeeId: empId,
          financialYear,
        },
      },
      update: {
        status: 'VERIFIED',
        ...(section80CVerified !== undefined && { section80CVerified: Number(section80CVerified) }),
        ...(section80DVerified !== undefined && { section80DVerified: Number(section80DVerified) }),
        ...(hraVerified !== undefined && { hraVerified: Number(hraVerified) }),
        ...(homeLoanInterestVerified !== undefined && { homeLoanInterestVerified: Number(homeLoanInterestVerified) }),
      },
      create: {
        companyId,
        employeeId: empId,
        financialYear,
        status: 'VERIFIED',
        section80CVerified: Number(section80CVerified) || 0,
        section80DVerified: Number(section80DVerified) || 0,
        hraVerified: Number(hraVerified) || 0,
        homeLoanInterestVerified: Number(homeLoanInterestVerified) || 0,
      },
    });

    return res.json({ success: true, record });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/payroll/tax-declarations/lock-all
businessPayrollRouter.post('/tax-declarations/lock-all', roleGuard('COMPANY_ADMIN', 'FINANCE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { financialYear = '2026-2027' } = req.body;

    const result = await prisma.taxDeclaration.updateMany({
      where: { companyId, financialYear, status: 'VERIFIED' },
      data: { status: 'LOCKED' },
    });

    return res.json({ success: true, count: result.count });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// 8. PAYROLL: STATUTORY COMPLIANCE REPORTS
// ============================================================================

// GET /api/v1/payroll/compliance-reports
businessPayrollRouter.get('/compliance-reports', roleGuard('COMPANY_ADMIN', 'FINANCE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { year, month, type } = req.query;

    const where: any = { companyId };
    if (year) where.year = Number(year);
    if (month) where.month = Number(month);
    if (type) where.type = String(type).toUpperCase();

    const reports = await prisma.complianceReport.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return res.json({
      success: true,
      reports: reports.map((r) => ({
        id: r.id,
        type: r.type,
        month: r.month,
        year: r.year,
        status: r.status,
        challanNumber: r.challanNumber || '',
        paymentDate: r.paymentDate ? r.paymentDate.toISOString().split('T')[0] : '',
        totalAmount: Number(r.totalAmount),
        recordsCount: r.recordsCount,
        details: r.details,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/payroll/compliance-reports
businessPayrollRouter.post('/compliance-reports', roleGuard('COMPANY_ADMIN', 'FINANCE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { type, month, year, status, challanNumber, paymentDate, totalAmount, recordsCount, details } = req.body;

    if (!type || !month || !year) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'type, month, and year are required'));
    }

    const report = await prisma.complianceReport.upsert({
      where: {
        companyId_type_month_year: {
          companyId,
          type: String(type).toUpperCase(),
          month: Number(month),
          year: Number(year),
        },
      },
      update: {
        status: status || 'FILED',
        challanNumber: challanNumber || null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        totalAmount: Number(totalAmount) || 0,
        recordsCount: Number(recordsCount) || 0,
        details: details || {},
      },
      create: {
        companyId,
        type: String(type).toUpperCase(),
        month: Number(month),
        year: Number(year),
        status: status || 'FILED',
        challanNumber: challanNumber || null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        totalAmount: Number(totalAmount) || 0,
        recordsCount: Number(recordsCount) || 0,
        details: details || {},
      },
    });

    return res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/payroll/compliance-reports
businessPayrollRouter.delete('/compliance-reports', roleGuard('COMPANY_ADMIN', 'FINANCE'), async (req, res, next) => {
  try {
    const companyId = req.user!.companyId!;
    const { year, month, type } = req.query;

    if (!year || !month || !type) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'year, month, and type are required'));
    }

    await prisma.complianceReport.deleteMany({
      where: {
        companyId,
        year: Number(year),
        month: Number(month),
        type: String(type).toUpperCase(),
      },
    });

    return res.json({ success: true, message: 'Compliance report deleted' });
  } catch (error) {
    next(error);
  }
});

