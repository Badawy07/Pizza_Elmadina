import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLoad, Loading, ErrorBox } from '../components/Async';
import { Pic } from '../components/ProductCard';
import { api, money } from '../api';
import { useCart, useToast } from '../state';

export default function ProductDetails() {
  const { productId } = useParams();
  const { data: p, loading, error } = useLoad(() => api.get(`/products/${productId}`), [productId]);
  const { add } = useCart();
  const toast = useToast();
  const nav = useNavigate();
  const [sizeId, setSizeId] = useState(null);
  const [toppingIds, setToppingIds] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [formErr, setFormErr] = useState('');

  useEffect(() => { if (p?.sizes?.length) setSizeId(p.sizes[0].id); }, [p]);
  if (loading) return <div className="container section"><Loading /></div>;
  if (error) return <div className="container section"><ErrorBox message={error} /></div>;

  // Live total is for display only. The server recomputes the real price at checkout.
  const size = p.sizes.find((s) => s.id === sizeId);
  const basePrice = size ? size.price : p.basePrice;
  const discounted = Math.round(basePrice * (100 - p.discountPercent)) / 100;
  const tops = p.toppings.filter((t) => toppingIds.includes(t.id));
  const unit = discounted + tops.reduce((s, t) => s + t.price, 0);
  const toggle = (id) => setToppingIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const addToCart = () => {
    if (!p.isAvailable) return setFormErr('This item is currently unavailable.');
    if (p.sizes.length && !size) return setFormErr('Please choose a size.');
    if (quantity < 1) return setFormErr('Quantity must be at least 1.');
    setFormErr('');
    add({ productId: p.id, sizeId: sizeId ?? null, toppingIds, quantity, instructions });
    toast(`${quantity} x ${p.name} added to your cart`, (
      <span style={{ display: 'flex', gap: '.5rem' }}>
        <button className="btn small outline" onClick={() => nav('/menu')}>Continue shopping</button>
        <button className="btn small" onClick={() => nav('/cart')}>Open cart</button>
      </span>));
  };

  return (
    <div className="container section">
      <p><Link to="/menu">Back to menu</Link></p>
      <div className="details">
        <Pic url={p.imageUrl} />
        <div>
          <h1>{p.name}</h1>
          {p.discountPercent > 0 && <span className="tag">-{p.discountPercent}% offer</span>}
          <p>{p.description}</p>
          {!p.isAvailable && <div className="err">Currently unavailable</div>}

          {p.sizes.length > 0 && (<>
            <h3>Size</h3>
            {p.sizes.map((s) => (
              <label key={s.id} className={`opt ${sizeId === s.id ? 'on' : ''}`}>
                <span><input type="radio" name="size" checked={sizeId === s.id} onChange={() => setSizeId(s.id)} />{s.name}</span>
                <b>{money(Math.round(s.price * (100 - p.discountPercent)) / 100)}</b>
              </label>))}
          </>)}

          {p.toppings.length > 0 && (<>
            <h3 style={{ marginTop: '1rem' }}>Extra toppings</h3>
            {p.toppings.map((t) => (
              <label key={t.id} className={`opt ${toppingIds.includes(t.id) ? 'on' : ''}`}>
                <span><input type="checkbox" checked={toppingIds.includes(t.id)} onChange={() => toggle(t.id)} />{t.name}</span>
                <b>+{money(t.price)}</b>
              </label>))}
          </>)}

          <label htmlFor="ins">Special instructions</label>
          <textarea id="ins" rows="2" maxLength="300" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="No olives, well done..." />

          <label>Quantity</label>
          <div className="qty">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Less">-</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity((q) => Math.min(50, q + 1))} aria-label="More">+</button>
          </div>

          <div className="total">Total: {money(unit * quantity)}</div>
          <ErrorBox message={formErr} />
          <button className="btn" disabled={!p.isAvailable} onClick={addToCart}>Add to Cart</button>
        </div>
      </div>
    </div>
  );
}
