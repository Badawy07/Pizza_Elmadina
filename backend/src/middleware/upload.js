const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { ApiError } = require('../util');

module.exports = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../../uploads'),
    filename: (_r, f, cb) => cb(null, crypto.randomUUID() + path.extname(f.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_r, f, cb) =>
    /^image\/(jpeg|png|webp)$/.test(f.mimetype) ? cb(null, true) : cb(new ApiError(400, 'Only JPG, PNG or WEBP images are allowed')),
});
