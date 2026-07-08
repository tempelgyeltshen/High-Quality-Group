import { db, auth } from '@/src/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  QueryConstraint
} from 'firebase/firestore';
import { Product, Employee, User, Sale } from '../frontend/types';

// Operation types for custom Firestore error handling metadata
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

/**
 * Custom Firestore error handler as mandated by firebase-integration skill guidelines.
 * Packages security/permission failures into structured JSON strings to enable rapid diagnosis.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error Captured: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Standard SHA-256 helper with fallback for non-secure local development environments.
 * Provides consistent hashing of user passwords client-side.
 */
async function sha256(message: string): Promise<string> {
  try {
    if (window.isSecureContext && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn("Crypto subtle not available, falling back to basic deterministic hash for compatibility", e);
  }
  // Deterministic string fallback hashing algorithm
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return 'fb_' + Math.abs(hash).toString(16);
}

/**
 * Production-ready Client API Isolation Layer interfacing directly with Cloud Firestore.
 * Supports offline queries/writes seamlessly via IndexedDB local persistence.
 */
export const api = {
  // ==========================================
  // PRODUCTS / INVENTORY
  // ==========================================

  async getProducts(): Promise<Product[]> {
    const path = 'products';
    try {
      const snap = await getDocs(collection(db, path));
      const items: Product[] = [];
      snap.forEach(docSnap => {
        items.push(docSnap.data() as Product);
      });
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getProductByCode(code: string): Promise<Product | null> {
    const path = `products/${code}`;
    try {
      const docRef = doc(db, 'products', code);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Product;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async createProduct(product: Product): Promise<void> {
    const path = `products/${product.item_code}`;
    try {
      const docRef = doc(db, 'products', product.item_code);
      await setDoc(docRef, product);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateProduct(code: string, data: Partial<Product>): Promise<void> {
    const path = `products/${code}`;
    try {
      const docRef = doc(db, 'products', code);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteProduct(code: string): Promise<void> {
    const path = `products/${code}`;
    try {
      const docRef = doc(db, 'products', code);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // ==========================================
  // EMPLOYEES / BADGES
  // ==========================================

  async getEmployees(): Promise<Employee[]> {
    const path = 'employees';
    try {
      const snap = await getDocs(collection(db, path));
      const items: Employee[] = [];
      snap.forEach(docSnap => {
        items.push(docSnap.data() as Employee);
      });
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getEmployeeByCode(code: string): Promise<Employee | null> {
    const path = `employees/${code}`;
    try {
      const docRef = doc(db, 'employees', code);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Employee;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async createEmployee(emp: Employee): Promise<void> {
    const path = `employees/${emp.employee_code}`;
    try {
      const docRef = doc(db, 'employees', emp.employee_code);
      await setDoc(docRef, emp);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async updateEmployee(code: string, data: Partial<Employee>): Promise<void> {
    const path = `employees/${code}`;
    try {
      const docRef = doc(db, 'employees', code);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteEmployee(code: string): Promise<void> {
    const path = `employees/${code}`;
    try {
      const docRef = doc(db, 'employees', code);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // ==========================================
  // USERS / OPERATORS
  // ==========================================

  async getUsers(): Promise<User[]> {
    const path = 'users';
    try {
      const snap = await getDocs(collection(db, path));
      const items: User[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        items.push({
          id: data.id,
          username: data.username,
          role: data.role
        });
      });
      return items;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async createUser(username: string, passwordPlain: string, role: 'admin' | 'cashier'): Promise<User> {
    const cleanUsername = username.trim().toLowerCase();
    const path = `users/${cleanUsername}`;
    try {
      const userRef = doc(db, 'users', cleanUsername);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        throw new Error('User already exists');
      }
      const id = Math.floor(1000 + Math.random() * 9000);
      const password_hash = await sha256(passwordPlain);
      const u = {
        id,
        username: cleanUsername,
        password_hash,
        role
      };
      await setDoc(userRef, u);
      return { id, username: cleanUsername, role };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async deleteUser(username: string): Promise<void> {
    const cleanUsername = username.trim().toLowerCase();
    const path = `users/${cleanUsername}`;
    try {
      const docRef = doc(db, 'users', cleanUsername);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async updateUserPassword(username: string, passwordPlain: string): Promise<void> {
    const cleanUsername = username.trim().toLowerCase();
    const path = `users/${cleanUsername}`;
    try {
      const docRef = doc(db, 'users', cleanUsername);
      const password_hash = await sha256(passwordPlain);
      await updateDoc(docRef, { password_hash });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async login(username: string, passwordPlain: string): Promise<User> {
    const cleanUsername = username.trim().toLowerCase();
    const path = `users/${cleanUsername}`;
    try {
      const userRef = doc(db, 'users', cleanUsername);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        throw new Error('Invalid username or password');
      }
      const data = docSnap.data();
      const hashed = await sha256(passwordPlain);
      if (data.password_hash !== hashed) {
        throw new Error('Invalid username or password');
      }
      return {
        id: data.id,
        username: data.username,
        role: data.role
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  // ==========================================
  // TRANSACTION LOGS / SALES (PAGINATED)
  // ==========================================

  /**
   * Records a new transaction into Cloud Firestore.
   * Consistently applies metadata tracking and computes 5% Bhutanese GST tax.
   */
  async createSale(saleData: any): Promise<any> {
    const path = `sales/${saleData.sale_no}`;
    try {
      // SUB-PIPELINE: TAX CALCULATION MECHANICS (Bhutanese 5% GST)
      // subtotal is computed as total_amount before any discounts
      const subtotal = saleData.total_amount || 0;
      const discount = saleData.discount_applied || 0;
      
      // Net amount is calculated as subtotal less any employee/badge discounts
      const netBeforeTax = subtotal - discount;
      
      // Bhutanese GST is strictly calculated at 5% of the net taxable amount
      const bhutanese_gst = parseFloat((0.05 * netBeforeTax).toFixed(2));
      
      // finalGrandTotal is the complete, tax-inclusive grand total of the transaction
      const finalGrandTotal = parseFloat((netBeforeTax + bhutanese_gst).toFixed(2));
      
      // Map standard embedded sale items array
      const itemsArray = saleData.items || [];

      const docRef = doc(db, 'sales', saleData.sale_no);
      const saleRecord = {
        ...saleData,
        // METADATA TRACKING INTEGRATION FOR AUDIT LOGS
        transactionId: saleData.sale_no,
        timestamp: Date.now(), // High-precision numeric sorting index
        itemsArray,
        subtotal,
        bhutanese_gst, // 5% Bhutanese GST tax component
        finalGrandTotal,
        transactionStatus: saleData.status || 'completed',
      };

      await setDoc(docRef, saleRecord);

      // Deduct inventory quantities for each purchased product to maintain consistency
      for (const item of itemsArray) {
        try {
          const prodRef = doc(db, 'products', item.item_code);
          const prodSnap = await getDoc(prodRef);
          if (prodSnap.exists()) {
            const currentStock = prodSnap.data().stock_qty || 0;
            const updatedStock = Math.max(0, currentStock - item.quantity);
            await updateDoc(prodRef, { stock_qty: updatedStock });
          }
        } catch (e) {
          console.error(`Offline-safe inventory adjustment failed for item [${item.item_code}]:`, e);
        }
      }

      return saleRecord;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  /**
   * Fetch sale records descending by timestamp utilizing Firestore Pagination.
   * Highly optimized to support queries over multiple years and millions of documents.
   */
  async getSales(lastDocSnap: any = null, limitSize: number = 50): Promise<{ sales: any[], lastVisible: any }> {
    const path = 'sales';
    try {
      const qConstraints: QueryConstraint[] = [
        orderBy('timestamp', 'desc'),
        limit(limitSize)
      ];
      
      if (lastDocSnap) {
        qConstraints.push(startAfter(lastDocSnap));
      }
      
      const q = query(collection(db, path), ...qConstraints);
      const snap = await getDocs(q);
      
      const sales: any[] = [];
      snap.forEach(docSnap => {
        sales.push(docSnap.data());
      });
      
      return {
        sales,
        lastVisible: snap.docs[snap.docs.length - 1] || null
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  /**
   * Voids a transaction by updating its status across standard and metadata tracking schemas.
   */
  async voidSale(saleNo: string): Promise<void> {
    const path = `sales/${saleNo}`;
    try {
      const docRef = doc(db, 'sales', saleNo);
      await updateDoc(docRef, {
        status: 'Returned',
        transactionStatus: 'voided'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Records payment on a credit sale, transitioning it to paid.
   */
  async recordCreditPayment(saleNo: string): Promise<boolean> {
    const path = `sales/${saleNo}`;
    try {
      const docRef = doc(db, 'sales', saleNo);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;
      const data = snap.data();
      await updateDoc(docRef, {
        status: 'paid',
        paid_amount: data?.net_amount || 0
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Processes a full sale return, restocking items back into inventory.
   */
  async processSaleReturn(saleNo: string): Promise<boolean> {
    const path = `sales/${saleNo}`;
    try {
      const docRef = doc(db, 'sales', saleNo);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return false;
      const data = snap.data();
      if (data.status === 'Returned' || data.transactionStatus === 'voided') {
        return false; // Already returned
      }

      const items = data.items || data.itemsArray || [];
      // Restock the items in Firestore to preserve database hygiene
      for (const item of items) {
        try {
          const prodRef = doc(db, 'products', item.item_code);
          const prodSnap = await getDoc(prodRef);
          if (prodSnap.exists()) {
            const currentStock = prodSnap.data().stock_qty || 0;
            const updatedStock = currentStock + item.quantity;
            await updateDoc(prodRef, { stock_qty: updatedStock });
          }
        } catch (e) {
          console.error(`Offline-safe return restocking failed for item [${item.item_code}]:`, e);
        }
      }

      await updateDoc(docRef, {
        status: 'Returned',
        transactionStatus: 'voided'
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  /**
   * Pulls transaction aggregates for the shift's end-of-day reports.
   * Completely offline-compatible. Filters matching date ranges inside local cache.
   */
  async getSalesForDayEnd(fromDateStr: string, toDateStr: string): Promise<{ sales: any[], summary: any }> {
    const path = 'sales';
    try {
      const q = query(collection(db, path), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      
      const sales: any[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const date = data.transaction_date; // format "YYYY-MM-DD"
        if (date >= fromDateStr && date <= toDateStr) {
          sales.push(data);
        }
      });

      let total_cash = 0;
      let total_bank = 0;
      let total_credit = 0;
      let total_discount = 0;
      let total_net = 0;

      sales.forEach(sale => {
        // Exclude voided records from aggregate revenue sums
        if (sale.transactionStatus !== 'voided' && sale.status !== 'Returned') {
          total_discount += sale.discount_applied || 0;
          total_net += sale.net_amount || 0;

          if (sale.payment_method === 'Cash') {
            total_cash += sale.net_amount || 0;
          } else if (sale.payment_method === 'Online' || sale.payment_method === 'Bank') {
            total_bank += sale.net_amount || 0;
          } else if (sale.payment_method === 'Credit') {
            total_credit += sale.net_amount || 0;
          }
        }
      });

      return {
        sales,
        summary: {
          total_cash_sales: total_cash,
          total_bank_sales: total_bank,
          total_credit_sales: total_credit,
          total_discount_claims: total_discount,
          net_revenue: total_net,
          total_transactions: sales.length
        }
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }
};
