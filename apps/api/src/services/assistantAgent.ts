import prisma from '../lib/prisma.js';
import { createRequest, decideRequest } from './requests.js';
import { checkIn, checkOut } from './attendance.js';
import { logActivity } from './activityLog.js';
import { AppError } from '../middlewares/errorHandler.js';

export interface AgentActionCard {
  type: 'CONFIRM_ACTION' | 'ACTION_EXECUTED' | 'ACTION_FAILED';
  tool: 'apply_leave' | 'punch_attendance' | 'create_ticket' | 'decide_request';
  status: 'PROPOSED' | 'EXECUTED' | 'CANCELLED';
  title: string;
  subtitle: string;
  summary: { label: string; value: string; highlight?: boolean }[];
  payload: Record<string, any>;
  meta?: Record<string, any>;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface ParseResult {
  isAction: boolean;
  reply?: string;
  citations?: string[];
  action?: AgentActionCard;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};
const MONTH_PATTERN = Object.keys(MONTH_MAP).join('|');

function parseDateTokens(dayStr: string, monthStr: string, yearStr?: string, refDate: Date = new Date()): Date {
  const day = parseInt(dayStr, 10);
  let month = -1;
  const mLower = monthStr.toLowerCase();
  if (MONTH_MAP[mLower] !== undefined) {
    month = MONTH_MAP[mLower];
  } else {
    month = parseInt(monthStr, 10) - 1;
  }
  let year = yearStr ? parseInt(yearStr, 10) : refDate.getFullYear();
  if (year < 100) year += 2000;
  // If year omitted and month is in the past (> 2 months ago), rollover to next year
  if (!yearStr && month < refDate.getMonth() - 2) {
    year += 1;
  }
  return new Date(year, month, day);
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface ParsedDatesAndReason {
  startDate: string;
  endDate: string;
  days: number;
  dateLabel: string;
  matchedDateSpan: string;
  reason: string;
  inferredCategory: 'SICK' | 'CASUAL' | 'EARNED' | null;
}

/**
 * Normalizes and extracts dates, durations, and reasons from natural language.
 * Handles specific calendar dates (e.g. "14-nov", "10-nov to 12-nov"), ranges,
 * durations ("3 days starting tomorrow"), relative terms, and user typos ("traving").
 */
export function parseDatesAndReason(rawText: string, referenceDate: Date = new Date()): ParsedDatesAndReason {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  let matchedDateSpan = '';
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  // Pattern A: Named Month Range: '10-nov to 12-nov' or 'from 10-nov to 12-nov' or '10 nov to 12 nov' or '10th nov - 12th nov'
  const rangePattern1 = new RegExp(
    '(?:from|for|on)?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:[-/\\s]+)(' + MONTH_PATTERN + ')(?:[-/\\s]+(\\d{2,4}))?' +
    '\\s*(?:to|until|-|through)\\s*' +
    '(?:from|for|on)?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:[-/\\s]+)(' + MONTH_PATTERN + ')(?:[-/\\s]+(\\d{2,4}))?',
    'i'
  );

  // Pattern B: '10 to 12 nov' or 'from 10 to 12 november'
  const rangePattern2 = new RegExp(
    '(?:from|for|on)?\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:to|until|-)\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:[-/\\s]+)(' + MONTH_PATTERN + ')(?:[-/\\s]+(\\d{2,4}))?',
    'i'
  );

  // Pattern C: 'nov 10 to nov 12' or 'nov 10 to 12'
  const rangePattern3 = new RegExp(
    '(?:from|for|on)?\\s*(' + MONTH_PATTERN + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:to|until|-)\\s*(?:(' + MONTH_PATTERN + ')\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:[-/\\s]+(\\d{2,4}))?',
    'i'
  );

  // Pattern D: Numeric date range: '10/11/2026 to 12/11/2026' or '10/11 to 12/11' or '10-11 to 12-11'
  const rangePatternNumeric = new RegExp(
    '(?:from|for|on)?\\s*(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?\\s*(?:to|until|-)\\s*(?:from|for|on)?\\s*(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?',
    'i'
  );

  // Pattern E: Duration from calendar date: '3 days from 10-nov'
  const durationFromCal = new RegExp(
    '(?:for\\s+)?(\\d+)\\s+days?\\s+(?:from|starting\\s+from|starting|on)?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:[-/\\s]+)(' + MONTH_PATTERN + ')(?:[-/\\s]+(\\d{2,4}))?',
    'i'
  );

  // Pattern F: Single named date: '14-nov', '14th nov', '14 nov 2026', 'on 14-nov', 'for 14-nov'
  const singleDatePattern1 = new RegExp(
    '(?:on|for|from)?\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:[-/\\s]+)(' + MONTH_PATTERN + ')(?:[-/\\s]+(\\d{2,4}))?',
    'i'
  );

  // Pattern G: Single named date month-first: 'nov 14', 'november 14th'
  const singleDatePattern2 = new RegExp(
    '(?:on|for|from)?\\s*(' + MONTH_PATTERN + ')\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[-/\\s]+(\\d{2,4}))?',
    'i'
  );

  // Pattern H: Single numeric date: '14/11/2026' or '14/11'
  const singleDatePatternNumeric = new RegExp(
    '(?:on|for|from)?\\s*(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?',
    'i'
  );

  const m1 = lower.match(rangePattern1);
  const m2 = lower.match(rangePattern2);
  const m3 = lower.match(rangePattern3);
  const mNum = lower.match(rangePatternNumeric);
  const mDurCal = lower.match(durationFromCal);

  if (m1) {
    matchedDateSpan = m1[0];
    startDate = parseDateTokens(m1[1], m1[2], m1[3], referenceDate);
    endDate = parseDateTokens(m1[4], m1[5], m1[6], referenceDate);
  } else if (m2) {
    matchedDateSpan = m2[0];
    startDate = parseDateTokens(m2[1], m2[3], m2[4], referenceDate);
    endDate = parseDateTokens(m2[2], m2[3], m2[4], referenceDate);
  } else if (m3) {
    matchedDateSpan = m3[0];
    const mEndMonth = m3[3] || m3[1];
    startDate = parseDateTokens(m3[2], m3[1], m3[5], referenceDate);
    endDate = parseDateTokens(m3[4], mEndMonth, m3[5], referenceDate);
  } else if (mNum) {
    matchedDateSpan = mNum[0];
    startDate = parseDateTokens(mNum[1], mNum[2], mNum[3], referenceDate);
    endDate = parseDateTokens(mNum[4], mNum[5], mNum[6], referenceDate);
  } else if (mDurCal) {
    matchedDateSpan = mDurCal[0];
    const count = parseInt(mDurCal[1], 10);
    startDate = parseDateTokens(mDurCal[2], mDurCal[3], mDurCal[4], referenceDate);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (count - 1));
  } else {
    // Check single dates
    const s1 = lower.match(singleDatePattern1);
    const s2 = lower.match(singleDatePattern2);
    const sNum = lower.match(singleDatePatternNumeric);

    if (s1 && !['apply', 'leave'].includes(s1[0].trim())) {
      matchedDateSpan = s1[0];
      startDate = parseDateTokens(s1[1], s1[2], s1[3], referenceDate);
      endDate = new Date(startDate);
    } else if (s2) {
      matchedDateSpan = s2[0];
      startDate = parseDateTokens(s2[2], s2[1], s2[3], referenceDate);
      endDate = new Date(startDate);
    } else if (sNum) {
      matchedDateSpan = sNum[0];
      startDate = parseDateTokens(sNum[1], sNum[2], sNum[3], referenceDate);
      endDate = new Date(startDate);
    }
  }

  // Duration count relative e.g. "for 3 days starting tomorrow"
  if (!startDate) {
    const durationMatch = lower.match(/(?:for\s+)?(\d+)\s+days?\s+(?:from|starting\s+from|starting)\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    if (durationMatch) {
      const dayCount = parseInt(durationMatch[1], 10);
      const startWord = durationMatch[2].toLowerCase();
      let startOffset = 0;
      if (startWord === 'tomorrow') startOffset = 1;
      else if (startWord !== 'today') {
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayIdx = daysOfWeek.indexOf(startWord);
        if (dayIdx >= 0) {
          let diff = dayIdx - referenceDate.getDay();
          if (diff <= 0) diff += 7;
          startOffset = diff;
        }
      }
      matchedDateSpan = durationMatch[0];
      const start = new Date(referenceDate);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() + startOffset);
      const end = new Date(start);
      end.setDate(end.getDate() + (dayCount - 1));
      startDate = start;
      endDate = end;
    }
  }

  // Relative dates fallback if no calendar date matched
  if (!startDate) {
    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);

    if (lower.includes('day after tomorrow')) {
      matchedDateSpan = 'day after tomorrow';
      const target = new Date(ref);
      target.setDate(target.getDate() + 2);
      startDate = target;
      endDate = target;
    } else if (lower.includes('tomorrow')) {
      matchedDateSpan = 'tomorrow';
      const target = new Date(ref);
      target.setDate(target.getDate() + 1);
      startDate = target;
      endDate = target;
    } else if (lower.includes('today')) {
      matchedDateSpan = 'today';
      startDate = ref;
      endDate = ref;
    } else {
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < daysOfWeek.length; i++) {
        const dayName = daysOfWeek[i];
        if (lower.includes(dayName)) {
          matchedDateSpan = dayName;
          const currentDay = ref.getDay();
          let diff = i - currentDay;
          if (diff <= 0) diff += 7;
          const target = new Date(ref);
          target.setDate(target.getDate() + diff);
          startDate = target;
          endDate = target;
          break;
        }
      }
    }
  }

  // Default to tomorrow if still not set
  if (!startDate) {
    const target = new Date(referenceDate);
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + 1);
    startDate = target;
    endDate = target;
  }

  const diffMs = (endDate || startDate).getTime() - startDate.getTime();
  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  const startStr = startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const endStr = (endDate || startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  const dateLabel = days === 1 ? startStr : `${startStr} to ${endStr}`;

  // Clean text by removing the matched date span so it doesn't contaminate reason extraction
  let residual = lower;
  if (matchedDateSpan) {
    residual = residual.replace(matchedDateSpan, ' ');
  }

  // Reason extraction from residual
  let reason = '';
  const reasonKeywords = [
    { regex: /\b(traving|traveling|travelling|travel|trip|tour|out of station|going home|visiting home)\b/i, label: 'Traveling' },
    { regex: /\b(fever|high fever|viral fever|temperature)\b/i, label: 'Fever' },
    { regex: /\b(headache|migraine)\b/i, label: 'Severe headache / Migraine' },
    { regex: /\b(stomach pain|stomach ache|food poisoning)\b/i, label: 'Stomach ache / Health issue' },
    { regex: /\b(cold|cough|flu|throat infection)\b/i, label: 'Cold & flu symptoms' },
    { regex: /\b(doctor|hospital|clinic|appointment|checkup|dentist)\b/i, label: 'Doctor appointment' },
    { regex: /\b(marriage|wedding|reception)\b/i, label: 'Attending wedding function' },
    { regex: /\b(personal|family|urgent work|personal work|emergency)\b/i, label: 'Personal work' },
  ];

  for (const kw of reasonKeywords) {
    if (kw.regex.test(residual)) {
      reason = kw.label;
      break;
    }
  }

  if (!reason) {
    const triggerMatch = residual.match(/(?:due to|because of|because|for|from|as|reason is|reason:)\s+([^.,;!]+)/i);
    if (triggerMatch && triggerMatch[1]) {
      let r = triggerMatch[1].trim();
      r = r.replace(/^(a|an|my)\s+/i, '');
      r = r.replace(/\b(leave|day|days|off|today|tomorrow|yesterday)\b/gi, '').trim();
      if (r.length > 1) {
        reason = r.charAt(0).toUpperCase() + r.slice(1);
      }
    }
  }

  if (!reason) {
    reason = 'Personal work / Requested via Uptrix AI Assistant';
  }

  // Infer leave category if not explicitly mentioned
  let inferredCategory: 'SICK' | 'CASUAL' | 'EARNED' | null = null;
  if (lower.includes('sick') || lower.includes('fever') || lower.includes('doctor') || lower.includes('medical') || lower.includes('cold') || lower.includes('migraine')) {
    inferredCategory = 'SICK';
  } else if (lower.includes('traving') || lower.includes('travel') || lower.includes('trip') || lower.includes('tour') || lower.includes('vacation')) {
    inferredCategory = 'CASUAL';
  } else if (lower.includes('casual') || lower.includes('personal') || lower.includes('urgent') || lower.includes('wedding') || lower.includes('marriage')) {
    inferredCategory = 'CASUAL';
  } else if (lower.includes('earned') || lower.includes('privilege') || lower.includes('annual')) {
    inferredCategory = 'EARNED';
  }

  return {
    startDate: formatDateStr(startDate),
    endDate: formatDateStr(endDate || startDate),
    days,
    dateLabel,
    matchedDateSpan,
    reason,
    inferredCategory,
  };
}

export interface ParseAgentIntentOpts {
  userId: number;
  companyId: number;
  query: string;
  sessionContext?: {
    lastTopic?: string;
    pendingAction?: AgentActionCard | null;
    lastPolicyTitle?: string;
  };
  previousMessages?: any[];
}

/**
 * Autonomous Tool Calling Parser (Without API Key)
 * Analyzes query intent, extracts slots, and constructs Human-in-the-Loop Action Cards.
 * Supports Multi-Turn Session Memory: modifies existing action cards and carries over context.
 */
export async function parseAgentIntent(opts: ParseAgentIntentOpts): Promise<ParseResult> {
  const { userId, companyId, query, sessionContext } = opts;
  const norm = query.toLowerCase().trim();
  const pendingAction = sessionContext?.pendingAction;

  // --------------------------------------------------------------------------
  // MULTI-TURN 1: DURATION MODIFICATION OF PENDING LEAVE CARD
  // e.g. "make it 2 days instead", "for 3 days", "change duration to 2 days"
  // --------------------------------------------------------------------------
  const durationMatch = norm.match(/(?:make it|change to|change duration to|for)\s+(\d+)\s+days?(?:\s+instead)?/i);
  if (durationMatch && pendingAction && pendingAction.tool === 'apply_leave' && pendingAction.status === 'PROPOSED') {
    const newDays = parseInt(durationMatch[1], 10);
    const start = new Date(pendingAction.payload.startDate);
    const newEnd = new Date(start);
    newEnd.setDate(newEnd.getDate() + (newDays - 1));

    const startStr = start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = newEnd.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
    const dateLabel = newDays === 1 ? startStr : `${startStr} to ${endStr}`;
    const dayText = newDays === 1 ? '1 Day' : `${newDays} Days`;

    let currentBal = 5;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { leaveBalances: true },
      });
      const balanceRecord = user?.leaveBalances.find((lb) => lb.leaveTypeId === pendingAction.payload.leaveTypeId);
      if (balanceRecord) currentBal = Number(balanceRecord.balance);
    } catch {
      // Fallback gracefully to default if DB is offline
    }
    const balanceAfter = Math.max(0, currentBal - newDays);

    const updatedCard: AgentActionCard = {
      ...pendingAction,
      summary: pendingAction.summary.map((s) => {
        if (s.label === 'Date & Duration') {
          return { ...s, value: `${dateLabel} (${dayText})` };
        }
        if (s.label === 'Quota Breakdown') {
          return { ...s, value: `${currentBal} days left → ${balanceAfter} days after approval` };
        }
        return s;
      }),
      payload: {
        ...pendingAction.payload,
        endDate: formatDateStr(newEnd),
        days: newDays,
      },
    };

    return {
      isAction: true,
      reply: `I have updated your **${pendingAction.payload.leaveTypeName}** request to **${dayText}** (${dateLabel}). Please review the updated details below and confirm.`,
      citations: ['Autonomous Action Engine (Multi-Turn Session Memory)'],
      action: updatedCard,
    };
  }

  // --------------------------------------------------------------------------
  // MULTI-TURN 2: REASON MODIFICATION OF PENDING LEAVE CARD
  // e.g. "change reason to viral fever", "and reason is family wedding"
  // --------------------------------------------------------------------------
  const reasonMatch = norm.match(/(?:change reason to|set reason to|and reason is|reason is|reason:)\s+(.+)/i);
  if (reasonMatch && pendingAction && pendingAction.tool === 'apply_leave' && pendingAction.status === 'PROPOSED') {
    let newReason = reasonMatch[1].trim();
    newReason = newReason.charAt(0).toUpperCase() + newReason.slice(1);

    const updatedCard: AgentActionCard = {
      ...pendingAction,
      summary: pendingAction.summary.map((s) => {
        if (s.label === 'Reason') {
          return { ...s, value: newReason };
        }
        return s;
      }),
      payload: {
        ...pendingAction.payload,
        reason: newReason,
      },
    };

    return {
      isAction: true,
      reply: `I have updated the reason for your **${pendingAction.payload.leaveTypeName}** to **"${newReason}"**.`,
      citations: ['Autonomous Action Engine (Multi-Turn Session Memory)'],
      action: updatedCard,
    };
  }

  // --------------------------------------------------------------------------
  // MULTI-TURN 3: TICKET ESCALATION / PRIORITY CHANGE
  // e.g. "make it urgent", "change priority to high"
  // --------------------------------------------------------------------------
  if (
    (norm.includes('urgent') || norm.includes('high priority')) &&
    pendingAction &&
    pendingAction.tool === 'create_ticket' &&
    pendingAction.status === 'PROPOSED'
  ) {
    const updatedCard: AgentActionCard = {
      ...pendingAction,
      summary: pendingAction.summary.map((s) => {
        if (s.label === 'Priority') {
          return { ...s, value: 'HIGH' };
        }
        return s;
      }),
      payload: {
        ...pendingAction.payload,
        priority: 'HIGH',
      },
    };

    return {
      isAction: true,
      reply: `I have updated your ticket priority to **HIGH** based on your feedback.`,
      citations: ['Autonomous Action Engine (Multi-Turn Session Memory)'],
      action: updatedCard,
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 1: APPLY LEAVE (WITH ANAPHORA & CONTEXT CARRYOVER)
  // --------------------------------------------------------------------------
  const isLeaveCommand =
    (norm.includes('apply') &&
      (norm.includes('leave') ||
        norm.includes('off') ||
        norm.includes('vacation') ||
        norm.includes('one') ||
        norm.includes('it') ||
        norm.includes('that'))) ||
    norm.includes('take leave') ||
    norm.includes('taking leave') ||
    norm.includes('request leave') ||
    norm.includes('need leave') ||
    norm.includes('want leave') ||
    norm.includes('sick leave') ||
    norm.includes('casual leave') ||
    norm.includes('earned leave') ||
    norm.includes('apply for leave') ||
    norm.includes('take off') ||
    norm.includes('day off') ||
    norm.includes('days off') ||
    norm.includes('the casual one') ||
    norm.includes('the sick one') ||
    norm.includes('the earned one');

  // Exclude simple queries like "leave balance" or "how many leaves"
  const isBalanceQueryOnly =
    (norm.includes('leave balance') ||
      norm.includes('how many leaves') ||
      norm.includes('remaining leaves') ||
      norm.includes('quota')) &&
    !norm.includes('apply');

  if (isLeaveCommand && !isBalanceQueryOnly) {
    // 1. Fetch user's leave balances & active leave types
    let user: any = null;
    let activeLeaveTypes: any[] = [];
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          manager: { select: { id: true, firstName: true, lastName: true } },
          leaveBalances: {
            include: { leaveType: true },
          },
        },
      });

      activeLeaveTypes = await prisma.leaveType.findMany({
        where: { companyId, isActive: true },
      });
    } catch {
      // Fallback active types if DB is disconnected / in test environment
      activeLeaveTypes = [
        { id: 1, name: 'Casual Leave', code: 'CASUAL' },
        { id: 2, name: 'Sick Leave', code: 'SICK' },
        { id: 3, name: 'Earned Leave', code: 'EARNED' },
      ];
    }

    if (activeLeaveTypes.length === 0) {
      return {
        isAction: true,
        reply: `⚠️ Your organization has not configured active leave types yet. Please contact HR to configure company leave policies.`,
      };
    }

    // 2. Extract dates, duration, reason, and inferred category
    const parsedData = parseDatesAndReason(query);

    // 3. Identify requested leave type (including multi-turn anaphora like "the casual one")
    let matchedType = null;
    if (
      norm.includes('sick') ||
      norm.includes('medical') ||
      norm.includes('fever') ||
      norm.includes('unwell') ||
      norm.includes('doctor') ||
      norm.includes('ill') ||
      norm.includes('sick one') ||
      parsedData.inferredCategory === 'SICK'
    ) {
      matchedType = activeLeaveTypes.find((lt) => lt.code === 'SICK' || lt.name.toLowerCase().includes('sick'));
    } else if (
      norm.includes('casual') ||
      norm.includes('urgent') ||
      norm.includes('personal') ||
      norm.includes('family') ||
      norm.includes('casual one') ||
      parsedData.inferredCategory === 'CASUAL'
    ) {
      matchedType = activeLeaveTypes.find((lt) => lt.code === 'CASUAL' || lt.name.toLowerCase().includes('casual'));
    } else if (
      norm.includes('earned') ||
      norm.includes('privilege') ||
      norm.includes('annual') ||
      norm.includes('vacation') ||
      norm.includes('earned one') ||
      parsedData.inferredCategory === 'EARNED'
    ) {
      matchedType = activeLeaveTypes.find((lt) => lt.code === 'EARNED' || lt.name.toLowerCase().includes('earned'));
    }

    // Fallback: Pick matching type or active type with balance > 0
    if (!matchedType) {
      if (parsedData.inferredCategory === 'SICK') {
        matchedType = activeLeaveTypes.find((lt) => lt.code === 'SICK' || lt.name.toLowerCase().includes('sick'));
      } else if (parsedData.inferredCategory === 'CASUAL') {
        matchedType = activeLeaveTypes.find((lt) => lt.code === 'CASUAL' || lt.name.toLowerCase().includes('casual'));
      } else if (parsedData.inferredCategory === 'EARNED') {
        matchedType = activeLeaveTypes.find((lt) => lt.code === 'EARNED' || lt.name.toLowerCase().includes('earned'));
      }
    }

    if (!matchedType) {
      const typeWithBalance = user?.leaveBalances?.find((lb: any) => Number(lb.balance) > 0);
      matchedType = typeWithBalance ? typeWithBalance.leaveType : activeLeaveTypes[0];
    }

    // 4. Check user's balance
    const userBalanceRecord = user?.leaveBalances?.find((lb: any) => lb.leaveTypeId === matchedType!.id);
    const currentBalance = userBalanceRecord ? Number(userBalanceRecord.balance) : 0;
    const balanceAfter = Math.max(0, currentBalance - parsedData.days);

    const approverName = user?.manager
      ? `${user.manager.firstName} ${user.manager.lastName}`
      : 'Reporting Manager / HR Desk';

    const dayText = parsedData.days === 1 ? '1 Day' : `${parsedData.days} Days`;

    const actionCard: AgentActionCard = {
      type: 'CONFIRM_ACTION',
      tool: 'apply_leave',
      status: 'PROPOSED',
      title: `${matchedType.name} Application`,
      subtitle: `Autonomous action prepared • Requires 1-click confirmation`,
      summary: [
        { label: 'Leave Category', value: matchedType.name, highlight: true },
        { label: 'Date & Duration', value: `${parsedData.dateLabel} (${dayText})` },
        { label: 'Quota Breakdown', value: `${currentBalance} days left → ${balanceAfter} days after approval` },
        { label: 'Reporting Approver', value: approverName },
        { label: 'Reason', value: parsedData.reason },
      ],
      payload: {
        leaveTypeId: matchedType.id,
        leaveTypeName: matchedType.name,
        startDate: parsedData.startDate,
        endDate: parsedData.endDate,
        days: parsedData.days,
        reason: parsedData.reason,
      },
      meta: {
        currentBalance,
        days: parsedData.days,
        balanceAfter,
        leaveTypeName: matchedType.name,
      },
      confirmLabel: `Confirm & Apply ${matchedType.name}`,
      cancelLabel: 'Dismiss',
    };

    return {
      isAction: true,
      reply: `I have prepared your **${matchedType.name}** request for **${parsedData.dateLabel}** (${dayText}). Please review the details below and click **Confirm & Apply** to submit for managerial approval.`,
      citations: ['Leave Balances & Quota Master', 'Autonomous Action Engine'],
      action: actionCard,
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 2: PUNCH ATTENDANCE (CHECK IN / CHECK OUT)
  // --------------------------------------------------------------------------
  const isPunchInCommand =
    norm.includes('punch in') ||
    norm.includes('check in') ||
    norm.includes('clock in') ||
    norm.includes('mark present') ||
    norm.includes('mark attendance');

  const isPunchOutCommand =
    norm.includes('punch out') ||
    norm.includes('check out') ||
    norm.includes('clock out') ||
    norm.includes('end shift') ||
    norm.includes('leaving office');

  if (isPunchInCommand || isPunchOutCommand) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeSession = await prisma.attendance.findFirst({
      where: {
        userId,
        checkIn: { gte: today },
      },
      orderBy: { checkIn: 'desc' },
    });

    const workMode = norm.includes('wfh') || norm.includes('home') || norm.includes('remote') ? 'WFH' : 'WFO';

    if (isPunchInCommand) {
      if (activeSession && !activeSession.checkOut) {
        const inTime = new Date(activeSession.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          isAction: true,
          reply: `⏱️ **You are already checked in today!**\n\n• **First Punch In:** ${inTime} (${activeSession.workMode || 'WFO'})\n• **Status:** Active shift in progress.\n\nWould you like me to punch you out instead?`,
          citations: ['Live Attendance Punch System'],
        };
      }

      const actionCard: AgentActionCard = {
        type: 'CONFIRM_ACTION',
        tool: 'punch_attendance',
        status: 'PROPOSED',
        title: `Punch In (${workMode})`,
        subtitle: `Record your work presence today`,
        summary: [
          { label: 'Work Mode', value: workMode === 'WFH' ? 'Work From Home' : 'Work From Office', highlight: true },
          { label: 'Punch Time', value: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          { label: 'Date', value: new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) },
        ],
        payload: {
          action: 'CHECK_IN',
          workMode,
          note: 'Punched in via AI Assistant',
        },
        confirmLabel: `Confirm Punch In (${workMode})`,
        cancelLabel: 'Cancel',
      };

      return {
        isAction: true,
        reply: `Ready to punch in for today as **${workMode === 'WFH' ? 'Work From Home' : 'Work From Office'}**. Click below to confirm.`,
        citations: ['Daily Time & Attendance Log', 'Autonomous Action Engine'],
        action: actionCard,
      };
    }

    if (isPunchOutCommand) {
      if (!activeSession) {
        return {
          isAction: true,
          reply: `⏱️ **You have not checked in yet today.** Please punch in first before checking out.`,
          citations: ['Daily Time & Attendance Log'],
        };
      }

      if (activeSession.checkOut) {
        const outTime = new Date(activeSession.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return {
          isAction: true,
          reply: `⏱️ You have already punched out for today at **${outTime}**. Your shift has concluded.`,
          citations: ['Daily Time & Attendance Log'],
        };
      }

      const actionCard: AgentActionCard = {
        type: 'CONFIRM_ACTION',
        tool: 'punch_attendance',
        status: 'PROPOSED',
        title: `Punch Out & Complete Shift`,
        subtitle: `Calculate final shift duration and punch out`,
        summary: [
          { label: 'Check-In Time', value: new Date(activeSession.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
          { label: 'Punch-Out Time', value: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), highlight: true },
        ],
        payload: {
          action: 'CHECK_OUT',
          note: 'Punched out via AI Assistant',
        },
        confirmLabel: 'Confirm Punch Out',
        cancelLabel: 'Cancel',
      };

      return {
        isAction: true,
        reply: `Ready to end your shift and record punch-out. Please confirm below.`,
        citations: ['Daily Time & Attendance Log', 'Autonomous Action Engine'],
        action: actionCard,
      };
    }
  }

  // --------------------------------------------------------------------------
  // TOOL 3: CREATE SUPPORT TICKET
  // --------------------------------------------------------------------------
  const isTicketCommand =
    (norm.includes('raise') && (norm.includes('ticket') || norm.includes('issue') || norm.includes('complaint'))) ||
    (norm.includes('create') && norm.includes('ticket')) ||
    (norm.includes('submit') && norm.includes('ticket')) ||
    norm.includes('file ticket') ||
    norm.includes('open ticket') ||
    norm.includes('not working ticket') ||
    norm.includes('broken monitor') ||
    norm.includes('broken laptop') ||
    norm.includes('mouse not working') ||
    norm.includes('vpn not working');

  if (isTicketCommand) {
    // Determine category
    let category = 'HR';
    if (
      norm.includes('laptop') ||
      norm.includes('mouse') ||
      norm.includes('keyboard') ||
      norm.includes('monitor') ||
      norm.includes('screen') ||
      norm.includes('charger') ||
      norm.includes('wifi') ||
      norm.includes('vpn') ||
      norm.includes('software') ||
      norm.includes('hardware') ||
      norm.includes('it')
    ) {
      category = 'IT';
    } else if (
      norm.includes('salary') ||
      norm.includes('tax') ||
      norm.includes('payslip') ||
      norm.includes('deduction') ||
      norm.includes('bank') ||
      norm.includes('reimburse') ||
      norm.includes('claim') ||
      norm.includes('finance')
    ) {
      category = 'FINANCE';
    }

    // Determine subject
    let subject = 'Support Request via AI Assistant';
    if (norm.includes('mouse')) subject = 'Computer Mouse Malfunction';
    else if (norm.includes('laptop')) subject = 'Laptop Hardware / Performance Issue';
    else if (norm.includes('charger')) subject = 'Power Adapter / Charger Replacement';
    else if (norm.includes('vpn')) subject = 'VPN Connection Failure';
    else if (norm.includes('wifi')) subject = 'Office Wi-Fi Connectivity Issue';
    else if (norm.includes('salary')) subject = 'Salary & Payroll Query';
    else if (norm.includes('ticket for')) {
      const match = norm.split('ticket for')[1];
      if (match && match.trim()) subject = match.trim().charAt(0).toUpperCase() + match.trim().slice(1);
    }

    const priority = norm.includes('urgent') || norm.includes('critical') || norm.includes('immediately') ? 'HIGH' : 'MEDIUM';

    const actionCard: AgentActionCard = {
      type: 'CONFIRM_ACTION',
      tool: 'create_ticket',
      status: 'PROPOSED',
      title: `Create ${category} Support Ticket`,
      subtitle: `Auto-routed to the designated ${category} Operations Desk`,
      summary: [
        { label: 'Category', value: `${category} Support Desk`, highlight: true },
        { label: 'Subject', value: subject },
        { label: 'Priority', value: priority },
        { label: 'Description', value: query },
      ],
      payload: {
        category,
        subject,
        description: query,
        priority,
      },
      confirmLabel: `Confirm & Raise ${category} Ticket`,
      cancelLabel: 'Cancel',
    };

    return {
      isAction: true,
      reply: `I have prepared a **${category} Support Ticket** for you. Review the details below and click **Confirm** to submit it directly to the ${category} team.`,
      citations: ['Helpdesk SLA & Ticketing Policy', 'Autonomous Action Engine'],
      action: actionCard,
    };
  }

  // --------------------------------------------------------------------------
  // TOOL 4: APPROVE / REJECT REQUEST VIA TEXT COMMAND
  // e.g. "approve request 5", "reject request #12", "approve request #5"
  // --------------------------------------------------------------------------
  const approveRejectMatch = norm.match(/(approve|reject)\s+(?:request\s+)?#?(\d+)/i);
  if (approveRejectMatch) {
    const actionDecision = approveRejectMatch[1].toLowerCase() === 'approve' ? 'APPROVED' : 'REJECTED';
    const reqId = parseInt(approveRejectMatch[2], 10);

    let targetReq: any = null;
    try {
      targetReq = await prisma.request.findFirst({
        where: { id: reqId, companyId },
        include: {
          user: { select: { firstName: true, lastName: true } },
          leaveType: { select: { name: true } },
        },
      });
    } catch {
      targetReq = null;
    }

    if (targetReq) {
      const requesterName = `${targetReq.user?.firstName || 'Staff'} ${targetReq.user?.lastName || 'Member'}`.trim();
      const desc = targetReq.type === 'LEAVE'
        ? `${Number(targetReq.days) || 1} day(s) ${targetReq.leaveType?.name || 'Leave'}`
        : `${targetReq.type} request`;

      const actionCard: AgentActionCard = {
        type: 'CONFIRM_ACTION',
        tool: 'decide_request',
        status: 'PROPOSED',
        title: `${actionDecision === 'APPROVED' ? 'Approve' : 'Reject'} Request #${reqId}`,
        subtitle: `${requesterName} • ${desc}`,
        summary: [
          { label: 'Decision', value: actionDecision, highlight: true },
          { label: 'Requester', value: requesterName },
          { label: 'Request Type', value: desc },
          { label: 'Reason on File', value: targetReq.reason || 'None' },
        ],
        payload: {
          requestId: reqId,
          status: actionDecision,
          note: `Decided via AI Assistant`,
        },
        confirmLabel: `Confirm ${actionDecision === 'APPROVED' ? 'Approval' : 'Rejection'}`,
        cancelLabel: 'Cancel',
      };

      return {
        isAction: true,
        reply: `I have prepared the decision for **${requesterName}**'s request (#${reqId}). Please confirm below:`,
        citations: ['Workforce Approvals Desk', 'Autonomous Action Engine'],
        action: actionCard,
      };
    }
  }

  // Not an action command -> Return false to let existing RAG/Informational engine handle it
  return { isAction: false };
}

/**
 * Executes confirmed autonomous agent tools directly against the database
 */
export async function executeAgentTool(opts: {
  userId: number;
  companyId: number;
  tool: string;
  payload: Record<string, any>;
}): Promise<{ success: boolean; message: string; data?: any }> {
  const { userId, companyId, tool, payload } = opts;

  // 1. TOOL: APPLY LEAVE
  if (tool === 'apply_leave') {
    const { leaveTypeId, startDate, endDate, days, reason } = payload;
    if (!leaveTypeId || !startDate || !reason) {
      throw new AppError(400, 'INVALID_PARAMS', 'Missing required leave parameters');
    }

    const request = await createRequest({
      userId,
      companyId,
      type: 'LEAVE',
      title: 'Leave Application via AI Assistant',
      reason,
      startDate,
      endDate: endDate || startDate,
      days: Number(days) || 1,
      leaveTypeId: Number(leaveTypeId),
    });

    await logActivity({
      companyId,
      actorId: userId,
      action: 'AI_AGENT_APPLY_LEAVE',
      objectType: 'Request',
      objectId: String(request.id),
      message: `AI Agent submitted ${days || 1}-day leave from ${startDate}: ${reason}`,
    });

    return {
      success: true,
      message: `Your leave request has been submitted successfully (ID: #${request.id}) and routed to your manager for approval!`,
      data: {
        requestId: request.id,
        status: request.status,
      },
    };
  }

  // 2. TOOL: PUNCH ATTENDANCE
  if (tool === 'punch_attendance') {
    const { action, workMode, note } = payload;

    if (action === 'CHECK_IN') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { shiftId: true },
      });

      const record = await checkIn({
        userId,
        companyId,
        latitude: payload.latitude || 0,
        longitude: payload.longitude || 0,
        workMode: workMode || 'WFO',
        note: note || 'Punched in via AI Agent',
        shiftId: user?.shiftId,
      });

      const punchTime = new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        success: true,
        message: `Punched in successfully at ${punchTime} (${record.workMode})! Your daily shift has started.`,
        data: {
          attendanceId: record.id,
          checkIn: record.checkIn,
          workMode: record.workMode,
        },
      };
    }

    if (action === 'CHECK_OUT') {
      const record = await checkOut({
        userId,
        companyId,
        latitude: payload.latitude || 0,
        longitude: payload.longitude || 0,
        note: note || 'Punched out via AI Agent',
      });

      const outTime = new Date(record.checkOut!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        success: true,
        message: `Punched out successfully at ${outTime}! Your work hours have been recorded for today.`,
        data: {
          attendanceId: record.id,
          checkOut: record.checkOut,
          durationHours: record.durationHours,
        },
      };
    }

    throw new AppError(400, 'INVALID_ACTION', 'Action must be CHECK_IN or CHECK_OUT');
  }

  // 3. TOOL: CREATE TICKET
  if (tool === 'create_ticket') {
    const { category, subject, description, priority } = payload;

    // Resolve assignee
    let assigneeId: number | null = null;
    let departmentId: number | null = null;

    if (category === 'IT') {
      const itUser = await prisma.user.findFirst({
        where: { companyId, role: 'IT', isActive: true },
        select: { id: true, departmentId: true },
      });
      assigneeId = itUser?.id || null;
      departmentId = itUser?.departmentId || null;
    } else if (category === 'FINANCE') {
      const finUser = await prisma.user.findFirst({
        where: { companyId, role: 'FINANCE', isActive: true },
        select: { id: true, departmentId: true },
      });
      assigneeId = finUser?.id || null;
      departmentId = finUser?.departmentId || null;
    } else {
      const hrUser = await prisma.user.findFirst({
        where: { companyId, role: 'HR', isActive: true },
        select: { id: true, departmentId: true },
      });
      assigneeId = hrUser?.id || null;
      departmentId = hrUser?.departmentId || null;
    }

    const count = await prisma.ticket.count({ where: { companyId } });
    const code = `TCK-${new Date().getFullYear()}-${String(count + 101).padStart(3, '0')}`;

    const ticket = await prisma.ticket.create({
      data: {
        companyId,
        requesterId: userId,
        assigneeId,
        code,
        category: category || 'GENERAL',
        subject: subject || 'AI Support Ticket',
        description: description || 'Created via Uptrix AI Assistant',
        priority: priority || 'MEDIUM',
        departmentId,
        status: 'OPEN',
        comments: [],
      },
    });

    if (assigneeId && assigneeId !== userId) {
      await prisma.notification.create({
        data: {
          companyId,
          userId: assigneeId,
          kind: 'TICKET',
          title: `New Support Ticket [${ticket.category}]`,
          message: `AI Agent created ticket ${ticket.code}: ${ticket.subject}`,
          url: '/tickets/assigned',
          sourceType: 'Ticket',
          sourceId: String(ticket.id),
        },
      }).catch((e) => console.error('Failed to create ticket notification:', e));
    }

    return {
      success: true,
      message: `Support ticket ${ticket.code} has been created and assigned to the ${category} team!`,
      data: {
        ticketId: ticket.id,
        code: ticket.code,
        category: ticket.category,
      },
    };
  }

  // 4. TOOL: DECIDE REQUEST (APPROVE / REJECT)
  if (tool === 'decide_request') {
    const { requestId, status, note } = payload;
    if (!requestId || !status) {
      throw new AppError(400, 'INVALID_PARAMS', 'Missing requestId or status');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const updated = await decideRequest({
      requestId: Number(requestId),
      companyId,
      actorId: userId,
      actorRole: user?.role || 'EMPLOYEE',
      status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
      note: note || 'Decided via AI Assistant',
    });

    return {
      success: true,
      message: `Request #${requestId} has been ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully!`,
      data: {
        requestId: updated.id,
        status: updated.status,
      },
    };
  }

  throw new AppError(400, 'UNSUPPORTED_TOOL', `Tool "${tool}" is not recognized.`);
}
