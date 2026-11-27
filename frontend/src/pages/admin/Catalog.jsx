import { useState } from 'react';
import { useLoad, ErrorBox } from '../../components/Async';
import { api } from '../../api';

// Small CRUD block reused for categories, toppings and offers.
function Block({ title, listPath, path, fields, toBody, blank }) {
  const { data, error, reload } = useLoad(() => api.get(listPath));
  const [form, setForm] = useState({ ...blank });
  const [err, setErr] = useState('');
  const save = () => {
    setErr('');
    (form.id ? api.put(`${path}/${form.id}`, toBody(form)) : api.post(path, toBody(form)))
      .then(() => { setForm({ ...blank }); reload(); }).catch((e) => setErr(e.message));
  };
  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <h3>{title}</h3>
      <ErrorBox message={error || err} />
      <div className="row" style={{ alignItems: 'end' }}>
        {fields.map((f) => (
          <div key={f.key}><label>{f.label}</label>
            {f.type === 'check'
              ? <label className="check"><input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />Yes</label>
              : <input type={f.type || 'text'} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />}
          </div>))}
        <div style={{ flex: '0 0 auto' }}><button className="btn" onClick={save}>{form.id ? 'Update' : 'Add'}</button></div>
      </div>
      <table style={{ marginTop: '1rem' }}>
        <tbody>{(data || []).map((r) => (
          <tr key={r.id}>
            <td>{fields.map((f) => (f.type === 'check' ? (r[f.key] ? `${f.label}: yes` : `${f.label}: no`) : r[f.key])).join('  |  ')}</td>
            <td style={{ width: 140 }}>
              <button className="btn small" onClick={() => setForm({ ...r })}>Edit</button>{' '}
              <button className="btn small danger" onClick={() => window.confirm('Delete?') && api.del(`${path}/${r.id}`).then(reload).catch((e) => setErr(e.message))}>Delete</button>
            </td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

export default function AdminCatalog() {
  return (
    <>
      <h2 className="section-title">Categories, toppings and offers</h2>
      <Block title="Categories" listPath="/categories" path="/admin/categories" blank={{ name: '', sortOrder: 0 }}
        fields={[{ key: 'name', label: 'Name' }, { key: 'sortOrder', label: 'Order', type: 'number' }]}
        toBody={(f) => ({ name: f.name, sortOrder: f.sortOrder })} />
      <Block title="Extra toppings" listPath="/admin/toppings" path="/admin/toppings" blank={{ name: '', price: '', isAvailable: true }}
        fields={[{ key: 'name', label: 'Name' }, { key: 'price', label: 'Price', type: 'number' }, { key: 'isAvailable', label: 'Available', type: 'check' }]}
        toBody={(f) => ({ name: f.name, price: f.price, isAvailable: f.isAvailable })} />
      <Block title="Offers (percent discount on one product)" listPath="/admin/offers" path="/admin/offers" blank={{ title: '', description: '', productId: '', discountPercent: '', isActive: true }}
        fields={[{ key: 'title', label: 'Title' }, { key: 'description', label: 'Description' }, { key: 'productId', label: 'Product ID', type: 'number' }, { key: 'discountPercent', label: 'Discount %', type: 'number' }, { key: 'isActive', label: 'Active', type: 'check' }]}
        toBody={(f) => ({ title: f.title, description: f.description, productId: f.productId, discountPercent: f.discountPercent, isActive: f.isActive })} />
    </>
  );
}
