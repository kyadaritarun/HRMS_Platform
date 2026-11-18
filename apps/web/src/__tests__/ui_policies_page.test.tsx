import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PoliciesPage from '../pages/policies/PoliciesPage';
import { api } from '../api/client';

vi.mock('../api/client', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
    getFileUrl: vi.fn((path: string) => path ? `/uploads/${path.replace(/^\/+/, '')}` : ''),
  };
});

describe('PoliciesPage - Read Policies, Preview & Acknowledge Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPolicies = [
    {
      id: 101,
      title: 'Information Security Policy',
      category: 'IT Security',
      content: 'Employees must adhere to data confidentiality standards.',
      version: 1,
      isMandatory: true,
      hasAccepted: false,
      acknowledged: false,
      acknowledgedAt: null,
      documentUrl: '/uploads/info-sec-policy.pdf',
    },
    {
      id: 102,
      title: 'Code of Conduct',
      category: 'HR Guidelines',
      content: 'Professional behavior is required at all times.',
      version: 2,
      isMandatory: true,
      hasAccepted: true,
      acknowledged: true,
      acknowledgedAt: '2026-11-15T10:00:00.000Z',
      documentUrl: '/uploads/code-of-conduct.pdf',
    },
  ];

  it('renders action button as "Read Policies" instead of "Read Full Text"', async () => {
    (api.get as any).mockResolvedValueOnce({
      data: { policies: mockPolicies },
    });

    render(
      <MemoryRouter>
        <PoliciesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Information Security Policy')).toBeInTheDocument();
    });

    // Check that "Read Policies" button exists
    const readButtons = screen.getAllByRole('button', { name: /read policies/i });
    expect(readButtons.length).toBe(2);

    // Ensure old label "Read Full Text" is no longer present
    expect(screen.queryByText(/read full text/i)).not.toBeInTheDocument();
  });

  it('opens drawer on "Read Policies" click and renders document preview iframe for PDF', async () => {
    (api.get as any).mockResolvedValueOnce({
      data: { policies: mockPolicies },
    });

    render(
      <MemoryRouter>
        <PoliciesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Information Security Policy')).toBeInTheDocument();
    });

    const readButtons = screen.getAllByRole('button', { name: /read policies/i });
    fireEvent.click(readButtons[0]);

    // Drawer should open with policy details
    await waitFor(() => {
      const headings = screen.getAllByRole('heading', { name: 'Information Security Policy' });
      expect(headings.length).toBeGreaterThanOrEqual(1);
    });

    // Ensure "Official Attached Document" card and "Policy Text & Clauses" are removed
    expect(screen.queryByText(/official attached document/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/policy text & clauses/i)).not.toBeInTheDocument();

    // In-drawer preview header and iframe must be rendered directly
    expect(screen.getByText('Document Preview')).toBeInTheDocument();
    expect(screen.getByText('Open in new window')).toBeInTheDocument();

    const previewIframe = screen.getByTitle('Information Security Policy');
    expect(previewIframe).toBeInTheDocument();
    expect(previewIframe.tagName.toLowerCase()).toBe('iframe');
    expect(previewIframe.getAttribute('src')).toContain('info-sec-policy.pdf');
  });

  it('successfully acknowledges policy when clicking "I Agree & Acknowledge"', async () => {
    (api.get as any).mockResolvedValueOnce({
      data: { policies: mockPolicies },
    });

    (api.post as any).mockResolvedValueOnce({
      data: { success: true, acknowledged: true },
    });

    (api.get as any).mockResolvedValueOnce({
      data: {
        policies: [
          {
            ...mockPolicies[0],
            hasAccepted: true,
            acknowledged: true,
            acknowledgedAt: new Date().toISOString(),
          },
          mockPolicies[1],
        ],
      },
    });

    render(
      <MemoryRouter>
        <PoliciesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Information Security Policy')).toBeInTheDocument();
    });

    // Open drawer
    const readButtons = screen.getAllByRole('button', { name: /read policies/i });
    fireEvent.click(readButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /i agree & acknowledge/i })).toBeInTheDocument();
    });

    // Click "I Agree & Acknowledge"
    const ackButton = screen.getByRole('button', { name: /i agree & acknowledge/i });
    fireEvent.click(ackButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/policies/101/acknowledge');
    });

    // Verify footer updates to signed status
    await waitFor(() => {
      expect(screen.getByText(/signed on/i)).toBeInTheDocument();
    });
  });
});
