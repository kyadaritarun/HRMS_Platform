import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ClaimCategoriesPage } from '../pages/company/ClaimCategoriesPage';
import api from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Claim Categories Page UI Tests', () => {
  const mockCategories = [
    {
      id: 'cat-travel',
      name: 'Travel & Transport',
      maxLimit: 25000,
      requiresReceipt: true,
      description: 'Flights, cabs, train tickets, lodging for official company travel.',
      isActive: true,
    },
    {
      id: 'cat-meals',
      name: 'Food & Meals',
      maxLimit: 3000,
      requiresReceipt: false,
      description: 'Client lunches, team dinners, or late-night overtime meals.',
      isActive: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as any).mockResolvedValue({
      data: { categories: mockCategories },
    });
  });

  it('1. Renders Claim Categories page with header, KPIs, and table', async () => {
    render(<ClaimCategoriesPage />);

    expect(screen.getByText('Claim Categories')).toBeInTheDocument();
    expect(screen.getByText('Total Categories')).toBeInTheDocument();
    expect(screen.getByText('Active Policies')).toBeInTheDocument();
    expect(screen.getAllByText('Proof Required').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Capped Allowances')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
      expect(screen.getByText('Food & Meals')).toBeInTheDocument();
    });

    expect(screen.getByText('₹25,000')).toBeInTheDocument();
    expect(screen.getByText('Mandatory Bill Proof')).toBeInTheDocument();
    expect(screen.getByText('Optional / Non-taxable')).toBeInTheDocument();
  });

  it('2. Filters categories by search query', async () => {
    render(<ClaimCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search claim categories/);
    fireEvent.change(searchInput, { target: { value: 'Travel' } });

    expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
    expect(screen.queryByText('Food & Meals')).not.toBeInTheDocument();
  });

  it('3. Filters categories by filter tabs', async () => {
    render(<ClaimCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
    });

    const receiptTab = screen.getByText(/Receipt Required/);
    fireEvent.click(receiptTab);

    expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
    expect(screen.queryByText('Food & Meals')).not.toBeInTheDocument();
  });

  it('4. Opens Add Category drawer and submits new category', async () => {
    (api.post as any).mockResolvedValueOnce({
      data: { success: true, category: { id: 'cat-new', name: 'Software Licenses' } },
    });

    render(<ClaimCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Claim Category'));

    expect(screen.getByText('Expense Management')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/e.g. Relocation & Moving Allowance/), {
      target: { value: 'Software Licenses' },
    });

    fireEvent.click(screen.getByText('Add Category'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/company/claims/categories',
        expect.objectContaining({
          name: 'Software Licenses',
        })
      );
    });
  });

  it('5. Opens Edit Category drawer and updates category', async () => {
    (api.put as any).mockResolvedValueOnce({
      data: { success: true },
    });

    render(<ClaimCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
    });

    const editBtns = screen.getAllByTitle('Edit Category');
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Edit Claim Category')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Update Category'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/company/claims/categories/cat-travel',
        expect.objectContaining({
          name: 'Travel & Transport',
        })
      );
    });
  });

  it('6. Deletes category with confirmation dialog', async () => {
    (api.delete as any).mockResolvedValueOnce({
      data: { success: true },
    });

    render(<ClaimCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByTitle('Delete Category');
    fireEvent.click(deleteBtns[0]);

    expect(screen.getByText('Delete Category?')).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Yes, Delete'));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/company/claims/categories/cat-travel');
    });
  });
});
