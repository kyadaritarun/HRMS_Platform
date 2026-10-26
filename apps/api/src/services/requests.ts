import prisma from '../lib/prisma.js';
import { AppError } from '../middlewares/errorHandler.js';
import { RequestType, RequestStatus } from '@prisma/client';
import { isWorkableDay, toDateKey } from '../lib/dates.js';
import { logActivity } from './activityLog.js';

/**
 * Resolves the appropriate approver based on the strict 3-tier organizational hierarchy:
 * 1. Regular Employee -> reports to their direct Manager (user.managerId)
 * 2. Manager (user with reports) -> reports to HR
 * 3. HR (role HR) -> reports to Company Admin
 */
export async function resolveWorkflowApprover(userId: number, companyId: number): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      manager: true,
      _count: { select: { reports: true } },
    },
  });

  if (!user) return null;

  // Tier 3: If requester is HR -> Reports to COMPANY_ADMIN
  if (user.role === 'HR') {
    if (user.manager && user.manager.role === 'COMPANY_ADMIN' && user.manager.isActive) {
      return user.manager.id;
    }
    const adminApprover = await prisma.user.findFirst({
      where: {
        companyId,
        id: { not: user.id },
        role: 'COMPANY_ADMIN',
        isActive: true,
      },
      select: { id: true },
    });
    return adminApprover ? adminApprover.id : (user.managerId || null);
  }

  // Tier 2: If requester is a Manager (has direct reports) -> Reports to HR
  const isManager = (user._count?.reports ?? 0) > 0;
  if (isManager && user.role !== 'COMPANY_ADMIN') {
    // If manager has an assigned manager who is HR or Admin, use them
    if (user.manager && (user.manager.role === 'HR' || user.manager.role === 'COMPANY_ADMIN') && user.manager.isActive) {
      return user.manager.id;
    }
    // Otherwise route to active HR in the company
    const hrApprover = await prisma.user.findFirst({
      where: {
        companyId,
        id: { not: user.id },
        role: 'HR',
        isActive: true,
      },
      select: { id: true },
    });
    if (hrApprover) return hrApprover.id;

    // Fallback to Company Admin if no HR exists
    const adminApprover = await prisma.user.findFirst({
      where: {
        companyId,
        id: { not: user.id },
        role: 'COMPANY_ADMIN',
        isActive: true,
      },
      select: { id: true },
    });
    return adminApprover ? adminApprover.id : (user.managerId || null);
  }

  // Tier 1: Regular Employee -> Reports to their direct Manager
  if (user.managerId && user.manager && user.manager.isActive) {
    return user.manager.id;
  }

  // If no direct manager assigned, fallback to HR, then Company Admin
  const hrApprover = await prisma.user.findFirst({
    where: {
      companyId,
      id: { not: user.id },
      role: 'HR',
      isActive: true,
    },
    select: { id: true },
  });
  if (hrApprover) return hrApprover.id;

  const adminApprover = await prisma.user.findFirst({
    where: {
      companyId,
      id: { not: user.id },
      role: 'COMPANY_ADMIN',
      isActive: true,
    },
    select: { id: true },
  });
  return adminApprover ? adminApprover.id : null;
}

export async function createRequest(opts: {
  userId: number;
  companyId: number;
  type: RequestType;
  title?: string;
  reason: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  amount?: number;
  leaveTypeId?: number;
  meta?: any;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    include: {
      company: true,
      manager: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  // Determine approver via reporting hierarchy (Employee -> Manager -> HR -> Admin)
  const approverId = await resolveWorkflowApprover(user.id, opts.companyId);

  let finalDays = opts.days ? opts.days : 0;
  const parsedStartDate = opts.startDate ? new Date(opts.startDate) : null;
  const parsedEndDate = opts.endDate ? new Date(opts.endDate) : parsedStartDate;

  // 2. Type-specific validations
  if (opts.type === 'LEAVE') {
    if (!opts.leaveTypeId) {
      throw new AppError(400, 'LEAVE_TYPE_REQUIRED', 'Leave type is required');
    }
    if (!parsedStartDate || !parsedEndDate) {
      throw new AppError(400, 'DATES_REQUIRED', 'Start date and end date are required');
    }
    if (parsedStartDate.getTime() > parsedEndDate.getTime()) {
      throw new AppError(400, 'INVALID_DATE_RANGE', 'Start date cannot be after end date');
    }

    const leaveType = await prisma.leaveType.findFirst({
      where: { id: opts.leaveTypeId, companyId: opts.companyId, isActive: true },
    });
    if (!leaveType) {
      throw new AppError(404, 'LEAVE_TYPE_NOT_FOUND', 'Active leave type not found');
    }

    // Check overlap with pending or approved leaves
    const overlap = await prisma.request.findFirst({
      where: {
        userId: opts.userId,
        type: 'LEAVE',
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            startDate: { lte: parsedEndDate },
            endDate: { gte: parsedStartDate },
          },
        ],
      },
    });

    if (overlap) {
      throw new AppError(400, 'LEAVE_OVERLAP', 'A leave request already exists overlapping these dates');
    }

    const isHalfDay = Boolean(opts.meta?.isHalfDay);
    if (isHalfDay) {
      if (!leaveType.allowHalfDay) {
        throw new AppError(400, 'HALF_DAY_NOT_ALLOWED', 'Half-day leaves are not allowed for this leave type');
      }
      finalDays = 0.5;
    } else {
      // Calculate count of working days excluding weekends and holidays
      const holidays = await prisma.holiday.findMany({
        where: { companyId: opts.companyId },
        select: { date: true },
      });
      const holidayKeys = new Set(holidays.map((h) => toDateKey(h.date)));
      const workingDaysStr = user.company?.workingDays || 'mon,tue,wed,thu,fri';

      let count = 0;
      const current = new Date(parsedStartDate);
      while (current <= parsedEndDate) {
        if (isWorkableDay(current, workingDaysStr, holidayKeys)) {
          count++;
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }

      finalDays = Math.max(1, count);
    }

    // Check balance for paid leave types
    if (leaveType.isPaid) {
      let balance = await prisma.leaveBalance.findUnique({
        where: { userId_leaveTypeId: { userId: opts.userId, leaveTypeId: leaveType.id } },
      });
      if (!balance) {
        const approvedCount = await prisma.request.findMany({
          where: {
            userId: opts.userId,
            companyId: opts.companyId,
            leaveTypeId: leaveType.id,
            type: 'LEAVE',
            status: 'APPROVED',
          },
          select: { days: true },
        });
        const used = approvedCount.reduce((s, r) => s + Number(r.days || 0), 0);
        const bal = Math.max(0, Number(leaveType.defaultAllocation) - used);
        balance = await prisma.leaveBalance.upsert({
          where: { userId_leaveTypeId: { userId: opts.userId, leaveTypeId: leaveType.id } },
          update: { balance: bal },
          create: {
            userId: opts.userId,
            leaveTypeId: leaveType.id,
            balance: bal,
            carriedOver: 0,
          },
        });
      }
      const currentBalance = Number(balance.balance);
      if (currentBalance < finalDays) {
        throw new AppError(
          400,
          'INSUFFICIENT_LEAVE_BALANCE',
          `Insufficient leave balance. Required: ${finalDays}, available: ${currentBalance}`
        );
      }
    }
  } else if (opts.type === 'COMP_OFF') {
    if (!parsedStartDate) {
      throw new AppError(400, 'WORKED_DATE_REQUIRED', 'Worked date is required for comp-off');
    }
    finalDays = opts.days && opts.days > 0 ? opts.days : 1;
  } else if (opts.type === 'CLAIM') {
    if (!opts.amount || opts.amount <= 0) {
      throw new AppError(400, 'AMOUNT_REQUIRED', 'Claim amount must be greater than zero');
    }
  }

  // 3. Create request row
  const request = await prisma.request.create({
    data: {
      type: opts.type,
      companyId: opts.companyId,
      userId: opts.userId,
      approverId,
      status: 'PENDING',
      title: opts.title || '',
      reason: opts.reason,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      days: finalDays ? finalDays : null,
      amount: opts.amount ? opts.amount : null,
      leaveTypeId: opts.leaveTypeId || null,
      meta: opts.meta || {},
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      leaveType: true,
    },
  });

  // 4. Create notification for approver
  if (approverId) {
    await prisma.notification.create({
      data: {
        companyId: opts.companyId,
        userId: approverId,
        kind: opts.type,
        title: `New ${opts.type} Request`,
        message: `${user.firstName} ${user.lastName} submitted a ${opts.type} request for approval.`,
        sourceType: 'Request',
        sourceId: String(request.id),
      },
    });
  }

  await logActivity({
    companyId: opts.companyId,
    actorId: opts.userId,
    action: `CREATE_${opts.type}_REQUEST`,
    objectType: 'Request',
    objectId: String(request.id),
    message: `${user.firstName} applied for ${opts.type}`,
  });

  return request;
}

export async function decideRequest(opts: {
  requestId: number;
  companyId: number;
  actorId: number;
  actorRole: string;
  status: 'APPROVED' | 'REJECTED';
  note?: string;
}) {
  const request = await prisma.request.findFirst({
    where: { id: opts.requestId, companyId: opts.companyId },
    include: {
      user: true,
      leaveType: true,
    },
  });

  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found');
  }

  if (request.status !== 'PENDING') {
    throw new AppError(400, 'ALREADY_DECIDED', `Request has already been ${request.status}`);
  }

  // RULE: Nobody can decide their own request
  if (request.userId === opts.actorId) {
    throw new AppError(403, 'CANNOT_APPROVE_OWN_REQUEST', 'You are not permitted to approve or reject your own request');
  }

  // RULE: HR requests report to Company Admin (another HR cannot approve an HR's request)
  if (request.user.role === 'HR' && opts.actorRole === 'HR') {
    throw new AppError(403, 'HR_REQUIRES_ADMIN_APPROVAL', 'HR requests must be approved by Company Admin');
  }

  // RULE: Only the assigned approver or HR/Admin can decide the request
  const isApprover = request.approverId === opts.actorId;
  const isAdminOrHr = ['COMPANY_ADMIN', 'HR', 'PRODUCT_SUPER_ADMIN'].includes(opts.actorRole);
  if (!isApprover && !isAdminOrHr) {
    throw new AppError(403, 'FORBIDDEN', 'Only the assigned manager or an HR/Admin can approve or reject this request');
  }

  // RULE: Rejection requires a decision note
  if (opts.status === 'REJECTED' && (!opts.note || !opts.note.trim())) {
    throw new AppError(400, 'REJECTION_NOTE_REQUIRED', 'A decision note is required when rejecting a request');
  }

  // Perform decision & side-effects in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    if (opts.status === 'APPROVED') {
      // Side effect for LEAVE
      if (request.type === 'LEAVE' && request.leaveTypeId && request.days) {
        const daysToDeduct = Number(request.days);
        const lt = await tx.leaveType.findUnique({ where: { id: request.leaveTypeId } });
        const defaultAllocation = Number(lt?.defaultAllocation || 15);

        await tx.leaveBalance.upsert({
          where: {
            userId_leaveTypeId: {
              userId: request.userId,
              leaveTypeId: request.leaveTypeId,
            },
          },
          update: {
            balance: { decrement: daysToDeduct },
          },
          create: {
            userId: request.userId,
            leaveTypeId: request.leaveTypeId,
            balance: Math.max(0, defaultAllocation - daysToDeduct),
            carriedOver: 0,
          },
        });
      }

      // Side effect for COMP_OFF: add to comp-off leave balance
      if (request.type === 'COMP_OFF' && request.days) {
        const compOffType = await tx.leaveType.findFirst({
          where: { companyId: opts.companyId, isCompOff: true, isActive: true },
        });

        if (compOffType) {
          await tx.leaveBalance.upsert({
            where: {
              userId_leaveTypeId: {
                userId: request.userId,
                leaveTypeId: compOffType.id,
              },
            },
            update: {
              balance: { increment: Number(request.days) },
            },
            create: {
              userId: request.userId,
              leaveTypeId: compOffType.id,
              balance: Number(request.days),
              carriedOver: 0,
            },
          });
        }
      }

      // Side effect for REGULARIZATION: create or update attendance
      if (request.type === 'REGULARIZATION' && request.startDate) {
        const meta = (request.meta as any) || {};
        const regularizeType =
          meta.regularizeType ||
          (meta.requestedCheckOut && meta.requestedCheckIn
            ? 'BOTH'
            : meta.requestedCheckIn
            ? 'CHECK_IN_ONLY'
            : meta.requestedCheckOut
            ? 'CHECK_OUT_ONLY'
            : 'BOTH');

        const startDate = new Date(request.startDate);
        const startOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59, 999);

        // Check if an attendance record already exists for this date
        const existingAtt = await tx.attendance.findFirst({
          where: {
            userId: request.userId,
            companyId: opts.companyId,
            checkIn: { gte: startOfDay, lte: endOfDay },
          },
          orderBy: { checkIn: 'desc' },
        });

        if (existingAtt) {
          let newCheckIn = existingAtt.checkIn;
          let newCheckOut = existingAtt.checkOut;

          if (meta.requestedCheckIn && regularizeType !== 'CHECK_OUT_ONLY') {
            const [cinH, cinM] = String(meta.requestedCheckIn).split(':').map(Number);
            newCheckIn = new Date(request.startDate);
            newCheckIn.setUTCHours(cinH, cinM, 0, 0);
          }

          if (meta.requestedCheckOut && regularizeType !== 'CHECK_IN_ONLY') {
            const [coutH, coutM] = String(meta.requestedCheckOut).split(':').map(Number);
            newCheckOut = new Date(request.startDate);
            newCheckOut.setUTCHours(coutH, coutM, 0, 0);
          }

          let newDuration = Number(existingAtt.durationHours);
          if (newCheckIn && newCheckOut) {
            newDuration = Math.round(((newCheckOut.getTime() - newCheckIn.getTime()) / 3600000) * 100) / 100;
          }

          const updatedAtt = await tx.attendance.update({
            where: { id: existingAtt.id },
            data: {
              checkIn: newCheckIn,
              checkOut: newCheckOut,
              durationHours: newDuration > 0 ? newDuration : existingAtt.durationHours,
              note: existingAtt.note
                ? `${existingAtt.note} | Regularized per request #${request.id}: ${request.reason}`
                : `Regularized per request #${request.id}: ${request.reason}`,
            },
          });

          await tx.request.update({
            where: { id: request.id },
            data: {
              meta: { ...meta, appliedAttendanceId: updatedAtt.id },
            },
          });
        } else {
          // No record exists: create a new attendance record
          const checkInTimeStr = meta.requestedCheckIn || '09:00';
          const [cinH, cinM] = checkInTimeStr.split(':').map(Number);
          const checkIn = new Date(request.startDate);
          checkIn.setUTCHours(cinH, cinM, 0, 0);

          let checkOut: Date | null = null;
          let durationHours = 0;

          if (meta.requestedCheckOut && regularizeType !== 'CHECK_IN_ONLY') {
            const [coutH, coutM] = String(meta.requestedCheckOut).split(':').map(Number);
            checkOut = new Date(request.startDate);
            checkOut.setUTCHours(coutH, coutM, 0, 0);
            durationHours = Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100) / 100;
          } else if (regularizeType === 'BOTH') {
            const [coutH, coutM] = '18:00'.split(':').map(Number);
            checkOut = new Date(request.startDate);
            checkOut.setUTCHours(coutH, coutM, 0, 0);
            durationHours = Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100) / 100;
          }

          const att = await tx.attendance.create({
            data: {
              companyId: opts.companyId,
              userId: request.userId,
              checkIn,
              checkOut,
              durationHours: durationHours > 0 ? durationHours : 8,
              note: `Regularized per request #${request.id}: ${request.reason}`,
            },
          });

          await tx.request.update({
            where: { id: request.id },
            data: {
              meta: { ...meta, appliedAttendanceId: att.id },
            },
          });
        }
      }
    }

    // Update request status
    return tx.request.update({
      where: { id: request.id },
      data: {
        status: opts.status,
        decisionNote: opts.note || '',
        resolvedAt: new Date(),
        approverId: opts.actorId,
      },
    });
  });

  // Notify requester
  await prisma.notification.create({
    data: {
      companyId: opts.companyId,
      userId: request.userId,
      kind: request.type,
      title: `${request.type} Request ${opts.status}`,
      message: `Your ${request.type} request has been ${opts.status.toLowerCase()}.${opts.note ? ` Note: ${opts.note}` : ''}`,
      sourceType: 'Request',
      sourceId: String(request.id),
    },
  });

  await logActivity({
    companyId: opts.companyId,
    actorId: opts.actorId,
    action: `DECIDE_${request.type}_REQUEST`,
    objectType: 'Request',
    objectId: String(request.id),
    message: `${opts.status} request #${request.id} for ${request.user.firstName}`,
  });

  return updated;
}

export async function cancelRequest(opts: {
  requestId: number;
  companyId: number;
  userId: number;
}) {
  const request = await prisma.request.findFirst({
    where: { id: opts.requestId, companyId: opts.companyId, userId: opts.userId },
  });

  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Request not found');
  }

  if (request.status === 'REJECTED' || request.status === 'CANCELLED') {
    throw new AppError(400, 'CANNOT_CANCEL', `Request is already in status ${request.status}`);
  }

  return prisma.$transaction(async (tx) => {
    // If it was APPROVED and was a LEAVE, restore the balance!
    if (request.status === 'APPROVED' && request.type === 'LEAVE' && request.leaveTypeId && request.days) {
      await tx.leaveBalance.update({
        where: {
          userId_leaveTypeId: {
            userId: request.userId,
            leaveTypeId: request.leaveTypeId,
          },
        },
        data: {
          balance: { increment: Number(request.days) },
        },
      });
    }

    const updated = await tx.request.update({
      where: { id: request.id },
      data: {
        status: 'CANCELLED',
        resolvedAt: new Date(),
      },
    });

    await logActivity({
      companyId: opts.companyId,
      actorId: opts.userId,
      action: 'CANCEL_REQUEST',
      objectType: 'Request',
      objectId: String(request.id),
      message: `Cancelled ${request.type} request #${request.id}`,
    });

    return updated;
  });
}

export async function payClaim(opts: {
  requestId: number;
  companyId: number;
  actorId: number;
}) {
  const request = await prisma.request.findFirst({
    where: { id: opts.requestId, companyId: opts.companyId, type: 'CLAIM' },
  });

  if (!request) {
    throw new AppError(404, 'NOT_FOUND', 'Claim request not found');
  }

  if (request.status !== 'APPROVED') {
    throw new AppError(400, 'CLAIM_NOT_APPROVED', 'Only APPROVED claims can be marked as PAID');
  }

  const updated = await prisma.request.update({
    where: { id: request.id },
    data: { status: 'PAID' },
  });

  await logActivity({
    companyId: opts.companyId,
    actorId: opts.actorId,
    action: 'PAY_CLAIM',
    objectType: 'Request',
    objectId: String(request.id),
    message: `Marked claim #${request.id} as PAID`,
  });

  return updated;
}
