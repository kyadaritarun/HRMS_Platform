import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PerformanceGoalsPage } from '../pages/performance/PerformanceGoalsPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Performance Goals - Cycles Dropdown UI Tests', () => {
  const mockCycles = [
    {
      id: 'cycle-2026-q1',
      name: 'Q1 2026 Appraisal Cycle',
      description: 'Jan 2026 - Mar 2026 OKR Evaluation',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      isActive: true,
    },
    {
      id: 'cycle-2026-q2',
      name: 'Q2 2026 Appraisal Cycle',
      description: 'Apr 2026 - Jun 2026 Mid-Year Review',
      startDate: '2026-04-01',
      endDate: '2026-06-30',
      isActive: false,
    },
  ];

  const mockGoals = [
    {
      id: 101,
      userId: 1,
      type: 'GOAL',
      title: 'Accelerate API response times',
      reason: 'Achieve <100ms response time on key endpoints',
      status: 'APPROVED',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      createdAt: '2026-01-02T10:00:00Z',
      meta: {
        cycleId: 'cycle-2026-q1',
        cycleName: 'Q1 2026 Appraisal Cycle',
        weight: 30,
        goalStatus: 'IN_PROGRESS',
        comments: [],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/company/cycles') {
        return Promise.resolve({ data: { performanceCycles: mockCycles } });
      }
      if (url === '/requests') {
        return Promise.resolve({ data: { items: mockGoals } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. Renders goal card with cycle badge', async () => {
    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Accelerate API response times')).toBeInTheDocument();
      expect(screen.getByText('Q1 2026 Appraisal Cycle')).toBeInTheDocument();
    });
  });

  it('2. Opens create goal drawer with Appraisal Cycle dropdown and without Target Completion Date input', async () => {
    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Accelerate API response times')).toBeInTheDocument();
    });

    const createBtn = screen.getByText('Create New Goal');
    fireEvent.click(createBtn);

    expect(screen.getByText('Performance Objective')).toBeInTheDocument();
    expect(screen.getAllByText(/Appraisal Cycle/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Target Completion Date')).not.toBeInTheDocument();

    const select = screen.getByLabelText(/Appraisal Cycle/) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(screen.getAllByText(/Q1 2026 Appraisal Cycle/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Q2 2026 Appraisal Cycle/)).toBeInTheDocument();
  });

  it('3. Submitting new goal passes selected cycle in request payload', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { request: { id: 102 } },
    });

    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Accelerate API response times')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create New Goal'));

    fireEvent.change(screen.getByPlaceholderText(/e.g. Optimize API latency/), {
      target: { value: 'Launch v2 Microservices' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Detail the measurable metrics/), {
      target: { value: 'Complete migration of user service' },
    });

    const select = screen.getByLabelText(/Appraisal Cycle/);
    fireEvent.change(select, { target: { value: 'cycle-2026-q2' } });

    fireEvent.click(screen.getByText('Submit Goal'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/requests',
        expect.objectContaining({
          type: 'GOAL',
          title: 'Launch v2 Microservices',
          reason: 'Complete migration of user service',
          startDate: '2026-04-01',
          endDate: '2026-06-30',
          meta: expect.objectContaining({
            cycleId: 'cycle-2026-q2',
            cycleName: 'Q2 2026 Appraisal Cycle',
          }),
        })
      );
    });
  });

  it('4. When an appraisal cycle reaches 100% weightage, it does not show in the Performance Objective dropdown', async () => {
    // 100% allocated for Q1 (20% + 80%)
    const completedGoals = [
      {
        id: 201,
        userId: 1,
        type: 'GOAL',
        title: 'Goal A',
        reason: 'Desc A',
        status: 'PENDING',
        meta: {
          cycleId: 'cycle-2026-q1',
          cycleName: 'Q1 2026 Appraisal Cycle',
          weight: 20,
        },
      },
      {
        id: 202,
        userId: 1,
        type: 'GOAL',
        title: 'Goal B',
        reason: 'Desc B',
        status: 'PENDING',
        meta: {
          cycleId: 'cycle-2026-q1',
          cycleName: 'Q1 2026 Appraisal Cycle',
          weight: 80,
        },
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/company/cycles') {
        return Promise.resolve({ data: { performanceCycles: mockCycles } });
      }
      if (url === '/requests') {
        return Promise.resolve({ data: { items: completedGoals } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Goal A')).toBeInTheDocument();
      expect(screen.getByText('Goal B')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create New Goal'));

    expect(screen.getByText('Performance Objective')).toBeInTheDocument();

    const select = screen.getByLabelText(/Appraisal Cycle/) as HTMLSelectElement;
    expect(select).toBeInTheDocument();

    // The options inside the select: Q1 should NOT be present because it is 100% allocated
    const optionValues = Array.from(select.options).map((o) => o.value);
    expect(optionValues).not.toContain('cycle-2026-q1');
    expect(optionValues).toContain('cycle-2026-q2');
  });

  it('5. Renders toolbar with search bar on left without KPI cards', async () => {
    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search goals or cycles...')).toBeInTheDocument();
    });

    // Verify top KPI cards have been removed as per clean UI design
    expect(screen.queryByText('Goals for Present Year')).not.toBeInTheDocument();
    expect(screen.queryByText('Number Submitted')).not.toBeInTheDocument();
    expect(screen.queryByText('Number Progressed')).not.toBeInTheDocument();
    expect(screen.queryByText('Number Completed')).not.toBeInTheDocument();
  });

  it('6. Renders table with 4 columns: Goal, Cycle, Approval, Action and supports view details & cancellation', async () => {
    const goalsWithApprover = [
      {
        id: 301,
        userId: 1,
        type: 'GOAL',
        title: 'Optimize Database Queries',
        reason: 'Improve query plans across multi-tenant tables',
        status: 'PENDING',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        createdAt: '2026-01-02T10:00:00Z',
        approver: {
          id: 5,
          firstName: 'Jane',
          lastName: 'Manager',
          email: 'jane.manager@uptrix.test',
        },
        meta: {
          cycleId: 'cycle-2026-q1',
          cycleName: 'Q1 2026 Appraisal Cycle',
          weight: 40,
          goalStatus: 'NOT_STARTED',
        },
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/company/cycles') {
        return Promise.resolve({ data: { performanceCycles: mockCycles } });
      }
      if (url === '/requests') {
        return Promise.resolve({ data: { items: goalsWithApprover } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Optimize Database Queries')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByRole('columnheader', { name: 'Goal' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Cycle' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Approval' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Action' })).toBeInTheDocument();

    // Check Approval column content
    expect(screen.getByText('Pending Manager Approval')).toBeInTheDocument();
    expect(screen.getByText('Jane Manager')).toBeInTheDocument();

    // Check Action button: View details
    const viewBtn = screen.getByTitle('View Goal Details');
    expect(viewBtn).toBeInTheDocument();
    fireEvent.click(viewBtn);

    // Details drawer opens
    expect(screen.getByText('Goal Details')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Manager').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('jane.manager@uptrix.test')).toBeInTheDocument();

    // Close view drawer
    fireEvent.click(screen.getByText('Close'));

    // Check Action button: Cancel pending goal
    const cancelBtn = screen.getByTitle('Cancel Pending Goal');
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);

    // Cancel confirmation dialog opens
    expect(screen.getByText('Cancel Goal Request?')).toBeInTheDocument();
    expect(screen.getByText('Yes, Cancel Goal')).toBeInTheDocument();

    (api.patch as any).mockResolvedValueOnce({ data: { success: true } });
    fireEvent.click(screen.getByText('Yes, Cancel Goal'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/requests/301/cancel');
    });
  });

  it('7. For APPROVED goals, only View Goal Details is shown in Action column; Advance Progress and Add Progress Note are removed', async () => {
    const approvedGoals = [
      {
        id: 401,
        userId: 1,
        type: 'GOAL',
        title: 'ASIDHUGESU',
        reason: 'ASEFIUGWEYFGIJKEWIFGITEST',
        status: 'APPROVED',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
        createdAt: '2026-01-02T10:00:00Z',
        approver: {
          id: 5,
          firstName: 'Vikram',
          lastName: 'Malhotra',
          email: 'vikram.malhotra@uptrix.test',
        },
        meta: {
          cycleId: 'cycle-2026-q1',
          cycleName: 'Q1 2026 Appraisal Cycle',
          weight: 50,
          goalStatus: 'IN_PROGRESS',
        },
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/company/cycles') {
        return Promise.resolve({ data: { performanceCycles: mockCycles } });
      }
      if (url === '/requests') {
        return Promise.resolve({ data: { items: approvedGoals } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('ASIDHUGESU')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    // View Goal Details should be present
    expect(screen.getByTitle('View Goal Details')).toBeInTheDocument();

    // Advance Progress and Add Progress Note must NOT be present
    expect(screen.queryByTitle('Advance Progress')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Mark In Progress')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Add Progress Note')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Cancel Pending Goal')).not.toBeInTheDocument();
  });
});
