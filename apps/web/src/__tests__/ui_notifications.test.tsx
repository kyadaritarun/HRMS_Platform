import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import * as AuthContextModule from '../context/AuthContext';
import api from '../api/client';

describe('Notifications Drawer UI Tests', () => {
  const mockNotifications = [
    {
      id: 1,
      kind: 'LEAVE',
      title: 'New LEAVE Request',
      message: 'amarendarkali submitted a LEAVE request for approval.',
      url: '/requests/approvals',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      kind: 'GOAL',
      title: 'New GOAL Request',
      message: 'karan submitted a GOAL request for approval.',
      url: '/requests/approvals',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        email: 'admin@uptrix.com',
        role: 'COMPANY_ADMIN',
        firstName: 'Admin',
        lastName: 'User',
      } as any,
      company: { id: 1, name: 'Uptrix' } as any,
      features: [],
      token: 'mock-token',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: () => true,
      hasHrPermission: () => true,
    });

    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/notifications') {
        return { data: { notifications: [...mockNotifications] } };
      }
      return { data: {} };
    });

    vi.spyOn(api, 'patch').mockResolvedValue({ data: { success: true } });
    vi.spyOn(api, 'delete').mockResolvedValue({ data: { success: true } });
  });

  it('renders "Clear all" button, clears notifications on click, and closes drawer when clicking a notification', async () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    // Open notifications drawer by clicking the bell icon
    const bellBtn = await screen.findByTitle('Notifications');
    fireEvent.click(bellBtn);

    // Drawer is open
    expect(screen.getByText(/Notifications/i)).toBeInTheDocument();
    expect(screen.getByText('New LEAVE Request')).toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();

    // Clicking a notification item closes the drawer
    const notifItem = screen.getByText('New LEAVE Request');
    fireEvent.click(notifItem);

    // Drawer should now be closed
    await waitFor(() => {
      expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
    });

    // Reopen drawer
    fireEvent.click(bellBtn);
    expect(screen.getByText('Clear all')).toBeInTheDocument();

    // Click "Clear all"
    const clearAllBtn = screen.getByText('Clear all');
    fireEvent.click(clearAllBtn);

    expect(api.delete).toHaveBeenCalledWith('/notifications/clear-all');

    // Should display empty state
    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });
});

