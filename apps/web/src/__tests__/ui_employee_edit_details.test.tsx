import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import * as AuthContextModule from '../context/AuthContext';
import { EmployeesPage } from '../pages/company/EmployeesPage';
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

describe('Edit Employee Details - Open Designation, Department, and Reporting Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEmployees = [
    {
      id: 101,
      email: 'kumarkiran29845@gmail.com',
      username: 'kumarkiran',
      firstName: 'kumarkiran',
      lastName: '',
      phone: '7207109353',
      role: 'EMPLOYEE',
      jobTitle: 'marketing',
      workMode: 'WFO',
      employmentType: 'PERMANENT',
      employeeNumber: 'EMP-591',
      personalEmail: 'kumarkiran@gmail.com',
      dateOfBirth: '2000-02-19T00:00:00.000Z',
      emergencyContact: {
        name: 'Emergency Person',
        relationship: 'Spouse',
        phone: '9999999999',
      },
      departmentId: 10,
      department: { id: 10, name: 'Digital Marketing' },
      managerId: 1,
      manager: { id: 1, firstName: 'Sumeet', lastName: 'Doshi' },
      createdAt: '2026-01-01T00:00:00.000Z',
      isActive: true,
    },
    {
      id: 1,
      email: 'sumeet.doshi@uptrix.io',
      username: 'sumeet.doshi',
      firstName: 'Sumeet',
      lastName: 'Doshi',
      phone: '9876543210',
      role: 'COMPANY_ADMIN',
      jobTitle: 'Managing Director',
      workMode: 'WFO',
      employmentType: 'PERMANENT',
      employeeNumber: 'EMP-001',
      departmentId: 1,
      department: { id: 1, name: 'Executive' },
      managerId: null,
      manager: null,
      createdAt: '2025-01-01T00:00:00.000Z',
      isActive: true,
    },
    {
      id: 2,
      email: 'avinash.m@uptrix.io',
      username: 'avinash.m',
      firstName: 'Avinash',
      lastName: 'Mohanty',
      phone: '9876543211',
      role: 'HR',
      jobTitle: 'HR Director',
      workMode: 'WFO',
      employmentType: 'PERMANENT',
      employeeNumber: 'EMP-002',
      departmentId: 2,
      department: { id: 2, name: 'Human Resources' },
      managerId: 1,
      manager: { id: 1, firstName: 'Sumeet', lastName: 'Doshi' },
      createdAt: '2025-01-01T00:00:00.000Z',
      isActive: true,
    },
  ];

  const mockDepartments = [
    { id: 1, name: 'Executive' },
    { id: 2, name: 'Human Resources' },
    { id: 10, name: 'Digital Marketing' },
  ];

  const renderComponent = () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'sumeet.doshi@uptrix.io',
        username: 'sumeet.doshi',
        role: 'COMPANY_ADMIN',
        firstName: 'Sumeet',
        lastName: 'Doshi',
        companyId: 1,
        mustChangePassword: false,
      },
      company: {
        id: 1,
        name: 'Uptrix Corp',
        code: 'UPTRIX',
        subdomain: 'uptrix',
      },
      features: ['hr_operations'],
      token: 'jwt-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: vi.fn().mockReturnValue(true),
      hasHrPermission: vi.fn().mockReturnValue(true),
    });

    vi.mocked(api.get).mockImplementation(async (url: string, config?: any) => {
      if (url === '/employees') {
        return {
          data: {
            items: mockEmployees,
            total: mockEmployees.length,
          },
        } as any;
      }
      if (url === '/company/departments') {
        return {
          data: { departments: mockDepartments },
        } as any;
      }
      if (url === '/company/shifts') {
        return {
          data: { shifts: [] },
        } as any;
      }
      return { data: {} } as any;
    });

    vi.mocked(api.patch).mockResolvedValue({
      data: { employee: mockEmployees[0] },
    } as any);

    return render(
      <MemoryRouter>
        <EmployeesPage />
      </MemoryRouter>
    );
  };

  it('renders Designation, Department, and Reporting Manager as editable inputs/selects in Edit Employee Details drawer', async () => {
    renderComponent();

    // Wait for table to load
    await waitFor(() => {
      expect(screen.getByText('kumarkiran')).toBeInTheDocument();
    });

    // Click edit button for kumarkiran
    const editButtons = screen.getAllByTitle('Edit Employee Details');
    fireEvent.click(editButtons[0]);

    // Check that Edit Employee Details drawer is open
    await waitFor(() => {
      expect(screen.getByText('Edit Employee Details')).toBeInTheDocument();
    });

    // 1. Designation / Job Title should be an editable text input with current value 'marketing'
    const jobTitleInput = screen.getByPlaceholderText('e.g. Marketing Lead, Software Engineer');
    expect(jobTitleInput).toBeInTheDocument();
    expect(jobTitleInput).not.toBeDisabled();
    expect(jobTitleInput).toHaveValue('marketing');

    // 2. Department should be an editable select dropdown with current value '10' (Digital Marketing)
    const departmentSelect = screen.getByLabelText(/Department/i, { selector: 'select' });
    expect(departmentSelect).toBeInTheDocument();
    expect(departmentSelect).not.toBeDisabled();
    expect(departmentSelect).toHaveValue('10');

    // 3. Reporting Manager should be an editable select dropdown with current value '1' (Sumeet Doshi)
    const managerSelect = screen.getByLabelText(/Reporting Manager/i, { selector: 'select' });
    expect(managerSelect).toBeInTheDocument();
    expect(managerSelect).not.toBeDisabled();
    expect(managerSelect).toHaveValue('1');

    // Verify the employee cannot report to themselves (id 101 should not be an option)
    const options = Array.from(managerSelect.querySelectorAll('option')).map((o) => o.value);
    expect(options).not.toContain('101');
    expect(options).toContain('1');
    expect(options).toContain('2');
  });

  it('saves updated Designation, Department, and Reporting Manager when submitting form', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('kumarkiran')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit Employee Details');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee Details')).toBeInTheDocument();
    });

    // Update Designation / Job Title
    const jobTitleInput = screen.getByPlaceholderText('e.g. Marketing Lead, Software Engineer');
    fireEvent.change(jobTitleInput, { target: { value: 'Senior Growth Specialist' } });

    // Update Department
    const departmentSelect = screen.getByLabelText(/Department/i, { selector: 'select' });
    fireEvent.change(departmentSelect, { target: { value: '2' } });

    // Update Reporting Manager
    const managerSelect = screen.getByLabelText(/Reporting Manager/i, { selector: 'select' });
    fireEvent.change(managerSelect, { target: { value: '2' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/employees/101',
        expect.objectContaining({
          jobTitle: 'Senior Growth Specialist',
          departmentId: 2,
          managerId: 2,
        })
      );
    });
  });

  it('allows promoting an employee back to HR role and preserves HR role when changing reporting manager', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('kumarkiran')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByTitle('Edit Employee Details');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Employee Details')).toBeInTheDocument();
    });

    // Select HR role in System Role dropdown
    const systemRoleSelect = screen.getByLabelText(/System Role/i, { selector: 'select' });
    expect(systemRoleSelect).toBeInTheDocument();
    expect(systemRoleSelect).not.toBeDisabled();

    fireEvent.change(systemRoleSelect, { target: { value: 'HR' } });
    expect(systemRoleSelect).toHaveValue('HR');

    // Select Reporting Manager as Company Admin (id 1)
    const managerSelect = screen.getByLabelText(/Reporting Manager/i, { selector: 'select' });
    fireEvent.change(managerSelect, { target: { value: '1' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/employees/101',
        expect.objectContaining({
          role: 'HR',
          managerId: 1,
        })
      );
    });
  });
});
