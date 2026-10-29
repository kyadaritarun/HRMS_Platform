import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middlewares/auth.js';
import { tenantMatchMiddleware } from '../middlewares/tenantMatch.js';
import { policyComplianceMiddleware } from '../middlewares/policyCompliance.js';
import { AppError } from '../middlewares/errorHandler.js';

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
      return res.json({
        reply: `🔒 **Access Restricted:** We do not have access to other organizations. Under our enterprise multi-tenant security architecture, all queries and data are strictly isolated exclusively to your company workspace (**${company.name}**).`,
        citations: ['Multi-Tenant Data Isolation & Workspace Governance'],
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
        select: { title: true, extractedText: true, policyType: true, version: true },
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
      return res.json({ reply: reply.trim(), citations });
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
      reply += `For urgent workplace issues, you can also speak directly with your reporting manager.`;
      return res.json({ reply: reply.trim(), citations });
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
      reply += `To apply for time-off:\n1. Open **Self Service > Leaves**.\n2. Select your leave category, dates, and reason.\n3. Submit for managerial approval.`;
      return res.json({ reply: reply.trim(), citations });
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
      query.includes('how to check in')
    ) {
      citations.push('Daily Time & Attendance Log');
      if (todaySession) {
        const inTime = new Date(todaySession.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        reply += `⏱️ **Your Attendance Status Today:**\n\n`;
        reply += `• **Status:** Punched In (${todaySession.workMode || 'WFO'})\n`;
        reply += `• **First Punch In:** ${inTime}\n`;
        reply += `• **Standard Shift Timing:** ${currentUser?.shiftTiming || '09:00 AM - 06:00 PM'}\n\n`;
        reply += `Remember to punch out before ending your shift from the top bar timer or **Self Service > Attendance**.`;
      } else {
        reply += `⏱️ **You have not punched in yet today.**\n\n`;
        reply += `To punch in:\n• Click the punch-in button beside your profile at the top of the screen, or\n• Navigate to **Self Service > Attendance** to mark your geolocation-verified presence.`;
      }
      return res.json({ reply: reply.trim(), citations });
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
      return res.json({ reply: reply.trim(), citations });
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
      return res.json({ reply: reply.trim(), citations });
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
      return res.json({ reply: reply.trim(), citations });
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
      return res.json({ reply: reply.trim(), citations });
    }

    // ------------------------------------------------------------------------
    // INTENT I: PENDING WORKFLOWS & APPROVALS (ADMIN & HR ONLY)
    // ------------------------------------------------------------------------
    if (
      (isCompanyAdmin || isHr) &&
      (query.includes('pending requests') ||
        query.includes('pending approvals') ||
        query.includes('pending leaves') ||
        query.includes('pending claims') ||
        query.includes('what needs approval'))
    ) {
      citations.push('Workforce Approvals Desk');
      const counts: Record<string, number> = { LEAVE: 0, CLAIM: 0, COMP_OFF: 0, REGULARIZATION: 0 };
      pendingRequests.forEach((r) => {
        counts[r.type] = (counts[r.type] || 0) + 1;
      });

      const totalPending = pendingRequests.length;
      reply += `📋 **Pending Approval Summary:**\n\n`;
      reply += `• **Total Pending Items:** ${totalPending}\n`;
      reply += `• **Leave Requests:** ${counts.LEAVE || 0}\n`;
      reply += `• **Expense Claims:** ${counts.CLAIM || 0}\n`;
      reply += `• **Attendance Regularizations:** ${counts.REGULARIZATION || 0}\n`;
      reply += `• **Comp-Off Claims:** ${counts.COMP_OFF || 0}\n\n`;
      reply += `Review and approve requests directly from **Assigned To Me > Approval Requests**.`;
      return res.json({ reply: reply.trim(), citations });
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
      return res.json({ reply: reply.trim(), citations });
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
      return res.json({ reply: reply.trim(), citations });
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
      return res.json({ reply: reply.trim(), citations });
    }

    // ------------------------------------------------------------------------
    // INTENT M: OFFICIAL COMPANY POLICIES MATCHING
    // ------------------------------------------------------------------------
    let matchedPolicy = null;
    for (const p of policies) {
      const pTitle = p.title.toLowerCase();
      const pText = (p.extractedText || '').toLowerCase();

      if (
        (query.includes('travel') || query.includes('expense') || query.includes('reimburse')) &&
        (p.policyType === 'CLAIM' || pTitle.includes('travel') || pTitle.includes('expense'))
      ) {
        matchedPolicy = p;
        break;
      } else if (
        (query.includes('leave') || query.includes('vacation') || query.includes('sick') || query.includes('maternity') || query.includes('paternity')) &&
        (p.policyType === 'LEAVE' || pTitle.includes('leave'))
      ) {
        matchedPolicy = p;
        break;
      } else if (
        (query.includes('conduct') || query.includes('ethics') || query.includes('dress code') || query.includes('behavior')) &&
        (p.policyType === 'HR' || pTitle.includes('conduct'))
      ) {
        matchedPolicy = p;
        break;
      } else if (
        (query.includes('posh') || query.includes('harassment') || query.includes('safety') || query.includes('protection')) &&
        (pTitle.includes('posh') || pTitle.includes('harassment'))
      ) {
        matchedPolicy = p;
        break;
      } else if (
        (query.includes('notice period') || query.includes('resignation') || query.includes('exit')) &&
        (pTitle.includes('exit') || pTitle.includes('notice') || pTitle.includes('resignation'))
      ) {
        matchedPolicy = p;
        break;
      } else if (
        (query.includes('wfh') || query.includes('remote') || query.includes('work from home')) &&
        (pTitle.includes('wfh') || pTitle.includes('remote') || pText.includes('remote work'))
      ) {
        matchedPolicy = p;
        break;
      }
    }

    if (matchedPolicy) {
      citations.push(matchedPolicy.title);
      reply += `📄 **According to the official ${matchedPolicy.title}:**\n\n`;
      reply += `${matchedPolicy.extractedText || 'Please refer to the full policy document in the policies repository.'}\n\n`;
      reply += `Full signed document is available under **Self Service > Policies**.`;
      return res.json({ reply: reply.trim(), citations });
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

    return res.json({
      reply: reply.trim(),
      citations,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
