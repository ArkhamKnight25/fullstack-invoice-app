export type InvoiceStatus = 'Sent' | 'Unpaid' | 'Overdue' | 'Paid' | 'Void' | 'Draft';
export type TaxRate = 0 | 3 | 5 | 18 | 28;

export interface Invoice {
  _id: string;
  invoiceId: string;
  customer: string;
  customerName: string;
  company: string;
  amount: number;
  taxRate: TaxRate;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  company: string;
}

export interface CustomerProfile {
  customer: Customer;
  metrics: {
    totalBilled: number;
    totalTax: number;
    outstanding: number;
    invoiceCount: number;
    byStatus: Record<InvoiceStatus, number>;
  };
  invoices: Invoice[];
}

export interface InvoiceListResponse {
  data: Invoice[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface SummaryResponse {
  totalBilled: number;
  totalTax: number;
  invoiceCount: number;
  customerCount: number;
  topCustomers: { name: string; company: string; totalValue: number }[];
}

export interface InvoiceFilters {
  page: number;
  limit: number;
  sortBy: 'amount' | 'dueDate';
  sortOrder: 'asc' | 'desc';
  status?: string;
  taxRate?: string;
  customer?: string;
  issueDateFrom?: string;
  issueDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}
