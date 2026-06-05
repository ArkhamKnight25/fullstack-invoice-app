import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCustomers, createInvoice, updateInvoice } from '../api/client';
import type { Invoice, InvoiceStatus, TaxRate } from '../types';

interface Props {
  onClose: () => void;
  existing?: Invoice;
}

const STATUS_OPTIONS: InvoiceStatus[] = ['Draft', 'Sent', 'Unpaid', 'Overdue', 'Paid', 'Void'];
const TAX_OPTIONS: TaxRate[] = [0, 3, 5, 18, 28];

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toDateInput(iso: string) {
  return iso ? iso.slice(0, 10) : '';
}

export function InvoiceModal({ onClose, existing }: Props) {
  const qc = useQueryClient();
  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers });

  const [customerId, setCustomerId] = useState(existing?.customer ?? '');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [taxRate, setTaxRate] = useState<TaxRate>(existing?.taxRate ?? 18);
  const [issueDate, setIssueDate] = useState(existing ? toDateInput(existing.issueDate) : '');
  const [dueDate, setDueDate] = useState(existing ? toDateInput(existing.dueDate) : '');
  const [status, setStatus] = useState<InvoiceStatus>(existing?.status ?? 'Draft');
  const [error, setError] = useState('');

  // Auto-fill company display
  const selectedCustomer = customers.find((c) => c._id === customerId);

  // Live tax/total preview
  const amountNum = parseFloat(amount) || 0;
  const previewTax = Math.round(amountNum * taxRate) / 100;
  const previewTotal = Math.round((amountNum + previewTax) * 100) / 100;

  // Pre-fill customer id when editing (customer field holds ObjectId)
  useEffect(() => {
    if (existing && customers.length > 0) {
      const match = customers.find((c) => c.name === existing.customerName);
      if (match) setCustomerId(match._id);
    }
  }, [existing, customers]);

  const mutation = useMutation({
    mutationFn: existing
      ? (data: Parameters<typeof updateInvoice>[1]) => updateInvoice(existing.invoiceId, data)
      : createInvoice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!customerId || !amount || !issueDate || !dueDate) {
      setError('All fields are required');
      return;
    }
    mutation.mutate({ customer: customerId, amount: amountNum, taxRate, issueDate, dueDate, status });
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <p className="modal-title">{existing ? 'Edit invoice' : 'New invoice'}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Customer</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Company (auto-filled)</label>
            <input
              type="text"
              value={selectedCustomer?.company ?? ''}
              readOnly
              style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tax rate</label>
              <select value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value) as TaxRate)}>
                {TAX_OPTIONS.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Issue date</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="form-footer-preview">
            Tax&nbsp;<strong>₹{fmt(previewTax)}</strong>&nbsp;·&nbsp;
            Total&nbsp;<strong>₹{fmt(previewTotal)}</strong>&nbsp;
            <span style={{ fontSize: 12 }}>(computed)</span>
          </div>

          {error && <p className="error-msg" style={{ marginBottom: 12 }}>{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
