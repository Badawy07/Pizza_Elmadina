import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoad, Loading, ErrorBox } from '../components/Async';
import { api, money } from '../api';
import { useAuth, useToast } from '../state';

export const STATUS_LABEL = { pending: 'Pending', confirmed: 'Confirmed', out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled' };
const FLOW = { delivery: ['pending', 'confirmed', 'out_for_delivery', 'completed'], pickup: ['pending', 'confirmed', 'completed'] };
export const PAY_LABEL = { unpaid: 'Unpaid (pay on receipt)', awaiting_verification: 'Awaiting verification', paid: 'Paid' };

function ReviewForm({ orderId, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const send = () => api.post(`/orders/${orderId}/review`, { rating, comment }).then(onDone).catch((e) => setErr(e.message));
  return (
    <div style={{ marginTop: '.75rem' }}>
      <b>Rate this order</b>
      <div className="stars">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRating(n)}>{n <= rating ? '★' : '☆'}</button>)}</div>
      <textarea rows="2" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us what you thought" />
      <ErrorBox message={err} />
      <button className="btn small" onClick={send}>Submit review</button>
    </div>
  );
}

export default function Orders() {
  const { socket } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useLoad(() => api.get('/orders'));
  useEffect(() => {
    if (!socket) return undefined;
    const h = (e) => { toast(`Order #${e.id} is now: ${STATUS_LABEL[e.status]}`); reload(); };
    socket.on('order:status', h);
    return () => socket.off('order:status', h);
  }, [socket]);

  return (
    <div className="container section">
      <h2 className="section-title">My orders</h2>
      {loading ? <Loading /> : error ? <ErrorBox message={error} /> :
        data.length === 0 ? <div className="empty">No orders yet. <Link to="/menu">Order something tasty</Link></div> :
        data.map((o) => (
          <div className="card" key={o.id} style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <b>Order #{o.id} ({o.orderType})</b><b>{money(o.total)}</b>
            </div>
            {o.status === 'cancelled'
              ? <div className="steps"><span className="step on">Cancelled</span></div>
              : <div className="steps">{FLOW[o.orderType].map((s) => <span key={s} className={`step ${s === o.status ? 'on' : ''}`}>{STATUS_LABEL[s]}</span>)}</div>}
            <div className="muted">Payment: {o.paymentMethod === 'cash' ? 'Cash' : 'InstaPay'} - {PAY_LABEL[o.paymentStatus]}</div>
            {o.addressText && <div className="muted">Deliver to: {o.addressText}</div>}
            <ul>{o.items.map((i) => (
              <li key={i.id}>{i.quantity} x {i.productName}{i.sizeName ? ` (${i.sizeName})` : ''}
                {i.toppings.length > 0 && ` + ${i.toppings.map((t) => t.name).join(', ')}`}{i.instructions && ` [${i.instructions}]`}</li>))}</ul>
            {o.status === 'completed' && (o.hasReview ? <span className="tag">Thanks for your review</span> : <ReviewForm orderId={o.id} onDone={reload} />)}
          </div>))}
    </div>
  );
}
