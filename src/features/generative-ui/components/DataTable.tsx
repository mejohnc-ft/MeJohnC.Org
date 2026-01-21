/**
 * DataTable Component
 *
 * CentrexStyle tabular data display.
 * Supports sorting, pagination, and data binding.
 */

'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataTableProps } from '../schemas';

// Generate mock data for the table
function generateMockData(columns: { key: string; label: string }[], limit: number) {
  const mockValues: Record<string, () => string> = {
    id: () => `#${Math.floor(Math.random() * 10000)}`,
    name: () => ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'][Math.floor(Math.random() * 5)],
    email: () => `user${Math.floor(Math.random() * 1000)}@example.com`,
    status: () => ['Active', 'Pending', 'Completed', 'Cancelled'][Math.floor(Math.random() * 4)],
    date: () => new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    amount: () => `$${(Math.random() * 1000).toFixed(2)}`,
    quantity: () => Math.floor(Math.random() * 100).toString(),
    type: () => ['Standard', 'Premium', 'Enterprise'][Math.floor(Math.random() * 3)],
    priority: () => ['Low', 'Medium', 'High', 'Critical'][Math.floor(Math.random() * 4)],
  };

  return Array.from({ length: limit }, (_, i) => {
    const row: Record<string, string> = {};
    columns.forEach(col => {
      const generator = mockValues[col.key.toLowerCase()] || (() => `Value ${i + 1}`);
      row[col.key] = generator();
    });
    return row;
  });
}

export function DataTable({
  columns = [],
  sortBy,
  sortDirection = 'desc',
  limit = 10,
}: DataTableProps) {
  const [currentSort, setCurrentSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    sortBy ? { key: sortBy, direction: sortDirection } : null
  );
  const [currentPage, setCurrentPage] = useState(0);

  // Generate mock data
  const data = useMemo(() => generateMockData(columns, limit * 3), [columns, limit]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!currentSort) return data;

    return [...data].sort((a, b) => {
      const aVal = a[currentSort.key] || '';
      const bVal = b[currentSort.key] || '';

      // Try numeric comparison first
      const aNum = parseFloat(aVal.replace(/[^0-9.-]/g, ''));
      const bNum = parseFloat(bVal.replace(/[^0-9.-]/g, ''));

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return currentSort.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const comparison = aVal.localeCompare(bVal);
      return currentSort.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, currentSort]);

  // Paginate
  const pageData = sortedData.slice(currentPage * limit, (currentPage + 1) * limit);
  const totalPages = Math.ceil(sortedData.length / limit);

  const handleSort = (key: string) => {
    if (currentSort?.key === key) {
      setCurrentSort({
        key,
        direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      setCurrentSort({ key, direction: 'desc' });
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active' || s === 'completed') return 'text-[#3dae2b]';
    if (s === 'pending') return 'text-[#ff8300]';
    if (s === 'cancelled' || s === 'critical') return 'text-[#e1251b]';
    if (s === 'high') return 'text-[#ff8300]';
    if (s === 'low') return 'text-[#0071ce]';
    return 'text-[#a3a3a3]';
  };

  if (columns.length === 0) {
    return (
      <div className="bg-[#121212] border border-[#262626] rounded-xl p-8 text-center">
        <p className="text-[#525252]">No columns defined</p>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border border-[#262626] rounded-xl overflow-hidden w-full">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#262626]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-sm font-semibold text-[#a3a3a3] uppercase tracking-wider cursor-pointer hover:bg-[#1a1a1a] transition-colors',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <div className={cn(
                    'flex items-center gap-1',
                    col.align === 'center' && 'justify-center',
                    col.align === 'right' && 'justify-end'
                  )}>
                    {col.label}
                    {currentSort?.key === col.key && (
                      currentSort.direction === 'asc' ? (
                        <ChevronUp className="w-4 h-4 text-[#3dae2b]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#3dae2b]" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-[#262626] last:border-b-0 hover:bg-[#1a1a1a] transition-colors"
              >
                {columns.map((col) => {
                  const value = row[col.key] || '-';
                  const isStatus = col.key.toLowerCase() === 'status' || col.key.toLowerCase() === 'priority';

                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3 text-sm',
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                        isStatus ? getStatusColor(value) : 'text-[#e5e5e5]'
                      )}
                    >
                      {isStatus ? (
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          value.toLowerCase() === 'active' && 'bg-[#3dae2b]/20',
                          value.toLowerCase() === 'completed' && 'bg-[#3dae2b]/20',
                          value.toLowerCase() === 'pending' && 'bg-[#ff8300]/20',
                          value.toLowerCase() === 'cancelled' && 'bg-[#e1251b]/20',
                          value.toLowerCase() === 'critical' && 'bg-[#e1251b]/20',
                          value.toLowerCase() === 'high' && 'bg-[#ff8300]/20',
                          value.toLowerCase() === 'medium' && 'bg-[#0071ce]/20',
                          value.toLowerCase() === 'low' && 'bg-[#0071ce]/20',
                        )}>
                          {value}
                        </span>
                      ) : (
                        value
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#262626]">
          <span className="text-sm text-[#525252]">
            Showing {currentPage * limit + 1}-{Math.min((currentPage + 1) * limit, sortedData.length)} of {sortedData.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="p-2 rounded-lg border border-[#262626] text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-[#a3a3a3]">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 rounded-lg border border-[#262626] text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-[#e5e5e5] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
