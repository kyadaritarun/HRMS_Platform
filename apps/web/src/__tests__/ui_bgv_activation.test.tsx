import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { BackgroundVerificationPage } from '../pages/company/BackgroundVerificationPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Background Verification (BGV) Activation & Pending UI Tests', () => {
  const mockStaff = [
    {
      id: 1,
      employeeNumber: 'EMP-001',
      firstName: 'Tarun',
      lastName: 'Kyadari',
      email: 'tarun@novatech.io',
      jobTitle: 'Founder & CEO',
      department: { id: 1, name: 'Leadership' },
    },
    {
      id: 2,
      employeeNumber: 'EMP-002',
      firstName: 'Maya',
      lastName: 'Patel',
      email: 'maya@novatech.io',
      jobTitle: 'Senior Fullstack Dev',
      department: { id: 2, name: 'Engineering' },
    },
    {
      id: 3,
      employeeNumber: 'EMP-003',
      firstName: 'Rohan',
      lastName: 'Sharma',
      email: 'rohan@novatech.io',
      jobTitle: 'Finance Lead',
      department: { id: 3, name: 'Finance & Accounts' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url.startsWith('/employees')) {
        return Promise.resolve({
          data: {
            items: mockStaff,
            total: 3,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders all real employees in the Employee column with unblurred info', async () => {
    render(
      <MemoryRouter>
        <BackgroundVerificationPage />
      </MemoryRouter>
    );

    // Verify all employees from the database are displayed
    expect(await screen.findByText('Tarun Kyadari')).toBeDefined();
    expect(screen.getByText('Maya Patel')).toBeDefined();
    expect(screen.getByText('Rohan Sharma')).toBeDefined();

    // Verify employee code and department are shown
    expect(screen.getByText(/EMP-001 • Leadership/i)).toBeDefined();
    expect(screen.getByText(/EMP-002 • Engineering/i)).toBeDefined();
    expect(screen.getByText(/EMP-003 • Finance & Accounts/i)).toBeDefined();
  });

  it('shows Pending for Aadhaar Check, PAN Check, Address Check, UAN / PF, and Overall Status', async () => {
    render(
      <MemoryRouter>
        <BackgroundVerificationPage />
      </MemoryRouter>
    );

    await screen.findByText('Tarun Kyadari');

    // All rows should have Pending status badges
    const pendingBadges = screen.getAllByText(/^Pending$/i);
    // 3 employees * 5 checks per employee = 15 pending badges in table
    expect(pendingBadges.length).toBeGreaterThanOrEqual(15);
  });

  it('renders blurred columns and the activation notice to contact Uptrix organization', async () => {
    const { container } = render(
      <MemoryRouter>
        <BackgroundVerificationPage />
      </MemoryRouter>
    );

    await screen.findByText('Tarun Kyadari');

    // Check that blurred cells exist in table body
    const blurredCells = container.querySelectorAll('td.filter.blur-\\[4px\\]');
    expect(blurredCells.length).toBeGreaterThanOrEqual(18); // 6 columns * 3 rows

    // Check activation notices (both overlay and banner)
    const activationNotices = screen.getAllByText(/If you want to activate, contact to Uptrix organization/i);
    expect(activationNotices.length).toBeGreaterThanOrEqual(1);

    // Check Contact button / mailto
    const contactLinks = screen.getAllByText(/Contact Uptrix Organization/i);
    expect(contactLinks.length).toBeGreaterThanOrEqual(1);
  });
});

