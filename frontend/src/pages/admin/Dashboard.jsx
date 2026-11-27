import { useEffect, useState } from 'react';
import { useLoad, Loading, ErrorBox } from '../../components/Async';
import { api, money } from '../../api';

export default function Dashboard() {
  const [period, setPeriod] = useState('day');
  const summary = useLoad(() => api.get('/admin/stats/summary'));
  const series = useLoad(() => api.get(`/admin/stats/sales?period=${period}`), [period]);
  useEffect(() => {
    const h = () => { summary.reload(); series.reload(); };
    window.addEventListener('admin:new-order', h);
    return () => window.removeEventListener('admin:new-order', h);
  });
  const s = summary.data;
  const max = Math.max(1, ...(series.data || []).map((x) => x.total));
  const labels = { day: 'Sales per day (last 30 days)', month: 'Sales per month (last 12 months)', six_months: 'Sales per month (last 6 months)' };
  return (
    <>
      <h2 className="section-title">Dashboard</h2>
      <ErrorBox message={summary.error} />
      {s && (
        <div className="stats">
          <div className="card stat">Total sales<b>{money(s.totalSales)}</b></div>
          <div className="card stat">Today<b>{money(s.today)}</b></div>
          <div className="card stat">This month<b>{money(s.thisMonth)}</b></div>
          <div className="card stat">Last 6 months<b>{money(s.sixMonths)}</b></div>
          <div className="card stat">Pending orders<b>{s.pendingOrders}</b></div>
        </div>)}
      <div className="card">
        <div className="chips">
          {[['day', 'By day'], ['month', 'By month'], ['six_months', 'Six months']].map(([k, l]) => (
            <button key={k} className={`chip ${period === k ? 'on' : ''}`} onClick={() => setPeriod(k)}>{l}</button>))}
        </div>
        <h3>{labels[period]}</h3>
        {series.loading ? <Loading /> : series.error ? <ErrorBox message={series.error} /> :
          series.data.length === 0 ? <div className="empty">No sales in this period yet.</div> : (<>
            <div className="bars">{series.data.map((x) => (
              <div key={x.label} className="bar" style={{ height: `${(x.total / max) * 100}%` }} title={`${x.label}: ${money(x.total)} (${x.orders} orders)`}><span>{Math.round(x.total)}</span></div>))}</div>
            <div className="barlabels">{series.data.map((x) => <div key={x.label}>{period === 'day' ? x.label.slice(5) : x.label}</div>)}</div>
          </>)}
        <p className="muted">Sales count confirmed, out for delivery and completed orders. Cancelled and pending orders are excluded.</p>
      </div>
    </>
  );
}
