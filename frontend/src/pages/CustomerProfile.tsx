import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCustomerProfile } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import type { InvoiceStatus } from '../types';

const STATUS_CHIPS: InvoiceStatus[] = ['Paid', 'Unpaid', 'Overdue', 'Draft', 'Sent', 'Void'];

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

  if (isLoading) return <div className="page"><p className="loading">Loading customer…</p></div>;
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
