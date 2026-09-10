import { useMemo } from 'react';
import type { CartItem } from './types';
import type { Employee } from '../../types';

export const GST_RATE = 0.05; // Standard 5% GST

/**
 * Derives every money figure for the checkout screen from the cart, the
 * per-line discounts, and the active basket-level discount (employee badge or
 * manual percentage). Pure computation — no side effects.
 */
export function useCheckoutTotals(cart: CartItem[], activeEmployee: Employee | null, manualDiscountPercent: number) {
  return useMemo(() => {
    const subTotal = cart.reduce((acc, item) => {
      const price = item.product.retail_price;
      const discountFactor = 1 - item.discount / 100;
      return acc + price * item.quantity * discountFactor;
    }, 0);

    const discountRate = activeEmployee ? activeEmployee.discount_rate : manualDiscountPercent / 100;
    const discountAmount = subTotal * discountRate;

    const taxableAmount = subTotal - discountAmount;
    const gstAmount = taxableAmount * GST_RATE;
    const grandTotal = taxableAmount + gstAmount;

    return { subTotal, discountRate, discountAmount, taxableAmount, gstAmount, grandTotal };
  }, [cart, activeEmployee, manualDiscountPercent]);
}
