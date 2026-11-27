import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBox, useLoad } from '../components/Async';
import { api, money } from '../api';
import { useAuth, useCart, useToast } from '../state';

export default function Checkout() {
  const { user } = useAuth();
  const { items, clear } = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const addresses = useLoad(() => api.get('/addresses'));
  const settings = useLoad(() => api.get('/settings'));
  const [orderType, setOrderType] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [paymentReference, setRef] = useState('');
  const [addressId, setAddressId] = useState('');
  const [addr, setAddr] = useState({ label: 'Home', line1: '', city: '', notes: '' });
  const [saveAddress, setSave] = useState(true);
  const [quote, setQuote] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (items.length) api.post('/cart/quote', { items }).then(setQuote).catch((e) => setErr(e.message)); }, [items]);
  useEffect(() => { if (addresses.data?.length && !addressId) setAddressId(String(addresses.data[0].id)); }, [addresses.data]);

  if (items.length === 0) return <div className="container section"><div className="empty">Your cart is empty. <Link to="/menu">Browse the menu</Link></div></div>;

  const fee = orderType === 'delivery' ? settings.data?.deliveryFee || 0 : 0;
  const useNew = !addresses.data?.length || addressId === 'new';

  const place = async () => {
    setErr('');
    if (!phone.trim()) return setErr('Please enter a phone number.');
    if (orderType === 'delivery' && useNew && (!addr.line1 || !addr.city)) return setErr('Please enter your delivery address.');
    setBusy(true);
    try {
      const body = { orderType, paymentMethod, phone, notes, items, paymentReference };
      if (orderType === 'delivery') { if (useNew) { body.address = addr; body.saveAddress = saveAddress; } else body.addressId = Number(addressId); }
      const order = await api.post('/orders', body);
      clear();
      toast(`Order #${order.id} placed. We will confirm it shortly.`);
      nav('/orders');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="container section">
      <h2 className="section-title">Checkout</h2>
      <div className="two-col">
        <div className="card">
          <h3>Order type</h3>
          <div className="chips">
            {['pickup', 'delivery'].map((t) => <button key={t} className={`chip ${orderType === t ? 'on' : ''}`} onClick={() => setOrderType(t)}>{t === 'pickup' ? 'Pickup' : 'Delivery'}</button>)}
          </div>
          <label>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} />

          {orderType === 'delivery' && (<>
            <h3 style={{ marginTop: '1rem' }}>Delivery address</h3>
            {addresses.data?.length > 0 && (
              <select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                {addresses.data.map((a) => <option key={a.id} value={a.id}>{a.label}: {a.line1}, {a.city}</option>)}
                <option value="new">Use a new address</option>
              </select>)}
            {useNew && (<>
              <label>Label</label><input value={addr.label} onChange={(e) => setAddr({ ...addr, label: e.target.value })} />
              <label>Street and building</label><input value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
              <label>City / area</label><input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
              <label>Notes for the driver</label><input value={addr.notes} onChange={(e) => setAddr({ ...addr, notes: e.target.value })} />
              <label className="check"><input type="checkbox" checked={saveAddress} onChange={(e) => setSave(e.target.checked)} />Save this address for next time</label>
            </>)}
          </>)}

          <h3 style={{ marginTop: '1rem' }}>Payment</h3>
          <div className="chips">
            {['cash', 'instapay'].map((m) => <button key={m} className={`chip ${paymentMethod === m ? 'on' : ''}`} onClick={() => setPaymentMethod(m)}>{m === 'cash' ? 'Cash' : 'InstaPay'}</button>)}
          </div>
          {paymentMethod === 'instapay' && (
            <div className="card" style={{ background: 'var(--soft)' }}>
              <p>Send <b>{quote ? money(quote.subtotal + fee) : '...'}</b> to <b>{settings.data?.instapayHandle}</b> on InstaPay, then enter the transfer reference below.</p>
              <p className="muted">Your order will show "awaiting verification" until the restaurant confirms the transfer. It is not marked paid automatically.</p>
              <label>Transfer reference</label><input value={paymentReference} onChange={(e) => setRef(e.target.value)} />
            </div>)}

          <label>Order notes</label><textarea rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <ErrorBox message={err} />
        </div>
        <div className="card">
          <h3>Summary</h3>
          <div className="sum-row"><span>Subtotal</span><span>{quote ? money(quote.subtotal) : '...'}</span></div>
          <div className="sum-row"><span>Delivery</span><span>{money(fee)}</span></div>
          <div className="sum-row big"><span>Total</span><span>{quote ? money(quote.subtotal + fee) : '...'}</span></div>
          <button className="btn" style={{ width: '100%', marginTop: '1rem' }} disabled={busy || !quote} onClick={place}>{busy ? 'Placing order...' : 'Place order'}</button>
        </div>
      </div>
    </div>
  );
}
