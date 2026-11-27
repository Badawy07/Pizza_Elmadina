const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, auth } = require('../middleware/auth');
const { ApiError, ok, wrap, mapUser, mapAddress } = require('../util');

router.post('/auth/register', wrap(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password || password.length < 6) throw new ApiError(400, 'Name, email and a password of 6+ characters are required');
  const [[exists]] = await db.query('SELECT id FROM users WHERE email=?', [email]);
  if (exists) throw new ApiError(409, 'Email already registered');
  const hash = await bcrypt.hash(password, 10);
  const [r] = await db.query('INSERT INTO users (name,email,phone,password_hash) VALUES (?,?,?,?)', [name, email.toLowerCase(), phone || null, hash]);
  const [[u]] = await db.query('SELECT * FROM users WHERE id=?', [r.insertId]);
  ok(res, { token: sign(u), user: mapUser(u) }, 201);
}));

router.post('/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const [[u]] = await db.query('SELECT * FROM users WHERE email=?', [String(email || '').toLowerCase()]);
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) throw new ApiError(401, 'Wrong email or password');
  ok(res, { token: sign(u), user: mapUser(u) });
}));

router.get('/auth/me', auth, wrap(async (req, res) => {
  const [[u]] = await db.query('SELECT * FROM users WHERE id=?', [req.user.id]);
  if (!u) throw new ApiError(401, 'Account no longer exists');
  ok(res, mapUser(u));
}));

router.get('/addresses', auth, wrap(async (req, res) => {
  const [rows] = await db.query('SELECT * FROM addresses WHERE user_id=? ORDER BY id DESC', [req.user.id]);
  ok(res, rows.map(mapAddress));
}));
router.post('/addresses', auth, wrap(async (req, res) => {
  const { label, line1, city, notes } = req.body;
  if (!line1 || !city) throw new ApiError(400, 'Address line and city are required');
  const [r] = await db.query('INSERT INTO addresses (user_id,label,line1,city,notes) VALUES (?,?,?,?,?)', [req.user.id, label || 'Home', line1, city, notes || null]);
  const [[a]] = await db.query('SELECT * FROM addresses WHERE id=?', [r.insertId]);
  ok(res, mapAddress(a), 201);
}));
router.delete('/addresses/:id', auth, wrap(async (req, res) => {
  await db.query('DELETE FROM addresses WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
  ok(res, { deleted: true });
}));
module.exports = router;
