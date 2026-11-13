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

    expect(screen.getByText('Refer an Employee')).toBeInTheDocument();
    expect(
      screen.getByText(/Fill in the employee referral details below. Our HR team will be notified/i)
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText('Enter employee name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. JOB-101')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Senior Frontend Developer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter mobile number')).toBeInTheDocument();
    expect(screen.getByText('+91')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter working email')).toBeInTheDocument();
    expect(screen.getByText('Upload Employee Resume')).toBeInTheDocument();
    expect(screen.getByText('Click to upload employee resume')).toBeInTheDocument();
    expect(screen.getByTestId('resume-file-input')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Submit Referral')).toBeInTheDocument();
  });

  it('2. Submitting ReferLeadModal posts data to /referrals', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { success: true, message: 'Referral submitted' },
    });

    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    render(<ReferLeadModal isOpen={true} onClose={handleClose} onSuccess={handleSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('Enter employee name'), {
      target: { value: 'Rahul Sharma' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. JOB-101'), {
      target: { value: 'JOB-204' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Senior Frontend Developer'), {
      target: { value: 'Senior React Developer' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter mobile number'), {
      target: { value: '9876543210' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter working email'), {
      target: { value: 'rahul@gmail.com' },
    });
    const file = new File(['dummy resume content'], 'rahul-resume.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('resume-file-input');
    fireEvent.change(fileInput, {
      target: { files: [file] },
    });

    expect(screen.getByText('rahul-resume.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Submit Referral'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/referrals',
        expect.objectContaining({
          candidateName: 'Rahul Sharma',
          ownerName: 'Rahul Sharma',
          jobRole: 'Senior React Developer',
          businessName: 'Senior React Developer',
          jobId: 'JOB-204',
          mobileNumber: '9876543210',
          email: 'rahul@gmail.com',
          notes: '',
        })
      );
    });
  });

  it('3. ReferEarnPage renders clean referrals table and HR feedback column', async () => {
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
        referrals: [
          {
            id: 1,
            candidateName: 'Amit Verma',
            jobRole: 'Cloud Solutions Lead',
            jobId: 'JOB-501',
            mobileNumber: '9123456780',
            email: 'amit@cloud.com',
            status: 'SCREENING',
            hrFeedback: 'Resume shortlisted for tech interview',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReferEarnPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Employee Referrals')).toBeInTheDocument();
      expect(screen.getByText('Refer an Employee')).toBeInTheDocument();
      expect(screen.getByText(/My Referrals/i)).toBeInTheDocument();
      expect(screen.getAllByText('HR Feedback').length).toBeGreaterThan(0);
      expect(screen.getByText('Amit Verma')).toBeInTheDocument();
      expect(screen.getByText('Resume shortlisted for tech interview')).toBeInTheDocument();
    });
  });

  it('4. Sidebar contains Employee Referrals under Self Service', () => {
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

    expect(screen.getByText('Employee Referrals')).toBeInTheDocument();
  });

  it('5. ReferLeadModal handles 413 / payload too large errors gracefully', async () => {
    (api.post as any).mockRejectedValueOnce({
      response: {
        status: 413,
        data: { error: 'request entity too large' },
      },
    });

    render(<ReferLeadModal isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Enter employee name'), {
      target: { value: 'Krishna' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. JOB-101'), {
      target: { value: 'random' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Senior Frontend Developer'), {
      target: { value: 'Software Engineer' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter mobile number'), {
      target: { value: '9223572847' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter working email'), {
      target: { value: 'sdf@gmail.com' },
    });

    fireEvent.click(screen.getByText('Submit Referral'));

    await waitFor(() => {
      expect(
        screen.getByText('The attached resume exceeds the upload limit. Please upload a file smaller than 10MB.')
      ).toBeInTheDocument();
    });
  });

  it('6. In HR role, Self Service Employee Referrals shows only self referrals (My Referrals) and not All Employee Referrals', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 99,
        email: 'alekhya@acme.com',
        role: 'HR',
        firstName: 'Alekhya',
        lastName: 'R',
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

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/referrals/my') {
        return Promise.resolve({
          data: {
            success: true,
            referrals: [
              {
                id: 10,
                candidateName: 'Priya Sharma',
                jobRole: 'Product Designer',
                jobId: 'JOB-909',
                mobileNumber: '9888877777',
                email: 'priya@designer.com',
                status: 'NEW_LEAD',
                hrFeedback: null,
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReferEarnPage selfServiceOnly={true} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Employee Referrals')).toBeInTheDocument();
      expect(screen.getByText(/My Referrals/i)).toBeInTheDocument();
      expect(screen.queryByText(/All Employee Referrals/i)).not.toBeInTheDocument();
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('Product Designer')).toBeInTheDocument();
    });
  });

  it('7. In HR role, HR Operations Referral Requests renders All Employee Referrals and review desk', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 99,
        email: 'alekhya@acme.com',
        role: 'HR',
        firstName: 'Alekhya',
        lastName: 'R',
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

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/referrals/company') {
        return Promise.resolve({
          data: {
            success: true,
            leads: [
              {
                id: 25,
                candidateName: 'Rohan Mehta',
                jobRole: 'Backend Engineer',
                jobId: 'JOB-102',
                referrerName: 'Sarah Connor',
                referrerEmail: 'sarah@acme.com',
                mobileNumber: '9777766666',
                email: 'rohan@backend.com',
                status: 'SCREENING',
                hrFeedback: 'Screening passed, scheduling interview',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { success: true } });
    });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ReferEarnPage selfServiceOnly={false} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Referral Requests')).toBeInTheDocument();
      expect(screen.getByText(/All Employee Referrals/i)).toBeInTheDocument();
      expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText(/Edit Feedback/i)).toBeInTheDocument();
      // Ensure "Refer an Employee" button is removed from Referral Requests page
      expect(screen.queryByText('Refer an Employee')).not.toBeInTheDocument();
    });

    // Verify single-click Hiring Stage dropdown change
    const statusSelect = screen.getByRole('combobox', { name: /Change hiring stage/i });
    expect(statusSelect).toHaveValue('SCREENING');

    fireEvent.change(statusSelect, { target: { value: 'INTERVIEWING' } });

    await waitFor(() => {
      // Instantly updates value optimistically on single change
      expect(statusSelect).toHaveValue('INTERVIEWING');
      expect(api.patch).toHaveBeenCalledWith('/referrals/25/status', { status: 'INTERVIEWING' });
    });
  });

  it('8. Sidebar contains Referral Requests under HR Operations for HR / Admin', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 99,
        email: 'alekhya@acme.com',
        role: 'HR',
        firstName: 'Alekhya',
        lastName: 'R',
      } as any,
      company: {
        id: 1,
        name: 'Acme Corp',
        package: { enabledFeatures: ['lead_referrals', 'departments', 'shift_management'] },
      } as any,
      features: ['lead_referrals'],
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

    // Expand HR Operations
    const hrOpsBtn = screen.getByText('HR Operations');
    fireEvent.click(hrOpsBtn);

    const referralRequestsLink = screen.getByRole('link', { name: /Referral Requests/i });
    expect(referralRequestsLink).toBeInTheDocument();
    expect(referralRequestsLink).toHaveAttribute('href', '/company/referral-requests');
  });
});
