import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchInvoices } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { InvoiceModal } from '../components/InvoiceModal';
import type { InvoiceFilters, Invoice } from '../types';

const STATUS_OPTIONS = ['Sent', 'Unpaid', 'Overdue', 'Paid', 'Void', 'Draft'];
const TAX_OPTIONS = ['0', '3', '5', '18', '28'];

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

export function InvoiceList() {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Partial<InvoiceFilters>>({
    page: 1, limit: 20, sortBy: 'dueDate', sortOrder: 'asc',
  });
  const [showModal, setShowModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => fetchInvoices(filters),
    placeholderData: (prev) => prev,
  });

  const set = useCallback((patch: Partial<InvoiceFilters>) => {
    setFilters((f) => ({ ...f, ...patch, page: 'page' in patch ? patch.page! : 1 }));
  }, []);

  function toggleSort(field: 'amount' | 'dueDate') {
    if (filters.sortBy === field) {
      set({ sortBy: field, sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      set({ sortBy: field, sortOrder: 'asc' });
    }
  }

  function sortIcon(field: string) {
    if (filters.sortBy !== field) return ' ↕';
    return filters.sortOrder === 'asc' ? ' ↑' : ' ↓';
