const router = require('express').Router();
const db = require('../db');
const { priceItems } = require('../pricing');
const { ok, wrap, ApiError, mapProduct, mapSize, mapTopping, mapSlide, mapOffer } = require('../util');

const PRODUCT_SQL = `SELECT p.*, c.name AS category_name,
  (SELECT MAX(o.discount_percent) FROM offers o WHERE o.product_id=p.id AND o.is_active=1) AS discount_percent
  FROM products p LEFT JOIN categories c ON c.id=p.category_id`;

router.get('/categories', wrap(async (_q, res) => {
  const [rows] = await db.query('SELECT * FROM categories ORDER BY sort_order, id');
  ok(res, rows.map((r) => ({ id: r.id, name: r.name, sortOrder: r.sort_order })));
}));

// Customers see only available products. ?categoryId= & ?bestseller=true
router.get('/products', wrap(async (req, res) => {
  const where = ['p.is_available=1']; const args = [];
  if (req.query.categoryId) { where.push('p.category_id=?'); args.push(req.query.categoryId); }
  if (req.query.bestseller === 'true') where.push('p.is_bestseller=1');
  const [rows] = await db.query(`${PRODUCT_SQL} WHERE ${where.join(' AND ')} ORDER BY p.id`, args);
  ok(res, rows.map(mapProduct));
}));

router.get('/products/:id', wrap(async (req, res) => {
  const [[p]] = await db.query(`${PRODUCT_SQL} WHERE p.id=?`, [req.params.id]);
  if (!p) throw new ApiError(404, 'Product not found');
  const [sizes] = await db.query('SELECT * FROM product_sizes WHERE product_id=? ORDER BY price', [p.id]);
  const [tops] = p.allow_toppings ? await db.query('SELECT * FROM toppings WHERE is_available=1 ORDER BY name') : [[]];
  ok(res, { ...mapProduct(p), sizes: sizes.map(mapSize), toppings: tops.map(mapTopping) });
}));

router.get('/homepage/slides', wrap(async (_q, res) => {
  const [rows] = await db.query('SELECT * FROM slides WHERE is_active=1 ORDER BY sort_order, id');
  ok(res, rows.map(mapSlide));
}));
router.get('/settings', (_q, res) => ok(res, { deliveryFee: Number(process.env.DELIVERY_FEE || 0), instapayHandle: process.env.INSTAPAY_HANDLE || 'pizzaelmadina@instapay' }));
router.get('/offers', wrap(async (_q, res) => {
  const [rows] = await db.query('SELECT * FROM offers WHERE is_active=1 ORDER BY id DESC');
  ok(res, rows.map(mapOffer));
}));

router.get('/reviews', wrap(async (_q, res) => {
  const [rows] = await db.query(`SELECT r.id, r.rating, r.comment, r.created_at, u.name FROM reviews r
    JOIN users u ON u.id=r.user_id ORDER BY r.id DESC LIMIT 12`);
  ok(res, rows.map((r) => ({ id: r.id, rating: r.rating, comment: r.comment, customerName: r.name, createdAt: r.created_at })));
}));

// Price a cart on the server (used by the cart page). Body: { items:[{productId,sizeId,toppingIds,quantity,instructions}] }
router.post('/cart/quote', wrap(async (req, res) => {
  const { lines, subtotal } = await priceItems(req.body.items);
  ok(res, { lines, subtotal });
}));
module.exports = router;
