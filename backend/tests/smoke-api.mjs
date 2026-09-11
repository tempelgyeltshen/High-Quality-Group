/**
 * API smoke test for the POS backend.
 *
 * Usage:  node backend/tests/smoke-api.mjs [baseUrl]
 * Requires the dev server to be running (npm run dev at repo root,
 * or npm run dev inside backend/).
 *
 * Covers the checkout happy path (login -> product -> create sale ->
 * credit payment -> sale return), validation failures, and the report.
 */
const BASE = process.argv[2] || 'http://localhost:3000/api';

let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ok  - ${name}`);
  } else {
    failed++;
    console.log(`FAIL  - ${name}${detail ? ` :: ${detail}` : ''}`);
  }
}

async function req(path, { method = 'GET', token, body } = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* non-JSON */ }
    return { status: res.status, json };
  } catch (err) {
    return { status: 0, json: null, error: err?.cause?.code || err?.message || String(err) };
  }
}

const results = {};

// ---- 1. Health / SPA reachability -------------------------------------
console.log(`\n== Smoke testing ${BASE} ==`);
const root = await fetch(BASE.replace(/\/api$/, '/')).catch((e) => ({ ok: false, status: 0 }));
check('GET / serves the app', root.ok, `status ${root.status}`);

// ---- 2. Auth -----------------------------------------------------------
const badLogin = await req('/auth/login', { method: 'POST', body: { username: 'admin', password: 'wrong' } });
check('wrong password rejected with 401', badLogin.status === 401, `got ${badLogin.status}`);

const login = await req('/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin123' } });
check('admin login returns token + role', login.status === 200 && !!login.json.token && login.json.user?.role === 'admin');
results.token = login.json?.token;

const unauth = await req('/products', { method: 'GET' });
check('authenticated route blocked without token (401)', unauth.status === 401, `got ${unauth.status}`);

// ---- 3. Catalog --------------------------------------------------------
const products = await req('/products', { token: results.token });
check('products list is non-empty', Array.isArray(products.json) && products.json.length > 0);
results.product = products.json?.find((p) => p.stock_qty >= 3);
check('found a product with stock >= 3', !!results.product, JSON.stringify(results.product?.item_code));

// ---- 4. Checkout happy path -------------------------------------------
const sale = await req('/sales', {
  method: 'POST',
  token: results.token,
  body: {
    items: [{ item_code: results.product.item_code, product_name: results.product.product_name, quantity: 2, retail_price: results.product.retail_price }],
    total_amount: results.product.retail_price * 2,
    discount_applied: 0,
    net_amount: results.product.retail_price * 2 * 1.05,
    payment_method: 'Cash',
    customer_name: 'Smoke Tester',
  },
});
check('cash sale created (201)', sale.status === 201, `got ${sale.status} ${JSON.stringify(sale.json)}`);
results.sale = sale.json;

if (results.sale?.sale_no) {
  const fetched = await req(`/sales/${results.sale.sale_no}`, { token: results.token });
  check('sale retrievable by sale_no', fetched.status === 200 && fetched.json?.sale_no === results.sale.sale_no);
}

// ---- 5. Validation rejects bad payloads --------------------------------
const empty = await req('/sales', { method: 'POST', token: results.token, body: { items: [] } });
check('empty cart rejected with 400', empty.status === 400, `got ${empty.status}`);

const badQty = await req('/sales', {
  method: 'POST',
  token: results.token,
  body: { items: [{ item_code: 'nope', quantity: 0, retail_price: 1 }], total_amount: 0, discount_applied: 0, net_amount: 0, payment_method: 'Cash' },
});
check('invalid quantity rejected with 400', badQty.status === 400, `got ${badQty.status}`);

const oversell = await req('/sales', {
  method: 'POST',
  token: results.token,
  body: {
    items: [{ item_code: results.product.item_code, product_name: results.product.product_name, quantity: 99999, retail_price: results.product.retail_price }],
    total_amount: 1, discount_applied: 0, net_amount: 1, payment_method: 'Cash',
  },
});
check('oversell rejected with 400 (insufficient stock)', oversell.status === 400, `got ${oversell.status} ${JSON.stringify(oversell.json)}`);

// ---- 6. Credit payment + return flow -----------------------------------
const credit = await req('/sales', {
  method: 'POST',
  token: results.token,
  body: {
    items: [{ item_code: results.product.item_code, product_name: results.product.product_name, quantity: 1, retail_price: results.product.retail_price }],
    total_amount: results.product.retail_price,
    discount_applied: 0,
    net_amount: results.product.retail_price * 1.05,
    payment_method: 'Credit',
    customer_name: 'Credit Customer',
  },
});
check('credit sale created (201)', credit.status === 201, `got ${credit.status}`);
results.creditSale = credit.json;

if (results.creditSale?.sale_no) {
  const pay = await req(`/sales/${results.creditSale.sale_no}/payment`, { method: 'PUT', token: results.token });
  check('credit payment recorded', pay.status === 200, `got ${pay.status}`);

  const ret = await req(`/sales/${results.creditSale.sale_no}/return`, { method: 'PUT', token: results.token });
  check('sale return processed + restocked', ret.status === 200, `got ${ret.status} ${JSON.stringify(ret.json)}`);
}

// ---- 7. Day-end report --------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
const report = await req(`/sales/report/day-end?from=${today}&to=${today}`, { token: results.token });
check('day-end report aggregates', report.status === 200 && typeof report.json?.summary?.net_revenue === 'number', `got ${report.status}`);
check('report counts today\'s sales', report.json?.summary?.total_transactions >= 2, JSON.stringify(report.json?.summary));

console.log(`\n== ${passed} passed, ${failed} failed ==`);
process.exit(failed ? 1 : 0);
