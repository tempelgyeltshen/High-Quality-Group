import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, limit } from 'firebase/firestore';
import { isLocal, readMockDb, writeMockDb, firestore, setLocalFallback, hashPassword, assertLocalWritesAllowed } from './connection.js';
import { defaultUsers } from './seed.js';

// --- USERS ---

export async function getUsers(): Promise<any[]> {
  if (isLocal()) {
    const db = readMockDb();
    return Object.values(db.users).map((u: any) => ({ id: u.id, username: u.username, role: u.role }));
  }

  try {
    const snap = await getDocs(collection(firestore, 'users'));
    return snap.docs.map((docSnap: any) => {
      const u = docSnap.data();
      return { id: u.id, username: u.username, role: u.role };
    });
  } catch (err) {
    console.warn('Firestore getUsers failed, using local fallback:', err);
    setLocalFallback(true);
    return getUsers();
  }
}

export async function getUserByUsername(username: string): Promise<any | null> {
  if (isLocal()) {
    const db = readMockDb();
    return Object.values(db.users).find((u: any) => u.username === username) || null;
  }

  try {
    const snap = await getDocs(query(collection(firestore, 'users'), where('username', '==', username), limit(1)));
    if (snap.empty) {
      // Auto-seed default users on-the-fly if missing
      const match = defaultUsers.find((u) => u.username === username);
      if (match) {
        await setDoc(doc(firestore, 'users', match.username), match);
        return match;
      }
      return null;
    }
    return snap.docs[0].data();
  } catch (err) {
    console.warn(`Firestore getUserByUsername failed for ${username}, using local fallback:`, err);
    setLocalFallback(true);
    return getUserByUsername(username);
  }
}

export async function createUser(username: string, passwordHash: string, role: string): Promise<any> {
  const cleanUsername = username.trim().toLowerCase();

  if (isLocal()) {
    assertLocalWritesAllowed('createUser');
    const db = readMockDb();
    if (db.users[cleanUsername]) throw new Error('User already exists');
    const id = Math.floor(1000 + Math.random() * 9000);
    const u = { id, username: cleanUsername, password_hash: passwordHash, role };
    db.users[cleanUsername] = u;
    writeMockDb(db);
    return { id, username: cleanUsername, role };
  }

  try {
    const userRef = doc(firestore, 'users', cleanUsername);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) throw new Error('User already exists');
    const id = Math.floor(1000 + Math.random() * 9000);
    const u = { id, username: cleanUsername, password_hash: passwordHash, role };
    await setDoc(userRef, u);
    return { id, username: cleanUsername, role };
  } catch (err: any) {
    if (err.message === 'User already exists') throw err;
    console.warn('Firestore createUser failed, using local fallback:', err);
    setLocalFallback(true);
    return createUser(username, passwordHash, role);
  }
}

export async function deleteUser(username: string): Promise<boolean> {
  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername === 'admin') throw new Error('Cannot delete the master admin account');

  if (isLocal()) {
    assertLocalWritesAllowed('deleteUser');
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
    setLocalFallback(true);
    return deleteUser(username);
  }
}

export async function updateUserPassword(username: string, passwordHash: string): Promise<boolean> {
  const cleanUsername = username.trim().toLowerCase();

  if (isLocal()) {
    assertLocalWritesAllowed('updateUserPassword');
    const db = readMockDb();
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
    setLocalFallback(true);
    return updateUserPassword(username, passwordHash);
  }
}
