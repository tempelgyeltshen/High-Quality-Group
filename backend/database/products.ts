import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { isLocal, readMockDb, writeMockDb, firestore, setLocalFallback, assertLocalWritesAllowed } from './connection.js';

// --- PRODUCTS ---

export async function getProducts(): Promise<any[]> {
  if (isLocal()) {
    const db = readMockDb();
    const list = Object.values(db.products);
    list.sort((a: any, b: any) => a.product_name.localeCompare(b.product_name));
    return list;
  }

  try {
    const snap = await getDocs(collection(firestore, 'products'));
    const list: any[] = [];
    snap.forEach((docSnap: any) => list.push(docSnap.data()));
    list.sort((a: any, b: any) => a.product_name.localeCompare(b.product_name));
    return list;
  } catch (err) {
    console.warn('Firestore getProducts failed, using local fallback:', err);
    setLocalFallback(true);
    return getProducts();
  }
}

export async function getProductByCode(code: string): Promise<any | null> {
  if (isLocal()) {
    const db = readMockDb();
    return db.products[code] || null;
  }

  try {
    const docSnap = await getDoc(doc(firestore, 'products', code));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    console.warn(`Firestore getProductByCode failed for ${code}, using local fallback:`, err);
    setLocalFallback(true);
    return getProductByCode(code);
  }
}

export async function addProduct(p: any): Promise<void> {
  if (isLocal()) {
    assertLocalWritesAllowed('addProduct');
    const db = readMockDb();
    db.products[p.item_code] = p;
    writeMockDb(db);
    return;
  }

  try {
    await setDoc(doc(firestore, 'products', p.item_code), p);
  } catch (err) {
    console.warn('Firestore addProduct failed, using local fallback:', err);
    setLocalFallback(true);
    await addProduct(p);
  }
}

export async function updateProduct(code: string, updates: any): Promise<boolean> {
  if (isLocal()) {
    assertLocalWritesAllowed('updateProduct');
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
    setLocalFallback(true);
    return updateProduct(code, updates);
  }
}

export async function deleteProduct(code: string): Promise<boolean> {
  if (isLocal()) {
    assertLocalWritesAllowed('deleteProduct');
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
    setLocalFallback(true);
    return deleteProduct(code);
  }
}
