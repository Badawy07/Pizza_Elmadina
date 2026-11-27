import { useState } from 'react';
import { useLoad, Loading, ErrorBox } from '../../components/Async';
import { api, imgUrl } from '../../api';

const empty = { id: null, title: '', description: '', badge: '', buttonText: 'Order Now', buttonLink: '/menu', isActive: true, sortOrder: 0 };

export default function AdminSlides() {
  const { data, loading, error, reload } = useLoad(() => api.get('/admin/slides'));
  const [form, setForm] = useState(null);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setErr('');
    if (!form.title.trim()) return setErr('Title is required');
    const fd = new FormData();
    ['title', 'description', 'badge', 'buttonText', 'buttonLink', 'isActive', 'sortOrder'].forEach((k) => fd.append(k, form[k] ?? ''));
    if (file) fd.append('image', file);
    try {
      if (form.id) await api.putForm(`/admin/slides/${form.id}`, fd); else await api.postForm('/admin/slides', fd);
      setForm(null); reload();
    } catch (e) { setErr(e.message); }
  };
  const quick = (s, fields) => { const fd = new FormData(); Object.entries(fields).forEach(([k, v]) => fd.append(k, v)); return api.putForm(`/admin/slides/${s.id}`, fd).then(reload).catch((e) => setErr(e.message)); };
  const del = (s) => window.confirm('Delete this slide?') && api.del(`/admin/slides/${s.id}`).then(reload).catch((e) => setErr(e.message));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 className="section-title">Hero slider</h2>
        <div><button className="btn" onClick={() => { setForm({ ...empty }); setFile(null); setErr(''); }}>Add slide</button></div>
      </div>
      <p className="muted">Active slides appear on the homepage in order (lowest number first). With no active slides, a fallback hero is shown.</p>
      <ErrorBox message={error || (!form && err)} />
      {form && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>{form.id ? 'Edit slide' : 'New slide'}</h3>
          <label>Title</label><input value={form.title} onChange={(e) => set('title', e.target.value)} />
          <label>Description</label><input value={form.description || ''} onChange={(e) => set('description', e.target.value)} />
          <div className="row">
            <div><label>Badge (optional, e.g. -20%)</label><input value={form.badge || ''} onChange={(e) => set('badge', e.target.value)} /></div>
            <div><label>Button text</label><input value={form.buttonText} onChange={(e) => set('buttonText', e.target.value)} /></div>
            <div><label>Button destination</label><input value={form.buttonLink} onChange={(e) => set('buttonLink', e.target.value)} placeholder="/menu or /menu/product/2" /></div>
            <div><label>Order</label><input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} /></div>
          </div>
          <label>Image</label><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files[0] || null)} />
          <label className="check"><input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />Active</label>
          <ErrorBox message={err} />
          <button className="btn" onClick={save}>Save</button>{' '}<button className="btn outline" onClick={() => setForm(null)}>Cancel</button>
        </div>)}
      {loading ? <Loading /> : data.length === 0 ? <div className="empty">No slides yet.</div> : (
        <table>
          <thead><tr><th></th><th>Title</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{data.map((s) => (
            <tr key={s.id}>
              <td>{s.imageUrl ? <img className="thumb" src={imgUrl(s.imageUrl)} alt="" /> : '🍕'}</td>
              <td>{s.title}<div className="muted">{s.buttonText} to {s.buttonLink}</div></td>
              <td>
                <button className="btn small outline" onClick={() => quick(s, { sortOrder: s.sortOrder - 1 })}>Up</button>{' '}{s.sortOrder}{' '}
                <button className="btn small outline" onClick={() => quick(s, { sortOrder: s.sortOrder + 1 })}>Down</button>
              </td>
              <td><span className="tag">{s.isActive ? 'Active' : 'Hidden'}</span></td>
              <td style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
                <button className="btn small" onClick={() => { setForm({ ...s }); setFile(null); setErr(''); }}>Edit</button>
                <button className="btn small outline" onClick={() => quick(s, { isActive: !s.isActive })}>{s.isActive ? 'Deactivate' : 'Activate'}</button>
                <button className="btn small danger" onClick={() => del(s)}>Delete</button>
              </td>
            </tr>))}</tbody>
        </table>)}
    </>
  );
}
