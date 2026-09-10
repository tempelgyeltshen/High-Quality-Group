import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit } from 'firebase/firestore';
import crypto from 'crypto';

// --- Hashing ---

const SCRYPT_PREFIX = 'scrypt$';
const SCRYPT_KEYLEN = 32;

/**
 * Hashes a password using salted scrypt.
 * Format: scrypt$<salt-base64>$<hash-base64>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${SCRYPT_PREFIX}${salt.toString('base64')}$${hash.toString('base64')}`;
}

/**
 * Verifies a password against a stored hash.
 * Supports both the current salted scrypt format and legacy unsalted
 * SHA-256 hashes (auto-upgraded by the login route on success).
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;

  if (storedHash.startsWith(SCRYPT_PREFIX)) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const [, saltB64, hashB64] = parts;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    if (expected.length !== SCRYPT_KEYLEN) return false;
    const actual = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    return crypto.timingSafeEqual(actual, expected);
  }

  // Legacy unsalted SHA-256 hex hash (64 chars)
  if (/^[0-9a-f]{64}$/i.test(storedHash)) {
    const legacy = crypto.createHash('sha256').update(password).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(legacy, 'hex'), Buffer.from(storedHash, 'hex'));
  }

  return false;
}

// --- Production safety guard ---

/**
 * In production (serverless / hosted deploys) the filesystem is ephemeral and
 * read-only: writes to mock_db.json would silently vanish on the next cold
 * start, losing sales and inventory changes. Reads from the seed file would
 * also return stale data. Once Firestore has been configured we therefore
 * REFUSE to fall back for write operations in production instead of silently
 * corrupting state. Set ALLOW_LOCAL_DB_FALLBACK=1 to opt back in explicitly
 * (e.g. for a deliberate local production build without Firestore).
 */
export function isProductionProcess(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
}

const allowLocalFallbackInProduction = () => process.env.ALLOW_LOCAL_DB_FALLBACK === '1';

/**
 * Thrown when a write is attempted while the local fallback is active in
 * production. Routes should map this to a 503 so clients retry/reconcile
 * instead of assuming the write succeeded.
 */
export class LocalDbWriteProhibitedError extends Error {
  constructor(operation: string) {
    super(
      `Write operation "${operation}" was blocked: the local database fallback is not ` +
      'permitted in production because the filesystem is ephemeral. Configure Firestore ' +
      '(firebase-applet-config.json) or set ALLOW_LOCAL_DB_FALLBACK=1 to override.',
    );
    this.name = 'LocalDbWriteProhibitedError';
  }
}

/** True when local writes are currently forbidden (prod + fallback active). */
export function isLocalWriteProhibited(): boolean {
  return isProductionProcess() && useLocalFallback && !allowLocalFallbackInProduction();
}

/**
 * Called by write-oriented DB helpers before touching mock_db.json in
 * production. No-op in development, where the JSON file is the intended store.
 */
export function assertLocalWritesAllowed(operation: string): void {
  if (isLocalWriteProhibited()) {
    throw new LocalDbWriteProhibitedError(operation);
  }
}

// --- Local Mock DB (JSON file fallback) ---

export interface LocalDB {
  users: Record<string, any>;
  products: Record<string, any>;
  employees: Record<string, any>;
  sales: Record<string, any>;
}

// Resolve backend/mock_db.json from the working directory. Supported layouts:
//   - repo root cwd  (npm run dev / npm start / Vercel): <cwd>/backend/mock_db.json
//   - backend/ cwd   (node ../dist/server.cjs from backend/): <cwd>/mock_db.json
// Prefer an existing file; otherwise default to the repo-root layout.
const mockDbCandidates = [
  path.resolve(process.cwd(), 'backend', 'mock_db.json'),
  path.resolve(process.cwd(), 'mock_db.json'),
];
const mockDbPath = (() => {
  for (const candidate of mockDbCandidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore and try the next candidate
    }
  }
  return mockDbCandidates[0];
})();

export function readMockDb(): LocalDB {
  try {
    if (fs.existsSync(mockDbPath)) {
      return JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading mock_db.json:', err);
  }

  const defaultDb: LocalDB = createDefaultDb();
  writeMockDb(defaultDb);
  return defaultDb;
}

export function writeMockDb(data: LocalDB) {
  try {
    fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing mock_db.json:', err);
  }
}

function createDefaultDb(): LocalDB {
  return {
    users: {
      admin: { id: 1, username: 'admin', password_hash: hashPassword('admin123'), role: 'admin' },
      cashier: { id: 2, username: 'cashier', password_hash: hashPassword('cashier123'), role: 'cashier' },
    },
    products: {
      '900113': { item_code: '900113', product_name: 'Bosch Armature GWS 6-100', retail_price: 1950, stock_qty: 15 },
      '900114': { item_code: '900114', product_name: 'Bosch Carbon Brush', retail_price: 180, stock_qty: 50 },
      '900115': { item_code: '900115', product_name: 'Makita Angle Grinder 4\"', retail_price: 3200, stock_qty: 8 },
      '880120': { item_code: '880120', product_name: 'Dewalt Cordless Drill 18V', retail_price: 4500, stock_qty: 12 },
      '880121': { item_code: '880121', product_name: 'Screwdriver Set 6pcs', retail_price: 650, stock_qty: 25 },
      '501221': { item_code: '501221', product_name: 'WD-40 Multi-Use Spray 400ml', retail_price: 420, stock_qty: 40 },
      '302450': { item_code: '302450', product_name: 'Measuring Tape 5m Heavy Duty', retail_price: 250, stock_qty: 30 },
    },
    employees: {
      'HQG-BLHT-T001': { employee_code: 'HQG-BLHT-T001', employee_name: 'Dorji', discount_rate: 0.20 },
      EMP102: { employee_code: 'EMP102', employee_name: 'Karma', discount_rate: 0.20 },
      EMP103: { employee_code: 'EMP103', employee_name: 'Pema', discount_rate: 0.15 },
    },
    sales: {},
  };
}

// --- Firestore Connection ---

export let useLocalFallback = false;
export let firestore: any = null;

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};

if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Error parsing firebase-applet-config.json:', err);
  }
}

try {
  const app = initializeApp(firebaseConfig);
  firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (err) {
  console.warn('Firebase initialization failed. Falling back to local database file.', err);
  useLocalFallback = true;
}

export function setLocalFallback(value: boolean) {
  if (value === true && isProductionProcess() && !allowLocalFallbackInProduction() && !useLocalFallback) {
    console.error(
      '[FALLBACK GUARD] Firestore failure in production: local JSON fallback is available for READS ' +
      'but WRITE operations will be rejected with LocalDbWriteProhibitedError until Firestore ' +
      'recovers. Set ALLOW_LOCAL_DB_FALLBACK=1 to allow local writes anyway.',
    );
  }
  useLocalFallback = value;
}

export function isLocal(): boolean {
  return useLocalFallback || !firestore;
}
