import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ApprovalsDeskPage } from '../pages/requests/ApprovalsDeskPage';
import api from '../api/client';
import * as AuthContextModule from '../context/AuthContext';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Approvals Desk Scope Control UI Tests', () => {
  const mockRequests = [
    {
      id: 101,
      type: 'GOAL',
      title: 'Backend Q1 Optimization',
      reason: 'Improve latency by 20%',
      status: 'PENDING',
      createdAt: '2026-11-03T10:00:00.000Z',
      user: {
        id: 1,
        firstName: 'Tarun',
        lastName: 'Kyadari',
        email: 'tarun@uptrix.test',
        jobTitle: 'Developer',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string, config?: any) => {
      if (url === '/requests') {
        return Promise.resolve({
          data: {
            items: mockRequests,
            total: 1,
            page: 1,
            pageSize: 20,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. For HR role, only requests assigned to HR are fetched (scope=assigned) and company-wide scope dropdown is hidden', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 5,
        role: 'HR',
        firstName: 'Jone',
        lastName: 'Doe',
        email: 'hr@gmail.com',
      } as any,
      company: null,
      features: [],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter>
        <ApprovalsDeskPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Approval Requests')).toBeInTheDocument();
    });

    // Check that api.get was called with scope: 'assigned'
    expect(api.get).toHaveBeenCalledWith(
      '/requests',
      expect.objectContaining({
        params: expect.objectContaining({ scope: 'assigned' }),
      })
    );

    // The "All Company" option or company selector must NOT be present
    expect(screen.queryByText('All Company')).not.toBeInTheDocument();
  });

  it('2. For COMPANY_ADMIN role, the scope dropdown is available to toggle company vs assigned', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        role: 'COMPANY_ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@uptrix.test',
      } as any,
      company: null,
      features: [],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter>
        <ApprovalsDeskPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Approval Requests')).toBeInTheDocument();
    });

    // Company Admin has the scope selector with "All Company" option
    expect(screen.getByRole('option', { name: 'All Company' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Assigned to Me' })).toBeInTheDocument();
  });
});
