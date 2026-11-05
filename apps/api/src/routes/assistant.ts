import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { AppError } from '../middlewares/errorHandler.js';
import { parseAgentIntent, executeAgentTool } from '../services/assistantAgent.js';
import { executeHybridRag } from '../services/hybridRag.js';
import {
  listSessions,
  getSession,
  createSession,
  appendMessage,
  deleteSession,
} from '../services/sessionStore.js';

const router = Router();

router.use(authMiddleware, tenantMatchMiddleware, policyComplianceMiddleware);

// Permissive feature check allowing Company Admin & HR by default
router.use((req, _res, next) => {
  const enabledFeatures = (req.company?.package?.enabledFeatures as string[]) || [];
  if (
    enabledFeatures.length === 0 ||
    enabledFeatures.includes('ai_assistant') ||
    enabledFeatures.includes('ai_assistance') ||
    req.user?.role === 'COMPANY_ADMIN' ||
    req.user?.role === 'HR'
  ) {
    return next();
  }
  return next();
});

// Helper to format dates nicely
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ----------------------------------------------------------------------------
// PILLAR 3: SESSION MANAGEMENT & THREAD ENDPOINTS
// ----------------------------------------------------------------------------

// GET /assistant/sessions - Lists user's conversation threads
router.get('/sessions', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const sessions = listSessions(userId, companyId);
    return res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

// POST /assistant/sessions - Creates a new clean thread
router.post('/sessions', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const session = createSession(userId, companyId, req.body?.title);
    return res.json({ session });
  } catch (err) {
    next(err);
  }
});

// GET /assistant/sessions/:id - Retrieves thread messages and active context
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const session = getSession(req.params.id, userId, companyId);
    if (!session) {
      return next(new AppError(404, 'SESSION_NOT_FOUND', 'Conversation thread not found'));
    }
    return res.json({ session });
  } catch (err) {
    next(err);
  }
});

// DELETE /assistant/sessions/:id - Deletes a thread
router.delete('/sessions/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const ok = deleteSession(req.params.id, userId, companyId);
    return res.json({ success: ok });
  } catch (err) {
    next(err);
  }
});

// POST /assistant/chat
router.post('/chat', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const userRole = req.user!.role; // 'COMPANY_ADMIN' | 'HR' | 'FINANCE' | 'IT' | 'EMPLOYEE'
    const message = (req.body.message || '').trim();

    if (!message) {
      return next(new AppError(400, 'MESSAGE_REQUIRED', 'Message is required'));
    }

    const query = message.toLowerCase();
    const isCompanyAdmin = userRole === 'COMPANY_ADMIN' || userRole === 'PRODUCT_SUPER_ADMIN';
    const isHr = userRole === 'HR';
    const isEmployee = userRole === 'EMPLOYEE';

    // ------------------------------------------------------------------------
    // PILLAR 3: RESOLVE OR INITIALIZE MULTI-TURN SESSION THREAD
    // ------------------------------------------------------------------------
    const sessionId = req.body.sessionId;
    let currentSession = sessionId ? getSession(sessionId, userId, companyId) : null;
    if (!currentSession) {
      currentSession = createSession(userId, companyId);
    }

    appendMessage(currentSession.id, userId, companyId, {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: Date.now(),
    });

    const sendAssistantResponse = (data: {
      reply: string;
      citations?: string[];
      action?: any;
      widget?: any;
      contextUpdate?: any;
    }) => {
      appendMessage(
        currentSession!.id,
        userId,
        companyId,
        {
          id: `asst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          sender: 'assistant',
          text: data.reply,
          action: data.action || null,
          widget: data.widget || null,
          citations: data.citations || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: Date.now(),
        },
        data.contextUpdate
      );

      return res.json({
        reply: data.reply,
        citations: data.citations || [],
        action: data.action || null,
        widget: data.widget || null,
        sessionId: currentSession!.id,
      });
    };

    // ------------------------------------------------------------------------
    // 1. STRICT TENANT LOOKUP & MULTI-TENANT ISOLATION
    // ------------------------------------------------------------------------
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { package: true },
    });

    if (!company) {
      return next(new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found'));
    }

    // Strict multi-tenant barrier: Company Admin, HR, and Employees can ONLY query their company
    const externalTenantTriggers = [
      'other company',
      'another company',
      'different company',
      'all companies',
      'switch company',
      'tenant 2',
      'tenant 3',
      'other tenant',
      'outside company',
      'external company',
    ];
    if (externalTenantTriggers.some((t) => query.includes(t))) {
      return sendAssistantResponse({
        reply: `🔒 **Access Restricted:** We do not have access to other organizations. Under our enterprise multi-tenant security architecture, all queries and data are strictly isolated exclusively to your company workspace (**${company.name}**).`,
        citations: ['Multi-Tenant Data Isolation & Workspace Governance'],
      });
    }

    // ------------------------------------------------------------------------
    // 1.5 AUTONOMOUS AGENT ACTION PARSER (WITH MULTI-TURN MEMORY)
    // ------------------------------------------------------------------------
    const agentAction = await parseAgentIntent({
      userId,
      companyId,
      query: message,
      sessionContext: currentSession.context,
      previousMessages: currentSession.messages,
    });

    if (agentAction.isAction) {
      return sendAssistantResponse({
        reply: agentAction.reply || '',
        citations: agentAction.citations || ['Autonomous Action Engine (Multi-Turn Session Memory)'],
        action: agentAction.action || null,
        contextUpdate: {
          pendingAction: agentAction.action || null,
          lastTopic: 'ACTION_TOOL',
        },
      });
    }

    // ------------------------------------------------------------------------
    // 2. STRICT EMPLOYEE RESTRICTIONS (WHEN EMPLOYEE ASKS FOR HR DATA)
    // "if user ask hr from comany al show say we didnot have asses to you"
    // ------------------------------------------------------------------------
    const hrRestrictedKeywords = [
      'hr data',
      'hr records',
      'hr details',
      'hr information',
      'hr files',
      'hr operations',
      'hr management',
      'hr roster',
      'hr admin',
      'company attendance',
      'attendance of company',
      'who is absent',
      'who is on leave',
      'who is not present',
      'all employees',
      'list of employees',
      'employee list',
      'team attendance',
      'all staff',
      'headcount of company',
      'total employees in company',
      'department distribution',
    ];

    const confidentialSalaryPatterns = [
      /salary of/i,
      /compensation of/i,
      /how much does .* earn/i,
      /how much is .* paid/i,
      /who earns the most/i,
      /highest salary/i,
      /payroll master/i,
      /all salaries/i,
      /employee salaries/i,
      /bank details of/i,
      /phone number of/i,
      /address of/i,
      /personal details of/i,
      /who got paid/i,
      /ctc of/i,
      /bonus of/i,
    ];

    const isAskingOwnSalary =
      query.includes('my salary') ||
      query.includes('my payslip') ||
      query.includes('my earnings') ||
      query.includes('my pay') ||
      query.includes('my compensation') ||
      query.includes('my ctc');

    const isAskingHrData = hrRestrictedKeywords.some((kw) => query.includes(kw));
    const isAskingConfidentialOthers = confidentialSalaryPatterns.some((p) => p.test(query));
    const isAskingBilling =
      query.includes('billing') ||
      query.includes('subscription plan') ||
      query.includes('invoice payment') ||
      query.includes('seats limit') ||
      query.includes('renew subscription');

    // If an employee asks for HR data, other employees' records, or company billing:
    if (isEmployee && (isAskingHrData || (isAskingConfidentialOthers && !isAskingOwnSalary) || isAskingBilling)) {
      return res.json({
        reply: `🔒 **We do not have access to that for you:** You do not have permission to access company HR operations, organization-wide attendance rosters, or confidential employee records.\n\nAs an employee in **${company.name}**, your access is restricted strictly to:\n• **Your Personal Records**: Your leave balances, daily punch times, and published payslips.\n• **Public Policies**: Leave guidelines, travel claims, holidays, and company announcements.\n\nIf you need confidential HR assistance or paperwork, please submit a formal request via **Self Service > Tickets**.`,
        citations: ['Enterprise RBAC & Employee Data Privacy Governance'],
      });
    }

    // ------------------------------------------------------------------------
    // 3. FETCH LIVE WORKSPACE DATA FOR CONTEXTUAL REASONING
    // ------------------------------------------------------------------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      policies,
      holidays,
      departments,
      currentUser,
      activeTodayAttendance,
      todayOnLeaveRequests,
      pendingRequests,
      allActiveUsers,
    ] = await Promise.all([
      // Policies
      prisma.policy.findMany({
        where: { companyId, isActive: true },
        select: { id: true, title: true, body: true, extractedText: true, policyType: true, version: true, slug: true },
      }),
      // Holidays
      prisma.holiday.findMany({
        where: { companyId },
        orderBy: { date: 'asc' },
      }),
      // Departments
      prisma.department.findMany({
        where: { companyId, isActive: true },
        include: { _count: { select: { users: true } } },
        orderBy: { name: 'asc' },
      }),
      // Requesting User with manager, department, attendance, payslips
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          department: true,
          manager: {
            select: { firstName: true, lastName: true, email: true, jobTitle: true },
          },
          leaveBalances: { include: { leaveType: true } },
          attendance: {
            where: { checkIn: { gte: today } },
            orderBy: { checkIn: 'desc' },
            take: 1,
          },
          payslips: {
            where: { status: 'PUBLISHED' },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
            take: 1,
          },
        },
      }),
      // Today Attendance Count across Company (for Admin / HR)
      (isCompanyAdmin || isHr)
        ? prisma.attendance.findMany({
            where: {
              companyId,
              checkIn: { gte: today },
            },
            select: { userId: true, workMode: true, checkIn: true },
          })
        : Promise.resolve([]),
      // Today Approved Leaves across Company (for Admin / HR)
      (isCompanyAdmin || isHr)
        ? prisma.request.findMany({
            where: {
              companyId,
              type: 'LEAVE',
              status: 'APPROVED',
              startDate: { lte: today },
              endDate: { gte: today },
            },
            include: { user: { select: { firstName: true, lastName: true } } },
          })
        : Promise.resolve([]),
      // Pending requests in company (for Admin / HR)
      (isCompanyAdmin || isHr)
        ? prisma.request.findMany({
            where: {
              companyId,
              status: 'PENDING',
            },
            select: { id: true, type: true, userId: true },
          })
        : Promise.resolve([]),
      // All active users in company (for Admin / HR)
      (isCompanyAdmin || isHr)
        ? prisma.user.findMany({
            where: { companyId, isActive: true },
            select: { id: true, firstName: true, lastName: true, jobTitle: true, departmentId: true, role: true },
          })
        : Promise.resolve([]),
    ]);

    const citations: string[] = [];
    let reply = '';

    // Announcements list from company settings
    const settings = ((company.settings as any) || {}) as Record<string, any>;
    const announcements = Array.isArray(settings.announcements) ? settings.announcements : [];

    // User's own balances
    const userBalances = (currentUser?.leaveBalances || [])
      .map((lb) => `• **${lb.leaveType.name} (${lb.leaveType.code})**: ${lb.balance} days remaining`)
      .join('\n');

    // User's today punch session
    const todaySession = currentUser?.attendance?.[0];

    // ------------------------------------------------------------------------
    // INTENT A: PROFILE, ROLE, MANAGER, DEPARTMENT & EMPLOYMENT DETAILS
    // ------------------------------------------------------------------------
    if (
      query.includes('who am i') ||
      query.includes('my profile') ||
      query.includes('my role') ||
      query.includes('my job title') ||
      query.includes('my designation') ||
      query.includes('my manager') ||
      query.includes('who is my manager') ||
      query.includes('my department') ||
      query.includes('my employee code') ||
      query.includes('my employee number') ||
      query.includes('my shift timing') ||
      query.includes('when did i join')
    ) {
      citations.push('Employee Master Record');
      const managerName = currentUser?.manager
        ? `${currentUser.manager.firstName} ${currentUser.manager.lastName} (${currentUser.manager.jobTitle || 'Reporting Manager'})`
        : 'Not assigned';

      reply += `👤 **Your Employment Profile (${company.name}):**\n\n`;
      reply += `• **Name:** ${currentUser?.firstName} ${currentUser?.lastName}\n`;
      reply += `• **Role:** ${currentUser?.role}\n`;
      reply += `• **Job Title:** ${currentUser?.jobTitle || 'General Staff'}\n`;
      reply += `• **Department:** ${currentUser?.department?.name || 'General'}\n`;
      reply += `• **Employee Code:** ${currentUser?.employeeNumber || `EMP-${currentUser?.id}`}\n`;
      reply += `• **Reporting Manager:** ${managerName}\n`;
      reply += `• **Work Mode:** ${currentUser?.workMode || 'WFO'}\n`;
      reply += `• **Shift Timing:** ${currentUser?.shiftTiming || '09:00 AM - 06:00 PM'}\n`;
      if (currentUser?.joiningDate) {
        reply += `• **Joining Date:** ${formatDate(currentUser.joiningDate)}\n`;
      }
      reply += `\nYou can review or update personal credentials under **Account > My Profile**.`;
      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        contextUpdate: { lastTopic: 'PROFILE' },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT B: HOW TO CONTACT HR (FOR EMPLOYEES)
    // ------------------------------------------------------------------------
    if (
      query.includes('contact hr') ||
      query.includes('reach hr') ||
      query.includes('talk to hr') ||
      query.includes('hr email') ||
      query.includes('hr help') ||
      query.includes('raise ticket') ||
      query.includes('submit ticket')
    ) {
      citations.push('HR Support & Helpdesk Policy');
      reply += `🛎️ **How to Contact HR:**\n\n`;
      reply += `You can reach out to the HR Operations team through our official ticketing system:\n`;
      reply += `1. Navigate to **Self Service > Tickets** on your sidebar.\n`;
      reply += `2. Click **+ Raise Ticket** and select the category (Payroll, Leave Dispute, Asset, or General Inquiry).\n`;
      reply += `3. The HR Operations desk will review and resolve your request with guaranteed SLA tracking.\n\n`;
      reply += `For urgent workplace issues, you can also speak directly with your reporting manager or ask me: *"Raise an IT ticket for broken laptop"*.`;
      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        contextUpdate: { lastTopic: 'CONTACT_HR' },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT C: LEAVE BALANCES & HOW TO APPLY FOR LEAVE
    // ------------------------------------------------------------------------
    if (
      query.includes('leave balance') ||
      query.includes('how many leaves') ||
      query.includes('remaining leaves') ||
      query.includes('casual leave') ||
      query.includes('sick leave') ||
      query.includes('quota') ||
      query.includes('can i take leave') ||
      query.includes('how to apply leave') ||
      query.includes('apply for leave')
    ) {
      citations.push('Leave Balances & Quota Master');
      reply += `Here is your current leave quota breakdown:\n\n${userBalances || '• No leave quota records found.'}\n\n`;

      const leavePolicy = policies.find((p) => p.policyType === 'LEAVE');
      if (leavePolicy) {
        citations.push(leavePolicy.title);
        reply += `📌 **Policy Guideline (${leavePolicy.title}):**\n${leavePolicy.extractedText || 'Leaves should be requested in advance and approved by your supervisor.'}\n\n`;
      }
      reply += `You can quickly apply for leave using the interactive launchers below, or simply type: *"Apply Casual Leave for tomorrow due to personal work"*.`;

      const leaveQuotaItems = (currentUser?.leaveBalances || []).map((lb) => {
        const balance = Number(lb.balance || 0);
        const total = Math.max(balance, (lb.leaveType as any)?.annualAllowance || 12);
        const used = Math.max(0, total - balance);
        const percent = Math.min(100, Math.round((balance / total) * 100));
        return {
          id: lb.leaveTypeId,
          name: lb.leaveType.name,
          code: lb.leaveType.code,
          color: (lb.leaveType as any)?.color || '#5E4BE2',
          balance,
          total,
          used,
          percent,
        };
      });

      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        widget: {
          type: 'LEAVE_QUOTA_BARS',
          title: 'Leave Balances & Quota Overview',
          items: leaveQuotaItems,
        },
        contextUpdate: {
          lastTopic: 'LEAVE_QUOTA',
          mentionedLeaveTypes: leaveQuotaItems.map((i) => i.name),
        },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT D: USER ATTENDANCE & PUNCH STATUS
    // ------------------------------------------------------------------------
    if (
      query.includes('my attendance') ||
      query.includes('check in time') ||
      query.includes('punch in') ||
      query.includes('punch out') ||
      query.includes('am i checked in') ||
      query.includes('punch status') ||
      query.includes('working hours today') ||
      query.includes('how to punch') ||
      query.includes('how to check in') ||
      query.includes('shift timing')
    ) {
      citations.push('Daily Time & Attendance Log');

      let durationText = '0h 0m';
      const inTime = todaySession ? new Date(todaySession.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;
      const outTime = todaySession?.checkOut ? new Date(todaySession.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

      if (todaySession) {
        const end = todaySession.checkOut ? new Date(todaySession.checkOut).getTime() : Date.now();
        const diffMs = Math.max(0, end - new Date(todaySession.checkIn).getTime());
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        durationText = `${hours}h ${mins}m`;

        reply += `⏱️ **Your Attendance Status Today:**\n\n`;
        reply += `• **Status:** ${todaySession.checkOut ? 'Shift Concluded' : 'Punched In'} (${todaySession.workMode || 'WFO'})\n`;
        reply += `• **First Punch In:** ${inTime}\n`;
        if (outTime) {
          reply += `• **Punch Out:** ${outTime}\n`;
        }
        reply += `• **Working Duration:** ${durationText}\n`;
        reply += `• **Standard Shift Timing:** ${currentUser?.shiftTiming || '09:00 AM - 06:00 PM'}\n\n`;
        if (!todaySession.checkOut) {
          reply += `You can punch out with 1 click using the attendance widget below:`;
        }
      } else {
        reply += `⏱️ **You have not punched in yet today.**\n\n`;
        reply += `• **Standard Shift Timing:** ${currentUser?.shiftTiming || '09:00 AM - 06:00 PM'}\n\n`;
        reply += `You can punch in directly from the live attendance widget below:`;
      }

      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        widget: {
          type: 'ATTENDANCE_TIMELINE',
          title: "Today's Attendance Timeline",
          data: {
            status: todaySession ? (todaySession.checkOut ? 'CLOCKED_OUT' : 'CLOCKED_IN') : 'NOT_CLOCKED_IN',
            workMode: todaySession?.workMode || 'WFO',
            checkIn: inTime,
            checkOut: outTime,
            shiftTiming: currentUser?.shiftTiming || '09:00 AM - 06:00 PM',
            duration: durationText,
            canPunchOut: !!todaySession && !todaySession.checkOut,
            canPunchIn: !todaySession,
          },
        },
        contextUpdate: {
          lastTopic: 'ATTENDANCE_STATUS',
        },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT E: COMPANY-WIDE ATTENDANCE (ADMIN & HR ONLY)
    // ------------------------------------------------------------------------
    if (
      (isCompanyAdmin || isHr) &&
      (query.includes('who is on leave today') ||
        query.includes('who is absent') ||
        query.includes('attendance today') ||
        query.includes('how many are present') ||
        query.includes('present today') ||
        query.includes('attendance summary'))
    ) {
      citations.push('Company Daily Attendance Roster');
      const presentCount = activeTodayAttendance.length;
      const totalCount = allActiveUsers.length;
      const onLeaveCount = todayOnLeaveRequests.length;
      const wfoCount = activeTodayAttendance.filter((a) => a.workMode === 'WFO').length;
      const wfhCount = activeTodayAttendance.filter((a) => a.workMode === 'WFH').length;

      reply += `📊 **Today's Company Attendance Snapshot (${formatDate(new Date())}):**\n\n`;
      reply += `• **Total Active Headcount:** ${totalCount} employees\n`;
      reply += `• **Punched In / Present:** ${presentCount} (${Math.round((presentCount / Math.max(1, totalCount)) * 100)}%)\n`;
      reply += `  - Work From Office (WFO): ${wfoCount}\n`;
      reply += `  - Work From Home (WFH): ${wfhCount}\n`;
      reply += `• **Approved Leaves Today:** ${onLeaveCount}\n`;

      if (todayOnLeaveRequests.length > 0) {
        const names = todayOnLeaveRequests.map((r) => `${r.user.firstName} ${r.user.lastName}`).join(', ');
        reply += `  - Team members on leave: **${names}**\n`;
      }

      reply += `\nFor the live roster, visit **HR Operations > Employee Attendance**.`;
      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        contextUpdate: { lastTopic: 'COMPANY_ATTENDANCE' },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT F: EMPLOYEE'S OWN SALARY & PAYSLIP INQUIRY
    // ------------------------------------------------------------------------
    if (isAskingOwnSalary) {
      citations.push('Employee Salary & Payslip Vault');
      const latestPayslip = currentUser?.payslips?.[0];
      if (latestPayslip) {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        reply += `💼 **Your Latest Published Payslip (${monthNames[latestPayslip.month]} ${latestPayslip.year}):**\n\n`;
        reply += `• **Net Disbursed Salary:** ₹${Number(latestPayslip.netSalary || 0).toLocaleString('en-IN')}\n`;
        reply += `• **Disbursement Status:** ${latestPayslip.status}\n`;
        reply += `• **Remarks:** ${latestPayslip.remarks || 'Standard monthly payroll'}\n\n`;
        reply += `You can download your full PDF payslips with itemized allowances and tax deductions from **Self Service > Payslips**.`;
      } else {
        reply += `Your current compensation is registered on file. However, you do not have a published payslip for the current cycle yet. Payslips are published by Finance at the end of each payroll period.`;
      }
      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        contextUpdate: { lastTopic: 'SALARY' },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT G: HEADCOUNT, DEPARTMENTS & TEAM (ADMIN & HR ONLY)
    // ------------------------------------------------------------------------
    if (
      (isCompanyAdmin || isHr) &&
      (query.includes('how many employees') ||
        query.includes('total headcount') ||
        query.includes('list departments') ||
        query.includes('department breakdown') ||
        query.includes('our team') ||
        query.includes('team size'))
    ) {
      citations.push('Organization Department & Headcount Master');
      const totalEmployees = allActiveUsers.length;
      reply += `👥 **Organization Headcount Overview (${company.name}):**\n\n`;
      reply += `• **Total Active Employees:** ${totalEmployees}\n`;
      reply += `• **Total Active Departments:** ${departments.length}\n\n`;
      reply += `**Department Breakdown:**\n`;

      departments.forEach((dept) => {
        reply += `• **${dept.name}**: ${dept._count?.users || 0} employees\n`;
      });

      reply += `\nTo view or reassign organizational hierarchy, visit **Company > Organization Hierarchy**.`;
      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        contextUpdate: { lastTopic: 'HEADCOUNT' },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT H: SUBSCRIPTION, BILLING & DOMAINS (ADMIN ONLY)
    // ------------------------------------------------------------------------
    if (
      isCompanyAdmin &&
      (query.includes('subscription') ||
        query.includes('billing') ||
        query.includes('seat limit') ||
        query.includes('our plan') ||
        query.includes('corporate domain') ||
        query.includes('allowed domains'))
    ) {
      citations.push('Company Billing & Workspace Governance');
      const pkg = company.package;
      const domains = company.allowedEmailDomains || `@${company.subdomain}.com`;

      reply += `🏢 **Company Workspace & Subscription Details:**\n\n`;
      reply += `• **Company Name:** ${company.name}\n`;
      reply += `• **Subdomain:** ${company.subdomain}.uptrix.io\n`;
      reply += `• **Active Tier:** ${pkg?.name || 'Enterprise Tier'}\n`;
      reply += `• **Seat Limit:** ${allActiveUsers.length} / ${pkg?.employeeLimit || 100} employee seats used\n`;
      reply += `• **Billing Cycle:** ${company.planType || 'YEARLY'}\n`;
      reply += `• **Allowed Corporate Domains:** ${domains}\n`;
      if (company.nextPaymentDate) {
        reply += `• **Next Renewal Date:** ${formatDate(company.nextPaymentDate)}\n`;
      }
      reply += `\nManage your seats and invoices in **Company > Subscription & Billing**.`;
      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        contextUpdate: { lastTopic: 'BILLING' },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT I: PENDING WORKFLOWS & APPROVALS (MANAGER, ADMIN & HR)
    // ------------------------------------------------------------------------
    const isApprovalQuery =
      query.includes('pending requests') ||
      query.includes('pending approvals') ||
      query.includes('pending leaves') ||
      query.includes('pending claims') ||
      query.includes('what needs approval') ||
      query.includes('what approvals are pending') ||
      query.includes('any leave requests to approve') ||
      query.includes('approvals to review') ||
      query.includes('requests to approve') ||
      query.includes('approval requests') ||
      query.includes('who needs approval') ||
      query.includes('approvals pending');

    if (isApprovalQuery) {
      citations.push('Workforce Approvals Desk');

      let pendingList: any[] = [];
      try {
        pendingList = await prisma.request.findMany({
          where: isCompanyAdmin || isHr
            ? { companyId, status: 'PENDING' }
            : { companyId, approverId: userId, status: 'PENDING' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                jobTitle: true,
                email: true,
              },
            },
            leaveType: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
      } catch {
        pendingList = [];
      }

      if (pendingList.length > 0) {
        const items = pendingList.map((r) => {
          const reqName = `${r.user?.firstName || 'Team'} ${r.user?.lastName || 'Member'}`.trim();
          const leaveName = r.leaveType?.name || (r.type === 'CLAIM' ? 'Expense Claim' : r.type === 'REGULARIZATION' ? 'Attendance Regularization' : 'Request');
          return {
            id: r.id,
            requesterName: reqName,
            jobTitle: r.user?.jobTitle || 'Team Member',
            type: r.type,
            leaveTypeName: leaveName,
            startDate: r.startDate ? formatDate(r.startDate) : null,
            endDate: r.endDate ? formatDate(r.endDate) : null,
            days: r.days ? Number(r.days) : 1,
            amount: r.amount ? Number(r.amount) : null,
            reason: r.reason || 'No description provided',
            status: 'PENDING',
          };
        });

        const firstItem = items[0];
        const previewText = items.length === 1
          ? `**${firstItem.requesterName}** has requested **${firstItem.days === 1 ? '1 day' : `${firstItem.days} days`}** of ${firstItem.leaveTypeName}.`
          : `You have **${items.length}** pending requests awaiting your decision.`;

        reply += `📋 **Pending Approvals Desk:**\n\n${previewText}\n\nYou can review details and click **[Approve]** or **[Reject]** directly from the live action cards below:`;

        return sendAssistantResponse({
          reply: reply.trim(),
          citations,
          widget: {
            type: 'PENDING_APPROVALS',
            title: 'Pending Workforce Approvals',
            items,
          },
          contextUpdate: {
            lastTopic: 'PENDING_APPROVALS',
          },
        });
      } else {
        reply += `✅ **No Pending Approvals:** You currently have zero pending approval requests waiting for your decision. All team submissions are up to date.`;
        return sendAssistantResponse({
          reply: reply.trim(),
          citations,
          widget: {
            type: 'PENDING_APPROVALS',
            title: 'Pending Workforce Approvals',
            items: [],
          },
          contextUpdate: {
            lastTopic: 'PENDING_APPROVALS',
          },
        });
      }
    }

    // ------------------------------------------------------------------------
    // INTENT J: UPCOMING HOLIDAYS & CALENDAR
    // ------------------------------------------------------------------------
    if (
      query.includes('holiday') ||
      query.includes('next holiday') ||
      query.includes('diwali') ||
      query.includes('christmas') ||
      query.includes('new year') ||
      query.includes('calendar') ||
      query.includes('office closed')
    ) {
      citations.push('Company Holiday Calendar');
      const upcomingHolidays = holidays.filter((h) => new Date(h.date) >= today);

      if (upcomingHolidays.length > 0) {
        const nextHoli = upcomingHolidays[0];
        const daysLeft = Math.ceil((new Date(nextHoli.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        reply += `🎉 **Upcoming Company Holidays:**\n\n`;
        reply += `The next official holiday is **${nextHoli.name}** on **${formatDate(nextHoli.date)}** (${daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow!' : `in ${daysLeft} days`}).\n\n`;
        reply += `**Next 4 Scheduled Holidays:**\n`;

        upcomingHolidays.slice(0, 4).forEach((h) => {
          reply += `• **${h.name}**: ${formatDate(h.date)} (${h.type || 'PUBLIC'})\n`;
        });
      } else {
        reply += `All scheduled holidays for this calendar period have completed. HR will update next year's schedule shortly.`;
      }
      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        contextUpdate: { lastTopic: 'HOLIDAYS' },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT K: COMPANY NOTICES & ANNOUNCEMENTS
    // ------------------------------------------------------------------------
    if (
      query.includes('announcement') ||
      query.includes('notice') ||
      query.includes('broadcast') ||
      query.includes('bulletin') ||
      query.includes('urgent news') ||
      query.includes('townhall')
    ) {
      citations.push('Company Notice Board');
      const activeAnn = announcements.filter((a: any) => a.isActive !== false);

      if (activeAnn.length > 0) {
        reply += `📢 **Latest Company Notices & Broadcasts:**\n\n`;
        activeAnn.slice(0, 3).forEach((ann: any) => {
          reply += `• **${ann.isPinned ? '📌 ' : ''}${ann.title}** (${ann.category || 'GENERAL'})\n`;
          reply += `  ${ann.content.slice(0, 140)}...\n\n`;
        });
        reply += `View full announcements, circular downloads, and acknowledgment receipts under **Company > Notice Board**.`;
      } else {
        reply += `There are no urgent company announcements at this time. All operations are running normally.`;
      }
      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        contextUpdate: { lastTopic: 'NOTICES' },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT L: CLAIMS & EXPENSE REIMBURSEMENT PROCESS
    // ------------------------------------------------------------------------
    if (
      query.includes('claim') ||
      query.includes('expense') ||
      query.includes('reimbursement') ||
      query.includes('travel allowance') ||
      query.includes('file claim')
    ) {
      citations.push('Expense & Travel Claim Policy');
      reply += `💰 **Expense & Travel Reimbursement Guidelines:**\n\n`;
      reply += `1. **Eligibility**: Expenses incurred for official business travel, client meetings, or company assets are eligible.\n`;
      reply += `2. **Receipts**: Valid tax invoices or payment receipts must be uploaded for each claim.\n`;
      reply += `3. **Submission**: Navigate to **Self Service > Claims**, click **+ New Claim**, enter the amount, and attach bills.\n`;
      reply += `4. **Payout**: Once approved by your manager and Finance, reimbursement is disbursed in the next monthly payroll run.`;
      return sendAssistantResponse({
        reply: reply.trim(),
        citations,
        contextUpdate: { lastTopic: 'CLAIMS' },
      });
    }

    // ------------------------------------------------------------------------
    // INTENT M: PILLAR 2 - TRUE HYBRID SEMANTIC RAG (VECTOR EMBEDDINGS + BM25)
    // ------------------------------------------------------------------------
    const ragResult = executeHybridRag({
      query: message,
      companyName: company.name,
      policies,
    });

    if (ragResult) {
      return sendAssistantResponse({
        reply: ragResult.answer,
        citations: ragResult.citations,
        contextUpdate: {
          lastPolicyTitle: ragResult.policy.title,
          lastTopic: 'POLICY_INQUIRY',
        },
      });
    }

    // ------------------------------------------------------------------------
    // DEFAULT ROLE-AWARE GREETING & CAPABILITY OVERVIEW
    // ------------------------------------------------------------------------
    if (citations.length === 0 && policies.length > 0) {
      citations.push(policies[0].title);
    }

    const greetingName = currentUser?.firstName || 'there';
    if (isCompanyAdmin) {
      reply = `Hello ${greetingName}! I am your **Uptrix Enterprise AI Assistant** for **${company.name}**.\n\nAs a **Company Administrator**, your search is scoped exclusively to your organization:\n\n• **Headcount & Departments**: Ask *"What is our total headcount?"* or *"List departments"*\n• **Attendance Operations**: Ask *"Who is on leave today?"* or *"Today's attendance snapshot"*\n• **Workflows & Approvals**: Ask *"What requests are pending approval?"*\n• **Subscription & Governance**: Ask *"What is our subscription tier and seat limit?"*\n• **Company Notices & Policies**: Ask *"Show latest company announcements"* or *"Explain travel policy"*\n\nHow can I help you manage your workspace today?`;
    } else if (isHr) {
      reply = `Hello ${greetingName}! I am your **Uptrix HR AI Assistant** for **${company.name}**.\n\nAs an **HR Manager**, you can query team and workforce operations:\n\n• **Team Attendance**: Ask *"Who is on leave today?"* or *"Attendance summary"*\n• **Approvals**: Ask *"Show pending leave and claim requests"*\n• **Headcount**: Ask *"How many employees in each department?"*\n• **Holidays & Circulars**: Ask *"When is the next company holiday?"* or *"Show notice board"*\n\nWhat would you like to check?`;
    } else {
      reply = `Hello ${greetingName}! I am your personal **Uptrix HR AI Assistant**.\n\nI am grounded in **${company.name}** official policies and your employment profile:\n\n• **Leave Quotas**: Ask *"How many leave days do I have available?"*\n• **Attendance**: Ask *"What was my punch-in time today?"*\n• **My Profile**: Ask *"Who is my manager?"* or *"What is my shift timing?"*\n• **Upcoming Holidays**: Ask *"When is the next official holiday?"*\n• **Company Policies**: Ask *"What is our medical/sick leave policy?"* or *"How do I claim reimbursement?"*\n• **Notices**: Ask *"What are the latest company announcements?"*\n\nHow may I assist you today?`;
    }

    return sendAssistantResponse({
      reply: reply.trim(),
      citations,
      contextUpdate: {
        lastTopic: 'GENERAL_GREETING',
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /assistant/execute-tool (Executes confirmed action card)
router.post('/execute-tool', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const { tool, payload, sessionId } = req.body;

    if (!tool || !payload) {
      return next(new AppError(400, 'INVALID_BODY', 'Tool name and payload are required'));
    }

    const result = await executeAgentTool({
      userId,
      companyId,
      tool,
      payload,
    });

    if (sessionId) {
      appendMessage(
        sessionId,
        userId,
        companyId,
        {
          id: `asst_exec_${Date.now()}`,
          sender: 'assistant',
          text: `✅ **Action Confirmed:** ${result.message}`,
          citations: ['Autonomous Action Engine'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: Date.now(),
        },
        {
          pendingAction: null,
        }
      );
    }

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
