import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyLeavesPage from '../pages/requests/MyLeavesPage';
import api from '../api/client';

vi.mock('../api/client', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
  };
});

describe('MyLeavesPage - Half-Day Leave Application (First Half / Second Half)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLeaveTypes = [
    {
      id: 1,
      name: 'Privileged Leave',
      code: 'PL',
      defaultAllocation: 22,
      isPaid: true,
      allowHalfDay: true,
    },
    {
      id: 2,
      name: 'Casual Leave',
      code: 'CL',
      defaultAllocation: 12,
      isPaid: true,
      allowHalfDay: true,
    },
  ];

  const mockRequests = [
    {
      id: 101,
      type: 'LEAVE',
      title: 'Privileged Leave Application - 0.5 day (First Half) on 2026-11-20',
      reason: 'Doctor appointment morning',
      status: 'PENDING',
      startDate: '2026-11-20',
      endDate: '2026-11-20',
      days: 0.5,
      leaveTypeId: 1,
      createdAt: '2026-11-18T05:00:00.000Z',
      leaveType: { id: 1, name: 'Privileged Leave', code: 'PL' },
      approver: { firstName: 'Sarah', lastName: 'Admin' },
      meta: {
        isHalfDay: true,
        halfDayPeriod: 'FIRST_HALF',
      },
    },
  ];

  it('renders history table showing half-day badge with session', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/requests')) {
        return Promise.resolve({ data: { items: mockRequests } });
      }
      if (url.includes('/company/leave-types')) {
        return Promise.resolve({ data: { leaveTypes: mockLeaveTypes } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <MyLeavesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const plElements = screen.getAllByText('Privileged Leave');
      expect(plElements.length).toBeGreaterThanOrEqual(1);
    });

    // Check table shows half-day badge
    expect(screen.getByText(/0.5 Day • 1st Half/i)).toBeInTheDocument();
  });

  it('allows employee to switch to Custom mode, choose Second Half, and submit 0.5 day leave', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/requests')) {
        return Promise.resolve({ data: { items: mockRequests } });
      }
      if (url.includes('/company/leave-types')) {
        return Promise.resolve({ data: { leaveTypes: mockLeaveTypes } });
      }
      return Promise.resolve({ data: {} });
    });
    (api.post as any).mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <MyLeavesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply for leave/i })).toBeInTheDocument();
    });

    // Click Apply for Leave
    fireEvent.click(screen.getByRole('button', { name: /apply for leave/i }));

    // Drawer opens
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Apply for Leave' })).toBeInTheDocument();
    });

    // Both "Full day" and "Custom" buttons exist
    const fullDayBtn = screen.getByRole('button', { name: /^full day$/i });
    const customBtn = screen.getByRole('button', { name: /^custom$/i });
    expect(fullDayBtn).toBeInTheDocument();
    expect(customBtn).toBeInTheDocument();

    // Click "Custom" to switch to half-day leave
    fireEvent.click(customBtn);

    // Verify half-day controls are visible
    await waitFor(() => {
      expect(screen.getByText(/session \/ half/i)).toBeInTheDocument();
      expect(screen.getByText(/you are requesting for/i)).toBeInTheDocument();
      expect(screen.getByText(/0.5 days/i)).toBeInTheDocument();
    });

    // Change Session to "Second Half"
    const sessionSelect = screen.getByDisplayValue(/second half/i);
    expect(sessionSelect).toBeInTheDocument();
    fireEvent.change(sessionSelect, { target: { value: 'SECOND_HALF' } });

    // Fill in Note / Reason
    const reasonInput = screen.getByPlaceholderText(/type here.../i);
    fireEvent.change(reasonInput, { target: { value: 'Afternoon family emergency' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /^submit$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/requests',
        expect.objectContaining({
          type: 'LEAVE',
          days: 0.5,
          reason: 'Afternoon family emergency',
          meta: expect.objectContaining({
            isHalfDay: true,
            halfDayPeriod: 'SECOND_HALF',
          }),
        })
      );
    });
  });

  it('allows searching and selecting a colleague in Notify and submits colleague info', async () => {
    const mockEmployees = [
      { id: 201, firstName: 'Kiran', lastName: 'Kumar', email: 'kiran@company.com', jobTitle: 'Developer' },
      { id: 202, firstName: 'Priya', lastName: 'Sharma', email: 'priya@company.com', jobTitle: 'Designer' },
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/requests')) {
        return Promise.resolve({ data: { items: mockRequests } });
      }
      if (url.includes('/company/leave-types')) {
        return Promise.resolve({ data: { leaveTypes: mockLeaveTypes } });
      }
      if (url.includes('/employees')) {
        return Promise.resolve({ data: { items: mockEmployees } });
      }
      return Promise.resolve({ data: {} });
    });
    (api.post as any).mockResolvedValue({ data: { success: true } });

    render(
      <MemoryRouter>
        <MyLeavesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /apply for leave/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /apply for leave/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search employee/i)).toBeInTheDocument();
    });

    // Search for "Kiran"
    const notifyInput = screen.getByPlaceholderText(/search employee/i);
    fireEvent.focus(notifyInput);
    fireEvent.change(notifyInput, { target: { value: 'Kiran' } });

    // Click on Kiran Kumar in the dropdown
    await waitFor(() => {
      expect(screen.getByText('Kiran Kumar')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Kiran Kumar'));

    // Check that selected colleague chip is shown
    expect(screen.getByText('(kiran@company.com)')).toBeInTheDocument();

    // Fill in Reason
    const reasonInput = screen.getByPlaceholderText(/type here.../i);
    fireEvent.change(reasonInput, { target: { value: 'Attending symposium' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /^submit$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/requests',
        expect.objectContaining({
          type: 'LEAVE',
          reason: 'Attending symposium',
          meta: expect.objectContaining({
            notifyUserId: 201,
            notifyEmail: 'kiran@company.com',
            notifyName: 'Kiran Kumar',
          }),
        })
      );
    });
  });

  it('displays half-day details when viewing leave details', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/requests')) {
        return Promise.resolve({ data: { items: mockRequests } });
      }
      if (url.includes('/company/leave-types')) {
        return Promise.resolve({ data: { leaveTypes: mockLeaveTypes } });
      }
      return Promise.resolve({ data: {} });
    });

    render(
      <MemoryRouter>
        <MyLeavesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTitle('View Details')).toBeInTheDocument();
    });

    // Click View Details
    fireEvent.click(screen.getByTitle('View Details'));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Leave Details' })).toBeInTheDocument();
    });

    // Check Duration displays 0.5 day (First Half)
    expect(screen.getByText(/0.5 day \(First Half\)/i)).toBeInTheDocument();
  });
});
