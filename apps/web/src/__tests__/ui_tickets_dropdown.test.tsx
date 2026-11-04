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

describe('Support Tickets Custom Category & Priority Dropdown UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        role: 'EMPLOYEE',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@uptrix.test',
      } as any,
      company: { id: 1, name: 'NovaTech', code: 'NOVA' } as any,
      features: ['support_ticket_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/tickets') {
        return Promise.resolve({ data: { tickets: [] } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. Opens Raise Support Ticket modal with custom Category dropdown and Priority selectors', async () => {
    render(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Support Tickets/i)).toBeInTheDocument();
    });

    // Click "Create Ticket" button
    const createTicketBtn = screen.getByRole('button', { name: /Create Ticket/i });
    fireEvent.click(createTicketBtn);

    // Modal opens
    expect(screen.getByText('Raise Support Ticket')).toBeInTheDocument();
    expect(screen.getByText('Department / Category')).toBeInTheDocument();
    expect(screen.getByText('IT Support')).toBeInTheDocument();

    // Priority level options
    expect(screen.getByRole('button', { name: /Low/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Medium/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /High/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Critical/i })).toBeInTheDocument();
  });

  it('2. Clicking category dropdown opens groups and selecting an option updates the selection', async () => {
    render(
      <MemoryRouter>
        <TicketsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Support Tickets/i)).toBeInTheDocument();
    });

    const createTicketBtn = screen.getByRole('button', { name: /Create Ticket/i });
    fireEvent.click(createTicketBtn);

    // Click Category trigger button
    const categoryTrigger = screen.getByRole('button', { name: /IT Support/i });
    fireEvent.click(categoryTrigger);

    // Popover opens showing all 3 groups
    expect(screen.getAllByText('IT & Infrastructure').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Finance & Payroll')).toBeInTheDocument();
    expect(screen.getByText('HR & Facilities')).toBeInTheDocument();

    // Select "Salary & Payslip Discrepancy"
    const salaryOption = screen.getByRole('button', { name: /Salary & Payslip Discrepancy/i });
    fireEvent.click(salaryOption);

    // Popover closes and the trigger displays the new selected category
    await waitFor(() => {
      expect(screen.getAllByText('Salary & Payslip Discrepancy').length).toBeGreaterThan(0);
    });
  });
});
