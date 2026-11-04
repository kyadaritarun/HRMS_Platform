import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MyDocumentsPage } from '../pages/documents/MyDocumentsPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('My Documents Category Dropdown UI Tests', () => {
  const mockDocs = [
    {
      id: 1,
      category: 'IDENTITY',
      title: 'Aadhaar Card',
      identifier: '878988989898',
      status: 'VERIFIED',
      createdAt: '2026-11-03T10:00:00.000Z',
    },
    {
      id: 2,
      category: 'EDUCATION',
      title: 'B.Tech Degree Certificate',
      identifier: 'DEG-1234',
      status: 'PENDING',
      createdAt: '2026-11-03T10:00:00.000Z',
    },
    {
      id: 3,
      category: 'EXPERIENCE',
      title: 'Relieving Letter Previous Org',
      identifier: 'REL-55',
      status: 'VERIFIED',
      createdAt: '2026-11-03T10:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/documents') {
        return Promise.resolve({
          data: {
            documents: mockDocs,
          },
        });
      }
      return Promise.resolve({ data: {} });
    });
  });

  it('renders category dropdown beside Upload Document button with 6 categories', async () => {
    render(
      <MemoryRouter>
        <MyDocumentsPage />
      </MemoryRouter>
    );

    // Verify Upload Document button is rendered
    expect(screen.getByRole('button', { name: /Upload Document/i })).toBeDefined();

    // Verify Category dropdown button is rendered beside it with default 'All Documents'
    const dropdownBtn = await screen.findByRole('button', { name: /Filter documents by category/i });
    expect(dropdownBtn).toBeDefined();
    expect(dropdownBtn.textContent).toContain('All Documents');

    // Click dropdown to expand menu
    fireEvent.click(dropdownBtn);

    // Verify all 6 options requested by user are present in the dropdown
    expect(screen.getByRole('button', { name: /All Documents/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Identity Proof/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Education/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Employment/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Compliance/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Other/i })).toBeDefined();
  });

  it('filters documents when a category is selected from the dropdown', async () => {
    render(
      <MemoryRouter>
        <MyDocumentsPage />
      </MemoryRouter>
    );

    // Wait for all 3 documents to be visible
    expect(await screen.findByText('Aadhaar Card')).toBeDefined();
    expect(screen.getByText('B.Tech Degree Certificate')).toBeDefined();
    expect(screen.getByText('Relieving Letter Previous Org')).toBeDefined();

    // Open dropdown and select 'Identity Proof'
    const dropdownBtn = screen.getByRole('button', { name: /Filter documents by category/i });
    fireEvent.click(dropdownBtn);

    const identityOption = screen.getByRole('button', { name: /Identity Proof/i });
    fireEvent.click(identityOption);

    // Dropdown button now displays 'Identity Proof'
    expect(dropdownBtn.textContent).toContain('Identity Proof');

    // Only Identity document should be rendered
    expect(screen.getByText('Aadhaar Card')).toBeDefined();
    expect(screen.queryByText('B.Tech Degree Certificate')).toBeNull();
    expect(screen.queryByText('Relieving Letter Previous Org')).toBeNull();

    // Now select 'Education'
    fireEvent.click(dropdownBtn);
    const educationOption = screen.getByRole('button', { name: /Education/i });
    fireEvent.click(educationOption);

    expect(screen.queryByText('Aadhaar Card')).toBeNull();
    expect(screen.getByText('B.Tech Degree Certificate')).toBeDefined();
    expect(screen.queryByText('Relieving Letter Previous Org')).toBeNull();
  });
});

