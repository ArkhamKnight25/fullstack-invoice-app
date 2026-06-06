import { useState, useCallback, useEffect, useRef } from 'react';
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

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j}><span className="skeleton" style={{ width: `${60 + Math.random() * 40}%` }} /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

type FilterKey = 'status' | 'taxRate' | 'date';

export function InvoiceList() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<Partial<InvoiceFilters>>({
    page: 1, limit: 20, sortBy: 'dueDate', sortOrder: 'asc',
  });
  const [showModal, setShowModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>();
  const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const filterRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => set({ search: searchInput || undefined }), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Close popover on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilter(null);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

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

  function clearAll() {
    setFilters({ page: 1, limit: 20, sortBy: 'dueDate', sortOrder: 'asc' });
    setSearchInput('');
    setOpenFilter(null);
  }

  const hasActiveFilters = !!(filters.status || filters.taxRate || filters.issueDateFrom || filters.issueDateTo || filters.dueDateFrom || filters.dueDateTo || filters.search);

  const invoices = data?.data ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const totalPages = data?.totalPages ?? 1;
  const startRow = (page - 1) * (filters.limit ?? 20) + 1;
  const endRow = Math.min(page * (filters.limit ?? 20), total);

  const dateActive = !!(filters.issueDateFrom || filters.issueDateTo || filters.dueDateFrom || filters.dueDateTo);

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

      <div className="filters" ref={filterRef}>
        <input
          className="search-box"
          placeholder="Search invoice / customer"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        {/* Status pill */}
        <div className="pill-wrap">
          <button
            className={`filter-pill${filters.status ? ' pill-active' : ''}`}
            onClick={() => setOpenFilter(openFilter === 'status' ? null : 'status')}
          >
            Status{filters.status ? ` · ${filters.status}` : ''} ▾
          </button>
          {openFilter === 'status' && (
            <div className="pill-dropdown">
              {STATUS_OPTIONS.map((s) => (
                <label key={s} className="pill-option">
                  <input
                    type="radio"
                    name="status"
                    checked={filters.status === s}
                    onChange={() => { set({ status: filters.status === s ? undefined : s }); setOpenFilter(null); }}
                  />
                  <StatusBadge status={s as never} />
                </label>
              ))}
              {filters.status && (
                <button className="pill-clear" onClick={() => { set({ status: undefined }); setOpenFilter(null); }}>Clear</button>
              )}
            </div>
          )}
        </div>

        {/* Tax rate pill */}
        <div className="pill-wrap">
          <button
            className={`filter-pill${filters.taxRate ? ' pill-active' : ''}`}
            onClick={() => setOpenFilter(openFilter === 'taxRate' ? null : 'taxRate')}
          >
            Tax rate{filters.taxRate ? ` · ${filters.taxRate}%` : ''} ▾
          </button>
          {openFilter === 'taxRate' && (
            <div className="pill-dropdown">
              {TAX_OPTIONS.map((r) => (
                <label key={r} className="pill-option">
                  <input
                    type="radio"
                    name="taxRate"
                    checked={filters.taxRate === r}
                    onChange={() => { set({ taxRate: filters.taxRate === r ? undefined : r }); setOpenFilter(null); }}
                  />
                  {r}%
                </label>
              ))}
              {filters.taxRate && (
                <button className="pill-clear" onClick={() => { set({ taxRate: undefined }); setOpenFilter(null); }}>Clear</button>
              )}
            </div>
          )}
        </div>

        {/* Date pill */}
        <div className="pill-wrap">
          <button
            className={`filter-pill${dateActive ? ' pill-active' : ''}`}
            onClick={() => setOpenFilter(openFilter === 'date' ? null : 'date')}
          >
            Date{dateActive ? ' · set' : ''} ▾
          </button>
          {openFilter === 'date' && (
            <div className="pill-dropdown" style={{ minWidth: 260, padding: 14 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <label className="form-label">Issue date from</label>
                <input type="date" value={filters.issueDateFrom ?? ''} onChange={(e) => set({ issueDateFrom: e.target.value || undefined })} />
                <label className="form-label">Issue date to</label>
                <input type="date" value={filters.issueDateTo ?? ''} onChange={(e) => set({ issueDateTo: e.target.value || undefined })} />
                <label className="form-label">Due date from</label>
                <input type="date" value={filters.dueDateFrom ?? ''} onChange={(e) => set({ dueDateFrom: e.target.value || undefined })} />
                <label className="form-label">Due date to</label>
                <input type="date" value={filters.dueDateTo ?? ''} onChange={(e) => set({ dueDateTo: e.target.value || undefined })} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {dateActive && <button className="pill-clear" onClick={() => { set({ issueDateFrom: undefined, issueDateTo: undefined, dueDateFrom: undefined, dueDateTo: undefined }); }}>Clear dates</button>}
                <button className="btn-primary btn-sm" onClick={() => setOpenFilter(null)}>Apply</button>
              </div>
            </div>
          )}
        </div>

        {hasActiveFilters && (
          <button className="btn-secondary btn-sm" onClick={clearAll}>Clear all</button>
        )}
      </div>

      <div className="card">
        {isError && <p className="error-msg">Failed to load invoices.</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th className="sortable" onClick={() => toggleSort('amount')}>Amount{sortIcon('amount')}</th>
                <th>Tax%</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <SkeletonRows />}
              {!isLoading && invoices.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      <p>No invoices match your filters.</p>
                      {hasActiveFilters && (
                        <button className="btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={clearAll}>
                          Clear filters — show all {total > 0 ? total.toLocaleString() : '2,000'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {!isLoading && invoices.map((inv) => (
                <tr
                  key={inv._id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setEditInvoice(inv); setShowModal(true); }}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{inv.invoiceId}</td>
                  <td>
                    <span
                      className="clickable"
                      onClick={(e) => { e.stopPropagation(); navigate(`/customers/${encodeURIComponent(inv.customerName)}`); }}
                    >
                      {inv.customerName}
                    </span>
                  </td>
                  <td>₹{fmt(inv.amount)}</td>
                  <td>{inv.taxRate}%</td>
                  <td>₹{fmt(inv.total)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && !isError && (
          <div className="table-footer">
            <span className="footer-count">
              {total > 0 ? `Showing ${startRow}–${endRow} of ${total.toLocaleString()}` : 'No results'}
            </span>
            <Pagination page={page} totalPages={totalPages} onChange={(p) => set({ page: p })} />
          </div>
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
