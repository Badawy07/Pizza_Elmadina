// Shared helpers + the ONE place where DB rows become API objects (camelCase contract).
class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bool = (v) => v === true || v === 1 || v === '1' || v === 'true';

const mapProduct = (r) => ({
  id: r.id, categoryId: r.category_id, categoryName: r.category_name ?? null,
  name: r.name, description: r.description, basePrice: r.base_price, imageUrl: r.image_url,
  isAvailable: !!r.is_available, isBestseller: !!r.is_bestseller, allowToppings: !!r.allow_toppings,
  discountPercent: r.discount_percent || 0,
});
const mapSize = (r) => ({ id: r.id, name: r.name, price: r.price });
const mapTopping = (r) => ({ id: r.id, name: r.name, price: r.price, isAvailable: !!r.is_available });
const mapSlide = (r) => ({
  id: r.id, title: r.title, description: r.description, imageUrl: r.image_url, badge: r.badge,
  buttonText: r.button_text, buttonLink: r.button_link, isActive: !!r.is_active, sortOrder: r.sort_order,
});
const mapOffer = (r) => ({
  id: r.id, title: r.title, description: r.description, productId: r.product_id,
  discountPercent: r.discount_percent, isActive: !!r.is_active,
});
const mapUser = (r) => ({ id: r.id, name: r.name, email: r.email, phone: r.phone, role: r.role });
const mapAddress = (r) => ({ id: r.id, label: r.label, line1: r.line1, city: r.city, notes: r.notes });

module.exports = { ApiError, ok, wrap, bool, mapProduct, mapSize, mapTopping, mapSlide, mapOffer, mapUser, mapAddress };
