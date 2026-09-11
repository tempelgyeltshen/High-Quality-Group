/**
 * Production guard smoke test.
 *
 * Usage:  node backend/tests/guard-503.mjs [baseUrl]
 * Requires a production-mode server WITHOUT Firestore configured:
 *   NODE_ENV=production npm run dev   (from backend/) or repo root
 *
 * Verifies: reads degrade gracefully to the local store, writes are blocked
 * with 503 (LocalDbWriteProhibitedError), and validation still returns 400.
 */
const BASE = process.argv[2] || 'http://localhost:3000/api';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  cond ? (pass++, console.log(`  ok  - ${name}`)) : (fail++, console.log(`FAIL  - ${name}${detail ? ` :: ${detail}` : ''}`));
};

const req = async (path, opt = {}) => {
  try {
    const res = await fetch(BASE + path, {
      method: opt.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(opt.token ? { Authorization: `Bearer ${opt.token}` } : {}) },
      body: opt.body ? JSON.stringify(opt.body) : undefined,
    });
    let json = null; try { json = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, json };
  } catch (err) {
    return { status: 0, json: null, error: err?.cause?.code || err?.message || String(err) };
  }
};

// Reads must degrade gracefully in production fallback
const login = await req('/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin123' } });
check('login (read path) still works in prod fallback', login.status === 200, `got ${login.status}`);
const token = login.json?.token;

const products = await req('/products', { token });
check('products (read path) still works in prod fallback', products.status === 200 && Array.isArray(products.json), `got ${products.status}`);

// Writes must be blocked with 503
const saleBody = {
  items: [{ item_code: '900113', product_name: 'Bosch Armature', quantity: 1, retail_price: 1950 }],
  total_amount: 1950, discount_applied: 0, net_amount: 2047.5,
  payment_method: 'Cash', customer_name: 'Guard Test',
};

const sale = await req('/sales', { method: 'POST', token, body: saleBody });
check('cash sale BLOCKED with 503 in prod fallback', sale.status === 503, `got ${sale.status} ${JSON.stringify(sale.json)}`);
check('503 body explains the guard', !!sale.json?.error?.includes('ephemeral'), JSON.stringify(sale.json));

const credit = await req('/sales', { method: 'POST', token, body: { ...saleBody, payment_method: 'Credit' } });
check('credit sale also blocked with 503', credit.status === 503, `got ${credit.status}`);

// Validation errors must STILL be 400 (not masked as 503)
const invalid = await req('/sales', { method: 'POST', token, body: { items: [] } });
check('invalid payload still 400 (validation precedes guard)', invalid.status === 400, `got ${invalid.status}`);

// Admin catalog writes must also be blocked
// (unique code so the test is idempotent across runs)
const addProd = await req('/products', { method: 'POST', token, body: { item_code: `TEST-${Date.now()}`, product_name: 'Guard Test Product', retail_price: 1, stock_qty: 1 } });
check('inventory add BLOCKED with 503 in prod fallback', addProd.status === 503, `got ${addProd.status}`);

console.log(`\n== guard: ${pass} passed, ${fail} failed ==`);
process.exit(fail ? 1 : 0);
