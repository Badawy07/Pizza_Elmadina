const jwt = require('jsonwebtoken');
const { ApiError } = require('../util');
const SECRET = process.env.JWT_SECRET || 'dev-secret';

const sign = (user) => jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
const verify = (token) => jwt.verify(token, SECRET);

function auth(req, _res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next(new ApiError(401, 'Login required'));
  try { req.user = verify(h.slice(7)); next(); } catch { next(new ApiError(401, 'Invalid or expired session')); }
}
function admin(req, res, next) {
  auth(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== 'admin') return next(new ApiError(403, 'Admin only'));
    next();
  });
}
module.exports = { sign, verify, auth, admin };
