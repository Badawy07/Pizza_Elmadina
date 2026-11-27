# Pizza El Madina (full stack)

Node/Express + MySQL backend, React (Vite) frontend. Field names are defined once in `API_CONTRACT.md`
(backend converts DB snake_case to camelCase in `backend/src/util.js`).

## Run
1. Start MySQL (8.x or MariaDB 10.5+).
2. Backend:
   ```
   cd backend
   cp .env.example .env      # set DB_PASSWORD and JWT_SECRET
   npm install
   npm run setup             # creates the database, tables, demo menu, and the admin user
   npm run dev               # http://localhost:4000
   ```
3. Frontend (second terminal):
   ```
   cd frontend
   npm install
   npm run dev               # http://localhost:5173 (proxies /api, /uploads, /socket.io to :4000)
   ```
4. Admin login: `admin@pizzaelmadina.com` / `Admin@12345` (change in `.env` before `npm run setup`). Customers register on the site.

For production set `VITE_API_ORIGIN` at frontend build time and `CLIENT_ORIGIN` in the backend `.env`.

## Rules enforced by the server
- Prices are always recomputed server-side from product, size, toppings and active offers; the client sends only ids and quantity.
- Unavailable products/toppings are rejected. Sizes must belong to the product.
- InstaPay orders stay `awaiting_verification` until an admin clicks "Verify transfer received". Cash becomes `paid` when the order is completed.
- Reviews: only the order owner, only when status is `completed`, one per order.
- Status flow: pending, confirmed, out_for_delivery (delivery only), completed; or cancelled.
