import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { LockedFeatureModal } from '../components/LockedFeatureModal';
import * as AuthContextModule from '../context/AuthContext';

describe('Frontend UI Tests: Sidebar and LockedFeatureModal', () => {
  it('1. Renders employee self-service navigation categories matching uptrix_hrms', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'employee@acme.com',
        username: 'employee',
        role: 'EMPLOYEE',
        firstName: 'Sarah',
        lastName: 'Connor',
        companyId: 1,
        mustChangePassword: false,
        isManager: false,
      },
      company: {
        id: 1,
        name: 'Acme Corporation',
        code: 'ACME',
        subdomain: 'acme',
      },
      features: ['time_attendance_management', 'leave_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: (f: string) => ['time_attendance_management', 'leave_management'].includes(f),
      hasHrPermission: () => false,
    });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Sidebar />
      </BrowserRouter>
    );

    expect(screen.getByText('UPTRIX HRMS')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Self Service')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('2. Locked features display crown icon and open LockedFeatureModal on click', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'employee@acme.com',
        username: 'employee',
        role: 'EMPLOYEE',
        firstName: 'Sarah',
        lastName: 'Connor',
        companyId: 1,
        mustChangePassword: false,
        isManager: false,
      },
      company: {
        id: 1,
        name: 'Acme Corporation',
        code: 'ACME',
        subdomain: 'acme',
      },
      features: [], // All features locked
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => false, // Everything locked
      hasHrPermission: () => false,
    });

    render(
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Sidebar />
      </BrowserRouter>
    );

    // Click Self Service category to expand its sub-menu downward
    const selfServiceCategory = screen.getByText('Self Service');
    fireEvent.click(selfServiceCategory);

    // AI Assistant is locked in sub-menu
    const lockedButton = screen.getByText('AI Assistant');
    expect(lockedButton).toBeInTheDocument();

    // Click locked button
    fireEvent.click(lockedButton);

    // Modal opens with feature locked title
    expect(screen.getByText('AI Assistant is Locked')).toBeInTheDocument();
    expect(screen.getByText('Request Upgrade')).toBeInTheDocument();
  });

  it('3. LockedFeatureModal close button dismisses modal', () => {
    const handleClose = vi.fn();
    render(
      <LockedFeatureModal
        isOpen={true}
        onClose={handleClose}
        featureName="Payroll Engine"
      />
    );

    expect(screen.getByText('Payroll Engine is Locked')).toBeInTheDocument();
    const dismissBtn = screen.getByText('Dismiss');
    fireEvent.click(dismissBtn);

    expect(handleClose).toHaveBeenCalled();
  });

  it('4. Renders exact 1:1 uptrix_hrms categories for COMPANY_ADMIN with downward accordion', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 2,
        email: 'admin@acme.com',
        username: 'admin',
        role: 'COMPANY_ADMIN',
        firstName: 'John',
        lastName: 'Doe',
        companyId: 1,
        mustChangePassword: false,
        isManager: true,
      },
      company: {
        id: 1,
        name: 'Acme Corporation',
        code: 'ACME',
        subdomain: 'acme',
      },
      features: [
        'time_attendance_management',
        'leave_management',
        'claims',
        'performance',
        'support_ticket_management',
        'appreciations',
        'ai_assistant',
      ],
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

    // Verify uptrix_hrms company admin categories
    expect(screen.getByText('Company Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Assigned To Me')).toBeInTheDocument();
    expect(screen.getByText('Self Service')).toBeInTheDocument();
    expect(screen.getByText('HR Operations')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();

    // Clicking Company expands downward
    const compCategory = screen.getByText('Company');
    fireEvent.click(compCategory);

    // Verify Company sub-items appear
    expect(screen.getByText('Create Employee')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
    expect(screen.getByText('Activity Logs')).toBeInTheDocument();

    // Clicking HR Operations expands downward
    const hrCategory = screen.getByText('HR Operations');
    fireEvent.click(hrCategory);
    expect(screen.getByText('Employees')).toBeInTheDocument();
    expect(screen.getByText('Departments')).toBeInTheDocument();
  });

  it('5. HR role sees Self Dashboard and does NOT see Company Dashboard', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 2,
        email: 'hr@acme.com',
        username: 'hruser',
        role: 'HR',
        firstName: 'Jane',
        lastName: 'HR',
        companyId: 1,
        mustChangePassword: false,
        isManager: false,
      },
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

    // Verify HR sees Dashboard (only once) and does NOT see Company Dashboard
    expect(screen.getAllByText('Dashboard')).toHaveLength(1);
    expect(screen.queryByText('Company Dashboard')).not.toBeInTheDocument();

    // Verify HR can expand HR Operations and see Activity Logs
    const hrCategory = screen.getByText('HR Operations');
    fireEvent.click(hrCategory);
    expect(screen.getByText('Activity Logs')).toBeInTheDocument();
  });
});
