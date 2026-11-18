import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DocumentReviewPage from '../pages/company/DocumentReviewPage';
import { api } from '../api/client';

vi.mock('../api/client', () => {
  const mockApi = {
    get: vi.fn(),
    patch: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
    getFileUrl: vi.fn((path: string) => path ? `/uploads/${path.replace(/^\/+/, '')}` : ''),
  };
});

describe('DocumentReviewPage - Right-Side Slide-Over Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDocuments = [
    {
      id: 1,
      userId: 10,
      title: 'Aadhaar Card',
      category: 'IDENTITY',
      identifier: '1234-5678-9012',
      fileUrl: '/uploads/aadhaar.pdf',
      status: 'PENDING',
      createdAt: '2026-11-18T05:00:00.000Z',
      user: {
        id: 10,
        firstName: 'Sushanth',
        lastName: 'Pillala',
        email: 'sushanthpillala@gmail.com',
        jobTitle: 'Senior Finance',
        department: { name: 'Finance' },
      },
    },
  ];

  it('opens review modal as a right-side slide-over drawer when clicking "Review Document"', async () => {
    (api.get as any).mockResolvedValue({
      data: { documents: mockDocuments },
    });

    render(
      <MemoryRouter>
        <DocumentReviewPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Aadhaar Card')).toBeInTheDocument();
    });

    // Click "Review Document"
    const reviewBtn = screen.getByRole('button', { name: /review document/i });
    fireEvent.click(reviewBtn);

    // Verify right-side drawer elements are rendered
    await waitFor(() => {
      expect(screen.getByText('Review & Authenticate Document')).toBeInTheDocument();
    });

    // Check right-side drawer positioning classes
    const drawerContainer = document.querySelector('.fixed.inset-y-0.right-0');
    expect(drawerContainer).not.toBeNull();
    const drawerPanel = drawerContainer?.querySelector('.slide-in-from-right');
    expect(drawerPanel).not.toBeNull();

    // Verify submitter info and specs
    const nameMatches = screen.getAllByText('Sushanth Pillala');
    expect(nameMatches.length).toBeGreaterThanOrEqual(1);
    const emailMatches = screen.getAllByText(/sushanthpillala@gmail.com/i);
    expect(emailMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('1234-5678-9012')).toBeInTheDocument();

    // Close drawer
    const closeBtn = screen.getByRole('button', { name: /^close$/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText('Review & Authenticate Document')).not.toBeInTheDocument();
    });
  });
});
