/**
 * One-off cleanup: removes smoke-test residue from backend/mock_db.json.
 * - Deletes the TEST-* product accidentally created by a guard-test run
 * - Deletes sales created by smoke/guard runs (Smoke Tester / Guard Test /
 *   Credit Customer) and restores their stock quantities
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(here, '..', 'mock_db.json');

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let removedProducts = 0;
for (const code of Object.keys(db.products)) {
  if (code.startsWith('TEST-')) {
    delete db.products[code];
    removedProducts++;
  }
}

const TEST_CUSTOMERS = new Set(['Smoke Tester', 'Guard Test', 'Credit Customer']);
let removedSales = 0;
for (const [saleNo, sale] of Object.entries(db.sales)) {
  if (TEST_CUSTOMERS.has(sale.customer_name)) {
    // Restore stock that the sale deducted
    for (const item of sale.items || []) {
      const prod = db.products[item.item_code];
      if (prod) prod.stock_qty = (prod.stock_qty || 0) + item.quantity;
    }
    delete db.sales[saleNo];
    removedSales++;
  }
}

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Cleanup done: removed ${removedProducts} TEST-* product(s), ${removedSales} test sale(s), stock restored.`);
