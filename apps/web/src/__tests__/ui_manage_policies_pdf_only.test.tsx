import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ManagePoliciesPage from '../pages/policies/ManagePoliciesPage';
import { api } from '../api/client';

vi.mock('../api/client', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: mockApi,
    api: mockApi,
    getFileUrl: vi.fn((path: string) => path ? `/uploads/${path.replace(/^\/+/, '')}` : ''),
  };
});

describe('ManagePoliciesPage - Attach Policy Document PDF Only', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      data: { policies: [] },
    });
  });

  it('renders file input with accept=".pdf,application/pdf" and PDF-only hints', async () => {
    render(
      <MemoryRouter>
        <ManagePoliciesPage />
      </MemoryRouter>
    );

    // Open Publish New Policy Document modal
    const publishButton = screen.getByRole('button', { name: /publish new policy/i });
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(screen.getByText('Publish New Policy Document')).toBeInTheDocument();
    });

    // Check hint text
    expect(screen.getByText(/pdf only \(max 10mb\)/i)).toBeInTheDocument();
    expect(screen.getByText(/upload official policy pdf document \(up to 10mb\)/i)).toBeInTheDocument();

    // Check input element
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.getAttribute('accept')).toBe('.pdf,application/pdf');
  });

  it('rejects non-PDF files (.docx, .doc) with an error message', async () => {
    render(
      <MemoryRouter>
        <ManagePoliciesPage />
      </MemoryRouter>
    );

    // Open modal
    const publishButton = screen.getByRole('button', { name: /publish new policy/i });
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(screen.getByText('Publish New Policy Document')).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const docFile = new File(['dummy doc content'], 'company_policy.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    fireEvent.change(fileInput, { target: { files: [docFile] } });

    await waitFor(() => {
      expect(screen.getByText(/only pdf documents are allowed/i)).toBeInTheDocument();
    });
  });

  it('accepts valid .pdf files without error', async () => {
    render(
      <MemoryRouter>
        <ManagePoliciesPage />
      </MemoryRouter>
    );

    // Open modal
    const publishButton = screen.getByRole('button', { name: /publish new policy/i });
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(screen.getByText('Publish New Policy Document')).toBeInTheDocument();
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdfFile = new File(['%PDF-1.4 dummy'], 'company_policy.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(screen.queryByText(/only pdf documents are allowed/i)).not.toBeInTheDocument();
      expect(screen.getByText('company_policy.pdf')).toBeInTheDocument();
      expect(screen.getByText(/ready to upload/i)).toBeInTheDocument();
    });
  });
});
