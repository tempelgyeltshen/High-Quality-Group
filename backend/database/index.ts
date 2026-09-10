import { isLocal, readMockDb, firestore, setLocalFallback } from './connection.js';
import { hashPassword } from './connection.js';
import { collection, doc, getDoc, getDocs, setDoc, query, limit } from 'firebase/firestore';
import { defaultUsers, defaultProducts, defaultEmployees } from './seed.js';

// Re-export all database operations
export { hashPassword, verifyPassword, LocalDbWriteProhibitedError } from './connection.js';
export { getProducts, getProductByCode, addProduct, updateProduct, deleteProduct } from './products.js';
export { getEmployees, getEmployeeByCode, addEmployee, updateEmployee, deleteEmployee } from './employees.js';
export { getUsers, getUserByUsername, createUser, deleteUser, updateUserPassword } from './users.js';
export { validateSaleData, createSale, getSaleByNo, getSales, recordCreditPayment, processSaleReturn } from './sales.js';

// --- Initialization ---

export async function initDatabase(): Promise<void> {
  if (isLocal()) {
    console.log('Firestore is offline or bypassed. Initializing local database file fallback...');
    readMockDb();
    console.log('Local fallback database initialized successfully.');
    return;
  }

  console.log('Validating Firestore connection...');
  try {
    await getDocs(query(collection(firestore, 'users'), limit(1)));
    console.log('Firestore connection verified successfully.');
  } catch (err) {
    console.warn('Error connecting to Firestore. Activating local database fallback:', err);
    setLocalFallback(true);
    readMockDb();
    return;
  }

  try {
    // Seed default users if missing
    for (const user of defaultUsers) {
      const userDoc = await getDoc(doc(firestore, 'users', user.username));
      if (!userDoc.exists()) {
        console.log(`Seeding default ${user.username} user in Firestore...`);
        await setDoc(doc(firestore, 'users', user.username), user);
      }
    }

    // Seed default products if missing
    for (const p of defaultProducts) {
      const pDoc = await getDoc(doc(firestore, 'products', p.item_code));
      if (!pDoc.exists()) {
        await setDoc(doc(firestore, 'products', p.item_code), p);
      }
    }

    // Seed default employees if missing
    for (const emp of defaultEmployees) {
      const empDoc = await getDoc(doc(firestore, 'employees', emp.employee_code));
      if (!empDoc.exists()) {
        await setDoc(doc(firestore, 'employees', emp.employee_code), emp);
      }
    }

    console.log('Database verification and seeding completed successfully.');
  } catch (seedErr) {
    console.error('Error seeding Firestore collections. Falling back to local DB:', seedErr);
    setLocalFallback(true);
    readMockDb();
  }
}
