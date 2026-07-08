export interface User {
  id: number;
  username: string;
  role: 'admin' | 'cashier';
}

export interface Product {
  item_code: string;
  product_name: string;
  retail_price: number;
  stock_qty: number;
}

export interface Employee {
  employee_code: string;
  employee_name: string;
  discount_rate: number;
  avatar_url?: string;
}

export interface Sale {
  id?: number;
  sale_no: string;
  transaction_date: string;
  total_amount: number;
  discount_applied: number;
  net_amount: number;
  payment_method: string;
  customer_name?: string;
  status?: string;
  paid_amount?: number;
}

export interface SaleItem {
  id?: number;
  sale_id?: number;
  item_code: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // custom manual item discount percentage (default 0)
}
