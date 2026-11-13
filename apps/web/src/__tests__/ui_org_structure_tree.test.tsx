import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as AuthContextModule from '../context/AuthContext';
import { RolesHierarchyPage } from '../pages/company/RolesHierarchyPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Org Structure Tree Component (Matching Visual Specification)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUsers = [
    {
      id: 1,
      firstName: 'Finance',
      lastName: 'Manager',
      email: 'finance.lead@docplexus.com',
      role: 'FINANCE',
      jobTitle: 'Finance Manager',
      isManager: true,
      department: { id: 1, name: 'FINANCE' },
      managerId: null,
      manager: null,
      reports: [{ id: 2 }],
    },
    {
      id: 2,
      firstName: 'Sumeet',
      lastName: 'Doshi',
      email: 'sumeet.doshi@docplexus.com',
      role: 'COMPANY_ADMIN',
      jobTitle: 'Interim-Chief Executive Officer',
      isManager: true,
      department: { id: 2, name: 'CEO OFFICE' },
      managerId: 1,
      manager: { id: 1, firstName: 'Finance', lastName: 'Manager' },
      reports: [{ id: 3 }, { id: 4 }],
    },
    {
      id: 3,
      firstName: 'Avinash',
      lastName: 'Mohanty',
      email: 'avinash.mohanty@docplexus.com',
      role: 'EMPLOYEE',
      jobTitle: 'Chief Commercial Officer',
      isManager: true,
      department: { id: 2, name: 'CEO OFFICE' },
      managerId: 2,
      manager: { id: 2, firstName: 'Sumeet', lastName: 'Doshi' },
      reports: [{ id: 5 }, { id: 6 }],
    },
    {
      id: 4,
      firstName: 'Shubhangi',
      lastName: 'Agarwal',
      email: 'shubhangi.agarwal@docplexus.com',
      role: 'EMPLOYEE',
      jobTitle: 'Company Secretary',
      isManager: false,
      department: { id: 2, name: 'CEO OFFICE' },
      managerId: 2,
      manager: { id: 2, firstName: 'Sumeet', lastName: 'Doshi' },
      reports: [],
    },
    {
      id: 5,
      firstName: 'Safiya',
      lastName: 'Sultana',
      email: 'safiya.sultana@docplexus.com',
      role: 'EMPLOYEE',
      jobTitle: 'Team Lead - Medical Communications',
      isManager: true,
      department: { id: 3, name: 'MEDICAL COMMUNICATIONS' },
      managerId: 3,
      manager: { id: 3, firstName: 'Avinash', lastName: 'Mohanty' },
      reports: [{ id: 7 }],
    },
    {
      id: 6,
      firstName: 'Aditee',
      lastName: 'Joshi',
      email: 'aditee.joshi@docplexus.com',
      role: 'EMPLOYEE',
      jobTitle: 'Associate Director',
      isManager: false,
      department: { id: 4, name: 'CUSTOMER SUCCESS' },
      managerId: 3,
      manager: { id: 3, firstName: 'Avinash', lastName: 'Mohanty' },
      reports: [],
    },
    {
      id: 7,
      firstName: 'Rohan',
      lastName: 'Verma',
      email: 'rohan.verma@docplexus.com',
      role: 'EMPLOYEE',
      jobTitle: 'Medical Content Specialist',
      isManager: false,
      department: { id: 3, name: 'MEDICAL COMMUNICATIONS' },
      managerId: 5,
      manager: { id: 5, firstName: 'Safiya', lastName: 'Sultana' },
      reports: [],
    },
  ];

  const mockDepartments = [
    { id: 1, name: 'FINANCE' },
    { id: 2, name: 'CEO OFFICE' },
    { id: 3, name: 'MEDICAL COMMUNICATIONS' },
    { id: 4, name: 'CUSTOMER SUCCESS' },
  ];

  const renderComponent = () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'finance.lead@docplexus.com',
        username: 'finance.lead',
        role: 'COMPANY_ADMIN',
        firstName: 'Finance',
        lastName: 'Manager',
        companyId: 1,
        mustChangePassword: false,
      },
      company: {
        id: 1,
        name: 'Docplexus',
        code: 'DOCPLEXUS',
        subdomain: 'docplexus',
      },
      features: ['org_hierarchy'],
      token: 'mock-jwt-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: vi.fn().mockReturnValue(true),
      hasHrPermission: vi.fn().mockReturnValue(true),
    });

    vi.mocked(api.get).mockImplementation(async (url: string) => {
      if (url === '/company/roles-hierarchy') {
        return { data: { users: mockUsers, rolesSummary: {} } } as any;
      }
      if (url === '/company/departments') {
        return { data: { departments: mockDepartments } } as any;
      }
      return { data: {} } as any;
    });

    return render(
      <MemoryRouter initialEntries={['/company/roles-hierarchy']}>
        <Routes>
          <Route path="/company/roles-hierarchy" element={<RolesHierarchyPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders the Org Structure tree with correct hierarchy cards, company name, and department', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Org Structure')).toBeInTheDocument();
      // Finance Manager root (appears both as name and title)
      expect(screen.getAllByText('Finance Manager').length).toBeGreaterThan(0);
      // Sumeet Doshi
      expect(screen.getByText('Sumeet Doshi')).toBeInTheDocument();
      // Avinash Mohanty
      expect(screen.getByText('Avinash Mohanty')).toBeInTheDocument();
      // Shubhangi Agarwal
      expect(screen.getByText('Shubhangi Agarwal')).toBeInTheDocument();
    });

    // Verify company name is shown on cards
    const companyTags = screen.getAllByText('Docplexus');
    expect(companyTags.length).toBeGreaterThan(0);
  });

  it('displays report count on collapsed node badge and expands when clicked', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Safiya Sultana')).toBeInTheDocument();
    });

    // Safiya Sultana has 1 report (Rohan Verma), and level 4 is collapsed by default
    // It should have a badge with '1'
    const safiyaBadge = screen.getByTitle(/Expand 1 direct reports/i);
    expect(safiyaBadge).toBeInTheDocument();
    expect(safiyaBadge).toHaveTextContent('1');

    // Rohan Verma is currently not visible because Safiya is collapsed
    expect(screen.queryByText('Rohan Verma')).not.toBeInTheDocument();

    // Click badge to expand Safiya's direct reports
    fireEvent.click(safiyaBadge);

    // Now Rohan Verma should appear
    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });

    // There should now be one more collapse badge
    const collapseBadges = screen.getAllByTitle(/Collapse direct reports/i);
    expect(collapseBadges.length).toBeGreaterThan(0);
  });

  it('supports Expand All, Collapse All, and Zoom controls', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Expand All')).toBeInTheDocument();
      expect(screen.getByText('Collapse All')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    // Test Zoom In
    const zoomInBtn = screen.getByTitle('Zoom In');
    fireEvent.click(zoomInBtn);
    expect(screen.getByText('110%')).toBeInTheDocument();

    // Test Zoom Out
    const zoomOutBtn = screen.getByTitle('Zoom Out');
    fireEvent.click(zoomOutBtn);
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Test Expand All: Rohan Verma should become visible
    fireEvent.click(screen.getByText('Expand All'));
    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });
  });

  it('filters/highlights matching nodes when search query is entered', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search org chart/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search org chart/i);
    fireEvent.change(searchInput, { target: { value: 'Rohan' } });

    // Typing 'Rohan' should automatically expand ancestor path and show Rohan Verma
    await waitFor(() => {
      expect(screen.getByText('Rohan Verma')).toBeInTheDocument();
    });
  });

  it('keeps Directory and Permissions Matrix tabs intact', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Directory/i)).toBeInTheDocument();
      expect(screen.getByText(/Permissions Matrix/i)).toBeInTheDocument();
    });

    // Click Directory Tab
    fireEvent.click(screen.getByText(/Directory/i));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search by employee name/i)).toBeInTheDocument();
      expect(screen.getByText('Reports To (Manager)')).toBeInTheDocument();
    });

    // Click Permissions Matrix Tab
    fireEvent.click(screen.getByText(/Permissions Matrix/i));
    await waitFor(() => {
      expect(screen.getByText('Capability & Operation')).toBeInTheDocument();
      expect(screen.getByText('Manage Company Profile & Billing')).toBeInTheDocument();
    });
  });
});
