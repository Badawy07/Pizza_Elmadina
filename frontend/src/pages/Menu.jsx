import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useLoad, Loading, ErrorBox } from '../components/Async';
import { api } from '../api';

export default function Menu({ offersOnly }) {
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('categoryId') || '';
  const cats = useLoad(() => api.get('/categories'));
  const prods = useLoad(() => api.get(`/products${categoryId ? `?categoryId=${categoryId}` : ''}`), [categoryId]);
  const list = (prods.data || []).filter((p) => !offersOnly || p.discountPercent > 0);
  return (
    <div className="container section">
      <h2 className="section-title">{offersOnly ? 'Offers' : 'Menu'}</h2>
      {!offersOnly && cats.data && (
        <div className="chips">
          <button className={`chip ${!categoryId ? 'on' : ''}`} onClick={() => setParams({})}>All</button>
          {cats.data.map((c) => (
            <button key={c.id} className={`chip ${String(c.id) === categoryId ? 'on' : ''}`} onClick={() => setParams({ categoryId: c.id })}>{c.name}</button>
          ))}
        </div>
      )}
      {prods.loading ? <Loading /> : prods.error ? <ErrorBox message={prods.error} /> :
        list.length === 0 ? <div className="empty">Nothing here yet.</div> :
        <div className="grid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
    </div>
  );
}
