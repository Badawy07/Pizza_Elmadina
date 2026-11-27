import { useEffect, useState } from 'react';
import { useLoad, Loading, ErrorBox } from '../../components/Async';
import { api, money } from '../../api';
import { STATUS_LABEL, PAY_LABEL } from '../Orders';

const NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['out_for_delivery', 'completed', 'cancelled'], out_for_delivery: ['completed'], completed: [], cancelled: [] };

export default function AdminOrders() {
  const { data, loading, error, reload } = useLoad(() => api.get('/admin/orders'));
  const [err, setErr] = useState('');
  useEffect(() => {
    window.addEventListener('admin:new-order', reload);
    return () => window.removeEventListener('admin:new-order', reload);
  }, [reload]);
  const act = (p) => p.then(reload).catch((e) => setErr(e.message));
  return (
    <>
      <h2 className="section-title">Orders</h2>
      <ErrorBox message={error || err} />
      {loading ? <Loading /> : data.length === 0 ? <div className="empty">No orders yet.</div> : (
        <table>
          <thead><tr><th>#</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{data.map((o) => (
            <tr key={o.id}>
              <td>{o.id}<div className="muted">{o.orderType}</div></td>
              <td>{o.customerName}<div className="muted">{o.phone}</div>{o.addressText && <div className="muted">{o.addressText}</div>}</td>
              <td>{o.items.map((i) => <div key={i.id}>{i.quantity} x {i.productName}{i.sizeName ? ` (${i.sizeName})` : ''}{i.toppings.length > 0 && ` + ${i.toppings.map((t) => t.name).join(', ')}`}{i.instructions && <i> [{i.instructions}]</i>}</div>)}{o.notes && <div className="muted">Note: {o.notes}</div>}</td>
              <td>{money(o.total)}</td>
              <td>{o.paymentMethod}<div className="muted">{PAY_LABEL[o.paymentStatus]}</div>{o.paymentReference && <div className="muted">Ref: {o.paymentReference}</div>}
                {o.paymentMethod === 'instapay' && o.paymentStatus !== 'paid' && o.status !== 'cancelled' &&
                  <button className="btn small yellow" onClick={() => act(api.patch(`/admin/orders/${o.id}/payment`, { paymentStatus: 'paid' }))}>Verify transfer received</button>}</td>
              <td><span className="tag">{STATUS_LABEL[o.status]}</span></td>
              <td style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                {NEXT[o.status].filter((s) => s !== 'out_for_delivery' || o.orderType === 'delivery').map((s) => (
                  <button key={s} className={`btn small ${s === 'cancelled' ? 'danger' : ''}`} onClick={() => act(api.patch(`/admin/orders/${o.id}/status`, { status: s }))}>{STATUS_LABEL[s]}</button>))}
              </td>
            </tr>))}</tbody>
        </table>)}
    </>
  );
}
