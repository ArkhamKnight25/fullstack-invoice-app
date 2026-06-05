import type { InvoiceStatus } from '../types';

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}
