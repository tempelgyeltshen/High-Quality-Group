import { Product, Employee, User, Sale } from '../types';

const apiBaseUrl = '/api';

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Set (or clear) the bearer token used for authenticated API requests. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Register a callback invoked when an authenticated request returns 401. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBaseUrl}/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init.headers as Record<string, string> || {}),
    },
    credentials: 'same-origin',
  });

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : null;

  // A 401 on an authenticated request means the session expired or was revoked.
  // Login failures (no token attached yet) are left for the caller to handle.
  if (res.status === 401 && authToken && onUnauthorized) {
    onUnauthorized();
  }

  if (!res.ok) {
    const message = body?.error || body?.message || res.statusText || 'API request failed';
    throw new Error(message);
  }

  return body as T;
}

export const api = {
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    return apiRequest<{ message: string; token: string; user: User }>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout(): Promise<void> {
    await apiRequest<void>('auth/logout', {
      method: 'POST',
    });
  },

  async getProducts(): Promise<Product[]> {
    return apiRequest<Product[]>('products');
  },

  async getProductByCode(code: string): Promise<Product | null> {
    try {
      return apiRequest<Product>(`products/${encodeURIComponent(code)}`);
    } catch (error: any) {
      if (error.message === 'Product not found') return null;
      throw error;
    }
  },

  async createProduct(product: Product): Promise<void> {
    await apiRequest<void>('products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  async updateProduct(code: string, data: Partial<Product>): Promise<void> {
    await apiRequest<void>(`products/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(code: string): Promise<void> {
    await apiRequest<void>(`products/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
  },

  async getEmployees(): Promise<Employee[]> {
    return apiRequest<Employee[]>('employees');
  },

  async getEmployeeByCode(code: string): Promise<Employee | null> {
    try {
      return apiRequest<Employee>(`employees/${encodeURIComponent(code)}`);
    } catch (error: any) {
      if (error.message === 'Employee not found') return null;
      throw error;
    }
  },

  async createEmployee(emp: Employee): Promise<void> {
    await apiRequest<void>('employees', {
      method: 'POST',
      body: JSON.stringify(emp),
    });
  },

  async updateEmployee(code: string, data: Partial<Employee>): Promise<void> {
    await apiRequest<void>(`employees/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteEmployee(code: string): Promise<void> {
    await apiRequest<void>(`employees/${encodeURIComponent(code)}`, {
      method: 'DELETE',
    });
  },

  async getUsers(): Promise<User[]> {
    return apiRequest<User[]>('users');
  },

  async createUser(username: string, passwordPlain: string, role: 'admin' | 'cashier'): Promise<User> {
    return apiRequest<User>('users', {
      method: 'POST',
      body: JSON.stringify({ username, password: passwordPlain, role }),
    });
  },

  async deleteUser(username: string): Promise<void> {
    await apiRequest<void>(`users/${encodeURIComponent(username)}`, {
      method: 'DELETE',
    });
  },

  async updateUserPassword(username: string, passwordPlain: string): Promise<void> {
    await apiRequest<void>(`users/${encodeURIComponent(username)}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password: passwordPlain }),
    });
  },

  async createSale(saleData: any): Promise<any> {
    return apiRequest<any>('sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });
  },

  async recordCreditPayment(saleNo: string): Promise<void> {
    await apiRequest<void>(`sales/${encodeURIComponent(saleNo)}/payment`, {
      method: 'PUT',
    });
  },

  async processSaleReturn(saleNo: string): Promise<void> {
    await apiRequest<void>(`sales/${encodeURIComponent(saleNo)}/return`, {
      method: 'PUT',
    });
  },

  async getSaleByNo(saleNo: string): Promise<any | null> {
    try {
      return apiRequest<any>(`sales/${encodeURIComponent(saleNo)}`);
    } catch (error: any) {
      if (error.message === 'Sale not found') return null;
      throw error;
    }
  },

  async getSales(from?: string, to?: string, id?: string): Promise<any[]> {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    if (id) query.set('id', id);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<any[]>(`sales${suffix}`);
  },

  async getDayEndReport(from?: string, to?: string): Promise<any> {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest<any>(`sales/report/day-end${suffix}`);
  }
};
