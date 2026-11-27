import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth, useToast } from '../../state';
import { money } from '../../api';

export default function AdminLayout() {
  const { socket } = useAuth();
  const toast = useToast();
  const [newCount, setNewCount] = useState(0);
  // Real-time notification when a customer places an order.
  useEffect(() => {
    if (!socket) return undefined;
    const h = (o) => { setNewCount((n) => n + 1); toast(`New order #${o.id} from ${o.customerName} (${money(o.total)})`); window.dispatchEvent(new Event('admin:new-order')); };
    socket.on('order:new', h);
    return () => socket.off('order:new', h);
  }, [socket]);
  return (
    <div className="admin">
      <aside className="side">
        <NavLink to="/admin" end>Dashboard</NavLink>
        <NavLink to="/admin/orders" onClick={() => setNewCount(0)}>Orders {newCount > 0 && <span className="badge" style={{ background: 'var(--yellow)', color: 'var(--black)' }}>{newCount}</span>}</NavLink>
        <NavLink to="/admin/products">Products</NavLink>
        <NavLink to="/admin/slides">Hero slider</NavLink>
        <NavLink to="/admin/catalog">Categories, toppings, offers</NavLink>
      </aside>
      <div className="main"><Outlet /></div>
    </div>
  );
}
