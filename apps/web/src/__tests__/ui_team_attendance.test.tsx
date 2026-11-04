import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { TeamAttendancePage } from '../pages/attendance/TeamAttendancePage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('Team Attendance UI Tests for Managers', () => {
  const mockTeamLogs = [
    {
      id: 501,
      checkIn: '2026-11-03T09:15:00.000Z',
      checkOut: null,
      workMode: 'OFFICE',
      durationHours: null,
      note: 'Working from Mumbai HQ',
      user: {
        id: 12,
        firstName: 'Alice',
        lastName: 'Developer',
        email: 'alice@uptrix.test',
        jobTitle: 'Frontend Engineer',
        department: { id: 2, name: 'Engineering' },
        profilePhoto: null,
      },
    },
    {
      id: 502,
      checkIn: '2026-11-03T08:45:00.000Z',
      checkOut: '2026-11-03T17:15:00.000Z',
      workMode: 'WFH',
      durationHours: '8.5' as any,
      note: 'Home workstation',
      user: {
        id: 14,
        firstName: 'Bob',
        lastName: 'Designer',
        email: 'bob@uptrix.test',
        jobTitle: 'UI/UX Designer',
        department: { id: 2, name: 'Engineering' },
        profilePhoto: null,
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/attendance/team') {
        return Promise.resolve({
          data: {
            records: mockTeamLogs,
            teamSize: 3,
            total: 2,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. Renders Team Attendance page with KPI summary cards', async () => {
    render(<TeamAttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('Team Attendance')).toBeInTheDocument();
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
      expect(screen.getByText('Bob Designer')).toBeInTheDocument();
    });

    expect(screen.getByText('Present Today')).toBeInTheDocument();
    expect(screen.getByText('Office Work')).toBeInTheDocument();
    expect(screen.getByText('Remote / WFH')).toBeInTheDocument();
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
  });

  it('2. Displays live punch-in status and active check-in indicator', async () => {
    render(<TeamAttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('Active / Logged In')).toBeInTheDocument();
      expect(screen.getByText('8.5 hrs')).toBeInTheDocument();
    });
  });

  it('3. Filters team members by search query', async () => {
    render(<TeamAttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search team member...');
    fireEvent.change(searchInput, { target: { value: 'Alice' } });

    expect(screen.getByText('Alice Developer')).toBeInTheDocument();
    expect(screen.queryByText('Bob Designer')).not.toBeInTheDocument();
  });
});

