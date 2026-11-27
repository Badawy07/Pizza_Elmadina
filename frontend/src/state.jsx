import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { api, getToken } from './api';

/* ---------- Toast ---------- */
const ToastCtx = createContext();
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, action) => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <span>{t.message}</span>
            {t.action}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Auth + socket ---------- */
const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    api.get('/auth/me').then(setUser).catch(() => localStorage.removeItem('token')).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!user) { setSocket(null); return undefined; }
    const s = io({ auth: { token: getToken() } });
    setSocket(s);
    return () => s.disconnect();
  }, [user]);

  const login = async (email, password) => {
    const d = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', d.token); setUser(d.user); return d.user;
  };
  const register = async (form) => {
    const d = await api.post('/auth/register', form);
    localStorage.setItem('token', d.token); setUser(d.user); return d.user;
  };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  return <AuthCtx.Provider value={{ user, ready, socket, login, register, logout }}>{children}</AuthCtx.Provider>;
}

/* ---------- Cart (stores choices only; prices always come from the server) ---------- */
const CartCtx = createContext();
export const useCart = () => useContext(CartCtx);
const keyOf = (i) => [i.productId, i.sizeId ?? 'x', [...i.toppingIds].sort().join('-'), i.instructions.trim().toLowerCase()].join('|');

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => { try { return JSON.parse(localStorage.getItem('cart')) || []; } catch { return []; } });
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; } localStorage.setItem('cart', JSON.stringify(items)); }, [items]);

  // Same product with a different size/toppings/instructions = a different cart line.
  const add = (item) => setItems((cur) => {
    const key = keyOf(item);
    const hit = cur.find((c) => c.key === key);
    if (hit) return cur.map((c) => (c.key === key ? { ...c, quantity: Math.min(50, c.quantity + item.quantity) } : c));
    return [...cur, { ...item, key }];
  });
  const setQty = (key, q) => setItems((cur) => cur.map((c) => (c.key === key ? { ...c, quantity: Math.max(1, Math.min(50, q)) } : c)));
  const remove = (key) => setItems((cur) => cur.filter((c) => c.key !== key));
  const clear = () => setItems([]);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  return <CartCtx.Provider value={{ items, add, setQty, remove, clear, count }}>{children}</CartCtx.Provider>;
}
