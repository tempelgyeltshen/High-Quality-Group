import { Product } from '../../types';

/** A scanned product parked in the current cart line. */
export interface CartItem {
  product: Product;
  quantity: number;
  /** Per-line manual discount percentage (0-100). */
  discount: number;
}

/** Toast-style feedback shown as a banner above the cart. */
export interface FeedbackState {
  error: string | null;
  info: string | null;
}

/** Active low-stock warning card. */
export interface LowStockAlert {
  id: string;
  productName: string;
  itemCode: string;
  stockQty: number;
  threshold: number;
  timestamp: number;
}

/** Payment modes supported by the register. */
export type PaymentType = 'Cash' | 'Online' | 'Credit';

/** Banks selectable for Online payments (Bhutan). */
export type BankCode = 'BOB' | 'BNB' | 'DK';

/** All line items + totals derived from the cart, used by panels and receipt. */
export interface SaleTotals {
  subTotal: number;
  discountRate: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
}
