const router = require('express').Router();
const db = require('../db');
const { admin } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { loadOrders } = require('./orders');
const { ApiError, ok, wrap, bool, mapProduct, mapSize, mapSlide, mapOffer, mapTopping } = require('../util');

router.use('/admin', admin);
const img = (req) => (req.file ? `/uploads/${req.file.filename}` : undefined);

/* ---------- Products ---------- */
router.get('/admin/products', wrap(async (_q, res) => {
  const [rows] = await db.query(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.id DESC`);
  const [sizes] = await db.query('SELECT * FROM product_sizes');
  ok(res, rows.map((p) => ({ ...mapProduct(p), sizes: sizes.filter((s) => s.product_id === p.id).map(mapSize) })));
}));

async function saveSizes(productId, raw) {
  if (raw === undefined) return;
  let sizes; try { sizes = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { throw new ApiError(400, 'sizes must be valid JSON'); }
  if (!Array.isArray(sizes)) throw new ApiError(400, 'sizes must be an array');
  for (const s of sizes) if (!s.name || !(Number(s.price) >= 0)) throw new ApiError(400, 'Each size needs a name and a price');
  await db.query('DELETE FROM product_sizes WHERE product_id=?', [productId]);
  for (const s of sizes) await db.query('INSERT INTO product_sizes (product_id,name,price) VALUES (?,?,?)', [productId, s.name, Number(s.price)]);
}

router.post('/admin/products', upload.single('image'), wrap(async (req, res) => {
  const b = req.body;
  if (!b.name || !(Number(b.basePrice) >= 0)) throw new ApiError(400, 'Name and a valid basePrice are required');
  const [r] = await db.query(
    'INSERT INTO products (category_id,name,description,base_price,image_url,is_available,is_bestseller,allow_toppings) VALUES (?,?,?,?,?,?,?,?)',
    [b.categoryId || null, b.name, b.description || null, Number(b.basePrice), img(req) || null,
     b.isAvailable === undefined ? 1 : +bool(b.isAvailable), +bool(b.isBestseller), b.allowToppings === undefined ? 1 : +bool(b.allowToppings)]);
  await saveSizes(r.insertId, b.sizes);
  ok(res, { id: r.insertId }, 201);
}));

router.put('/admin/products/:id', upload.single('image'), wrap(async (req, res) => {
  const b = req.body; const id = req.params.id;
  const [[p]] = await db.query('SELECT id FROM products WHERE id=?', [id]);
  if (!p) throw new ApiError(404, 'Product not found');
  const map = { categoryId: ['category_id', (v) => v || null], name: ['name', String], description: ['description', String],
    basePrice: ['base_price', Number], isAvailable: ['is_available', (v) => +bool(v)], isBestseller: ['is_bestseller', (v) => +bool(v)],
    allowToppings: ['allow_toppings', (v) => +bool(v)] };
  const sets = []; const args = [];
  for (const [k, [col, fn]] of Object.entries(map)) if (b[k] !== undefined) { sets.push(`${col}=?`); args.push(fn(b[k])); }
  if (img(req)) { sets.push('image_url=?'); args.push(img(req)); }
  if (sets.length) await db.query(`UPDATE products SET ${sets.join(',')} WHERE id=?`, [...args, id]);
  await saveSizes(id, b.sizes);
  ok(res, { id: +id });
}));

router.patch('/admin/products/:id/availability', wrap(async (req, res) => {
  await db.query('UPDATE products SET is_available=? WHERE id=?', [+bool(req.body.isAvailable), req.params.id]);
  ok(res, { id: +req.params.id, isAvailable: bool(req.body.isAvailable) });
}));
router.delete('/admin/products/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM products WHERE id=?', [req.params.id]); ok(res, { deleted: true });
}));

/* ---------- Categories ---------- */
router.post('/admin/categories', wrap(async (req, res) => {
  if (!req.body.name) throw new ApiError(400, 'name required');
  const [r] = await db.query('INSERT INTO categories (name,sort_order) VALUES (?,?)', [req.body.name, +req.body.sortOrder || 0]);
  ok(res, { id: r.insertId }, 201);
}));
router.put('/admin/categories/:id', wrap(async (req, res) => {
  await db.query('UPDATE categories SET name=?, sort_order=? WHERE id=?', [req.body.name, +req.body.sortOrder || 0, req.params.id]);
  ok(res, { id: +req.params.id });
}));
router.delete('/admin/categories/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM categories WHERE id=?', [req.params.id]); ok(res, { deleted: true });
}));

/* ---------- Toppings ---------- */
router.get('/admin/toppings', wrap(async (_q, res) => {
  const [rows] = await db.query('SELECT * FROM toppings ORDER BY name'); ok(res, rows.map(mapTopping));
}));
router.post('/admin/toppings', wrap(async (req, res) => {
  if (!req.body.name) throw new ApiError(400, 'name required');
  const [r] = await db.query('INSERT INTO toppings (name,price,is_available) VALUES (?,?,?)', [req.body.name, +req.body.price || 0, req.body.isAvailable === undefined ? 1 : +bool(req.body.isAvailable)]);
  ok(res, { id: r.insertId }, 201);
}));
router.put('/admin/toppings/:id', wrap(async (req, res) => {
  await db.query('UPDATE toppings SET name=?, price=?, is_available=? WHERE id=?', [req.body.name, +req.body.price || 0, +bool(req.body.isAvailable), req.params.id]);
  ok(res, { id: +req.params.id });
}));
router.delete('/admin/toppings/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM toppings WHERE id=?', [req.params.id]); ok(res, { deleted: true });
}));

/* ---------- Hero slides ---------- */
router.get('/admin/slides', wrap(async (_q, res) => {
  const [rows] = await db.query('SELECT * FROM slides ORDER BY sort_order, id'); ok(res, rows.map(mapSlide));
}));
router.post('/admin/slides', upload.single('image'), wrap(async (req, res) => {
  const b = req.body; if (!b.title) throw new ApiError(400, 'title required');
  const [r] = await db.query('INSERT INTO slides (title,description,image_url,badge,button_text,button_link,is_active,sort_order) VALUES (?,?,?,?,?,?,?,?)',
    [b.title, b.description || null, img(req) || null, b.badge || null, b.buttonText || 'Order Now', b.buttonLink || '/menu', b.isActive === undefined ? 1 : +bool(b.isActive), +b.sortOrder || 0]);
  ok(res, { id: r.insertId }, 201);
}));
router.put('/admin/slides/:id', upload.single('image'), wrap(async (req, res) => {
  const b = req.body; const sets = []; const args = [];
  const map = { title: ['title', String], description: ['description', String], badge: ['badge', String], buttonText: ['button_text', String],
    buttonLink: ['button_link', String], isActive: ['is_active', (v) => +bool(v)], sortOrder: ['sort_order', (v) => +v || 0] };
  for (const [k, [col, fn]] of Object.entries(map)) if (b[k] !== undefined) { sets.push(`${col}=?`); args.push(fn(b[k])); }
  if (img(req)) { sets.push('image_url=?'); args.push(img(req)); }
  if (sets.length) await db.query(`UPDATE slides SET ${sets.join(',')} WHERE id=?`, [...args, req.params.id]);
  ok(res, { id: +req.params.id });
}));
router.delete('/admin/slides/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM slides WHERE id=?', [req.params.id]); ok(res, { deleted: true });
}));

/* ---------- Offers ---------- */
router.get('/admin/offers', wrap(async (_q, res) => {
  const [rows] = await db.query('SELECT * FROM offers ORDER BY id DESC'); ok(res, rows.map(mapOffer));
}));
router.post('/admin/offers', wrap(async (req, res) => {
  const b = req.body; const d = +b.discountPercent;
  if (!b.title || !(d >= 0 && d <= 90)) throw new ApiError(400, 'title and discountPercent (0-90) required');
  const [r] = await db.query('INSERT INTO offers (title,description,product_id,discount_percent,is_active) VALUES (?,?,?,?,?)',
    [b.title, b.description || null, b.productId || null, d, b.isActive === undefined ? 1 : +bool(b.isActive)]);
  ok(res, { id: r.insertId }, 201);
}));
router.put('/admin/offers/:id', wrap(async (req, res) => {
  const b = req.body;
  await db.query('UPDATE offers SET title=?, description=?, product_id=?, discount_percent=?, is_active=? WHERE id=?',
    [b.title, b.description || null, b.productId || null, +b.discountPercent || 0, +bool(b.isActive), req.params.id]);
  ok(res, { id: +req.params.id });
}));
router.delete('/admin/offers/:id', wrap(async (req, res) => {
  await db.query('DELETE FROM offers WHERE id=?', [req.params.id]); ok(res, { deleted: true });
}));

/* ---------- Orders ---------- */
router.get('/admin/orders', wrap(async (req, res) => {
  const status = req.query.status;
  ok(res, status ? await loadOrders('o.status=?', [status]) : await loadOrders('1=1', []));
}));

const NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['out_for_delivery', 'completed', 'cancelled'], out_for_delivery: ['completed'], completed: [], cancelled: [] };
router.patch('/admin/orders/:id/status', wrap(async (req, res) => {
  const { status } = req.body;
  const [[o]] = await db.query('SELECT * FROM orders WHERE id=?', [req.params.id]);
  if (!o) throw new ApiError(404, 'Order not found');
  if (!NEXT[o.status].includes(status)) throw new ApiError(400, `Cannot change status from ${o.status} to ${status}`);
  if (status === 'out_for_delivery' && o.order_type !== 'delivery') throw new ApiError(400, 'Only delivery orders can be out for delivery');
  await db.query('UPDATE orders SET status=? WHERE id=?', [status, o.id]);
  // Cash is collected on handover, so a completed cash order is paid. InstaPay is NEVER auto-paid.
  if (status === 'completed' && o.payment_method === 'cash') await db.query("UPDATE orders SET payment_status='paid' WHERE id=?", [o.id]);
  const [order] = await loadOrders('o.id=?', [o.id]);
  req.app.get('io').to(`user:${o.user_id}`).emit('order:status', { id: o.id, status: order.status, paymentStatus: order.paymentStatus });
  ok(res, order);
}));
router.patch('/admin/orders/:id/payment', wrap(async (req, res) => {
  const { paymentStatus } = req.body;
  if (!['unpaid', 'awaiting_verification', 'paid'].includes(paymentStatus)) throw new ApiError(400, 'Invalid paymentStatus');
  await db.query('UPDATE orders SET payment_status=? WHERE id=?', [paymentStatus, req.params.id]);
  const [order] = await loadOrders('o.id=?', [req.params.id]);
  if (!order) throw new ApiError(404, 'Order not found');
  ok(res, order);
}));

/* ---------- Stats (sales = confirmed, out_for_delivery or completed orders) ---------- */
const SALE = "status IN ('confirmed','out_for_delivery','completed')";
router.get('/admin/stats/summary', wrap(async (_q, res) => {
  const [[r]] = await db.query(`SELECT
    COALESCE(SUM(total),0) totalSales, COUNT(*) totalOrders,
    COALESCE(SUM(CASE WHEN DATE(created_at)=CURDATE() THEN total END),0) today,
    COALESCE(SUM(CASE WHEN created_at >= DATE_FORMAT(NOW(),'%Y-%m-01') THEN total END),0) thisMonth,
    COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(DATE_FORMAT(NOW(),'%Y-%m-01'), INTERVAL 5 MONTH) THEN total END),0) sixMonths
    FROM orders WHERE ${SALE}`);
  const [[p]] = await db.query("SELECT COUNT(*) n FROM orders WHERE status='pending'");
  ok(res, { ...r, pendingOrders: p.n });
}));
router.get('/admin/stats/sales', wrap(async (req, res) => {
  const period = req.query.period || 'day';
  let sql;
  if (period === 'day') sql = `SELECT DATE_FORMAT(created_at,'%Y-%m-%d') label, SUM(total) total, COUNT(*) orders FROM orders WHERE ${SALE} AND created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY) GROUP BY label ORDER BY label`;
  else if (period === 'month') sql = `SELECT DATE_FORMAT(created_at,'%Y-%m') label, SUM(total) total, COUNT(*) orders FROM orders WHERE ${SALE} AND created_at >= DATE_SUB(DATE_FORMAT(NOW(),'%Y-%m-01'), INTERVAL 11 MONTH) GROUP BY label ORDER BY label`;
  else if (period === 'six_months') sql = `SELECT DATE_FORMAT(created_at,'%Y-%m') label, SUM(total) total, COUNT(*) orders FROM orders WHERE ${SALE} AND created_at >= DATE_SUB(DATE_FORMAT(NOW(),'%Y-%m-01'), INTERVAL 5 MONTH) GROUP BY label ORDER BY label`;
  else throw new ApiError(400, 'period must be day, month or six_months');
  const [rows] = await db.query(sql);
  ok(res, rows.map((r) => ({ label: r.label, total: Number(r.total), orders: r.orders })));
}));

module.exports = router;
