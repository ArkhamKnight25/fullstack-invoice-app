import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchSummary } from '../api/client';

function fmt(n: number) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Summary() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary'],
    queryFn: fetchSummary,
  });

  if (isLoading) return <div className="page"><p className="loading">Loading summary…</p></div>;
  if (isError || !data) return <div className="page"><p className="error-msg">Failed to load summary.</p></div>;

  const maxValue = Math.max(...data.topCustomers.map((c) => c.totalValue), 1);

  return (
    <div className="page">
      <div className="toolbar">
        <span className="toolbar-title">Summary / Analytics</span>
        <button className="btn-secondary" onClick={() => navigate('/')}>← Back to invoices</button>
      </div>

      <div className="metric-grid" style={{ marginBottom: 24 }}>
