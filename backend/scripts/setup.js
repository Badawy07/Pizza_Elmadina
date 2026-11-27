// Creates the database, tables and demo data. Safe to re-run (seed only runs on an empty users table).
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

(async () => {
  const name = process.env.DB_NAME || 'pizza_el_madina';
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4`);
  await conn.query(`USE \`${name}\``);
  await conn.query(fs.readFileSync(path.join(__dirname, '../sql/schema.sql'), 'utf8'));

  const [[{ n }]] = await conn.query('SELECT COUNT(*) n FROM users');
  if (n === 0) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@12345', 10);
    await conn.query('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',
      ['Admin', process.env.ADMIN_EMAIL || 'admin@pizzaelmadina.com', hash, 'admin']);

    const cats = ['Pizza', 'Feteer', 'Sides', 'Drinks'];
    for (let i = 0; i < cats.length; i++) {
      await conn.query('INSERT INTO categories (name,sort_order) VALUES (?,?)', [cats[i], i]);
    }

    // [categoryId, name, description, basePrice, bestseller, allowToppings, sizes]
    const prods = [
      [1, 'Margherita', 'Tomato sauce, mozzarella and fresh basil on a thin crust.', 90, 1, 1, [['Small', 90], ['Medium', 120], ['Large', 150]]],
      [1, 'Pepperoni', 'Loaded with pepperoni and melted cheese.', 110, 1, 1, [['Small', 110], ['Medium', 145], ['Large', 180]]],
      [1, 'Mixed Cheese', 'Mozzarella, cheddar and roumi cheese.', 105, 0, 1, [['Small', 105], ['Medium', 135], ['Large', 170]]],
      [2, 'Sweet Feteer', 'Flaky feteer with honey and powdered sugar.', 70, 0, 0, [['Regular', 70]]],
      [3, 'French Fries', 'Crispy golden fries.', 30, 0, 0, [['Regular', 30], ['Large', 45]]],
      [4, 'Pepsi', 'Cold can.', 15, 0, 0, [['Can', 15]]],
    ];
    for (const [c, nme, d, p, best, top, sizes] of prods) {
      const [r] = await conn.query(
        'INSERT INTO products (category_id,name,description,base_price,is_bestseller,allow_toppings) VALUES (?,?,?,?,?,?)',
        [c, nme, d, p, best, top]);
      for (const [sn, sp] of sizes) {
        await conn.query('INSERT INTO product_sizes (product_id,name,price) VALUES (?,?,?)', [r.insertId, sn, sp]);
      }
    }
    for (const [t, p] of [['Extra Cheese', 15], ['Olives', 10], ['Mushrooms', 10], ['Peppers', 8], ['Sausage', 20]]) {
      await conn.query('INSERT INTO toppings (name,price) VALUES (?,?)', [t, p]);
    }
    await conn.query(
      'INSERT INTO slides (title,description,badge,button_text,button_link,sort_order) VALUES (?,?,?,?,?,?)',
      ['Best Seller: Pepperoni', 'Our most loved pizza, fresh from the oven.', 'Best Seller', 'Order Now', '/menu/product/2', 0]);
    await conn.query(
      'INSERT INTO slides (title,description,badge,button_text,button_link,sort_order) VALUES (?,?,?,?,?,?)',
      ['20% off Margherita', 'This week only. Add extra cheese for a little more.', '-20%', 'Get the Offer', '/menu/product/1', 1]);
    await conn.query(
      'INSERT INTO offers (title,description,product_id,discount_percent) VALUES (?,?,?,?)',
      ['Margherita Week', '20% off every Margherita size.', 1, 20]);
    console.log('Seeded demo data.');
  }
  console.log('Database ready:', name);
  await conn.end();
})().catch((e) => { console.error(e); process.exit(1); });
