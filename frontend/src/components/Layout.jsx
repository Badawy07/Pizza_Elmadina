import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth, useCart } from '../state';

export default function Layout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return (
    <>
      <header className="nav">
        <div className="container">
          <Link to="/" className="logo">🍕 PIZZA EL MADINA</Link>
          <nav className="nav-links">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/menu">Menu</NavLink>
            <NavLink to="/offers">Offers</NavLink>
            <a href="/#about">About</a>
            <a href="/#contact">Contact</a>
          </nav>
          <div className="nav-right">
            <Link to="/cart" className="logo" aria-label="Cart">🛒 <span className="badge">{count}</span></Link>
            {user ? (
              <>
                {user.role === 'admin' ? <Link to="/admin" className="btn small">Admin</Link> : <Link to="/orders" className="btn small">My orders</Link>}
                <button className="btn small outline" onClick={logout}>Logout</button>
              </>
            ) : <Link to="/login" className="btn small">Login</Link>}
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="footer" id="contact">
        <div className="container row">
          <div><h3>Pizza El Madina</h3><p>Traditional Egyptian pizza, baked fresh every day.</p></div>
          <div><h3>Contact</h3><p>Phone: 0100 000 0000</p><p>Open daily 12:00 to 01:00</p></div>
          <div><h3>Order</h3><p>Pickup or delivery. Pay cash or InstaPay.</p></div>
        </div>
      </footer>
    </>
  );
}
