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
  },
}));

describe('Pillar 1: AI Assistant Autonomous Tool Calling UI Tests (Without API Key)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders starter action cards for Apply Sick Leave, Punch In, and Support Ticket', () => {
    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Apply sick leave for tomorrow due to fever')).toBeInTheDocument();
    expect(screen.getByText('Punch me in as WFH today')).toBeInTheDocument();
    expect(screen.getByText('Raise an IT ticket for broken mouse')).toBeInTheDocument();
  });

  it('2. Submitting action prompt renders Human-in-the-Loop interactive confirmation card', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        reply: 'I have prepared your Sick Leave request for tomorrow.',
        citations: ['Leave Balances & Quota Master'],
        action: {
          type: 'CONFIRM_ACTION',
          tool: 'apply_leave',
          status: 'PROPOSED',
          title: 'Sick Leave Application',
          subtitle: 'Autonomous action prepared • Requires 1-click confirmation',
          summary: [
            { label: 'Leave Category', value: 'Sick Leave', highlight: true },
            { label: 'Date & Duration', value: 'Thu, Nov 5, 2026 (1 Day)' },
            { label: 'Quota Breakdown', value: '3 days left → 2 days after approval' },
            { label: 'Reporting Approver', value: 'Vikram Malhotra' },
            { label: 'Reason', value: 'Severe fever and recovery' },
          ],
          payload: {
            leaveTypeId: 2,
            leaveTypeName: 'Sick Leave',
            startDate: '2026-11-05',
            endDate: '2026-11-05',
            days: 1,
            reason: 'Severe fever and recovery',
          },
          confirmLabel: 'Confirm & Apply Sick Leave',
          cancelLabel: 'Dismiss',
        },
      },
    });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about leaves/i);
    fireEvent.change(input, { target: { value: 'Apply sick leave for tomorrow due to fever' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Sick Leave Application')).toBeInTheDocument();
      expect(screen.getByText('Action Prepared')).toBeInTheDocument();
      expect(screen.getByText('Thu, Nov 5, 2026 (1 Day)')).toBeInTheDocument();
      expect(screen.getByText('3 days left → 2 days after approval')).toBeInTheDocument();
      expect(screen.getByText('Confirm & Apply Sick Leave')).toBeInTheDocument();
    });
  });

  it('3. Clicking Confirm & Apply executes tool via /assistant/execute-tool and shows Executed state', async () => {
    (api.post as any)
      .mockResolvedValueOnce({
        data: {
          reply: 'I have prepared your Sick Leave request for tomorrow.',
          citations: ['Leave Balances & Quota Master'],
          action: {
            type: 'CONFIRM_ACTION',
            tool: 'apply_leave',
            status: 'PROPOSED',
            title: 'Sick Leave Application',
            subtitle: 'Autonomous action prepared',
            summary: [{ label: 'Reason', value: 'Severe fever' }],
            payload: { leaveTypeId: 2, startDate: '2026-11-05', reason: 'Severe fever' },
            confirmLabel: 'Confirm & Apply Sick Leave',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Leave request #REQ-901 submitted to Vikram Malhotra successfully!',
        },
      });

    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Ask about leaves/i);
    fireEvent.change(input, { target: { value: 'Apply sick leave for tomorrow due to fever' } });
    fireEvent.submit(input.closest('form')!);

    const confirmBtn = await screen.findByText('Confirm & Apply Sick Leave');
    expect(confirmBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/assistant/execute-tool', {
        tool: 'apply_leave',
        payload: expect.objectContaining({ leaveTypeId: 2, startDate: '2026-11-05' }),
      });
      expect(screen.getByText('Executed')).toBeInTheDocument();
      expect(screen.getAllByText(/Leave request #REQ-901 submitted/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('4. Handles multi-day leave prompt with date range and reason typo: "apply leave from 10-nov to 12-nov from traving"', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: {
        reply: 'I have prepared your Casual Leave request for 10 Nov 2026 to 12 Nov 2026 (3 Days).',
        citations: ['Leave Balances & Quota Master'],
        action: {
          type: 'CONFIRM_ACTION',
          tool: 'apply_leave',
          status: 'PROPOSED',
          title: 'Casual Leave Application',
          subtitle: 'Autonomous action prepared • Requires 1-click confirmation',
          summary: [
            { label: 'Leave Category', value: 'Casual Leave', highlight: true },
            { label: 'Date & Duration', value: '10 Nov 2026 to 12 Nov 2026 (3 Days)' },
            { label: 'Quota Breakdown', value: '8 days left → 5 days after approval' },
            { label: 'Reporting Approver', value: 'Vikram Malhotra' },
            { label: 'Reason', value: 'Traveling' },
          ],
          payload: {
            leaveTypeId: 1,
            leaveTypeName: 'Casual Leave',
            startDate: '2026-11-10',
            endDate: '2026-11-12',
            days: 3,
            reason: 'Traveling',
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

    const input = screen.getByPlaceholderText(/Ask about leaves/i);
    fireEvent.change(input, { target: { value: 'apply leave from 10-nov to 12-nov from traving' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Casual Leave Application')).toBeInTheDocument();
      expect(screen.getByText('10 Nov 2026 to 12 Nov 2026 (3 Days)')).toBeInTheDocument();
      expect(screen.getByText('Traveling')).toBeInTheDocument();
      expect(screen.getByText('Confirm & Apply Casual Leave')).toBeInTheDocument();
    });
  });
});
