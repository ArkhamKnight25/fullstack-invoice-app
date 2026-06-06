import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCustomerProfile } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import type { InvoiceStatus } from '../types';

const STATUS_CHIPS: InvoiceStatus[] = ['Paid', 'Unpaid', 'Overdue', 'Draft'];

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function CustomerProfile() {
  const { idOrName } = useParams<{ idOrName: string }>();
  const [activeStatus, setActiveStatus] = useState<InvoiceStatus | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['customer', idOrName],
    queryFn: () => fetchCustomerProfile(idOrName!),
    enabled: !!idOrName,
  });

  if (isLoading) return (
    <div className="page">
      <div className="metric-grid">
        {[1,2,3,4].map(i => <div key={i} className="metric-card"><span className="skeleton" style={{ width: '60%', height: 32, display: 'block' }} /></div>)}
      </div>
    </div>
  );
  if (isError || !data) return <div className="page"><p className="error-msg">Customer not found.</p></div>;

  const { customer, metrics, invoices } = data;
  const filtered = activeStatus ? invoices.filter((i) => i.status === activeStatus) : invoices;

  return (
    <div className="page">
      <p className="breadcrumb">
        <Link to="/">Invoices</Link> / Customer
      </p>

      <div className="customer-header">
        <div className="avatar">{initials(customer.name)}</div>
        <div>
          <p className="customer-name">{customer.name}</p>
          <p className="customer-company">{customer.company} (1:1)</p>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">Total billed</p>
          <p className="metric-value">₹{fmt(metrics.totalBilled)}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Total tax</p>
          <p className="metric-value">₹{fmt(metrics.totalTax)}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Outstanding</p>
          <p className="metric-value">₹{fmt(metrics.outstanding)}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label"># Invoices</p>
          <p className="metric-value">{metrics.invoiceCount}</p>
        </div>
      </div>

      <div className="status-chips">
        {STATUS_CHIPS.map((s) => (
          <button
            key={s}
            className={'chip' + (activeStatus === s ? ' active' : '')}
            onClick={() => setActiveStatus(activeStatus === s ? null : s)}
          >
            {s} <span style={{ opacity: 0.7 }}>{metrics.byStatus[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <p className="section-title">Invoice history</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Total</th>
                <th>Status</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="empty">No invoices{activeStatus ? ` with status "${activeStatus}"` : ''}.</td></tr>
              )}
              {filtered.map((inv) => (
                <tr key={inv._id} style={inv.status === 'Overdue' ? { background: '#fff5f5' } : {}}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{inv.invoiceId}</td>
                  <td>₹{fmt(inv.total)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>{fmtDate(inv.issueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
