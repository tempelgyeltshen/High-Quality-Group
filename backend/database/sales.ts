import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, runTransaction } from 'firebase/firestore';
import { isLocal, readMockDb, writeMockDb, firestore, setLocalFallback, assertLocalWritesAllowed } from './connection.js';

// --- SALES ---

const isNonNegativeNumber = (value: any): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/**
 * Validates an incoming sale payload before it is written to the database.
 * Returns an error message string, or null when the payload is well-formed.
 * This prevents half-written/corrupt sale records (missing financial fields,
 * null subtotals, etc.) from ever being persisted.
 */
export function validateSaleData(saleData: any): string | null {
  if (!saleData || typeof saleData !== 'object' || Array.isArray(saleData)) {
    return 'Sale payload must be an object';
  }

  const { items, total_amount, discount_applied, net_amount, payment_method, customer_name } = saleData;

  if (!Array.isArray(items) || items.length === 0) {
    return 'Cannot process an empty sale cart';
  }
  if (!isNonNegativeNumber(total_amount)) {
    return 'total_amount must be a non-negative number';
  }
  if (!isNonNegativeNumber(discount_applied)) {
    return 'discount_applied must be a non-negative number';
  }
  if (!isNonNegativeNumber(net_amount)) {
    return 'net_amount must be a non-negative number';
  }
  if (typeof payment_method !== 'string' || payment_method.trim() === '') {
    return 'payment_method is required';
  }
  if (customer_name !== undefined && typeof customer_name !== 'string') {
    return 'customer_name must be a string';
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const label = item && typeof item === 'object' && item.item_code ? `"${item.item_code}"` : `at index ${i}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return `Invalid line item at index ${i}`;
    }
    if (typeof item.item_code !== 'string' || item.item_code.trim() === '') {
      return `Line item ${label} is missing a valid item_code`;
    }
    if (typeof item.quantity !== 'number' || !Number.isFinite(item.quantity) || item.quantity <= 0) {
      return `Line item ${label} has an invalid quantity`;
    }
    if (!isNonNegativeNumber(item.retail_price)) {
      return `Line item ${label} has an invalid retail_price`;
    }
  }

  return null;
}

export async function createSale(saleData: any): Promise<any> {
  const validationError = validateSaleData(saleData);
  if (validationError) {
    throw new Error(validationError);
  }

  const { items, total_amount, discount_applied, net_amount, payment_method, customer_name } = saleData;

  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = Math.floor(1000 + Math.random() * 9000);
  const sale_no = `SL-${timestamp}-${rand}`;
  const transaction_date = new Date().toISOString();
  const nameToSave = customer_name || 'Walk-In Customer';
  const isCredit = payment_method === 'Credit';
  const statusToSave = isCredit ? 'unpaid' : 'completed';
  const paidAmtToSave = isCredit ? 0 : net_amount;

  const formatItems = (rawItems: any[]) =>
    rawItems.map((it: any) => ({
      item_code: it.item_code,
      product_name: it.product_name || '',
      quantity: it.quantity,
      unit_price: it.retail_price,
      subtotal: it.retail_price * it.quantity,
    }));

  const buildSaleDoc = () => ({
    sale_no,
    transaction_date,
    total_amount,
    discount_applied,
    net_amount,
    payment_method,
    customer_name: nameToSave,
    paid_amount: paidAmtToSave,
    status: statusToSave,
    items: formatItems(items),
  });

  if (isLocal()) {
    assertLocalWritesAllowed('createSale');
    const db = readMockDb();
    for (const item of items) {
      const prod = db.products[item.item_code];
      if (!prod) {
        throw new Error(`Product "${item.item_code}" not found in inventory`);
      }
      const available = prod.stock_qty || 0;
      if (available < item.quantity) {
        throw new Error(`Insufficient stock for ${prod.product_name || item.item_code}: available ${available}, requested ${item.quantity}`);
      }
    }
    for (const item of items) {
      db.products[item.item_code].stock_qty = Math.max(0, (db.products[item.item_code].stock_qty || 0) - item.quantity);
    }
    const saleDocData = buildSaleDoc();
    db.sales[sale_no] = saleDocData;
    writeMockDb(db);
    return saleDocData;
  }

  try {
    const saleDocRef = doc(firestore, 'sales', sale_no);
    await runTransaction(firestore, async (transaction: any) => {
      const productRefsAndQty: { ref: any; currentQty: number; deductQty: number }[] = [];
      for (const item of items) {
        const prodRef = doc(firestore, 'products', item.item_code);
        const prodDoc = await transaction.get(prodRef);
        const currentQty = prodDoc.exists() ? (prodDoc.data()?.stock_qty || 0) : 0;
        if (!prodDoc.exists()) {
          throw new Error(`Product "${item.item_code}" not found in inventory`);
        }
        if (currentQty < item.quantity) {
          throw new Error(`Insufficient stock for ${item.item_code}: available ${currentQty}, requested ${item.quantity}`);
        }
        productRefsAndQty.push({ ref: prodRef, currentQty, deductQty: item.quantity });
      }
      for (const prod of productRefsAndQty) {
        transaction.update(prod.ref, { stock_qty: prod.currentQty - prod.deductQty });
      }
      transaction.set(saleDocRef, buildSaleDoc());
    });

    return {
      sale_no, transaction_date, total_amount, discount_applied,
      net_amount, payment_method, customer_name: nameToSave,
      paid_amount: paidAmtToSave, status: statusToSave, items,
    };
  } catch (err: any) {
    // Business-rule failures (unknown product / insufficient stock) must surface to
    // the client as-is instead of silently switching the whole app to the local DB.
    const message = err?.message || '';
    if (message.includes('Insufficient stock') || message.includes('not found in inventory')) {
      throw err;
    }
    console.warn('Firestore createSale failed, using local fallback:', err);
    setLocalFallback(true);
    return createSale(saleData);
  }
}

export async function getSaleByNo(saleNo: string): Promise<any | null> {
  if (isLocal()) {
    const db = readMockDb();
    return db.sales[saleNo] || null;
  }

  try {
    const saleDoc = await getDoc(doc(firestore, 'sales', saleNo));
    return saleDoc.exists() ? saleDoc.data() : null;
  } catch (err) {
    console.warn(`Firestore getSaleByNo failed for ${saleNo}, using local fallback:`, err);
    setLocalFallback(true);
    return getSaleByNo(saleNo);
  }
}

export async function getSales(from?: string, to?: string): Promise<any[]> {
  const sortByDateDesc = (list: any[]) =>
    list.sort((a: any, b: any) => b.transaction_date.localeCompare(a.transaction_date));

  if (isLocal()) {
    const db = readMockDb();
    let sales = Object.values(db.sales);
    if (from && to) {
      const fromStr = `${from}T00:00:00.000Z`;
      const toStr = `${to}T23:59:59.999Z`;
      sales = sales.filter((s: any) => s.transaction_date >= fromStr && s.transaction_date <= toStr);
    }
    return sortByDateDesc(sales);
  }

  try {
    let q: any = collection(firestore, 'sales');
    if (from && to) {
      const fromStr = `${from}T00:00:00.000Z`;
      const toStr = `${to}T23:59:59.999Z`;
      q = query(q, where('transaction_date', '>=', fromStr), where('transaction_date', '<=', toStr));
    }
    const snap = await getDocs(q);
    const list: any[] = [];
    snap.forEach((docSnap: any) => list.push(docSnap.data()));
    return sortByDateDesc(list);
  } catch (err) {
    console.warn('Firestore getSales failed, using local fallback:', err);
    setLocalFallback(true);
    return getSales(from, to);
  }
}

export async function recordCreditPayment(saleNo: string): Promise<boolean> {
  if (isLocal()) {
    assertLocalWritesAllowed('recordCreditPayment');
    const db = readMockDb();
    const sale = db.sales[saleNo];
    if (!sale) return false;
    sale.status = 'paid';
    sale.paid_amount = sale.net_amount || 0;
    writeMockDb(db);
    return true;
  }

  try {
    const saleRef = doc(firestore, 'sales', saleNo);
    const saleDoc = await getDoc(saleRef);
    if (!saleDoc.exists()) return false;
    const data = saleDoc.data();
    await updateDoc(saleRef, { status: 'paid', paid_amount: data?.net_amount || 0 });
    return true;
  } catch (err) {
    console.warn('Firestore recordCreditPayment failed, using local fallback:', err);
    setLocalFallback(true);
    return recordCreditPayment(saleNo);
  }
}

export async function processSaleReturn(saleNo: string): Promise<boolean> {
  if (isLocal()) {
    assertLocalWritesAllowed('processSaleReturn');
    const db = readMockDb();
    const sale = db.sales[saleNo];
    if (!sale || sale.status === 'returned') return false;
    for (const item of sale.items || []) {
      const prod = db.products[item.item_code];
      if (prod) prod.stock_qty = (prod.stock_qty || 0) + item.quantity;
    }
    sale.status = 'returned';
    writeMockDb(db);
    return true;
  }

  try {
    const saleRef = doc(firestore, 'sales', saleNo);
    const saleDoc = await getDoc(saleRef);
    if (!saleDoc.exists()) return false;
    const data = saleDoc.data();
    if (data?.status === 'returned') return false;
    const items = data?.items || [];

    await runTransaction(firestore, async (transaction: any) => {
      for (const item of items) {
        const prodRef = doc(firestore, 'products', item.item_code);
        const prodDoc = await transaction.get(prodRef);
        const currentQty = prodDoc.exists() ? (prodDoc.data()?.stock_qty || 0) : 0;
        transaction.update(prodRef, { stock_qty: currentQty + item.quantity });
      }
      transaction.update(saleRef, { status: 'returned' });
    });

    return true;
  } catch (err) {
    console.warn('Firestore processSaleReturn failed, using local fallback:', err);
    setLocalFallback(true);
    return processSaleReturn(saleNo);
  }
}
