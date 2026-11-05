import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AssistantPage } from '../pages/assistant/AssistantPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Pillar 4: Generative UI & Rich Action Cards UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/assistant/sessions') {
        return Promise.resolve({ data: { sessions: [] } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. Leave Application Card shows visual meter with remaining days before and after submission', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        reply: 'I have prepared your Casual Leave request for Friday.',
        citations: ['Leave Balances & Quota Master'],
        action: {
          type: 'CONFIRM_ACTION',
          tool: 'apply_leave',
          status: 'PROPOSED',
          title: 'Casual Leave Application',
          subtitle: 'Autonomous action prepared • Requires 1-click confirmation',
          summary: [
            { label: 'Leave Category', value: 'Casual Leave', highlight: true },
            { label: 'Date & Duration', value: 'Fri, Nov 7, 2026 (1 Day)' },
            { label: 'Quota Breakdown', value: '4 days left → 3 days after approval' },
            { label: 'Reporting Approver', value: 'Neha Sharma' },
            { label: 'Reason', value: 'Family event' },
          ],
          payload: {
            leaveTypeId: 1,
            leaveTypeName: 'Casual Leave',
            startDate: '2026-11-07',
            endDate: '2026-11-07',
            days: 1,
            reason: 'Family event',
          },
          meta: {
            currentBalance: 4,
            days: 1,
            balanceAfter: 3,
            leaveTypeName: 'Casual Leave',
          },
          confirmLabel: 'Confirm & Apply Casual Leave',
          cancelLabel: 'Dismiss',
        },
      },
    });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about leaves, travel claims/i);
    fireEvent.change(input, { target: { value: 'Apply casual leave for this Friday' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Casual Leave Application')).toBeInTheDocument();
      expect(screen.getByText('Current Balance')).toBeInTheDocument();
      expect(screen.getByText('After Submission')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('2. Manager Approval Card renders live request with 1-click Approve and Reject buttons', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        reply: '📋 You have 2 pending approval requests awaiting your decision.',
        citations: ['Workforce Approvals Desk'],
        widget: {
          type: 'PENDING_APPROVALS',
          title: 'Pending Workforce Approvals',
          items: [
            {
              id: 101,
              requesterName: 'Vikram Sharma',
              jobTitle: 'Frontend Engineer',
              type: 'LEAVE',
              leaveTypeName: 'Casual Leave',
              startDate: '10-Nov-2026',
              endDate: '12-Nov-2026',
              days: 3,
              reason: 'Traveling to hometown',
              status: 'PENDING',
            },
            {
              id: 102,
              requesterName: 'Ananya Verma',
              jobTitle: 'Product Designer',
              type: 'LEAVE',
              leaveTypeName: 'Sick Leave',
              startDate: '14-Nov-2026',
              endDate: '14-Nov-2026',
              days: 1,
              reason: 'Doctor appointment',
              status: 'PENDING',
            },
          ],
        },
      },
    });

    (api.patch as any).mockResolvedValueOnce({
      data: { success: true },
    });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about leaves, travel claims/i);
    fireEvent.change(input, { target: { value: 'What approvals are pending?' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Vikram Sharma')).toBeInTheDocument();
      expect(screen.getByText(/Traveling to hometown/i)).toBeInTheDocument();
      expect(screen.getByText('Ananya Verma')).toBeInTheDocument();
    });

    // 1-Click Approve on Vikram's request
    const approveButtons = screen.getAllByRole('button', { name: /Approve/i });
    expect(approveButtons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/requests/101/decision',
        expect.objectContaining({
          status: 'APPROVED',
        })
      );
      expect(screen.getByText(/Decision Recorded:/i)).toBeInTheDocument();
    });
  });

  it('3. Attendance Mini-Widget displays live timeline and 1-click "Punch Out Now" button', async () => {
    (api.post as any)
      .mockResolvedValueOnce({
        data: {
          reply: '⏱️ Your Attendance Status Today: Punched In (WFO)',
          citations: ['Daily Time & Attendance Log'],
          widget: {
            type: 'ATTENDANCE_TIMELINE',
            title: "Today's Attendance Timeline",
            data: {
              status: 'CLOCKED_IN',
              workMode: 'WFO',
              checkIn: '09:15 AM',
              checkOut: null,
              shiftTiming: '09:00 AM - 06:00 PM',
              duration: '3h 45m',
              canPunchOut: true,
              canPunchIn: false,
            },
          },
        },
      })
      .mockResolvedValueOnce({
        // For attendance punch-out
        data: {
          success: true,
          attendance: { checkOut: new Date().toISOString() },
        },
      });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about leaves, travel claims/i);
    fireEvent.change(input, { target: { value: 'What is my attendance status today?' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText("Today's Attendance Timeline")).toBeInTheDocument();
      expect(screen.getByText('09:15 AM')).toBeInTheDocument();
      expect(screen.getByText('3h 45m')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Punch Out Now/i })).toBeInTheDocument();
    });

    // Click 1-Click Punch Out
    fireEvent.click(screen.getByRole('button', { name: /Punch Out Now/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/attendance/check-out',
        expect.objectContaining({
          note: expect.stringContaining('Punched out via AI Assistant widget'),
        })
      );
      expect(screen.getByText(/Your punch-out at/i)).toBeInTheDocument();
    });
  });

  it('4. Leave Quota Progress Bars display remaining allowances with quick-apply launcher', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        reply: 'Here is your current leave quota breakdown:',
        citations: ['Leave Balances & Quota Master'],
        widget: {
          type: 'LEAVE_QUOTA_BARS',
          title: 'Leave Balances & Quota Overview',
          items: [
            {
              id: 1,
              name: 'Casual Leave',
              code: 'CASUAL',
              balance: 4,
              total: 12,
              used: 8,
              percent: 33,
            },
            {
              id: 2,
              name: 'Sick Leave',
              code: 'SICK',
              balance: 6,
              total: 10,
              used: 4,
              percent: 60,
            },
          ],
        },
      },
    });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about leaves, travel claims/i);
    fireEvent.change(input, { target: { value: 'How many leaves do I have left?' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Leave Balances & Quota Overview')).toBeInTheDocument();
      expect(screen.getByText('Casual Leave')).toBeInTheDocument();
      expect(screen.getByText('Sick Leave')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply Casual →' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Apply Sick →' })).toBeInTheDocument();
    });

    // Mock next chat response when clicking quick launcher
    (api.post as any).mockResolvedValueOnce({
      data: {
        reply: 'I have prepared your Casual Leave application for tomorrow.',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Apply Casual →' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/assistant/chat',
        expect.objectContaining({
          message: expect.stringContaining('Apply Casual Leave'),
        })
      );
    });
  });
});
