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

  it('1. Renders Claim Categories page with header and table', async () => {
    render(<ClaimCategoriesPage />);

    expect(screen.getByText('Claim Categories')).toBeInTheDocument();
    expect(screen.queryByText('Total Categories')).not.toBeInTheDocument();
    expect(screen.queryByText('Active Policies')).not.toBeInTheDocument();
    expect(screen.queryByText('Capped Allowances')).not.toBeInTheDocument();

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

  it('3. Filters categories by keyword in description', async () => {
    render(<ClaimCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search claim categories/);
    fireEvent.change(searchInput, { target: { value: 'dinner' } });

    expect(screen.getByText('Food & Meals')).toBeInTheDocument();
    expect(screen.queryByText('Travel & Transport')).not.toBeInTheDocument();
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

  it('7. Toggles active/inactive status of a category', async () => {
    (api.put as any).mockResolvedValueOnce({
      data: { success: true },
    });

    render(<ClaimCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Travel & Transport')).toBeInTheDocument();
    });

    const pauseBtns = screen.getAllByTitle('Deactivate Category');
    expect(pauseBtns.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(pauseBtns[0]);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/company/claims/categories/cat-travel',
        expect.objectContaining({
          isActive: false,
        })
      );
    });
  });

  it('8. Renders TablePagination and updates items on page', async () => {
    const manyCategories = Array.from({ length: 15 }, (_, i) => ({
      id: `cat-${i}`,
      name: `Category ${i + 1}`,
      maxLimit: 1000 * (i + 1),
      requiresReceipt: i % 2 === 0,
      description: `Description for category ${i + 1}`,
      isActive: true,
    }));

    (api.get as any).mockResolvedValueOnce({
      data: { categories: manyCategories },
    });

    render(<ClaimCategoriesPage />);

    await waitFor(() => {
      expect(screen.getByText('Category 1')).toBeInTheDocument();
      expect(screen.getByText('Category 10')).toBeInTheDocument();
      // Page 1 should not show Category 11 by default with pageSize=10
      expect(screen.queryByText('Category 11')).not.toBeInTheDocument();
    });
  });
});
