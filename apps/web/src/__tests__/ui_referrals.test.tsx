import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ReferLeadModal } from '../components/referrals/ReferLeadModal';
import { ReferEarnPage } from '../pages/referrals/ReferEarnPage';
import { Sidebar } from '../components/layout/Sidebar';
import * as AuthContextModule from '../context/AuthContext';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Refer a Lead & Refer & Earn UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. ReferLeadModal renders all screenshot fields correctly', () => {
    render(<ReferLeadModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Refer a Lead')).toBeInTheDocument();
    expect(
      screen.getByText(/Share the business details below. Our sales team reaches out to them/i)
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText('Enter business name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter owner name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter mobile number')).toBeInTheDocument();
    expect(screen.getByText('+91')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter city')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Zip code')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter the full address')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Submit Lead')).toBeInTheDocument();
  });

  it('2. Submitting ReferLeadModal posts data to /referrals', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { success: true, message: 'Lead submitted' },
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(<ReferLeadModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('Enter business name'), {
      target: { value: 'Tech Innovations Pvt Ltd' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter owner name'), {
      target: { value: 'Rajesh Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter mobile number'), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter email address'), {
      target: { value: 'rajesh@techinnovations.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter city'), {
      target: { value: 'Bengaluru' },
    });

    fireEvent.click(screen.getByText('Submit Lead'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/referrals', {
        businessName: 'Tech Innovations Pvt Ltd',
        ownerName: 'Rajesh Sharma',
        mobileNumber: '9876543210',
        email: 'rajesh@techinnovations.com',
        city: 'Bengaluru',
      });
    });
  });

  it('3. ReferEarnPage renders hero banner, wallet, and tabs', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'employee@acme.com',
        role: 'EMPLOYEE',
        firstName: 'Sarah',
        lastName: 'Connor',
      } as any,
      company: { id: 1, name: 'Acme Corp' } as any,
      features: [],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    (api.get as any).mockResolvedValueOnce({
      data: {
        success: true,
        stats: {
          totalReferrals: 2,
          successful: 1,
          totalEarned: 3000,
          balance: 3000,
          pendingReward: 3000,
        },
        referrals: [
          {
            id: 1,
            businessName: 'Cloud Solutions Ltd',
            ownerName: 'Amit Verma',
            mobileNumber: '9123456780',
            email: 'amit@cloud.com',
            city: 'Hyderabad',
            status: 'CONVERTED',
            rewardAmount: 3000,
            rewardStatus: 'CREDITED',
          },
        ],
        withdrawals: [],
        walletHistory: [],
      },
    });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReferEarnPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/You refer, They purchase/i)).toBeInTheDocument();
      expect(screen.getByText(/You get ₹ 3,000/i)).toBeInTheDocument();
      expect(screen.getByText('WALLET BALANCE')).toBeInTheDocument();
      expect(screen.getByText('Total Referrals')).toBeInTheDocument();
      expect(screen.getByText('Successful Conversions')).toBeInTheDocument();
      expect(screen.getByText('Total Rewards Earned')).toBeInTheDocument();
      expect(screen.getByText(/My Referrals/i)).toBeInTheDocument();
      expect(screen.getByText('Wallet History')).toBeInTheDocument();
      expect(screen.getByText(/Withdrawal Requests/i)).toBeInTheDocument();
    });
  });

  it('4. Sidebar contains Refer & Earn under Self Service', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'employee@acme.com',
        role: 'EMPLOYEE',
        firstName: 'Sarah',
        lastName: 'Connor',
      } as any,
      company: { id: 1, name: 'Acme Corp' } as any,
      features: [],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Sidebar />
      </BrowserRouter>
    );

    // Expand Self Service
    const selfServiceBtn = screen.getByText('Self Service');
    fireEvent.click(selfServiceBtn);

    expect(screen.getByText('Refer & Earn')).toBeInTheDocument();
  });
});
