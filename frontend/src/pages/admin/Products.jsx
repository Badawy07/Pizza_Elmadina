import { useState } from 'react';
import { useLoad, Loading, ErrorBox } from '../../components/Async';
import { api, imgUrl, money } from '../../api';

const empty = { id: null, name: '', description: '', categoryId: '', basePrice: '', isAvailable: true, isBestseller: false, allowToppings: true, sizes: [{ name: 'Regular', price: '' }] };

export default function AdminProducts() {
  const products = useLoad(() => api.get('/admin/products'));
  const cats = useLoad(() => api.get('/categories'));
  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const edit = (p) => { setFile(null); setErr(''); setForm({ ...p, categoryId: p.categoryId ?? '', sizes: p.sizes.length ? p.sizes : [{ name: 'Regular', price: p.basePrice }] }); };
  const save = async () => {
    setErr('');
    if (!form.name.trim()) return setErr('Name is required');
    if (form.sizes.some((s) => !s.name || s.price === '' || Number(s.price) < 0)) return setErr('Every size needs a name and price');
    const fd = new FormData();
    const base = form.basePrice === '' ? Math.min(...form.sizes.map((s) => Number(s.price))) : form.basePrice;
    Object.entries({ name: form.name, description: form.description || '', categoryId: form.categoryId, basePrice: base,
      isAvailable: form.isAvailable, isBestseller: form.isBestseller, allowToppings: form.allowToppings,
      sizes: JSON.stringify(form.sizes.map((s) => ({ name: s.name, price: Number(s.price) }))) }).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('image', file);
    try {
      if (form.id) await api.putForm(`/admin/products/${form.id}`, fd); else await api.postForm('/admin/products', fd);
      setForm(null); products.reload();
    } catch (e) { setErr(e.message); }
  };
  const toggle = (p) => api.patch(`/admin/products/${p.id}/availability`, { isAvailable: !p.isAvailable }).then(products.reload).catch((e) => setErr(e.message));
  const del = (p) => window.confirm(`Delete ${p.name}?`) && api.del(`/admin/products/${p.id}`).then(products.reload).catch((e) => setErr(e.message));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 className="section-title">Products</h2>
        <div><button className="btn" onClick={() => { setForm({ ...empty }); setFile(null); setErr(''); }}>Add product</button></div>
      </div>
      <ErrorBox message={products.error || (!form && err)} />

      {form && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>{form.id ? 'Edit product' : 'New product'}</h3>
          <div className="row">
            <div><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div><label>Category</label>
              <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                <option value="">None</option>{cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
          </div>
          <label>Description</label><textarea rows="2" value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
          <label>Photo {form.imageUrl && <span className="muted">(leave empty to keep the current one)</span>}</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files[0] || null)} />
          <label>Sizes and prices</label>
          {form.sizes.map((s, i) => (
            <div className="row" key={i} style={{ marginBottom: '.3rem' }}>
              <input placeholder="Size name" value={s.name} onChange={(e) => set('sizes', form.sizes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input placeholder="Price" type="number" min="0" value={s.price} onChange={(e) => set('sizes', form.sizes.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} />
              <button className="btn small danger" style={{ flex: '0 0 auto' }} onClick={() => set('sizes', form.sizes.filter((_, j) => j !== i))}>Remove</button>
            </div>))}
          <button className="btn small outline" onClick={() => set('sizes', [...form.sizes, { name: '', price: '' }])}>Add size</button>
          <label className="check"><input type="checkbox" checked={form.isAvailable} onChange={(e) => set('isAvailable', e.target.checked)} />Available</label>
          <label className="check"><input type="checkbox" checked={form.isBestseller} onChange={(e) => set('isBestseller', e.target.checked)} />Best seller</label>
          <label className="check"><input type="checkbox" checked={form.allowToppings} onChange={(e) => set('allowToppings', e.target.checked)} />Allow extra toppings</label>
          <ErrorBox message={err} />
          <button className="btn" onClick={save}>Save</button>{' '}
          <button className="btn outline" onClick={() => setForm(null)}>Cancel</button>
        </div>)}

      {products.loading ? <Loading /> : products.data.length === 0 ? <div className="empty">No products yet.</div> : (
        <table>
          <thead><tr><th></th><th>Name</th><th>Category</th><th>From</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{products.data.map((p) => (
            <tr key={p.id}>
              <td>{p.imageUrl ? <img className="thumb" src={imgUrl(p.imageUrl)} alt="" /> : '🍕'}</td>
              <td>{p.name}{p.isBestseller && <> <span className="tag">Best</span></>}</td>
              <td>{p.categoryName || '-'}</td>
              <td>{money(p.sizes.length ? Math.min(...p.sizes.map((s) => s.price)) : p.basePrice)}</td>
              <td><span className="tag">{p.isAvailable ? 'Available' : 'Hidden'}</span></td>
              <td style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                <button className="btn small" onClick={() => edit(p)}>Edit</button>
                <button className="btn small outline" onClick={() => toggle(p)}>{p.isAvailable ? 'Mark unavailable' : 'Mark available'}</button>
                <button className="btn small danger" onClick={() => del(p)}>Delete</button>
              </td>
            </tr>))}</tbody>
        </table>)}
    </>
  );
}
