import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LoansAdvancesPage } from '../pages/payroll/LoansAdvancesPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'COMPANY_ADMIN', email: 'admin@uptrix.test' },
  }),
}));

describe('Loans & Salary Advances Page UI Tests', () => {
  const mockLoans = [
    {
      id: 'LN-2026-101',
      employeeId: 10,
      employeeName: 'Raju Kali',
      employeeEmail: 'raju@uptrix.test',
      department: 'IT Tickets',
      type: 'FESTIVAL_ADVANCE',
      principalAmount: 30000,
      tenureMonths: 12,
      monthlyEmi: 2500,
      totalRepaid: 0,
      balanceRemaining: 30000,
      reason: 'Diwali festive purchase',
      status: 'PENDING',
      appliedDate: '2026-10-01',
    },
    {
      id: 'LN-2026-102',
      employeeId: 11,
      employeeName: 'Karan Kumar',
      employeeEmail: 'karan@uptrix.test',
      department: 'IT Team',
      type: 'EMERGENCY_ADVANCE',
      principalAmount: 30000,
      tenureMonths: 3,
      monthlyEmi: 10000,
      totalRepaid: 0,
      balanceRemaining: 30000,
      reason: 'Medical emergency',
      status: 'DISBURSED',
      appliedDate: '2026-10-05',
      utrNumber: 'HDFCN98234123',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/payroll/loans') {
        return Promise.resolve({ data: { loans: mockLoans } });
      }
      if (url === '/employees') {
        return Promise.resolve({ data: { employees: [] } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. Renders page without the 4 KPI cards and with search bar on left and status dropdown on right', async () => {
    render(<LoansAdvancesPage />);

    // Header exists
    expect(screen.getByText('Loans & Salary Advances')).toBeInTheDocument();

    // 4 KPI cards must NOT be present
    expect(screen.queryByText('Active Advances')).not.toBeInTheDocument();
    expect(screen.queryByText('Monthly EMI Recovery')).not.toBeInTheDocument();
    expect(screen.queryByText('Total Disbursed (FY)')).not.toBeInTheDocument();
    expect(screen.queryByText('Pending Requests')).not.toBeInTheDocument();

    // Search bar is present
    const searchInput = screen.getByPlaceholderText(/Search by employee name, loan ID/);
    expect(searchInput).toBeInTheDocument();

    // Status dropdown is present with options
    const statusSelect = screen.getByLabelText('Filter by status');
    expect(statusSelect).toBeInTheDocument();
    expect(screen.getByText('All Records')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Active Payouts')).toBeInTheDocument();
    expect(screen.getByText('Settled')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('LN-2026-101')).toBeInTheDocument();
      expect(screen.getByText('Raju Kali')).toBeInTheDocument();
    });
  });

  it('2. Shows Approve and Reject buttons with icons (title="Approve", title="Reject") instead of words', async () => {
    (api.patch as any).mockResolvedValueOnce({ data: { success: true } });

    render(<LoansAdvancesPage />);

    await waitFor(() => {
      expect(screen.getByText('LN-2026-101')).toBeInTheDocument();
    });

    // Check that text buttons "Approve" and "Reject" are not text
    const approveBtn = screen.getByTitle('Approve');
    const rejectBtn = screen.getByTitle('Reject');

    expect(approveBtn).toBeInTheDocument();
    expect(rejectBtn).toBeInTheDocument();

    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/payroll/loans/LN-2026-101', {
        status: 'APPROVED',
      });
    });
  });

  it('3. Filtering by status dropdown works', async () => {
    render(<LoansAdvancesPage />);

    await waitFor(() => {
      expect(screen.getByText('LN-2026-101')).toBeInTheDocument();
      expect(screen.getByText('LN-2026-102')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Filter by status');
    fireEvent.change(statusSelect, { target: { value: 'PENDING' } });

    expect(screen.getByText('LN-2026-101')).toBeInTheDocument();
    expect(screen.queryByText('LN-2026-102')).not.toBeInTheDocument();
  });

  it('4. Clicking Reject opens the custom Rejection Modal with presets and submits reason properly', async () => {
    (api.patch as any).mockResolvedValueOnce({ data: { success: true } });

    render(<LoansAdvancesPage />);

    await waitFor(() => {
      expect(screen.getByText('LN-2026-101')).toBeInTheDocument();
    });

    const rejectBtn = screen.getByTitle('Reject');
    fireEvent.click(rejectBtn);

    // Modal should be opened
    expect(screen.getByText('Reject Advance Request')).toBeInTheDocument();
    expect(screen.getByText('Provide a reason for turning down this request')).toBeInTheDocument();
    expect(screen.getByText('Quick Reason Templates')).toBeInTheDocument();

    // Reason textarea should exist
    const textarea = screen.getByPlaceholderText(/Explain why this request is being rejected/);
    expect(textarea).toBeInTheDocument();

    // Click a template chip
    const templateChip = screen.getByText('Exceeds permissible advance limit');
    fireEvent.click(templateChip);
    expect((textarea as HTMLTextAreaElement).value).toBe('Exceeds permissible advance limit');

    // Submit rejection
    const submitRejectBtn = screen.getByRole('button', { name: /Reject Request/i });
    fireEvent.click(submitRejectBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/payroll/loans/LN-2026-101', {
        status: 'REJECTED',
        rejectionReason: 'Exceeds permissible advance limit',
      });
    });

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText('Reject Advance Request')).not.toBeInTheDocument();
    });
  });

  it('5. Renders rejection feedback in the table row and opens details drawer on click', async () => {
    const rejectedLoans = [
      {
        id: 'LN-2026-103',
        employeeId: 10,
        employeeName: 'Raju Kali',
        employeeEmail: 'raju@uptrix.test',
        department: 'IT Tickets',
        type: 'EMERGENCY_ADVANCE',
        principalAmount: 30000,
        tenureMonths: 3,
        monthlyEmi: 10000,
        totalRepaid: 0,
        balanceRemaining: 30000,
        reason: 'Hospital emergency',
        status: 'REJECTED',
        appliedDate: '2026-10-01',
        rejectionReason: 'Exceeds permissible advance limit of 50% net salary',
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/payroll/loans') {
        return Promise.resolve({ data: { loans: rejectedLoans } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<LoansAdvancesPage />);

    await waitFor(() => {
      expect(screen.getByText('LN-2026-103')).toBeInTheDocument();
    });

    // Feedback should be visible in the table row
    const feedbackBadge = screen.getByText(/Exceeds permissible advance limit of 50% net salary/);
    expect(feedbackBadge).toBeInTheDocument();

    // Clicking feedback badge opens the details drawer
    fireEvent.click(feedbackBadge);

    expect(screen.getByText('Loan & Advance Details')).toBeInTheDocument();
    expect(screen.getByText('Rejection Feedback from Finance Team')).toBeInTheDocument();
    expect(screen.getByText('Reference: LN-2026-103')).toBeInTheDocument();
  });

  it('6. In self service (/loans-advances or selfServiceOnly=true), Finance user only sees their own loans', async () => {
    const mixedLoans = [
      {
        id: 'LN-2026-SELF',
        employeeId: 1, // Matches logged in user id = 1
        employeeName: 'Admin Self',
        employeeEmail: 'admin@uptrix.test',
        department: 'Finance',
        type: 'EMERGENCY_ADVANCE',
        principalAmount: 25000,
        tenureMonths: 2,
        monthlyEmi: 12500,
        totalRepaid: 0,
        balanceRemaining: 25000,
        reason: 'Personal expense',
        status: 'PENDING',
        appliedDate: '2026-10-10',
      },
      {
        id: 'LN-2026-OTHER',
        employeeId: 99, // Another employee
        employeeName: 'Other Person',
        employeeEmail: 'other@uptrix.test',
        department: 'Engineering',
        type: 'FESTIVAL_ADVANCE',
        principalAmount: 40000,
        tenureMonths: 6,
        monthlyEmi: 6667,
        totalRepaid: 0,
        balanceRemaining: 40000,
        reason: 'Festive shopping',
        status: 'PENDING',
        appliedDate: '2026-10-11',
      },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/payroll/loans') {
        return Promise.resolve({ data: { loans: mixedLoans } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<LoansAdvancesPage selfServiceOnly={true} />);

    // Table header should be "Finance Feedback"
    expect(screen.getByText('Finance Feedback')).toBeInTheDocument();
    expect(screen.queryByText('Actions / Feedback')).not.toBeInTheDocument();

    await waitFor(() => {
      // Must see self loan
      expect(screen.getByText('LN-2026-SELF')).toBeInTheDocument();
    });

    // Must NOT see other employee's loan
    expect(screen.queryByText('LN-2026-OTHER')).not.toBeInTheDocument();
  });
});
