import { useCallback } from 'react';
import type { CartItem } from './types';

/**
 * All cart mutations, exposed as stable callbacks. Keeps cart state logic out
 * of the page component so both panels and future keyboard shortcuts share it.
 */
export function useCartActions(setCart: React.Dispatch<React.SetStateAction<CartItem[]>>) {
  const addItem = useCallback((product: CartItem['product']) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.item_code === product.item_code);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], quantity: updated[existingIdx].quantity + 1 };
        return updated;
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  }, [setCart]);

  const handleQtyChange = useCallback((itemCode: string, qty: number) => {
    if (qty < 1) return;
    setCart((prev) =>
      prev.map((item) =>
        item.product.item_code === itemCode ? { ...item, quantity: qty } : item,
      ),
    );
  }, [setCart]);

  const handleItemDiscountChange = useCallback((itemCode: string, disc: number) => {
    if (disc < 0 || disc > 100) return;
    setCart((prev) =>
      prev.map((item) =>
        item.product.item_code === itemCode ? { ...item, discount: disc } : item,
      ),
    );
  }, [setCart]);

  const handleRemoveItem = useCallback((itemCode: string) => {
    setCart((prev) => prev.filter((item) => item.product.item_code !== itemCode));
  }, [setCart]);

  return { addItem, handleQtyChange, handleItemDiscountChange, handleRemoveItem };
}
