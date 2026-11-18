import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/auth/LoginPage';
import * as AuthContextModule from '../context/AuthContext';

describe('LoginPage Rate Limiting & Remaining Attempts Warning Tests', () => {
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

  it('displays warning and attempts indicator when 3 attempts remain', async () => {
    const error401: any = new Error('Request failed with status code 401');
    error401.response = {
      status: 401,
      data: {
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password',
        remainingAttempts: 3,
      },
    };
    mockLogin.mockRejectedValueOnce(error401);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/username or email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Only 3 attempts remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/\(3 attempts left\)/i)).toBeInTheDocument();
    });
  });

  it('displays warning when 2 attempts remain', async () => {
    const error401: any = new Error('Request failed with status code 401');
    error401.response = {
      status: 401,
      data: {
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password',
        remainingAttempts: 2,
      },
    };
    mockLogin.mockRejectedValueOnce(error401);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/username or email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Only 2 attempts remaining/i)).toBeInTheDocument();
      expect(screen.getByText(/\(2 attempts left\)/i)).toBeInTheDocument();
    });
  });

  it('displays urgent warning when only 1 attempt remains', async () => {
    const error401: any = new Error('Request failed with status code 401');
    error401.response = {
      status: 401,
      data: {
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email/username or password',
        remainingAttempts: 1,
      },
    };
    mockLogin.mockRejectedValueOnce(error401);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/username or email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Only 1 attempt remaining before temporary lockout!/i)).toBeInTheDocument();
      expect(screen.getByText(/\(1 attempt left\)/i)).toBeInTheDocument();
    });
  });

  it('displays lockout banner and disables button when 429 RATE_LIMIT_EXCEEDED occurs', async () => {
    const error429: any = new Error('Request failed with status code 429');
    error429.response = {
      status: 429,
      data: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
        retryAfter: 900,
        remainingAttempts: 0,
      },
    };
    mockLogin.mockRejectedValueOnce(error429);

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByPlaceholderText(/username or email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Security Lockout Active/i)).toBeInTheDocument();
      expect(screen.getAllByText(/15m 00s/i).length).toBeGreaterThanOrEqual(1);
    });

    // The submit button should now be disabled and display lockout timer
    const lockedBtn = screen.getByRole('button', { name: /locked/i });
    expect(lockedBtn).toBeDisabled();
  });
});
