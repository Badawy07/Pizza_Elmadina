import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state';
import { ErrorBox } from '../components/Async';

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const u = mode === 'login' ? await login(f.email, f.password) : await register(f);
      nav(u.role === 'admin' ? '/admin' : '/menu');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="container section" style={{ maxWidth: 440 }}>
      <div className="card">
        <h2>{mode === 'login' ? 'Login' : 'Create account'}</h2>
        {mode === 'register' && (<>
          <label>Name</label><input value={f.name} onChange={set('name')} />
          <label>Phone</label><input value={f.phone} onChange={set('phone')} />
        </>)}
        <label>Email</label><input type="email" value={f.email} onChange={set('email')} />
        <label>Password</label><input type="password" value={f.password} onChange={set('password')} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <ErrorBox message={err} />
        <button className="btn" disabled={busy} onClick={submit}>{busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}</button>
        <p style={{ marginTop: '1rem' }}>
          <button className="chip" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
            {mode === 'login' ? 'New here? Create an account' : 'Have an account? Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
