// Orders storage — file-based for dev, in-memory fallback for serverless
const fs = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

let _mem = []; // in-memory fallback

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode() {
  let code = '100B-';
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')) || [];
  } catch (e) {
    return [..._mem];
  }
}

function writeOrders(orders) {
  _mem = orders;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (e) {
    // serverless — only memory persists within instance
  }
}

function createOrder({ customer, delivery, items }) {
  const existing = readOrders();
  let code;
  do { code = generateCode(); } while (existing.some(o => o.code === code));

  const total = (items || []).reduce((s, i) => s + (Number(i.price) * Number(i.qty)), 0);
  const order = {
    code,
    status: 'pending',
    customer,
    delivery,
    items,
    total,
    createdAt: new Date().toISOString(),
  };

  writeOrders([order, ...existing]);
  return order;
}

function getOrderByCode(code) {
  return readOrders().find(o => o.code === (code || '').toUpperCase()) || null;
}

function getOrdersByEmail(email) {
  if (!email) return [];
  const lc = email.toLowerCase();
  return readOrders().filter(o => o.customer && (o.customer.email || '').toLowerCase() === lc);
}

module.exports = { createOrder, getOrderByCode, getOrdersByEmail, readOrders };
