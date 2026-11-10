import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import * as AuthContextModule from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage Finance Landing Redirection Tests', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      company: null,
      features: [],
      token: null,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      refreshUser: vi.fn(),
      hasFeature: vi.fn().mockReturnValue(true),
      hasHrPermission: vi.fn().mockReturnValue(true),
    });
  });

  it('navigates to /employee/dashboard when FINANCE user logs in', async () => {
    mockLogin.mockResolvedValueOnce({
      user: {
        id: 5,
        email: 'finance@kyadari.com',
        username: 'rohan.sharma',
        role: 'FINANCE',
        firstName: 'Rohan',
        lastName: 'Sharma',
        companyId: 1,
        mustChangePassword: false,
      },
      token: 'mock-jwt-token',
    });

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/Username or Email/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLElement;

    fireEvent.change(emailInput, { target: { value: 'finance@kyadari.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Admin@123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        login: 'finance@kyadari.com',
        password: 'Admin@123!',
      });
      // Verifies it redirects to the Dashboard (/employee/dashboard) instead of /payroll/attendance-salary
      expect(mockNavigate).toHaveBeenCalledWith('/employee/dashboard');
      expect(mockNavigate).not.toHaveBeenCalledWith('/payroll/attendance-salary');
    });
  });

  it('navigates to /employee/dashboard when using 1-click demo login for Finance persona', async () => {
    mockLogin.mockResolvedValueOnce({
      user: {
        id: 5,
        email: 'sushanth@uptrixglobal.com',
        username: 'sushanth',
        role: 'FINANCE',
        firstName: 'Sushanth',
        lastName: 'Reddy',
        companyId: 1,
        mustChangePassword: false,
      },
      token: 'mock-jwt-token',
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Fill in credentials and submit
    fireEvent.change(screen.getByPlaceholderText(/Username or Email/i), {
      target: { value: 'sushanth@uptrixglobal.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/^Password$/i), {
      target: { value: 'Password@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        login: 'sushanth@uptrixglobal.com',
        password: 'Password@123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/employee/dashboard');
      expect(mockNavigate).not.toHaveBeenCalledWith('/payroll/attendance-salary');
    });
  });

  it('navigates to /employee/dashboard when IT user logs in', async () => {
    mockLogin.mockResolvedValueOnce({
      user: {
        id: 6,
        email: 'tarun@uptrixglobal.com',
        username: 'kyadaritarun',
        role: 'IT',
        firstName: 'Tarun',
        lastName: 'Kyadari',
        companyId: 1,
        mustChangePassword: false,
      },
      token: 'mock-jwt-token',
    });

    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/Username or Email/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);
    const submitBtn = container.querySelector('button[type="submit"]') as HTMLElement;

    fireEvent.change(emailInput, { target: { value: 'tarun@uptrixglobal.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password@123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        login: 'tarun@uptrixglobal.com',
        password: 'Password@123',
      });
      // Verifies IT redirects to Dashboard (/employee/dashboard) instead of /company/assets
      expect(mockNavigate).toHaveBeenCalledWith('/employee/dashboard');
      expect(mockNavigate).not.toHaveBeenCalledWith('/company/assets');
    });
  });

  it('navigates to /employee/dashboard when using 1-click demo login for IT persona', async () => {
    mockLogin.mockResolvedValueOnce({
      user: {
        id: 6,
        email: 'tarun@uptrixglobal.com',
        username: 'kyadaritarun',
        role: 'IT',
        firstName: 'Tarun',
        lastName: 'Kyadari',
        companyId: 1,
        mustChangePassword: false,
      },
      token: 'mock-jwt-token',
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    // Fill in credentials and submit
    fireEvent.change(screen.getByPlaceholderText(/Username or Email/i), {
      target: { value: 'tarun@uptrixglobal.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/^Password$/i), {
      target: { value: 'Password@123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        login: 'tarun@uptrixglobal.com',
        password: 'Password@123',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/employee/dashboard');
      expect(mockNavigate).not.toHaveBeenCalledWith('/company/assets');
    });
  });
});
