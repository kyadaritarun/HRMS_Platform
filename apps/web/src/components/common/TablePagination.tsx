import React from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;
  className?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemName = 'records',
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  // Smart page numbers calculation with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (safePage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 bg-white ${className}`}
    >
      {/* Left: Summary and Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Showing <strong className="font-bold text-slate-800">{start}</strong> to{' '}
          <strong className="font-bold text-slate-800">{end}</strong> of{' '}
          <strong className="font-bold text-slate-800">{totalItems}</strong> {itemName}
        </span>

        {onPageSizeChange && totalItems > 0 && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-[11px] text-slate-400">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              aria-label="Rows per page"
              className="px-2 py-1 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1}
            className={`h-8 px-2.5 sm:px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xs mr-1 ${
              safePage <= 1
                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-indigo-50 border-slate-200/90 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 active:scale-95 cursor-pointer'
            }`}
            title="Previous page"
            aria-label="Previous page"
          >
            <IconChevronLeft className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span className="hidden sm:inline text-[11px] font-semibold">Prev</span>
          </button>

          {/* Numbered Page Buttons with Ellipsis */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`dots-${idx}`} className="w-6 text-center font-bold text-slate-400 select-none">
                    •••
                  </span>
                );
              }
              const pageNum = Number(p);
              const isActive = safePage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#5E4BE2] text-white shadow-xs scale-105'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-2xs'
                  }`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage >= totalPages}
            className={`h-8 px-2.5 sm:px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-2xs ml-1 ${
              safePage >= totalPages
                ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-indigo-50 border-slate-200/90 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 active:scale-95 cursor-pointer'
            }`}
            title="Next page"
            aria-label="Next page"
          >
            <span className="hidden sm:inline text-[11px] font-semibold">Next</span>
            <IconChevronRight className="w-4 h-4 stroke-[2.5] shrink-0" />
          </button>
        </div>
      )}
    </div>
  );
};

export default TablePagination;
