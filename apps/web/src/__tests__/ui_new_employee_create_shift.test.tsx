import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { NewEmployeePage } from '../pages/company/NewEmployeePage';
import api from '../api/client';
import * as AuthContextModule from '../context/AuthContext';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('NewEmployeePage In-Page Create Shift UI Tests', () => {
  const existingShifts = [
    {
      id: 's-1',
      name: 'General Shift',
      code: 'GS',
      startTime: '09:00',
      endTime: '18:00',
      breakDurationMinutes: 60,
      gracePeriodMinutes: 15,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        role: 'COMPANY_ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@uptrix.test',
      } as any,
      company: { id: 1, name: 'NovaTech', code: 'NOVA', subdomain: 'novatech' } as any,
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
      if (url === '/company/departments') {
        return Promise.resolve({ data: { departments: [{ id: 1, name: 'Engineering' }] } });
      }
      if (url.startsWith('/employees')) {
        return Promise.resolve({ data: { items: [] } });
      }
      if (url === '/company/settings') {
        return Promise.resolve({ data: { company: { allowedEmailDomains: 'novatech.io' } } });
      }
      if (url === '/company/shifts') {
        return Promise.resolve({ data: { shifts: existingShifts } });
      }
      return Promise.resolve({ data: {} });
    });

    (api.put as any).mockImplementation((url: string, data: any) => {
      if (url === '/company/shifts') {
        return Promise.resolve({ data: { success: true, shifts: data.shifts } });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. Clicking "Create Shift" opens the drawer right on the same page without navigating away', async () => {
    render(
      <MemoryRouter>
        <NewEmployeePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Shift Timing/i)).toBeInTheDocument();
    });

    const createShiftBtn = screen.getByRole('button', { name: /Create Shift/i });
    expect(createShiftBtn).toBeInTheDocument();

    fireEvent.click(createShiftBtn);

    // In-page drawer appears
    expect(screen.getByRole('heading', { name: 'Create Shift' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. General Shift')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. GS')).toBeInTheDocument();
  });

  it('2. Creating a shift via the drawer updates company shifts and automatically selects it in Shift Timing', async () => {
    render(
      <MemoryRouter>
        <NewEmployeePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Shift Timing/i)).toBeInTheDocument();
    });

    const createShiftBtn = screen.getByRole('button', { name: /Create Shift/i });
    fireEvent.click(createShiftBtn);

    const nameInput = screen.getByPlaceholderText('e.g. General Shift');
    const codeInput = screen.getByPlaceholderText('e.g. GS');

    fireEvent.change(nameInput, { target: { value: 'Night Shift' } });
    fireEvent.change(codeInput, { target: { value: 'NS' } });

    const submitBtn = screen.getByRole('button', { name: /Save Shift/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/company/shifts',
        expect.objectContaining({
          shifts: expect.arrayContaining([
            expect.objectContaining({
              name: 'Night Shift',
              code: 'NS',
            }),
          ]),
        })
      );
    });

    // Check that success toast or message appeared
    await waitFor(() => {
      expect(screen.getByText(/"Night Shift" was saved and automatically selected./i)).toBeInTheDocument();
    });
  });
});
