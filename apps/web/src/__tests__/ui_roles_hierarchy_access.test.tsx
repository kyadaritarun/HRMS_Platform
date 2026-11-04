import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as AuthContextModule from '../context/AuthContext';
import { ProtectedRoute } from '../components/ProtectedRoute';
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

describe('Roles & Hierarchy Access for Finance and IT Roles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUsers = [
    {
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@uptrix.io',
      role: 'COMPANY_ADMIN',
      jobTitle: 'Managing Director',
      isManager: true,
      department: { id: 1, name: 'Executive' },
      manager: null,
      reports: [{ id: 5 }, { id: 6 }],
    },
    {
      id: 5,
      firstName: 'Rohan',
      lastName: 'Sharma',
      email: 'finance@uptrix.io',
      role: 'FINANCE',
      jobTitle: 'Finance Controller',
      isManager: false,
      department: { id: 2, name: 'Finance & Accounts' },
      manager: { id: 1, firstName: 'Admin', lastName: 'User' },
      reports: [],
    },
    {
      id: 6,
      firstName: 'Amit',
      lastName: 'Verma',
      email: 'it@uptrix.io',
      role: 'IT',
      jobTitle: 'IT Systems Admin',
      isManager: false,
      department: { id: 3, name: 'IT Infrastructure' },
      manager: { id: 1, firstName: 'Admin', lastName: 'User' },
      reports: [],
    },
  ];

  const mockDepartments = [
    { id: 1, name: 'Executive' },
    { id: 2, name: 'Finance & Accounts' },
    { id: 3, name: 'IT Infrastructure' },
  ];

  it('allows FINANCE user to access /company/roles-hierarchy without being redirected to dashboard', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 5,
        email: 'finance@uptrix.io',
        username: 'rohan.sharma',
        role: 'FINANCE',
        firstName: 'Rohan',
        lastName: 'Sharma',
        companyId: 1,
        mustChangePassword: false,
      },
      company: {
        id: 1,
        name: 'Uptrix Corp',
        code: 'UPTRIX',
        subdomain: 'uptrix',
      },
      features: ['org_hierarchy'],
      token: 'jwt-token',
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

    render(
      <MemoryRouter initialEntries={['/company/roles-hierarchy']}>
        <Routes>
          <Route
            path="/company/roles-hierarchy"
            element={
              <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR', 'FINANCE', 'IT', 'EMPLOYEE']}>
                <RolesHierarchyPage />
              </ProtectedRoute>
            }
          />
          <Route path="/employee/dashboard" element={<div>Employee Dashboard Mock</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Verify Roles & Hierarchy header is rendered, NOT Employee Dashboard Mock
    await waitFor(() => {
      expect(screen.getByText(/Roles & Hierarchy/i)).toBeInTheDocument();
      expect(screen.queryByText('Employee Dashboard Mock')).not.toBeInTheDocument();
    });

    // Switch to Directory tab where role filter is located
    fireEvent.click(screen.getByText(/Directory/i));

    await waitFor(() => {
      // Check that Finance and IT options exist in role filter
      expect(screen.getByRole('option', { name: 'Finance' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'IT Operations' })).toBeInTheDocument();
    });
  });

  it('allows IT user to access /roles-hierarchy without being redirected', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 6,
        email: 'it@uptrix.io',
        username: 'amit.verma',
        role: 'IT',
        firstName: 'Amit',
        lastName: 'Verma',
        companyId: 1,
        mustChangePassword: false,
      },
      company: {
        id: 1,
        name: 'Uptrix Corp',
        code: 'UPTRIX',
        subdomain: 'uptrix',
      },
      features: ['org_hierarchy'],
      token: 'jwt-token',
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

    render(
      <MemoryRouter initialEntries={['/roles-hierarchy']}>
        <Routes>
          <Route
            path="/roles-hierarchy"
            element={
              <ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR', 'FINANCE', 'IT', 'EMPLOYEE']}>
                <RolesHierarchyPage />
              </ProtectedRoute>
            }
          />
          <Route path="/employee/dashboard" element={<div>Employee Dashboard Mock</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Roles & Hierarchy/i)).toBeInTheDocument();
      expect(screen.queryByText('Employee Dashboard Mock')).not.toBeInTheDocument();
    });
  });
});
