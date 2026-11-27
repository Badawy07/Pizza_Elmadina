// Server-side pricing. The frontend NEVER sends prices; only ids, quantity and instructions.
const db = require('./db');
const { ApiError } = require('./util');

async function priceItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(400, 'Cart is empty');
  const lines = [];
  for (const it of items) {
    const qty = Number(it.quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new ApiError(400, 'Invalid quantity');
    const [[p]] = await db.query('SELECT * FROM products WHERE id=?', [it.productId]);
    if (!p) throw new ApiError(400, `Product ${it.productId} not found`);
    if (!p.is_available) throw new ApiError(400, `${p.name} is currently unavailable`);

    const [sizes] = await db.query('SELECT * FROM product_sizes WHERE product_id=?', [p.id]);
    let size = null; let sizePrice = p.base_price;
    if (sizes.length) {
      size = sizes.find((s) => s.id === Number(it.sizeId));
      if (!size) throw new ApiError(400, `Please choose a valid size for ${p.name}`);
      sizePrice = size.price;
    }
    const [[offer]] = await db.query(
      'SELECT MAX(discount_percent) d FROM offers WHERE is_active=1 AND product_id=?', [p.id]);
    const discount = offer?.d || 0;
    sizePrice = Math.round(sizePrice * (100 - discount)) / 100;

    const ids = [...new Set((it.toppingIds || []).map(Number))];
    let toppings = [];
    if (ids.length) {
      if (!p.allow_toppings) throw new ApiError(400, `${p.name} does not accept toppings`);
      const [rows] = await db.query('SELECT * FROM toppings WHERE id IN (?) AND is_available=1', [ids]);
      if (rows.length !== ids.length) throw new ApiError(400, 'A selected topping is unavailable');
      toppings = rows;
    }
    const unitPrice = sizePrice + toppings.reduce((s, t) => s + t.price, 0);
    lines.push({
      productId: p.id, productName: p.name, imageUrl: p.image_url,
      sizeId: size?.id ?? null, sizeName: size?.name ?? null,
      toppings: toppings.map((t) => ({ id: t.id, name: t.name, price: t.price })),
      instructions: String(it.instructions || '').slice(0, 300),
      quantity: qty, unitPrice, lineTotal: Math.round(unitPrice * qty * 100) / 100,
    });
  }
  const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
  return { lines, subtotal };
}
module.exports = { priceItems };
