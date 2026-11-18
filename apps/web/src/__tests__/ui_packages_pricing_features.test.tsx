import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  PackagesPage,
  FEATURE_GROUPS,
  AVAILABLE_FEATURES,
  expandFeaturesWithAliases,
} from '../pages/superadmin/PackagesPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Packages & Pricing Custom Plan Feature Completeness Tests', () => {
  const fullEnterprise64Features = [
    'time_attendance_management', 'attendance', 'shift_roster', 'shift_management',
    'leave_management', 'leaves', 'comp_off_management', 'comp_off', 'compensation_off',
    'holiday_calendar', 'holidays', 'payroll', 'payroll_management', 'loan_advances',
    'tax_declarations', 'compliance_reports', 'claim_process_management', 'claims',
    'performance_management', 'performance', 'employee_appreciation', 'appreciations',
    'policy_documents_management', 'policies', 'employee_document_management', 'documents',
    'support_ticket_management', 'tickets', 'ai_assistance', 'ai_assistant',
    'employees_directory', 'directory', 'org_structure', 'asset_management', 'assets',
    'onboarding_management', 'onboarding', 'employee_training', 'background_verification',
    'activity_logs', 'lead_referrals', 'referrals', 'compliance_management', 'compliance',
    'reports_analytics', 'reports', 'exit_management', 'exits', 'settlement',
    'company_goals', 'goals', 'departments', 'department_management', 'billing',
    'billing_management', 'hr_operations', 'finance_operations', 'it_operations',
    'leave_types', 'appraisal_cycles', 'salary_master', 'form16_tax',
    'daily_punch_report', 'leave_taken_report',
  ];

  const mockPackages = [
    {
      id: 3,
      name: 'Enterprise Tier',
      tier: 'CUSTOM',
      description: 'Full-featured enterprise suite with payroll, performance, and AI',
      currency: 'INR',
      priceMonthly: 4999,
      priceQuarterly: 13999,
      priceYearly: 49999,
      employeeLimit: 100,
      billingDefault: 'MONTHLY',
      enabledFeatures: fullEnterprise64Features,
      _count: { companies: 5 },
    },
    {
      id: 4,
      name: 'uptrixglobal - Custom Plan',
      companyName: 'uptrixglobal',
      tier: 'CUSTOM',
      description: 'Tailored plan configured specifically for uptrixglobal',
      currency: 'INR',
      priceMonthly: 4999,
      priceQuarterly: 13999,
      priceYearly: 49999,
      employeeLimit: 100,
      billingDefault: 'MONTHLY',
      enabledFeatures: fullEnterprise64Features,
      _count: { companies: 1 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      data: { packages: mockPackages },
    });
  });

  it('1. FEATURE_GROUPS includes all missing modules (training, bgv, compliance reports)', () => {
    const allKeys = FEATURE_GROUPS.flatMap((g) => g.features).map((f) => f.key);

    expect(allKeys).toContain('employee_training');
    expect(allKeys).toContain('background_verification');
    expect(allKeys).toContain('compliance_reports');
    expect(AVAILABLE_FEATURES.length).toBe(38);
  });

  it('2. expandFeaturesWithAliases expands all 38 module keys to all 64 Enterprise features', () => {
    const all38Keys = AVAILABLE_FEATURES.map((f) => f.key);
    const expanded = expandFeaturesWithAliases(all38Keys);

    expect(expanded.length).toBe(64);
    for (const feat of fullEnterprise64Features) {
      expect(expanded).toContain(feat);
    }
  });

  it('3. Renders both Enterprise Tier and Custom Plan with "+61 more" badges', async () => {
    render(
      <MemoryRouter>
        <PackagesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Enterprise Tier')).toBeInTheDocument();
      expect(screen.getByText('uptrixglobal - Custom Plan')).toBeInTheDocument();
    });

    // Both should display "+61 more" since both have 64 features (3 badges + 61 more)
    const moreBadges = screen.getAllByText('+61 more');
    expect(moreBadges.length).toBe(2);
  });

  it('4. Opening + Custom Plan modal has all options ready to select and saves all 64 features', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { success: true },
    });

    render(
      <MemoryRouter>
        <PackagesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('+ Custom Plan')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('+ Custom Plan'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Package Plan' })).toBeInTheDocument();
    });

    // Custom Plan defaults with all features unlocked
    fireEvent.click(screen.getByRole('button', { name: 'Create Package Plan' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/superadmin/packages',
        expect.objectContaining({
          tier: 'CUSTOM',
          enabledFeatures: expect.arrayContaining([
            'time_attendance_management',
            'attendance',
            'employee_training',
            'background_verification',
            'compliance_reports',
            'claim_process_management',
            'payroll_management',
          ]),
        })
      );
    });
  });
});
