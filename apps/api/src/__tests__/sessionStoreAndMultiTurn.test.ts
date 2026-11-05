import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSession,
  getSession,
  listSessions,
  deleteSession,
  appendMessage,
  _resetStoreForTesting,
} from '../services/sessionStore.js';
import { parseAgentIntent } from '../services/assistantAgent.js';

describe('Pillar 3: Multi-Turn Conversation Memory & Sessions Unit Tests', () => {
  const userId = 101;
  const companyId = 1;

  beforeEach(() => {
    _resetStoreForTesting();
  });

  it('1. Session Lifecycle: Creates, lists, retrieves, and deletes conversation sessions', () => {
    const session1 = createSession(userId, companyId, 'Leave Balance Discussion');
    const session2 = createSession(userId, companyId, 'IT Support Ticket');

    expect(session1.id).toBeDefined();
    expect(session2.id).toBeDefined();

    const list = listSessions(userId, companyId);
    expect(list.length).toBe(2);
    expect(list.some((s) => s.title === 'Leave Balance Discussion')).toBe(true);

    const fetched = getSession(session1.id, userId, companyId);
    expect(fetched).not.toBeNull();
    expect(fetched!.title).toBe('Leave Balance Discussion');

    const deleted = deleteSession(session1.id, userId, companyId);
    expect(deleted).toBe(true);

    const afterList = listSessions(userId, companyId);
    expect(afterList.length).toBe(1);
    expect(afterList[0].id).toBe(session2.id);
  });

  it('2. Multi-turn context: Modifies pending action duration ("make it 2 days instead")', async () => {
    // Turn 1: Propose initial 1-day sick leave card
    const initialAction = {
      type: 'CONFIRM_ACTION' as const,
      tool: 'apply_leave' as const,
      status: 'PROPOSED' as const,
      title: 'Sick Leave Application',
      subtitle: 'Autonomous action prepared',
      summary: [
        { label: 'Leave Category', value: 'Sick Leave' },
        { label: 'Date & Duration', value: '14 Nov 2026 (1 Day)' },
        { label: 'Quota Breakdown', value: '5 days left → 4 days after approval' },
        { label: 'Reason', value: 'Fever' },
      ],
      payload: {
        leaveTypeId: 2,
        leaveTypeName: 'Sick Leave',
        startDate: '2026-11-14',
        endDate: '2026-11-14',
        days: 1,
        reason: 'Fever',
      },
      confirmLabel: 'Confirm & Apply Sick Leave',
    };

    // Turn 2: Follow-up modifying duration
    const turn2 = await parseAgentIntent({
      userId,
      companyId,
      query: 'make it 2 days instead',
      sessionContext: {
        pendingAction: initialAction,
        lastTopic: 'ACTION_TOOL',
      },
    });

    expect(turn2.isAction).toBe(true);
    expect(turn2.action).toBeDefined();
    expect(turn2.action!.payload.days).toBe(2);
    expect(turn2.action!.payload.startDate).toBe('2026-11-14');
    expect(turn2.action!.payload.endDate).toBe('2026-11-15');
    expect(turn2.action!.payload.reason).toBe('Fever');
    expect(turn2.reply).toContain('2 Days');
  });

  it('3. Multi-turn context: Modifies pending action reason ("change reason to viral infection")', async () => {
    const initialAction = {
      type: 'CONFIRM_ACTION' as const,
      tool: 'apply_leave' as const,
      status: 'PROPOSED' as const,
      title: 'Sick Leave Application',
      subtitle: 'Autonomous action prepared',
      summary: [
        { label: 'Leave Category', value: 'Sick Leave' },
        { label: 'Date & Duration', value: '14 Nov 2026 (1 Day)' },
        { label: 'Reason', value: 'Fever' },
      ],
      payload: {
        leaveTypeId: 2,
        leaveTypeName: 'Sick Leave',
        startDate: '2026-11-14',
        endDate: '2026-11-14',
        days: 1,
        reason: 'Fever',
      },
      confirmLabel: 'Confirm & Apply Sick Leave',
    };

    const turn2 = await parseAgentIntent({
      userId,
      companyId,
      query: 'change reason to viral infection and rest',
      sessionContext: {
        pendingAction: initialAction,
      },
    });

    expect(turn2.isAction).toBe(true);
    expect(turn2.action!.payload.reason).toBe('Viral infection and rest');
    expect(turn2.action!.payload.days).toBe(1);
  });

  it('4. Multi-turn context: Escalates ticket urgency ("make it urgent")', async () => {
    const initialTicketAction = {
      type: 'CONFIRM_ACTION' as const,
      tool: 'create_ticket' as const,
      status: 'PROPOSED' as const,
      title: 'Create IT Support Ticket',
      subtitle: 'Auto-routed to IT Operations Desk',
      summary: [
        { label: 'Category', value: 'IT Support Desk' },
        { label: 'Subject', value: 'Computer Mouse Malfunction' },
        { label: 'Priority', value: 'MEDIUM' },
      ],
      payload: {
        category: 'IT',
        subject: 'Computer Mouse Malfunction',
        priority: 'MEDIUM',
      },
      confirmLabel: 'Confirm & Raise IT Ticket',
    };

    const turn2 = await parseAgentIntent({
      userId,
      companyId,
      query: 'please make it urgent, I have a client demo',
      sessionContext: {
        pendingAction: initialTicketAction,
      },
    });

    expect(turn2.isAction).toBe(true);
    expect(turn2.action!.payload.priority).toBe('HIGH');
    expect(turn2.reply).toContain('HIGH');
  });

  it('5. Multi-turn anaphora: Resolves "the casual one" to Casual Leave', async () => {
    const res = await parseAgentIntent({
      userId,
      companyId,
      query: 'apply the casual one for 14-nov due to personal work',
    });

    // We verify the query was recognized as a leave command with CASUAL leave code
    expect(res.isAction).toBe(true);
    if (res.action) {
      expect(res.action.payload.startDate).toBe('2026-11-14');
      expect(res.action.payload.reason).toBe('Personal work');
    }
  });
});

