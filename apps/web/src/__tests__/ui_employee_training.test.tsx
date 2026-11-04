import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import EmployeeTrainingPage from '../pages/company/EmployeeTrainingPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Employee Training UI Tests - Removal of Course Catalog & Activation Blur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.startsWith('/employees')) {
        return Promise.resolve({
          data: {
            items: [
              { id: 101, employeeNumber: 'EMP-001', name: 'jone', department: { name: 'General' } },
              { id: 102, employeeNumber: 'EMP-002', name: 'Arjun Verma', department: { name: 'General' } },
              { id: 103, employeeNumber: 'EMP-003', name: 'Rohan Sharma', department: { name: 'Finance & Accounts' } },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. Does NOT render Course Catalog tab or Course Catalog tab switcher', () => {
    render(
      <MemoryRouter>
        <EmployeeTrainingPage />
      </MemoryRouter>
    );

    // Course Catalog tab button should not exist
    expect(screen.queryByText(/Course Catalog/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Course Catalog/i })).toBeNull();
  });

  it('2. Directly displays Employee Progress table with blurred columns and unblurred employee info', async () => {
    render(
      <MemoryRouter>
        <EmployeeTrainingPage />
      </MemoryRouter>
    );

    // Check activation banner
    expect(screen.getAllByText(/Pending Activation/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Active Courses/i)).toBeNull();

    // Table headers exist
    expect(screen.getByText('Employee')).toBeInTheDocument();
    expect(screen.getByText('Training Program')).toBeInTheDocument();
    expect(screen.getByText('Due Date')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getAllByText('Certificate').length).toBeGreaterThan(0);

    // Wait for employees to load
    await waitFor(() => {
      expect(screen.getAllByText('jone').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Arjun Verma').length).toBeGreaterThan(0);
    });

    // Check that blurred column headers have blur styling
    const progHeader = screen.getByText('Training Program');
    expect(progHeader.className).toContain('blur');

    // Check that Employee cell does not contain blur
    const employeeHeader = screen.getByText('Employee');
    expect(employeeHeader.className).not.toContain('blur');
  });

  it('3. Renders the centered activation notice and top alert banner to contact Uptrix organization', () => {
    render(
      <MemoryRouter>
        <EmployeeTrainingPage />
      </MemoryRouter>
    );

    // Centered overlay card and top alert banner
    expect(screen.getByText('Employee Training & Certifications Inactive')).toBeInTheDocument();
    expect(screen.getAllByText(/If you want to activate, contact to Uptrix organization/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Contact Uptrix Organization/i).length).toBeGreaterThan(0);
  });

  it('4. Filters employees by search dropdowns', async () => {
    render(
      <MemoryRouter>
        <EmployeeTrainingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Arjun Verma').length).toBeGreaterThan(0);
    });

    const searchInput = screen.getByPlaceholderText(/Search by Employee or Course name/i);
    fireEvent.change(searchInput, { target: { value: 'Arjun' } });

    expect(screen.getAllByText('Arjun Verma').length).toBeGreaterThan(0);
    expect(screen.queryByText('Rohan Sharma')).toBeNull();
  });

  it('5. Overlay activation card informs user to contact Uptrix organization', () => {
    render(
      <MemoryRouter>
        <EmployeeTrainingPage />
      </MemoryRouter>
    );

    expect(
      screen.getAllByText(/Training programs, progress tracking, and certificate generation are pending. If you want to activate, contact to Uptrix organization./i).length
    ).toBeGreaterThan(0);
  });
});
