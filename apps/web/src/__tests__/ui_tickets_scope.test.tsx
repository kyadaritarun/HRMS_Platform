import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { TicketsPage } from '../pages/tickets/TicketsPage';
import api from '../api/client';
import * as AuthContextModule from '../context/AuthContext';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Tickets Scope UI Tests for HR & Self Service', () => {
  const mockTickets = [
    {
      id: 301,
      code: 'TCK-2026-101',
      title: 'Clarification regarding Q2 Tax',
      subject: 'Clarification regarding Q2 Tax',
      description: 'Kindly share Form 16 Part B',
      category: 'HR',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      createdAt: '2026-10-19T10:00:00.000Z',
      requester: {
        id: 12,
        firstName: 'Maya',
        lastName: 'Patel',
        email: 'maya@uptrix.test',
      },
      assignee: {
        id: 5,
        firstName: 'Jone',
        lastName: 'Doe',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string, config?: any) => {
      if (url === '/tickets') {
        return Promise.resolve({
          data: {
            tickets: mockTickets,
            total: 1,
            page: 1,
            pageSize: 8,
          },
        });
      }
      if (url === '/employees') {
        return Promise.resolve({
          data: {
            items: [
              { id: 5, firstName: 'Jone', lastName: 'Doe', role: 'HR', department: { name: 'Human Resources' } },
              { id: 6, firstName: 'Elena', lastName: 'Rostova', role: 'HR', department: { name: 'Human Resources' } },
              { id: 10, firstName: 'Liam', lastName: 'Carter', role: 'EMPLOYEE', department: { name: 'Engineering' } },
              { id: 20, firstName: 'Rohan', lastName: 'Sharma', role: 'FINANCE', department: { name: 'Finance & Accounts' } },
              { id: 30, firstName: 'Amit', lastName: 'Verma', role: 'IT', department: { name: 'IT Infrastructure' } },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. In Self Service (/tickets) for HR: fetches scope=mine, no scope dropdown shown', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 5,
        role: 'HR',
        firstName: 'Jone',
        lastName: 'Doe',
        email: 'hr@gmail.com',
      } as any,
      company: null,
      features: ['support_ticket_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tickets')).toBeInTheDocument();
    });

    // Verify fetched with scope=mine
    expect(api.get).toHaveBeenCalledWith(
      '/tickets',
      expect.objectContaining({
        params: expect.objectContaining({ scope: 'mine' }),
      })
    );

    // No Scope select dropdown in Self Service
    expect(screen.queryByText(/All Company/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /scope/i })).not.toBeInTheDocument();

    // Create Ticket button is present in Self Service
    expect(screen.getByRole('button', { name: /Create Ticket/i })).toBeInTheDocument();
  });

  it('2. In Assigned To Me (/tickets/assigned) for HR: fetches scope=assigned, no All Company option', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 5,
        role: 'HR',
        firstName: 'Jone',
        lastName: 'Doe',
        email: 'hr@gmail.com',
      } as any,
      company: null,
      features: ['support_ticket_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/tickets/assigned']}>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Assigned Tickets')).toBeInTheDocument();
    });

    // Verify fetched with scope=assigned
    expect(api.get).toHaveBeenCalledWith(
      '/tickets',
      expect.objectContaining({
        params: expect.objectContaining({ scope: 'assigned' }),
      })
    );

    // "All Company" must NOT be rendered for HR
    expect(screen.queryByText(/All Company/i)).not.toBeInTheDocument();

    // Create Ticket button is NOT rendered in Assigned Tickets
    expect(screen.queryByRole('button', { name: /Create Ticket/i })).not.toBeInTheDocument();
  });

  it('3. In Assigned To Me (/tickets/assigned) for COMPANY_ADMIN: has scope toggle with All Company', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        role: 'COMPANY_ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@uptrix.test',
      } as any,
      company: null,
      features: ['support_ticket_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/tickets/assigned']}>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Assigned Tickets')).toBeInTheDocument();
    });

    // Company Admin has the scope dropdown with "All Company"
    expect(screen.getByRole('option', { name: 'All Company' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Assigned to Me' })).toBeInTheDocument();
  });

  it('4. When HR opens an assigned ticket, "Assigned To" shows only HR team employees', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 5,
        role: 'HR',
        firstName: 'Jone',
        lastName: 'Doe',
        email: 'hr@gmail.com',
      } as any,
      company: null,
      features: ['support_ticket_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/tickets/assigned']}>
        <TicketsPage />
      </MemoryRouter>
    );

    // Click Open button on the ticket
    const openBtn = await screen.findByRole('button', { name: /Open/i });
    fireEvent.click(openBtn);

    // Verify drawer opened with "Assigned To (HR Team)"
    await waitFor(() => {
      expect(screen.getByText(/Assigned To \(HR Team\)/i)).toBeInTheDocument();
    });

    // Verify only HR team members appear in the select options
    const selectElem = screen.getByTitle('Reassign ticket') as HTMLSelectElement;
    const optionTexts = Array.from(selectElem.options).map((opt) => opt.text);

    // Should include HR team members
    expect(optionTexts.some((t) => t.includes('Jone Doe'))).toBe(true);
    expect(optionTexts.some((t) => t.includes('Elena Rostova'))).toBe(true);

    // Should NOT include Engineering or Finance or IT members
    expect(optionTexts.some((t) => t.includes('Liam Carter'))).toBe(false);
    expect(optionTexts.some((t) => t.includes('Rohan Sharma'))).toBe(false);
    expect(optionTexts.some((t) => t.includes('Amit Verma'))).toBe(false);
  });

  it('5. When Finance opens an assigned ticket, "Assigned To" shows only Finance team employees', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/tickets') {
        return Promise.resolve({
          data: {
            tickets: [
              {
                id: 401,
                code: 'TCK-FIN-101',
                title: 'Salary Clarification',
                subject: 'Salary Clarification',
                description: 'Deductions question',
                category: 'FINANCE_TAX',
                priority: 'HIGH',
                status: 'OPEN',
                createdAt: '2026-10-19T10:00:00.000Z',
                requester: { id: 12, firstName: 'Maya', lastName: 'Patel', email: 'maya@uptrix.test' },
                assignee: { id: 20, firstName: 'Rohan', lastName: 'Sharma' },
              },
            ],
            total: 1,
            page: 1,
            pageSize: 8,
          },
        });
      }
      if (url === '/employees') {
        return Promise.resolve({
          data: {
            items: [
              { id: 5, firstName: 'Jone', lastName: 'Doe', role: 'HR', department: { name: 'Human Resources' } },
              { id: 6, firstName: 'Elena', lastName: 'Rostova', role: 'HR', department: { name: 'Human Resources' } },
              { id: 10, firstName: 'Liam', lastName: 'Carter', role: 'EMPLOYEE', department: { name: 'Engineering' } },
              { id: 20, firstName: 'Rohan', lastName: 'Sharma', role: 'FINANCE', department: { name: 'Finance & Accounts' } },
              { id: 30, firstName: 'Amit', lastName: 'Verma', role: 'IT', department: { name: 'IT Infrastructure' } },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 20,
        role: 'FINANCE',
        firstName: 'Rohan',
        lastName: 'Sharma',
        email: 'finance@gmail.com',
      } as any,
      company: null,
      features: ['support_ticket_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/tickets/assigned']}>
        <TicketsPage />
      </MemoryRouter>
    );

    // Click Open button on the ticket
    const openBtn = await screen.findByRole('button', { name: /Open/i });
    fireEvent.click(openBtn);

    // Verify drawer opened with "Assigned To (Finance Team)"
    await waitFor(() => {
      expect(screen.getByText(/Assigned To \(Finance Team\)/i)).toBeInTheDocument();
    });

    const selectElem = screen.getByTitle('Reassign ticket') as HTMLSelectElement;
    const optionTexts = Array.from(selectElem.options).map((opt) => opt.text);

    // Should include Finance team member
    expect(optionTexts.some((t) => t.includes('Rohan Sharma'))).toBe(true);

    // Should NOT include Engineering or IT members
    expect(optionTexts.some((t) => t.includes('Liam Carter'))).toBe(false);
    expect(optionTexts.some((t) => t.includes('Amit Verma'))).toBe(false);
  });

  it('6. When IT opens an assigned ticket, "Assigned To" shows only IT team employees', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/tickets') {
        return Promise.resolve({
          data: {
            tickets: [
              {
                id: 501,
                code: 'TCK-IT-101',
                title: 'Need new laptop monitor',
                subject: 'Need new laptop monitor',
                description: 'External monitor issue',
                category: 'HARDWARE',
                priority: 'HIGH',
                status: 'OPEN',
                createdAt: '2026-10-19T10:00:00.000Z',
                requester: { id: 12, firstName: 'Maya', lastName: 'Patel', email: 'maya@uptrix.test' },
                assignee: { id: 30, firstName: 'Amit', lastName: 'Verma' },
              },
            ],
            total: 1,
            page: 1,
            pageSize: 8,
          },
        });
      }
      if (url === '/employees') {
        return Promise.resolve({
          data: {
            items: [
              { id: 5, firstName: 'Jone', lastName: 'Doe', role: 'HR', department: { name: 'Human Resources' } },
              { id: 6, firstName: 'Elena', lastName: 'Rostova', role: 'HR', department: { name: 'Human Resources' } },
              { id: 10, firstName: 'Liam', lastName: 'Carter', role: 'EMPLOYEE', department: { name: 'Engineering' } },
              { id: 20, firstName: 'Rohan', lastName: 'Sharma', role: 'FINANCE', department: { name: 'Finance & Accounts' } },
              { id: 30, firstName: 'Amit', lastName: 'Verma', role: 'IT', department: { name: 'IT Infrastructure' } },
            ],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 30,
        role: 'IT',
        firstName: 'Amit',
        lastName: 'Verma',
        email: 'it@gmail.com',
      } as any,
      company: null,
      features: ['support_ticket_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/tickets/assigned']}>
        <TicketsPage />
      </MemoryRouter>
    );

    // Click Open button on the ticket
    const openBtn = await screen.findByRole('button', { name: /Open/i });
    fireEvent.click(openBtn);

    // Verify drawer opened with "Assigned To (IT Team)"
    await waitFor(() => {
      expect(screen.getByText(/Assigned To \(IT Team\)/i)).toBeInTheDocument();
    });

    const selectElem = screen.getByTitle('Reassign ticket') as HTMLSelectElement;
    const optionTexts = Array.from(selectElem.options).map((opt) => opt.text);

    // Should include IT team member
    expect(optionTexts.some((t) => t.includes('Amit Verma'))).toBe(true);

    // Should NOT include HR, Engineering, or Finance members
    expect(optionTexts.some((t) => t.includes('Liam Carter'))).toBe(false);
    expect(optionTexts.some((t) => t.includes('Jone Doe'))).toBe(false);
    expect(optionTexts.some((t) => t.includes('Rohan Sharma'))).toBe(false);
  });
});

