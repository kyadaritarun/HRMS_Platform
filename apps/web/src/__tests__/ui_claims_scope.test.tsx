import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ClaimsPage } from '../pages/requests/ClaimsPage';
import api from '../api/client';
import * as AuthContextModule from '../context/AuthContext';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('Claims Scope UI Tests for HR and Self Service', () => {
  const mockClaims = [
    {
      id: 201,
      type: 'CLAIM',
      title: 'Travel to Client Site',
      reason: 'Flight and taxi fare',
      amount: 4500,
      status: 'PENDING',
      createdAt: '2026-11-03T10:00:00.000Z',
      user: {
        id: 12,
        firstName: 'Maya',
        lastName: 'Patel',
        email: 'maya@uptrix.test',
        jobTitle: 'Engineer',
      },
      meta: {
        category: 'Travel & Accommodation',
        currency: 'INR',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string, config?: any) => {
      if (url === '/requests') {
        return Promise.resolve({
          data: {
            items: mockClaims,
            total: 1,
            page: 1,
            pageSize: 10,
          },
        });
      }
      if (url === '/company/claims/categories') {
        return Promise.resolve({
          data: {
            categories: [{ id: '1', name: 'Travel & Accommodation' }],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('1. Under Self Service (/claims) for HR: shows "My Claims" with scope=mine, no All Company dropdown', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 5,
        role: 'HR',
        firstName: 'Jone',
        lastName: 'Doe',
        email: 'hr@gmail.com',
      } as any,
      company: null,
      features: ['claim_process_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/claims']}>
        <ClaimsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('My Claims')).toBeInTheDocument();
    });

    // Fetched with scope=mine
    expect(api.get).toHaveBeenCalledWith(
      '/requests',
      expect.objectContaining({
        params: expect.objectContaining({ type: 'CLAIM', scope: 'mine' }),
      })
    );

    // No All Company or Scope select dropdown in Self Service
    expect(screen.queryByText(/Scope: All Company/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Scope: Assigned to Me/i)).not.toBeInTheDocument();
  });

  it('2. Under Assigned To Me (/company/claims/manage) for HR: shows "Claims Review" with scope=assigned, no All Company option', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 5,
        role: 'HR',
        firstName: 'Jone',
        lastName: 'Doe',
        email: 'hr@gmail.com',
      } as any,
      company: null,
      features: ['claim_process_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/company/claims/manage']}>
        <ClaimsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Claims Review')).toBeInTheDocument();
    });

    // Fetched with scope=assigned
    expect(api.get).toHaveBeenCalledWith(
      '/requests',
      expect.objectContaining({
        params: expect.objectContaining({ type: 'CLAIM', scope: 'assigned' }),
      })
    );

    // "All Company" must NOT be present for HR
    expect(screen.queryByText(/All Company/i)).not.toBeInTheDocument();
  });

  it('3. Under Assigned To Me (/company/claims/manage) for COMPANY_ADMIN: has scope dropdown to toggle All Company', async () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        role: 'COMPANY_ADMIN',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@uptrix.test',
      } as any,
      company: null,
      features: ['claim_process_management'],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    render(
      <MemoryRouter initialEntries={['/company/claims/manage']}>
        <ClaimsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Claims Review')).toBeInTheDocument();
    });

    // Company Admin has the scope dropdown with "Scope: All Company"
    expect(screen.getByRole('option', { name: 'Scope: All Company' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Scope: Assigned to Me' })).toBeInTheDocument();
  });
});

