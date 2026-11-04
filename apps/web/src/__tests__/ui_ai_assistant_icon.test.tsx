import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';

// Mock AuthContext
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/employee/dashboard' }),
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      firstName: 'Jone',
      lastName: 'Doe',
      email: 'jone@uptrix.test',
      role: 'HR',
    },
    company: { id: 1, name: 'Uptrix' },
    features: ['ai_assistance'],
    hasFeature: () => true,
    hasHrPermission: () => true,
    logout: vi.fn(),
  }),
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { notifications: [] } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('AI Assistant Modern Icon & Button UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modern AI Assistant button with sparkle icon and AI label in navbar', () => {
    render(
      <MemoryRouter>
        <AppLayout />
      </MemoryRouter>
    );

    const aiButton = screen.getByTitle('AI Assistant');
    expect(aiButton).toBeInTheDocument();
    expect(aiButton).toHaveTextContent('AI');

    // Click navigates to /assistant
    fireEvent.click(aiButton);
    expect(mockNavigate).toHaveBeenCalledWith('/assistant');
  });
});
