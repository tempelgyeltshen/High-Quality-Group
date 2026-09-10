import { useCallback } from 'react';
import { api } from '../../services/api';
import { playSound } from '../../utils/sound';
import type { CartItem, LowStockAlert } from './types';
import type { Employee, Product } from '../../types';

interface UseBarcodeScannerParams {
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setLastScannedProduct: (p: Product | null) => void;
  setActiveEmployee: (e: Employee | null) => void;
  setManualDiscountPercent: (v: number) => void;
  setLowStockAlerts: React.Dispatch<React.SetStateAction<LowStockAlert[]>>;
  setErrorStatus: (msg: string | null) => void;
  setInfoStatus: (msg: string | null) => void;
  lowStockThreshold: number;
}

function applyEmployeeBadge(
  employee: Employee,
  setActiveEmployee: (e: Employee | null) => void,
  setManualDiscountPercent: (v: number) => void,
  setInfoStatus: (msg: string | null) => void,
) {
  setActiveEmployee(employee);
  setManualDiscountPercent(0); // Employee discount replaces manual discount
  setInfoStatus(
    `Employee applied: ${employee.employee_name} (${(employee.discount_rate * 100).toFixed(0)}% Employee Discount)`,
  );
  playSound('employee');
  setTimeout(() => setInfoStatus(null), 3000);
}

/**
 * Resolves a scanned barcode to either an employee badge (discount takeover)
 * or a product (cart append + low-stock warning). Mirrors the original
 * Checkout.tsx behavior exactly.
 */
export function useBarcodeScanner(params: UseBarcodeScannerParams) {
  const {
    setCart, setLastScannedProduct, setActiveEmployee, setManualDiscountPercent,
    setLowStockAlerts, setErrorStatus, setInfoStatus, lowStockThreshold,
  } = params;

  return useCallback(async (barcode: string) => {
    if (!barcode) return;
    setErrorStatus(null);

    // 1. Employee Scan Rule: starts with EMP or HQG or matches employee in db
    if (barcode.toUpperCase().startsWith('EMP') || barcode.toUpperCase().startsWith('HQG')) {
      try {
        const employee = await api.getEmployeeByCode(barcode);
        if (employee) {
          applyEmployeeBadge(employee, setActiveEmployee, setManualDiscountPercent, setInfoStatus);
          return;
        }
      } catch (err) {
        console.error('Error fetching employee badge:', err);
      }
    }

    // 2. Product Scan Rule
    try {
      const product = await api.getProductByCode(barcode);
      if (!product) {
        // Fallback: code may match an employee_code that doesn't start with EMP/HQG
        const employee = await api.getEmployeeByCode(barcode);
        if (employee) {
          applyEmployeeBadge(employee, setActiveEmployee, setManualDiscountPercent, setInfoStatus);
          return;
        }

        playSound('error');
        setErrorStatus(`Item/Badge Code [${barcode}] NOT found in Cloud database!`);
        setTimeout(() => setErrorStatus(null), 5000);
        return;
      }

      setLastScannedProduct(product);

      if (product.stock_qty <= 0) {
        setErrorStatus(`Warning: ${product.product_name} is currently out of stock (Stock Qty: 0).`);
        setTimeout(() => setErrorStatus(null), 5000);
      } else if (product.stock_qty <= lowStockThreshold) {
        setLowStockAlerts((prev) => {
          // Avoid duplicate active warnings for the same item code
          if (prev.some((alert) => alert.itemCode === product.item_code)) {
            return prev.map((alert) =>
              alert.itemCode === product.item_code
                ? { ...alert, stockQty: product.stock_qty, threshold: lowStockThreshold }
                : alert,
            );
          }
          return [
            {
              id: Math.random().toString(36).substring(2, 9),
              productName: product.product_name,
              itemCode: product.item_code,
              stockQty: product.stock_qty,
              threshold: lowStockThreshold,
              timestamp: Date.now(),
            },
            ...prev,
          ];
        });
        playSound('error');
      }

      // Append to shopping cart state
      setCart((prevCart) => {
        const existingIdx = prevCart.findIndex((item) => item.product.item_code === product.item_code);
        playSound('beep');
        if (existingIdx > -1) {
          const updated = [...prevCart];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + 1,
          };
          return updated;
        }
        return [...prevCart, { product, quantity: 1, discount: 0 }];
      });
    } catch (err) {
      playSound('error');
      setErrorStatus('Connection failed. Database unavailable.');
    }
  }, [lowStockThreshold, setActiveEmployee, setCart, setErrorStatus, setInfoStatus, setLastScannedProduct, setManualDiscountPercent, setLowStockAlerts]);
}
