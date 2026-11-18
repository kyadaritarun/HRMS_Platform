import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShiftRosterPage from '../pages/company/ShiftRosterPage';
import { api } from '../api/client';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'HR', companyId: 1, firstName: 'HR', lastName: 'Admin' },
    hasRole: () => true,
    hasPermission: () => true,
  }),
}));

vi.mock('../api/client', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
  };
});

describe('Shift & Schedule Management - Leave Visibility & Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEmployees = [
    {
      id: 101,
      firstName: 'Tarun',
      lastName: 'Kumar',
      email: 'tarun@example.com',
      department: { id: 1, name: 'Engineering' },
      jobTitle: 'Developer',
    },
  ];

  const mockShifts = [
    {
      id: 's1',
      name: 'General Shift',
      code: 'GEN',
      startTime: '09:00',
      endTime: '18:00',
      breakDurationMinutes: 45,
      gracePeriodMinutes: 15,
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
  ];

  it('1. Displays "On Leave" status on roster grid when employee has approved leave', async () => {
    // Current Monday
    const today = new Date();
    const day = today.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMon);
    const monStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/employees')) {
        return Promise.resolve({ data: { items: mockEmployees, total: 1 } });
      }
      if (url.includes('/company/shifts')) {
        return Promise.resolve({ data: { shifts: mockShifts } });
      }
      if (url.includes('/company/settings')) {
        return Promise.resolve({ data: { company: { workingDays: 'mon,tue,wed,thu,fri' } } });
      }
      if (url.includes('/company/roster')) {
        return Promise.resolve({
          data: {
            rosterMap: {},
            assignments: [],
            leaveMap: {
              [`101_${monStr}`]: {
                id: 55,
                type: 'Casual Leave',
                code: 'CL',
                status: 'APPROVED',
                days: 1,
                reason: 'Family event',
                isHalfDay: false,
              },
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <ShiftRosterPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tarun Kumar')).toBeInTheDocument();
    });

    // Expect the "On Leave" badge to be prominently visible in the roster grid
    await waitFor(() => {
      expect(screen.getByText('🌴 On Leave')).toBeInTheDocument();
    });
  });

  it('2. Displays "Pending" leave status on roster grid when employee has a pending leave request', async () => {
    const today = new Date();
    const day = today.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const tuesday = new Date(today);
    tuesday.setDate(today.getDate() + diffToMon + 1);
    const tueStr = `${tuesday.getFullYear()}-${String(tuesday.getMonth() + 1).padStart(2, '0')}-${String(tuesday.getDate()).padStart(2, '0')}`;

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/employees')) {
        return Promise.resolve({ data: { items: mockEmployees, total: 1 } });
      }
      if (url.includes('/company/shifts')) {
        return Promise.resolve({ data: { shifts: mockShifts } });
      }
      if (url.includes('/company/settings')) {
        return Promise.resolve({ data: { company: { workingDays: 'mon,tue,wed,thu,fri' } } });
      }
      if (url.includes('/company/roster')) {
        return Promise.resolve({
          data: {
            rosterMap: {},
            assignments: [],
            leaveMap: {
              [`101_${tueStr}`]: {
                id: 56,
                type: 'Sick Leave',
                code: 'SL',
                status: 'PENDING',
                days: 1,
                reason: 'Fever',
                isHalfDay: false,
              },
            },
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <ShiftRosterPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Tarun Kumar')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('⏳ Pending')).toBeInTheDocument();
    });
  });

  it('3. In 6 days work / 1 day week off, Bulk Assign applies shift to working days and preserves WO on weekly off', async () => {
    let capturedAssignments: any[] = [];
    (api.post as any).mockImplementation((url: string, body: any) => {
      if (url.includes('/bulk-assign')) {
        capturedAssignments = body.assignments || [];
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.resolve({ data: {} });
    });

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/employees')) {
        return Promise.resolve({ data: { items: mockEmployees, total: 1 } });
      }
      if (url.includes('/company/shifts')) {
        return Promise.resolve({ data: { shifts: mockShifts } });
      }
      if (url.includes('/company/settings')) {
        return Promise.resolve({
          data: { company: { workingDays: 'mon,tue,wed,thu,fri,sat' } },
        });
      }
      if (url.includes('/company/roster')) {
        return Promise.resolve({
          data: {
            rosterMap: {},
            assignments: [],
            leaveMap: {},
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    const { getByText } = render(
      <MemoryRouter>
        <ShiftRosterPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getByText('Tarun Kumar')).toBeInTheDocument();
    });

    // Open Bulk Assign modal
    const bulkBtn = getByText('Bulk Assign');
    bulkBtn.click();

    // Click "Apply to This Week"
    await waitFor(() => {
      expect(getByText('Apply to This Week')).toBeInTheDocument();
    });

    const applyBtn = getByText('Apply to This Week');
    applyBtn.click();

    await waitFor(() => {
      expect(capturedAssignments.length).toBe(7);
    });

    // Verify 6 days are 'GEN' and Sunday (7th day) is 'WO'
    const genDays = capturedAssignments.filter((a) => a.shiftTiming === 'GEN');
    const woDays = capturedAssignments.filter((a) => a.shiftTiming === 'WO');

    expect(genDays.length).toBe(6);
    expect(woDays.length).toBe(1);
  });
});
