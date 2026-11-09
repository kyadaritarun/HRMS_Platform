import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TaxDeclarationsPage } from '../pages/payroll/TaxDeclarationsPage';
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
    user: { id: 1, role: 'FINANCE', email: 'finance@uptrix.test' },
  }),
}));

describe('Tax Declarations Page UI Tests', () => {
  const mockDeclarations = [
    {
      id: 1,
      name: 'Chandra Kali',
      email: 'chandrakali@uptrixglobal.com',
      pan: 'ABCDE1234F',
      department: 'Management',
      regime: 'NEW_REGIME',
      grossSalary: 900000,
      section80CDeclared: 0,
      section80CVerified: 0,
      section80DDeclared: 0,
      section80DVerified: 0,
      hraDeclared: 0,
      hraVerified: 0,
      status: 'PENDING_REVIEW',
      submissionDate: '2026-10-01',
    },
    {
      id: 2,
      name: 'Srikanth Admin',
      email: 'srikanth@uptrixglobal.com',
      pan: 'XYZAB5678C',
      department: 'Administration',
      regime: 'NEW_REGIME',
      grossSalary: 0,
      section80CDeclared: 0,
      section80CVerified: 0,
      section80DDeclared: 0,
      section80DVerified: 0,
      hraDeclared: 0,
      hraVerified: 0,
      status: 'VERIFIED',
      submissionDate: '2026-10-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/payroll/tax-declarations') {
        return Promise.resolve({ data: { records: mockDeclarations } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. Renders table with icon buttons for Verify Proofs and Form 16 without text words', async () => {
    (api.patch as any).mockResolvedValueOnce({ data: { success: true } });

    render(<TaxDeclarationsPage />);

    expect(screen.getByText('Tax Proofs & Form 16')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Chandra Kali')).toBeInTheDocument();
      expect(screen.getByText('Srikanth Admin')).toBeInTheDocument();
    });

    // Check Verify Proofs button is an icon with title="Verify Proofs"
    const verifyBtn = screen.getByTitle('Verify Proofs');
    expect(verifyBtn).toBeInTheDocument();

    // Check Form 16 buttons are icons with title="Form 16"
    const form16Btns = screen.getAllByTitle('Form 16');
    expect(form16Btns.length).toBeGreaterThanOrEqual(1);

    // Verify Proofs click works
    (api.post as any).mockResolvedValueOnce({ data: { success: true } });
    fireEvent.click(verifyBtn);
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/payroll/tax-declarations/verify',
        expect.objectContaining({
          employeeId: 1,
        })
      );
    });
  });

  it('2. Self-Service Tax Declarations: shows only logged in user declaration even for Company Admin or Finance', async () => {
    // Current user in mock is id: 1 (Chandra Kali)
    render(<TaxDeclarationsPage selfServiceOnly={true} />);

    expect(screen.getByText('Tax Declarations')).toBeInTheDocument();

    await waitFor(() => {
      // Chandra Kali (id: 1, current user) should be present
      expect(screen.getByText('Chandra Kali')).toBeInTheDocument();
      // Srikanth Admin (id: 2, other user) should NOT be present
      expect(screen.queryByText('Srikanth Admin')).not.toBeInTheDocument();
    });

    // In self service, Lock Verified button should not be present
    expect(screen.queryByText('Lock Verified for Payroll')).not.toBeInTheDocument();
  });
});
