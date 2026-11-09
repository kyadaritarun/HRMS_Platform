import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { PerformanceGoalsPage } from '../pages/performance/PerformanceGoalsPage';
import { CompanyGoalsPage } from '../pages/company/CompanyGoalsPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Company Goals & Performance Objectives Alignment UI Tests', () => {
  const mockCompanyGoals = [
    {
      id: 'cg-1',
      title: 'Accelerate Enterprise Revenue to $15M ARR',
      description: 'Expand enterprise customer acquisitions and reduce gross revenue churn.',
      category: 'Revenue & Growth',
      targetPeriod: 'FY 2026-27',
      targetMetric: '$15M ARR • 40% YoY Growth',
      progress: 68,
      status: 'ON_TRACK',
      ownerName: 'CEO & Leadership',
    },
    {
      id: 'cg-2',
      title: 'Cloud Architecture Scalability & 99.99% Uptime',
      description: 'Migrate critical services to Kubernetes multi-region clusters.',
      category: 'Product & Technology',
      targetPeriod: 'Q1-Q2 2026',
      targetMetric: '99.99% Uptime SLA',
      progress: 75,
      status: 'ON_TRACK',
      ownerName: 'VP Engineering',
    },
  ];

  const mockCycles = [
    {
      id: 'cycle-1',
      name: 'Q1 2026 Appraisal Cycle',
      description: 'Q1 Evaluation',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      isActive: true,
    },
  ];

  const mockIndividualGoals = [
    {
      id: 201,
      userId: 1,
      type: 'GOAL',
      title: 'Refactor Core Microservices API Gateway',
      reason: 'Decrease p99 latency to 85ms across endpoints',
      status: 'APPROVED',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      createdAt: '2026-01-05T10:00:00Z',
      meta: {
        cycleId: 'cycle-1',
        cycleName: 'Q1 2026 Appraisal Cycle',
        weight: 30,
        goalStatus: 'IN_PROGRESS',
        companyGoalId: 'cg-2',
        companyGoalTitle: 'Cloud Architecture Scalability & 99.99% Uptime',
        comments: [],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/company/goals') {
        return Promise.resolve({ data: { companyGoals: mockCompanyGoals } });
      }
      if (url === '/company/cycles') {
        return Promise.resolve({ data: { performanceCycles: mockCycles } });
      }
      if (url === '/requests') {
        return Promise.resolve({ data: { items: mockIndividualGoals } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. CompanyGoalsPage: renders strategic goals and management controls for Company Admin', async () => {
    render(<CompanyGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Accelerate Enterprise Revenue to $15M ARR')).toBeInTheDocument();
      expect(screen.getByText('Cloud Architecture Scalability & 99.99% Uptime')).toBeInTheDocument();
    });

    // Verify controls
    expect(screen.getByText('Add Company Goal')).toBeInTheDocument();

    // Open Add Modal
    const addBtn = screen.getByText('Add Company Goal');
    fireEvent.click(addBtn);
    expect(screen.getByText('Add Strategic Company Goal')).toBeInTheDocument();
  });

  it('1b. CompanyGoalsPage: renders strategic goals in a structured table by default', async () => {
    render(<CompanyGoalsPage />);

    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'Goal' })).toBeInTheDocument();
      expect(screen.getByText('Period')).toBeInTheDocument();
      expect(screen.getAllByText('Status').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Executive Owner')).toBeInTheDocument();
      expect(screen.getAllByText('Actions').length).toBeGreaterThanOrEqual(1);
    });

    // Verify row contents in table
    expect(screen.getByText('Accelerate Enterprise Revenue to $15M ARR')).toBeInTheDocument();
    expect(screen.getByText('Cloud Architecture Scalability & 99.99% Uptime')).toBeInTheDocument();
    expect(screen.getByText('FY 2026-27')).toBeInTheDocument();
    expect(screen.getByText('Q1-Q2 2026')).toBeInTheDocument();
    expect(screen.getByText('CEO & Leadership')).toBeInTheDocument();
    expect(screen.getByText('VP Engineering')).toBeInTheDocument();
  });

  it('2. PerformanceGoalsPage: maintains clean toolbar with search on left without redundant company goals button in table', async () => {
    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search goals or cycles...')).toBeInTheDocument();
    });

    // Company goals are shown inside Create New Goal modal, not cluttering the table
    expect(screen.queryByRole('button', { name: /^Company Goals$/i })).not.toBeInTheDocument();
  });

  it('3. PerformanceGoalsPage: shows alignment badge in table row and inside goal details drawer', async () => {
    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Refactor Core Microservices API Gateway')).toBeInTheDocument();
    });

    // Verify alignment badge on row
    expect(screen.getByText('Aligned: Cloud Architecture Scalability & 99.99% Uptime')).toBeInTheDocument();

    // Click View Goal to open details drawer
    const viewButtons = screen.getAllByTitle('View Goal Details');
    fireEvent.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Goal Details')).toBeInTheDocument();
      expect(screen.getByText('Aligned Company Strategic Goal')).toBeInTheDocument();
      expect(screen.getByText('Strategic Pillar')).toBeInTheDocument();
    });
  });

  it('4. PerformanceGoalsPage: create goal modal allows selecting and viewing aligned Company Goal', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { success: true },
    });

    render(<PerformanceGoalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Refactor Core Microservices API Gateway')).toBeInTheDocument();
    });

    // Click Create New Goal
    const createBtn = screen.getByText('Create New Goal');
    fireEvent.click(createBtn);

    // Verify Company Goal section in drawer
    expect(screen.getByLabelText(/Aligned Company Strategic Goal/)).toBeInTheDocument();
    expect(screen.getByText(/Browse Goals \(2\)/)).toBeInTheDocument();

    // Select a company goal from dropdown
    const select = screen.getByLabelText(/Aligned Company Strategic Goal/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'cg-1' } });

    // Fill required title & reason
    fireEvent.change(screen.getByPlaceholderText(/e.g. Optimize API latency/), {
      target: { value: 'Expand Enterprise Sales Pipeline' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Detail the measurable metrics/), {
      target: { value: 'Close 5 enterprise accounts with ARR > $200k each' },
    });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Submit Goal/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/requests',
        expect.objectContaining({
          type: 'GOAL',
          title: 'Expand Enterprise Sales Pipeline',
          reason: 'Close 5 enterprise accounts with ARR > $200k each',
          meta: expect.objectContaining({
            companyGoalId: 'cg-1',
            companyGoalTitle: 'Accelerate Enterprise Revenue to $15M ARR',
          }),
        })
      );
    });
  });
});
