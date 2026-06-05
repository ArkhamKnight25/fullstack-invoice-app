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
  }

  const invoices = data?.data ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const totalPages = data?.totalPages ?? 1;
  const startRow = (page - 1) * (filters.limit ?? 20) + 1;
  const endRow = Math.min(page * (filters.limit ?? 20), total);

  return (
    <div className="page">
      <div className="toolbar">
        <span className="toolbar-title">Invoices</span>
        <div className="toolbar-actions">
          <button className="btn-secondary" onClick={() => navigate('/summary')}>Summary</button>
          <button className="btn-primary" onClick={() => { setEditInvoice(undefined); setShowModal(true); }}>
            + New invoice
          </button>
        </div>
      </div>

      <div className="filters">
        <input
          className="search-box"
          placeholder="Search invoice / customer"
          value={filters.search ?? ''}
          onChange={(e) => set({ search: e.target.value })}
        />
        <select value={filters.status ?? ''} onChange={(e) => set({ status: e.target.value || undefined })}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.taxRate ?? ''} onChange={(e) => set({ taxRate: e.target.value || undefined })}>
          <option value="">All tax rates</option>
          {TAX_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
        </select>
        <input
          type="date"
          title="Issue date from"
          value={filters.issueDateFrom ?? ''}
          onChange={(e) => set({ issueDateFrom: e.target.value || undefined })}
          style={{ minWidth: 140 }}
        />
        <input
          type="date"
          title="Issue date to"
          value={filters.issueDateTo ?? ''}
          onChange={(e) => set({ issueDateTo: e.target.value || undefined })}
          style={{ minWidth: 140 }}
        />
        <input
          type="date"
          title="Due date from"
          value={filters.dueDateFrom ?? ''}
          onChange={(e) => set({ dueDateFrom: e.target.value || undefined })}
          style={{ minWidth: 140 }}
        />
        <input
          type="date"
          title="Due date to"
          value={filters.dueDateTo ?? ''}
          onChange={(e) => set({ dueDateTo: e.target.value || undefined })}
          style={{ minWidth: 140 }}
        />
        {Object.values(filters).some(v => v && !['page','limit','sortBy','sortOrder'].includes(String(v))) && (
          <button className="btn-secondary btn-sm" onClick={() => setFilters({ page: 1, limit: 20, sortBy: 'dueDate', sortOrder: 'asc' })}>
            Clear
          </button>
        )}
      </div>

      <div className="card">
        {isLoading && <p className="loading">Loading invoices…</p>}
        {isError && <p className="error-msg">Failed to load invoices.</p>}
        {!isLoading && !isError && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th className="sortable" onClick={() => toggleSort('amount')}>
                      Amount{sortIcon('amount')}
                    </th>
                    <th>Tax%</th>
                    <th>Total</th>
                    <th className="sortable" onClick={() => toggleSort('dueDate')}>
                      Due{sortIcon('dueDate')}
                    </th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 && (
                    <tr><td colSpan={8} className="empty">No invoices found.</td></tr>
                  )}
                  {invoices.map((inv) => (
                    <tr key={inv._id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{inv.invoiceId}</td>
                      <td>
                        <span
                          className="clickable"
                          onClick={() => navigate(`/customers/${encodeURIComponent(inv.customerName)}`)}
                        >
                          {inv.customerName}
                        </span>
                      </td>
                      <td>₹{fmt(inv.amount)}</td>
                      <td>{inv.taxRate}%</td>
                      <td>₹{fmt(inv.total)}</td>
                      <td>{fmtDate(inv.dueDate)}</td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => { setEditInvoice(inv); setShowModal(true); }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span className="footer-count">
                {total > 0 ? `Showing ${startRow}–${endRow} of ${total.toLocaleString()}` : 'No results'}
              </span>
              <Pagination page={page} totalPages={totalPages} onChange={(p) => set({ page: p })} />
            </div>
          </>
        )}
      </div>

      {showModal && (
        <InvoiceModal
          existing={editInvoice}
          onClose={() => { setShowModal(false); setEditInvoice(undefined); }}
        />
      )}
    </div>
  );
}
