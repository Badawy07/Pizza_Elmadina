const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware/auth');
const { priceItems } = require('../pricing');
const { ApiError, ok, wrap } = require('../util');

const mapOrder = (o, items = [], review = null) => ({
  id: o.id, orderType: o.order_type, paymentMethod: o.payment_method, paymentStatus: o.payment_status,
  status: o.status, subtotal: o.subtotal, deliveryFee: o.delivery_fee, total: o.total, phone: o.phone,
  addressText: o.address_text, notes: o.notes, paymentReference: o.payment_reference, createdAt: o.created_at,
  customerName: o.customer_name, hasReview: !!(review ?? o.review_id),
  items: items.map((i) => ({
    id: i.id, productId: i.product_id, productName: i.product_name, sizeName: i.size_name,
    toppings: i.toppings_json ? JSON.parse(i.toppings_json) : [], instructions: i.instructions,
    unitPrice: i.unit_price, quantity: i.quantity, lineTotal: i.line_total,
  })),
});

async function loadOrders(where, args) {
  const [orders] = await db.query(`SELECT o.*, u.name AS customer_name, r.id AS review_id FROM orders o
    JOIN users u ON u.id=o.user_id LEFT JOIN reviews r ON r.order_id=o.id WHERE ${where} ORDER BY o.id DESC`, args);
  if (!orders.length) return [];
  const [items] = await db.query('SELECT * FROM order_items WHERE order_id IN (?)', [orders.map((o) => o.id)]);
  return orders.map((o) => mapOrder(o, items.filter((i) => i.order_id === o.id)));
}

router.post('/orders', auth, wrap(async (req, res) => {
  const { orderType, paymentMethod, phone, notes, items, addressId, address, saveAddress, paymentReference } = req.body;
  if (!['pickup', 'delivery'].includes(orderType)) throw new ApiError(400, 'orderType must be pickup or delivery');
  if (!['cash', 'instapay'].includes(paymentMethod)) throw new ApiError(400, 'paymentMethod must be cash or instapay');
  if (!phone || String(phone).length < 7) throw new ApiError(400, 'A phone number is required');

  const { lines, subtotal } = await priceItems(items);

  let addressText = null; let deliveryFee = 0;
  if (orderType === 'delivery') {
    let a = null;
    if (addressId) [[a]] = await db.query('SELECT * FROM addresses WHERE id=? AND user_id=?', [addressId, req.user.id]);
    else if (address?.line1 && address?.city) {
      a = address;
      if (saveAddress) await db.query('INSERT INTO addresses (user_id,label,line1,city,notes) VALUES (?,?,?,?,?)', [req.user.id, address.label || 'Home', address.line1, address.city, address.notes || null]);
    }
    if (!a) throw new ApiError(400, 'A delivery address is required');
    addressText = `${a.line1}, ${a.city}${a.notes ? ' (' + a.notes + ')' : ''}`;
    deliveryFee = Number(process.env.DELIVERY_FEE || 0);
  }
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;
  // InstaPay is NEVER marked paid here. It waits for an admin to verify the transfer manually.
  const paymentStatus = paymentMethod === 'instapay' ? 'awaiting_verification' : 'unpaid';

  const conn = await db.getConnection();
  let orderId;
  try {
    await conn.beginTransaction();
    const [r] = await conn.query(
      `INSERT INTO orders (user_id,order_type,payment_method,payment_status,subtotal,delivery_fee,total,phone,address_text,notes,payment_reference)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [req.user.id, orderType, paymentMethod, paymentStatus, subtotal, deliveryFee, total, phone, addressText, (notes || '').slice(0, 500) || null, (paymentReference || '').slice(0, 120) || null]);
    orderId = r.insertId;
    for (const l of lines) {
      await conn.query(
        `INSERT INTO order_items (order_id,product_id,product_name,size_name,toppings_json,instructions,unit_price,quantity,line_total)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [orderId, l.productId, l.productName, l.sizeName, JSON.stringify(l.toppings), l.instructions || null, l.unitPrice, l.quantity, l.lineTotal]);
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }

  const [order] = await loadOrders('o.id=?', [orderId]);
  req.app.get('io').to('admins').emit('order:new', order); // real-time notification for admin
  ok(res, order, 201);
}));

router.get('/orders', auth, wrap(async (req, res) => ok(res, await loadOrders('o.user_id=?', [req.user.id]))));

router.get('/orders/:id', auth, wrap(async (req, res) => {
  const [o] = await loadOrders('o.id=? AND o.user_id=?', [req.params.id, req.user.id]);
  if (!o) throw new ApiError(404, 'Order not found');
  ok(res, o);
}));

// Reviews: only the owner, only after the order is completed, one per order.
router.post('/orders/:id/review', auth, wrap(async (req, res) => {
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new ApiError(400, 'Rating must be 1 to 5');
  const [[o]] = await db.query('SELECT * FROM orders WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  if (!o) throw new ApiError(404, 'Order not found');
  if (o.status !== 'completed') throw new ApiError(403, 'You can review an order only after it is completed');
  const [[dup]] = await db.query('SELECT id FROM reviews WHERE order_id=?', [o.id]);
  if (dup) throw new ApiError(409, 'You already reviewed this order');
  await db.query('INSERT INTO reviews (order_id,user_id,rating,comment) VALUES (?,?,?,?)', [o.id, req.user.id, rating, String(req.body.comment || '').slice(0, 600) || null]);
  ok(res, { reviewed: true }, 201);
}));

module.exports = router;
module.exports.loadOrders = loadOrders;
