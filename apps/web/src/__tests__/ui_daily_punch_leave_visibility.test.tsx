import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DailyPunchReportPage from '../pages/reports/DailyPunchReportPage';
import { api } from '../api/client';

vi.mock('../api/client', () => {
  const mockApi = {
    get: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
  };
});

describe('DailyPunchReportPage - Leave Visibility & Inspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockReportData = {
    dates: [
      {
        dateKey: '2026-11-18',
        formattedDate: '18/11/2026',
        dayName: 'Wednesday',
        dayOfWeek: 3,
        isWeekend: false,
        rawDate: '2026-11-18T00:00:00.000Z',
      },
    ],
    employees: [
      {
        id: 101,
        firstName: 'Tarun',
        lastName: 'Kumar',
        fullName: 'Tarun Kumar',
        email: 'tarun@example.com',
        employeeNumber: 'EMP101',
        jobTitle: 'Developer',
        department: 'Engineering',
        departmentId: 1,
        profilePhoto: null,
        shiftName: 'General Shift',
        punchesByDate: {
          '2026-11-18': {
            hasPunch: false,
            isOnLeave: true,
            isWeekend: false,
            leave: {
              id: 42,
              name: 'Casual Leave',
              code: 'CL',
              color: 'purple',
              days: 1,
              status: 'APPROVED',
              reason: 'Personal family emergency',
              isHalfDay: false,
            },
          },
        },
      },
      {
        id: 102,
        firstName: 'Sushanth',
        lastName: 'Pillala',
        fullName: 'Sushanth Pillala',
        email: 'sushanth@example.com',
        employeeNumber: 'EMP102',
        jobTitle: 'Finance Analyst',
        department: 'Finance',
        departmentId: 2,
        profilePhoto: null,
        shiftName: 'General Shift',
        punchesByDate: {
          '2026-11-18': {
            hasPunch: false,
            isOnLeave: true,
            isWeekend: false,
            leave: {
              id: 43,
              name: 'Sick Leave',
              code: 'SL',
              color: 'amber',
              days: 0.5,
              status: 'PENDING',
              reason: 'Medical checkup',
              isHalfDay: true,
              halfDayPeriod: 'FIRST_HALF',
            },
          },
        },
      },
    ],
    summary: {
      totalEmployees: 2,
      totalPunchesCount: 0,
      totalLatePunches: 0,
      totalMissingCheckouts: 0,
      totalWorkedHours: 0,
      averageHoursPerPunch: 0,
    },
    companyWorkingDays: 'mon,tue,wed,thu,fri',
    departments: [
      { id: 1, name: 'Engineering' },
      { id: 2, name: 'Finance' },
    ],
  };

  it('renders Approved and Pending leave cells and opens inspection modal with leave details', async () => {
    (api.get as any).mockResolvedValue({
      data: mockReportData,
    });

    render(
      <MemoryRouter>
        <DailyPunchReportPage />
      </MemoryRouter>
    );

    // Verify employees are displayed
    await waitFor(() => {
      expect(screen.getByText('Tarun Kumar')).toBeInTheDocument();
      expect(screen.getByText('Sushanth Pillala')).toBeInTheDocument();
    });

    // Verify Approved Leave badge for Tarun
    expect(screen.getByText('Leave (CL)')).toBeInTheDocument();

    // Verify Pending Leave badge for Sushanth
    expect(screen.getByText('Pending (SL)')).toBeInTheDocument();

    // Click on Tarun's leave cell to inspect details
    const approvedLeaveCell = screen.getByText('Leave (CL)');
    fireEvent.click(approvedLeaveCell);

    // Modal should open with full leave information
    await waitFor(() => {
      expect(screen.getByText('Leave Information')).toBeInTheDocument();
      expect(screen.getAllByText('Approved Leave').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Casual Leave (CL)')).toBeInTheDocument();
      expect(screen.getByText('Full Day (1d)')).toBeInTheDocument();
      expect(screen.getByText('"Personal family emergency"')).toBeInTheDocument();
    });
  });
});
