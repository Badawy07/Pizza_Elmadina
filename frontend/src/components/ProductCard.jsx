import { Link } from 'react-router-dom';
import { imgUrl, money } from '../api';

export function Pic({ url, className = 'pimg' }) {
  return url ? <img className={className} src={imgUrl(url)} alt="" /> : <div className="ph">🍕</div>;
}

export default function ProductCard({ p }) {
  const discounted = p.discountPercent > 0 ? Math.round(p.basePrice * (100 - p.discountPercent)) / 100 : null;
  return (
    <div className="pcard">
      <Link to={`/menu/product/${p.id}`}><Pic url={p.imageUrl} /></Link>
      <div className="body">
        {p.isBestseller && <span className="tag">Best Seller</span>}
        {p.discountPercent > 0 && <span className="tag">-{p.discountPercent}%</span>}
        <h3>{p.name}</h3>
        <p className="muted">{p.description}</p>
        <div className="price">
          {discounted !== null && <span className="old">{money(p.basePrice)}</span>}
          from {money(discounted ?? p.basePrice)}
        </div>
        {/* Add to Cart opens the details page so the customer can pick size/toppings first. */}
        <Link to={`/menu/product/${p.id}`} className="btn">Add to Cart</Link>
      </div>
    </div>
  );
}
