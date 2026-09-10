import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { isLocal, readMockDb, writeMockDb, firestore, setLocalFallback, assertLocalWritesAllowed } from './connection.js';

// --- EMPLOYEES ---

export async function getEmployees(): Promise<any[]> {
  if (isLocal()) {
    const db = readMockDb();
    const list = Object.values(db.employees);
    list.sort((a: any, b: any) => a.employee_name.localeCompare(b.employee_name));
    return list;
  }

  try {
    const snap = await getDocs(collection(firestore, 'employees'));
    const list: any[] = [];
    snap.forEach((docSnap: any) => list.push(docSnap.data()));
    list.sort((a: any, b: any) => a.employee_name.localeCompare(b.employee_name));
    return list;
  } catch (err) {
    console.warn('Firestore getEmployees failed, using local fallback:', err);
    setLocalFallback(true);
    return getEmployees();
  }
}

export async function getEmployeeByCode(code: string): Promise<any | null> {
  if (isLocal()) {
    const db = readMockDb();
    return db.employees[code] || null;
  }

  try {
    const docSnap = await getDoc(doc(firestore, 'employees', code));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    console.warn(`Firestore getEmployeeByCode failed for ${code}, using local fallback:`, err);
    setLocalFallback(true);
    return getEmployeeByCode(code);
  }
}

export async function addEmployee(emp: any): Promise<void> {
  if (isLocal()) {
    assertLocalWritesAllowed('addEmployee');
    const db = readMockDb();
    db.employees[emp.employee_code] = emp;
    writeMockDb(db);
    return;
  }

  try {
    await setDoc(doc(firestore, 'employees', emp.employee_code), emp);
  } catch (err) {
    console.warn('Firestore addEmployee failed, using local fallback:', err);
    setLocalFallback(true);
    await addEmployee(emp);
  }
}

export async function updateEmployee(code: string, updates: any): Promise<boolean> {
  if (isLocal()) {
    assertLocalWritesAllowed('updateEmployee');
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
    setLocalFallback(true);
    return updateEmployee(code, updates);
  }
}

export async function deleteEmployee(code: string): Promise<boolean> {
  if (isLocal()) {
    assertLocalWritesAllowed('deleteEmployee');
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
    setLocalFallback(true);
    return deleteEmployee(code);
  }
}
