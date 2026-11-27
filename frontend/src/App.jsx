import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Menu from './pages/Menu';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Orders from './pages/Orders';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminSlides from './pages/admin/Slides';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCatalog from './pages/admin/Catalog';
import { useAuth } from './state';

function RequireAuth({ admin }) {
  const { user, ready } = useAuth();
  if (!ready) return <div className="container section">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/offers" element={<Menu offersOnly />} />
        <Route path="/menu/product/:productId" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
        </Route>
        <Route element={<RequireAuth admin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="slides" element={<AdminSlides />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="catalog" element={<AdminCatalog />} />
          </Route>
        </Route>
        <Route path="*" element={<div className="container section"><div className="empty">Page not found</div></div>} />
      </Route>
    </Routes>
  );
}
