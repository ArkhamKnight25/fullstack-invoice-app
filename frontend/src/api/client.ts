import type {
  Invoice,
  InvoiceListResponse,
  InvoiceFilters,
  Customer,
  CustomerProfile,
  SummaryResponse,
} from '../types';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Invoices ---

export function fetchInvoices(filters: Partial<InvoiceFilters>): Promise<InvoiceListResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return request<InvoiceListResponse>(`/invoices?${params.toString()}`);
}

export function fetchInvoice(invoiceId: string): Promise<Invoice> {
  return request<Invoice>(`/invoices/${invoiceId}`);
}

export function createInvoice(data: {
  customer: string;
  amount: number;
  taxRate: number;
  issueDate: string;
  dueDate: string;
  status: string;
}): Promise<Invoice> {
  return request<Invoice>('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateInvoice(
  invoiceId: string,
  data: Partial<{
    customer: string;
    amount: number;
    taxRate: number;
    issueDate: string;
    dueDate: string;
    status: string;
  }>
): Promise<Invoice> {
  return request<Invoice>(`/invoices/${invoiceId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteInvoice(invoiceId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/invoices/${invoiceId}`, { method: 'DELETE' });
}

// --- Customers ---

export function fetchCustomers(): Promise<Customer[]> {
  return request<Customer[]>('/customers');
}

export function fetchCustomerProfile(idOrName: string): Promise<CustomerProfile> {
  return request<CustomerProfile>(`/customers/${encodeURIComponent(idOrName)}`);
}

// --- Summary ---

export function fetchSummary(): Promise<SummaryResponse> {
  return request<SummaryResponse>('/summary');
}
