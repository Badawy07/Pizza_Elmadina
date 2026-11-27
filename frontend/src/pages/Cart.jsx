import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Pic } from '../components/ProductCard';
import { ErrorBox } from '../components/Async';
import { api, money } from '../api';
import { useCart } from '../state';

// Prices shown here come from POST /cart/quote (server-side), never from the browser.
export default function Cart() {
  const { items, setQty, remove } = useCart();
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const sig = JSON.stringify(items.map((i) => [i.key, i.quantity]));

  useEffect(() => {
    if (items.length === 0) { setQuote(null); setError(''); return; }
    setError('');
    api.post('/cart/quote', { items }).then(setQuote).catch((e) => { setQuote(null); setError(e.message); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  if (items.length === 0) {
    return <div className="container section"><div className="empty"><h3>Your cart is empty</h3><Link to="/menu" className="btn">Browse the menu</Link></div></div>;
  }
  return (
    <div className="container section">
      <h2 className="section-title">Your cart</h2>
      <div className="two-col">
        <div>
          {items.map((it, idx) => {
            const l = quote?.lines[idx];
            return (
              <div className="cart-line" key={it.key}>
                <Pic url={l?.imageUrl} />
                <div>
                  <h3>{l?.productName || '...'}</h3>
                  {l?.sizeName && <div className="muted">Size: {l.sizeName}</div>}
                  {l?.toppings.length > 0 && <div className="muted">Toppings: {l.toppings.map((t) => t.name).join(', ')}</div>}
                  {it.instructions && <div className="muted">Note: {it.instructions}</div>}
                  {l && <div>{money(l.unitPrice)} each</div>}
                  <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginTop: '.4rem' }}>
                    <div className="qty">
                      <button onClick={() => setQty(it.key, it.quantity - 1)}>-</button>
                      <span>{it.quantity}</span>
                      <button onClick={() => setQty(it.key, it.quantity + 1)}>+</button>
                    </div>
                    <button className="btn small danger" onClick={() => remove(it.key)}>Remove</button>
                  </div>
                </div>
                <b>{l ? money(l.lineTotal) : ''}</b>
              </div>
            );
          })}
        </div>
        <div className="card">
          <h3>Summary</h3>
          <ErrorBox message={error} />
          <div className="sum-row big"><span>Subtotal</span><span>{quote ? money(quote.subtotal) : '...'}</span></div>
          <p className="muted">Delivery fee is added at checkout if you choose delivery.</p>
          <Link to="/checkout" className="btn" style={{ display: 'block', textAlign: 'center', opacity: error ? .5 : 1, pointerEvents: error ? 'none' : 'auto' }}>Checkout</Link>
        </div>
      </div>
    </div>
  );
}
