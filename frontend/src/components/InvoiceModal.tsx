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
