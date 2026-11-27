import { Link } from 'react-router-dom';
import Slider from '../components/Slider';
import ProductCard from '../components/ProductCard';
import { useLoad, Loading, ErrorBox } from '../components/Async';
import { api } from '../api';

const Stars = ({ n }) => <span>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

export default function Home() {
  const best = useLoad(() => api.get('/products?bestseller=true'));
  const offers = useLoad(() => api.get('/offers'));
  const cats = useLoad(() => api.get('/categories'));
  const reviews = useLoad(() => api.get('/reviews'));
  return (
    <>
      <Slider />
      <section className="section container">
        <h2 className="section-title">Best Sellers</h2>
        {best.loading ? <Loading /> : best.error ? <ErrorBox message={best.error} /> :
          best.data.length === 0 ? <div className="empty">No best sellers yet.</div> :
          <div className="grid">{best.data.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </section>
      <section className="section alt">
        <div className="container">
          <h2 className="section-title">Special Offers</h2>
          {offers.loading ? <Loading /> : offers.error ? <ErrorBox message={offers.error} /> :
            offers.data.length === 0 ? <div className="empty">No active offers right now.</div> :
            <div className="grid">{offers.data.map((o) => (
              <div className="card" key={o.id}>
                <span className="tag">-{o.discountPercent}%</span>
                <h3>{o.title}</h3><p>{o.description}</p>
                {o.productId && <Link className="btn" to={`/menu/product/${o.productId}`}>Order this</Link>}
              </div>))}</div>}
        </div>
      </section>
      <section className="section container">
        <h2 className="section-title">Categories</h2>
        {cats.loading ? <Loading /> : cats.error ? <ErrorBox message={cats.error} /> :
          <div className="chips">{cats.data.map((c) => <Link key={c.id} className="chip" to={`/menu?categoryId=${c.id}`}>{c.name}</Link>)}</div>}
        <Link to="/menu" className="btn">View the full menu</Link>
      </section>
      <section className="section alt">
        <div className="container">
          <h2 className="section-title">What customers say</h2>
          {reviews.loading ? <Loading /> : reviews.error ? <ErrorBox message={reviews.error} /> :
            reviews.data.length === 0 ? <div className="empty">No reviews yet. Order and be the first.</div> :
            <div className="grid">{reviews.data.map((r) => (
              <div className="card" key={r.id}><Stars n={r.rating} /><p>{r.comment}</p><b>{r.customerName}</b></div>))}</div>}
        </div>
      </section>
      <section className="section container" id="about">
        <h2 className="section-title">About Pizza El Madina</h2>
        <p>A local family pizzeria. We bake traditional Egyptian pizza and feteer fresh to order, with simple honest ingredients and fair prices.</p>
      </section>
    </>
  );
}
