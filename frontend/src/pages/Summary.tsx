import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchSummary } from '../api/client';
// useNavigate kept for customer profile navigation

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
      <div className="metric-grid" style={{ marginBottom: 24 }}>
        <div className="metric-card">
          <p className="metric-label">Total billed</p>
          <p className="metric-value">₹{fmt(data.totalBilled)}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Total tax</p>
          <p className="metric-value">₹{fmt(data.totalTax)}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label"># Invoices</p>
          <p className="metric-value">{data.invoiceCount.toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label"># Customers</p>
          <p className="metric-value">{data.customerCount}</p>
        </div>
      </div>

      <div className="card">
        <p className="section-title">Top customers by value</p>
        <div className="bar-chart">
          {data.topCustomers.map((c) => (
            <div key={c.name} className="bar-row">
              <span
                className="bar-label clickable"
                onClick={() => navigate(`/customers/${encodeURIComponent(c.name)}`)}
                title={c.name}
              >
                {c.name}
              </span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(c.totalValue / maxValue) * 100}%` }}
                />
              </div>
              <span className="bar-value">₹{fmt(c.totalValue)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
