require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { verify } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const io = new Server(server, { cors: { origin } });
app.set('io', io);

// Sockets: admins join "admins", customers join "user:<id>" (token required).
io.use((socket, next) => {
  try { socket.user = verify(socket.handshake.auth?.token); next(); } catch { next(new Error('unauthorized')); }
});
io.on('connection', (s) => {
  s.join(s.user.role === 'admin' ? 'admins' : `user:${s.user.id}`);
});

app.use(cors({ origin }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (_q, res) => res.json({ success: true, data: { status: 'ok' } }));
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/catalog'));
app.use('/api', require('./routes/orders'));
app.use('/api', require('./routes/admin'));

app.use('/api', (_q, _r, next) => next(Object.assign(new Error('Route not found'), { status: 404 })));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.name === 'MulterError' ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ success: false, error: { message: status === 500 ? 'Server error' : err.message } });
});

const port = process.env.PORT || 4000;
server.listen(port, () => console.log(`API running on http://localhost:${port}`));
