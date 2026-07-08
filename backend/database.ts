import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit, 
  runTransaction 
} from 'firebase/firestore';
import crypto from 'crypto';

// Flag to track whether we should use local database fallback
let useLocalFallback = false;

// Load Firebase configuration
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Error parsing firebase-applet-config.json:', err);
  }
}

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Initialize firebase SDK with safety fallback
export let firestore: any = null;

try {
  const app = initializeApp(firebaseConfig);
  firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('Firebase initialization failed. Falling back to local database file.', err);
  useLocalFallback = true;
}

// --- LOCAL DB FALLBACK SYSTEM (mock_db.json) ---

interface LocalDB {
  users: Record<string, any>;
  products: Record<string, any>;
  employees: Record<string, any>;
  sales: Record<string, any>;
}

const mockDbPath = path.resolve(process.cwd(), 'mock_db.json');

function readMockDb(): LocalDB {
  try {
    if (fs.existsSync(mockDbPath)) {
      return JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading mock_db.json:', err);
  }

  // Create default seeded mock DB
  const defaultDb: LocalDB = {
    users: {
      admin: { id: 1, username: 'admin', password_hash: hashPassword('admin123'), role: 'admin' },
      cashier: { id: 2, username: 'cashier', password_hash: hashPassword('cashier123'), role: 'cashier' }
    },
    products: {
      '900113': { item_code: '900113', product_name: 'Bosch Armature GWS 6-100', retail_price: 1950, stock_qty: 15 },
      '900114': { item_code: '900114', product_name: 'Bosch Carbon Brush', retail_price: 180, stock_qty: 50 },
      '900115': { item_code: '900115', product_name: 'Makita Angle Grinder 4"', retail_price: 3200, stock_qty: 8 },
      '880120': { item_code: '880120', product_name: 'Dewalt Cordless Drill 18V', retail_price: 4500, stock_qty: 12 },
      '880121': { item_code: '880121', product_name: 'Screwdriver Set 6pcs', retail_price: 650, stock_qty: 25 },
      '501221': { item_code: '501221', product_name: 'WD-40 Multi-Use Spray 400ml', retail_price: 420, stock_qty: 40 },
      '302450': { item_code: '302450', product_name: 'Measuring Tape 5m Heavy Duty', retail_price: 250, stock_qty: 30 }
    },
    employees: {
      'HQG-BLHT-T001': { employee_code: 'HQG-BLHT-T001', employee_name: 'Dorji', discount_rate: 0.20 },
      'EMP102': { employee_code: 'EMP102', employee_name: 'Karma', discount_rate: 0.20 },
      'EMP103': { employee_code: 'EMP103', employee_name: 'Pema', discount_rate: 0.15 }
    },
    sales: {}
  };

  writeMockDb(defaultDb);
  return defaultDb;
}

function writeMockDb(data: LocalDB) {
  try {
    fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing mock_db.json:', err);
  }
}

// Validate connection and seed initial collections if empty
export async function initDatabase(): Promise<void> {
  if (useLocalFallback || !firestore) {
    console.log('Firestore is offline or bypassed. Initializing local database file fallback...');
    readMockDb(); // Ensure local file exists and is seeded
    console.log('Local fallback database initialized successfully.');
    return;
  }

  console.log('Validating Firestore connection...');
  try {
    // Run a quick query to test connectivity
    await getDocs(query(collection(firestore, 'users'), limit(1)));
    console.log('Firestore connection verified successfully.');
  } catch (err) {
    console.warn('Error connecting to Firestore. Activating local database fallback:', err);
    useLocalFallback = true;
    readMockDb();
    return;
  }

  try {
    // 1. Check and Seed Users (Individually check to avoid partial or missing seed issues)
    const adminDoc = await getDoc(doc(firestore, 'users', 'admin'));
    if (!adminDoc.exists()) {
      console.log('Seeding default admin user in Firestore...');
      await setDoc(doc(firestore, 'users', 'admin'), {
        id: 1,
        username: 'admin',
        password_hash: hashPassword('admin123'),
        role: 'admin'
      });
    }

    const cashierDoc = await getDoc(doc(firestore, 'users', 'cashier'));
    if (!cashierDoc.exists()) {
      console.log('Seeding default cashier user in Firestore...');
      await setDoc(doc(firestore, 'users', 'cashier'), {
        id: 2,
        username: 'cashier',
        password_hash: hashPassword('cashier123'),
        role: 'cashier'
      });
    }

    // 2. Check and Seed Products (Verify each product individually)
    const defaultProducts = [
      { item_code: '900113', product_name: 'Bosch Armature GWS 6-100', retail_price: 1950, stock_qty: 15 },
      { item_code: '900114', product_name: 'Bosch Carbon Brush', retail_price: 180, stock_qty: 50 },
      { item_code: '900115', product_name: 'Makita Angle Grinder 4"', retail_price: 3200, stock_qty: 8 },
      { item_code: '880120', product_name: 'Dewalt Cordless Drill 18V', retail_price: 4500, stock_qty: 12 },
      { item_code: '880121', product_name: 'Screwdriver Set 6pcs', retail_price: 650, stock_qty: 25 },
      { item_code: '501221', product_name: 'WD-40 Multi-Use Spray 400ml', retail_price: 420, stock_qty: 40 },
      { item_code: '302450', product_name: 'Measuring Tape 5m Heavy Duty', retail_price: 250, stock_qty: 30 }
    ];

    for (const p of defaultProducts) {
      const pDoc = await getDoc(doc(firestore, 'products', p.item_code));
      if (!pDoc.exists()) {
        await setDoc(doc(firestore, 'products', p.item_code), p);
      }
    }

    // 3. Check and Seed Employees (Verify each employee individually)
    const defaultEmployees = [
      { employee_code: 'HQG-BLHT-T001', employee_name: 'Dorji', discount_rate: 0.20 },
      { employee_code: 'EMP102', employee_name: 'Karma', discount_rate: 0.20 },
      { employee_code: 'EMP103', employee_name: 'Pema', discount_rate: 0.15 }
    ];

    for (const emp of defaultEmployees) {
      const empDoc = await getDoc(doc(firestore, 'employees', emp.employee_code));
      if (!empDoc.exists()) {
        await setDoc(doc(firestore, 'employees', emp.employee_code), emp);
      }
    }
    console.log('Database verification and individual seeding completed successfully.');
  } catch (seedErr) {
    console.error('Error seeding Firestore collections. Falling back to local DB:', seedErr);
    useLocalFallback = true;
    readMockDb();
  }
}

// --- PRODUCTS HELPERS ---

export async function getProducts(): Promise<any[]> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    const list = Object.values(db.products);
    list.sort((a, b) => a.product_name.localeCompare(b.product_name));
    return list;
  }

  try {
    const snap = await getDocs(collection(firestore, 'products'));
    const list: any[] = [];
    snap.forEach((docSnap: any) => {
      list.push(docSnap.data());
    });
    list.sort((a, b) => a.product_name.localeCompare(b.product_name));
    return list;
  } catch (err) {
    console.warn('Firestore getProducts failed, using local fallback:', err);
    useLocalFallback = true;
    return getProducts();
  }
}

export async function getProductByCode(code: string): Promise<any | null> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    return db.products[code] || null;
  }

  try {
    const docSnap = await getDoc(doc(firestore, 'products', code));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    console.warn(`Firestore getProductByCode failed for ${code}, using local fallback:`, err);
    useLocalFallback = true;
    return getProductByCode(code);
  }
}

export async function addProduct(p: any): Promise<void> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    db.products[p.item_code] = p;
    writeMockDb(db);
    return;
  }

  try {
    await setDoc(doc(firestore, 'products', p.item_code), p);
  } catch (err) {
    console.warn('Firestore addProduct failed, using local fallback:', err);
    useLocalFallback = true;
    await addProduct(p);
  }
}

export async function updateProduct(code: string, updates: any): Promise<boolean> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    if (!db.products[code]) return false;
    db.products[code] = { ...db.products[code], ...updates };
    writeMockDb(db);
    return true;
  }

  try {
    const docRef = doc(firestore, 'products', code);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.warn('Firestore updateProduct failed, using local fallback:', err);
    useLocalFallback = true;
    return updateProduct(code, updates);
  }
}

export async function deleteProduct(code: string): Promise<boolean> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    if (!db.products[code]) return false;
    delete db.products[code];
    writeMockDb(db);
    return true;
  }

  try {
    const docRef = doc(firestore, 'products', code);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn('Firestore deleteProduct failed, using local fallback:', err);
    useLocalFallback = true;
    return deleteProduct(code);
  }
}

// --- EMPLOYEES HELPERS ---

export async function getEmployees(): Promise<any[]> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    const list = Object.values(db.employees);
    list.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
    return list;
  }

  try {
    const snap = await getDocs(collection(firestore, 'employees'));
    const list: any[] = [];
    snap.forEach((docSnap: any) => {
      list.push(docSnap.data());
    });
    list.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
    return list;
  } catch (err) {
    console.warn('Firestore getEmployees failed, using local fallback:', err);
    useLocalFallback = true;
    return getEmployees();
  }
}

export async function getEmployeeByCode(code: string): Promise<any | null> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    return db.employees[code] || null;
  }

  try {
    const docSnap = await getDoc(doc(firestore, 'employees', code));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    console.warn(`Firestore getEmployeeByCode failed for ${code}, using local fallback:`, err);
    useLocalFallback = true;
    return getEmployeeByCode(code);
  }
}

export async function addEmployee(emp: any): Promise<void> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    db.employees[emp.employee_code] = emp;
    writeMockDb(db);
    return;
  }

  try {
    await setDoc(doc(firestore, 'employees', emp.employee_code), emp);
  } catch (err) {
    console.warn('Firestore addEmployee failed, using local fallback:', err);
    useLocalFallback = true;
    await addEmployee(emp);
  }
}

export async function updateEmployee(code: string, updates: any): Promise<boolean> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    if (!db.employees[code]) return false;
    db.employees[code] = { ...db.employees[code], ...updates };
    writeMockDb(db);
    return true;
  }

  try {
    const docRef = doc(firestore, 'employees', code);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    await updateDoc(docRef, updates);
    return true;
  } catch (err) {
    console.warn('Firestore updateEmployee failed, using local fallback:', err);
    useLocalFallback = true;
    return updateEmployee(code, updates);
  }
}

export async function deleteEmployee(code: string): Promise<boolean> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    if (!db.employees[code]) return false;
    delete db.employees[code];
    writeMockDb(db);
    return true;
  }

  try {
    const docRef = doc(firestore, 'employees', code);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return false;
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn('Firestore deleteEmployee failed, using local fallback:', err);
    useLocalFallback = true;
    return deleteEmployee(code);
  }
}

// --- USERS HELPERS ---

export async function getUsers(): Promise<any[]> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    return Object.values(db.users).map((u: any) => ({
      id: u.id,
      username: u.username,
      role: u.role
    }));
  }

  try {
    const snap = await getDocs(collection(firestore, 'users'));
    const list: any[] = [];
    snap.forEach((docSnap: any) => {
      const u = docSnap.data();
      list.push({
        id: u.id,
        username: u.username,
        role: u.role
      });
    });
    return list;
  } catch (err) {
    console.warn('Firestore getUsers failed, using local fallback:', err);
    useLocalFallback = true;
    return getUsers();
  }
}

export async function createUser(username: string, passwordHash: string, role: string): Promise<any> {
  const cleanUsername = username.trim().toLowerCase();
  
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    if (db.users[cleanUsername]) {
      throw new Error('User already exists');
    }
    const id = Math.floor(1000 + Math.random() * 9000);
    const u = {
      id,
      username: cleanUsername,
      password_hash: passwordHash,
      role
    };
    db.users[cleanUsername] = u;
    writeMockDb(db);
    return { id, username: cleanUsername, role };
  }

  try {
    const userRef = doc(firestore, 'users', cleanUsername);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      throw new Error('User already exists');
    }
    const id = Math.floor(1000 + Math.random() * 9000);
    const u = {
      id,
      username: cleanUsername,
      password_hash: passwordHash,
      role
    };
    await setDoc(userRef, u);
    return { id, username: cleanUsername, role };
  } catch (err: any) {
    if (err.message === 'User already exists') throw err;
    console.warn('Firestore createUser failed, using local fallback:', err);
    useLocalFallback = true;
    return createUser(username, passwordHash, role);
  }
}

export async function deleteUser(username: string): Promise<boolean> {
  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername === 'admin') {
    throw new Error('Cannot delete the master admin account');
  }

  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    if (!db.users[cleanUsername]) return false;
    delete db.users[cleanUsername];
    writeMockDb(db);
    return true;
  }

  try {
    const userRef = doc(firestore, 'users', cleanUsername);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) return false;
    await deleteDoc(userRef);
    return true;
  } catch (err: any) {
    if (err.message === 'Cannot delete the master admin account') throw err;
    console.warn('Firestore deleteUser failed, using local fallback:', err);
    useLocalFallback = true;
    return deleteUser(username);
  }
}

export async function updateUserPassword(username: string, passwordHash: string): Promise<boolean> {
  const cleanUsername = username.trim().toLowerCase();

  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    if (!db.users[cleanUsername]) return false;
    db.users[cleanUsername].password_hash = passwordHash;
    writeMockDb(db);
    return true;
  }

  try {
    const userRef = doc(firestore, 'users', cleanUsername);
    const docSnap = await getDoc(userRef);
    if (!docSnap.exists()) return false;
    await updateDoc(userRef, { password_hash: passwordHash });
    return true;
  } catch (err) {
    console.warn('Firestore updateUserPassword failed, using local fallback:', err);
    useLocalFallback = true;
    return updateUserPassword(username, passwordHash);
  }
}

export async function getUserByUsername(username: string): Promise<any | null> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    const user = Object.values(db.users).find((u: any) => u.username === username);
    return user || null;
  }

  try {
    const snap = await getDocs(query(collection(firestore, 'users'), where('username', '==', username), limit(1)));
    if (snap.empty) {
      // If default users are missing from Firestore, auto-seed and return them on the fly
      if (username === 'admin') {
        const u = { id: 1, username: 'admin', password_hash: hashPassword('admin123'), role: 'admin' };
        await setDoc(doc(firestore, 'users', 'admin'), u);
        return u;
      } else if (username === 'cashier') {
        const u = { id: 2, username: 'cashier', password_hash: hashPassword('cashier123'), role: 'cashier' };
        await setDoc(doc(firestore, 'users', 'cashier'), u);
        return u;
      }
      return null;
    }
    return snap.docs[0].data();
  } catch (err) {
    console.warn(`Firestore getUserByUsername failed for ${username}, using local fallback:`, err);
    useLocalFallback = true;
    return getUserByUsername(username);
  }
}

// --- SALES HELPERS ---

export async function createSale(saleData: any): Promise<any> {
  const { items, total_amount, discount_applied, net_amount, payment_method, customer_name } = saleData;
  
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const rand = Math.floor(1000 + Math.random() * 9000);
  const sale_no = `SL-${timestamp}-${rand}`;
  const transaction_date = new Date().toISOString();

  const nameToSave = customer_name || 'Walk-In Customer';
  const isCredit = payment_method === 'Credit';
  const statusToSave = isCredit ? 'unpaid' : 'completed';
  const paidAmtToSave = isCredit ? 0 : net_amount;

  if (useLocalFallback || !firestore) {
    const db = readMockDb();

    // 1. Check stocks and deduct
    for (const item of items) {
      const prod = db.products[item.item_code];
      if (prod) {
        prod.stock_qty = Math.max(0, (prod.stock_qty || 0) - item.quantity);
      }
    }

    // 2. Save the sale
    const saleDocData = {
      sale_no,
      transaction_date,
      total_amount,
      discount_applied,
      net_amount,
      payment_method,
      customer_name: nameToSave,
      paid_amount: paidAmtToSave,
      status: statusToSave,
      items: items.map((it: any) => ({
        item_code: it.item_code,
        product_name: it.product_name || '',
        quantity: it.quantity,
        unit_price: it.retail_price,
        subtotal: it.retail_price * it.quantity
      }))
    };

    db.sales[sale_no] = saleDocData;
    writeMockDb(db);

    return saleDocData;
  }

  try {
    const saleDocRef = doc(firestore, 'sales', sale_no);

    await runTransaction(firestore, async (transaction: any) => {
      // 1. Read product stocks to ensure integrity and prevent oversells
      const productRefsAndQty: { ref: any, currentQty: number, item_code: string, deductQty: number }[] = [];
      for (const item of items) {
        const prodRef = doc(firestore, 'products', item.item_code);
        const prodDoc = await transaction.get(prodRef);
        const currentQty = prodDoc.exists() ? (prodDoc.data()?.stock_qty || 0) : 0;
        productRefsAndQty.push({
          ref: prodRef,
          currentQty,
          item_code: item.item_code,
          deductQty: item.quantity
        });
      }

      // 2. Perform updates
      for (const prod of productRefsAndQty) {
        const newQty = Math.max(0, prod.currentQty - prod.deductQty);
        transaction.update(prod.ref, { stock_qty: newQty });
      }

      // 3. Write sale document with items embedded
      const saleDocData = {
        sale_no,
        transaction_date,
        total_amount,
        discount_applied,
        net_amount,
        payment_method,
        customer_name: nameToSave,
        paid_amount: paidAmtToSave,
        status: statusToSave,
        items: items.map((it: any) => ({
          item_code: it.item_code,
          product_name: it.product_name || '',
          quantity: it.quantity,
          unit_price: it.retail_price,
          subtotal: it.retail_price * it.quantity
        }))
      };

      transaction.set(saleDocRef, saleDocData);
    });

    return {
      sale_no,
      transaction_date,
      total_amount,
      discount_applied,
      net_amount,
      payment_method,
      customer_name: nameToSave,
      paid_amount: paidAmtToSave,
      status: statusToSave,
      items
    };
  } catch (err) {
    console.warn('Firestore createSale failed, using local fallback:', err);
    useLocalFallback = true;
    return createSale(saleData);
  }
}

export async function getSaleByNo(saleNo: string): Promise<any | null> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    return db.sales[saleNo] || null;
  }

  try {
    const saleDoc = await getDoc(doc(firestore, 'sales', saleNo));
    if (!saleDoc.exists()) return null;
    return saleDoc.data();
  } catch (err) {
    console.warn(`Firestore getSaleByNo failed for ${saleNo}, using local fallback:`, err);
    useLocalFallback = true;
    return getSaleByNo(saleNo);
  }
}

export async function getSales(from?: string, to?: string): Promise<any[]> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    let sales = Object.values(db.sales);

    if (from && to) {
      const fromStr = `${from}T00:00:00.000Z`;
      const toStr = `${to}T23:59:59.999Z`;
      sales = sales.filter((s: any) => s.transaction_date >= fromStr && s.transaction_date <= toStr);
    }

    // Sort by transaction_date DESC
    sales.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
    return sales;
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
    snap.forEach((docSnap: any) => {
      list.push(docSnap.data());
    });

    // Sort by transaction_date DESC
    list.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
    return list;
  } catch (err) {
    console.warn('Firestore getSales failed, using local fallback:', err);
    useLocalFallback = true;
    return getSales(from, to);
  }
}

export async function recordCreditPayment(saleNo: string): Promise<boolean> {
  if (useLocalFallback || !firestore) {
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
    await updateDoc(saleRef, {
      status: 'paid',
      paid_amount: data?.net_amount || 0
    });
    return true;
  } catch (err) {
    console.warn('Firestore recordCreditPayment failed, using local fallback:', err);
    useLocalFallback = true;
    return recordCreditPayment(saleNo);
  }
}

export async function processSaleReturn(saleNo: string): Promise<boolean> {
  if (useLocalFallback || !firestore) {
    const db = readMockDb();
    const sale = db.sales[saleNo];
    if (!sale) return false;
    if (sale.status === 'returned') return false; // Already returned

    const items = sale.items || [];
    // Restock
    for (const item of items) {
      const prod = db.products[item.item_code];
      if (prod) {
        prod.stock_qty = (prod.stock_qty || 0) + item.quantity;
      }
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
    if (data?.status === 'returned') return false; // Already returned

    const items = data?.items || [];

    await runTransaction(firestore, async (transaction: any) => {
      // Restock product items
      for (const item of items) {
        const prodRef = doc(firestore, 'products', item.item_code);
        const prodDoc = await transaction.get(prodRef);
        const currentQty = prodDoc.exists() ? (prodDoc.data()?.stock_qty || 0) : 0;
        transaction.update(prodRef, { stock_qty: currentQty + item.quantity });
      }

      // Update status to 'returned'
      transaction.update(saleRef, { status: 'returned' });
    });

    return true;
  } catch (err) {
    console.warn('Firestore processSaleReturn failed, using local fallback:', err);
    useLocalFallback = true;
    return processSaleReturn(saleNo);
  }
}
