import { useState, useEffect, useRef, useCallback } from 'react';
import type { User, Employee, Product } from '../../types';
import { api } from '../../services/api';
import { playSound } from '../../utils/sound';
import { useCheckoutTotals } from './useCheckoutTotals';
import { useCartActions } from './useCartActions';
import { useBarcodeScanner } from './useBarcodeScanner';
import { useReceiptPrinter } from './useReceiptPrinter';
import ScannerPanel from './ScannerPanel';
import CartPanel from './CartPanel';
import PaymentPanel from './PaymentPanel';
import ReceiptModal from './ReceiptModal';
import ShortcutsFooter from './ShortcutsFooter';
import type { CartItem, LowStockAlert, PaymentType, BankCode } from './types';

interface CheckoutPageProps {
  currentUser: User | null;
  onLogout: () => void;
  onSaleSaved: () => void;
}

/**
 * New Sale register screen. Owns checkout state and composes the focused
 * sub-components (scanner bar, cart, payment, receipt, shortcuts ribbon).
 */
export default function CheckoutPage({ currentUser, onLogout, onSaleSaved }: CheckoutPageProps) {
  // Scanner & cart state
  const [scannerInput, setScannerInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [remarks, setRemarks] = useState('');
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);

  // Low Stock Warning System state
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);

  // Discount state
  const [manualDiscountPercent, setManualDiscountPercent] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState('');
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);

  // Payment state
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<PaymentType>('Cash');
  const [selectedBank, setSelectedBank] = useState<BankCode>('BOB');
  const [selectedCustomer, setSelectedCustomer] = useState('Walk-In Customer');

  const paymentMethod = paymentType === 'Online' ? `Online (${selectedBank})` : paymentType;

  // Status and receipt modal state
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [infoStatus, setInfoStatus] = useState<string | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<any | null>(null);

  const scannerInputRef = useRef<HTMLInputElement>(null);

  // --- Derived data & actions (extracted hooks) ---
  const { subTotal, discountAmount, taxableAmount, gstAmount, grandTotal } =
    useCheckoutTotals(cart, activeEmployee, manualDiscountPercent);

  const { addItem, handleQtyChange, handleItemDiscountChange, handleRemoveItem } = useCartActions(setCart);

  const handleDirectScan = useBarcodeScanner({
    setCart,
    setLastScannedProduct,
    setActiveEmployee,
    setManualDiscountPercent,
    setLowStockAlerts,
    setErrorStatus,
    setInfoStatus,
    lowStockThreshold,
  });

  const printReceipt = useReceiptPrinter(savedReceipt?.sale_no);

  const handleScannerSubmit = useCallback(async () => {
    const barcode = scannerInput.trim();
    if (!barcode) return;

    setScannerInput(''); // Instant clear for next scan
    await handleDirectScan(barcode);
  }, [scannerInput, handleDirectScan]);

  // Ensure scanner input has autofocus at all times without interrupting other inputs
  useEffect(() => {
    if (scannerInputRef.current) {
      scannerInputRef.current.focus();
    }

    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // If the user clicked on or within any form inputs, selects, textareas, buttons or links,
      // do not steal focus back to the scanner.
      if (
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('button') ||
        target.closest('a')
      ) {
        return;
      }

      // Small delay to prevent blocking button clicks
      setTimeout(() => {
        if (scannerInputRef.current && !savedReceipt) {
          const active = document.activeElement;
          // Verify we aren't currently typing inside another form element
          if (
            active &&
            (active.tagName === 'INPUT' ||
             active.tagName === 'SELECT' ||
             active.tagName === 'TEXTAREA') &&
            active.id !== 'scanner-input-field'
          ) {
            return;
          }
          scannerInputRef.current.focus();
        }
      }, 150);
    };

    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [savedReceipt]);

  // --- Cart-level actions ---

  const handleClearCart = () => {
    setCart([]);
    setActiveEmployee(null);
    setManualDiscountPercent(0);
    setRemarks('');
    setTenderedAmount('');
    setPaymentType('Cash');
    setSelectedBank('BOB');
    setErrorStatus(null);
    setLastScannedProduct(null);
    setLowStockAlerts([]);
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountInput);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      setActiveEmployee(null); // Manual discount clears active employee
      setManualDiscountPercent(val);
      setDiscountInput('');
      setInfoStatus(`Manual global discount of ${val}% applied.`);
      setTimeout(() => setInfoStatus(null), 2500);
    } else {
      playSound('error');
      alert('Please enter a valid percentage discount (0-100)');
    }
  };

  const tenderedVal = parseFloat(tenderedAmount) || 0;
  const changeDue = tenderedVal > grandTotal ? tenderedVal - grandTotal : 0;

  // Process transaction to DB
  const handleSaveCheckout = async () => {
    if (cart.length === 0) {
      playSound('error');
      setErrorStatus('Cannot process an empty sale basket! Scan items first.');
      return;
    }

    const payload = {
      items: cart.map((item) => ({
        item_code: item.product.item_code,
        product_name: item.product.product_name,
        quantity: item.quantity,
        retail_price: item.product.retail_price,
      })),
      total_amount: subTotal,
      discount_applied: discountAmount,
      net_amount: grandTotal,
      payment_method: paymentMethod,
      customer_name: selectedCustomer,
    };

    try {
      const data = await api.createSale(payload);

      playSound('success');
      setSavedReceipt(data); // Display receipts dialog
      handleClearCart();
      onSaleSaved(); // trigger reload on reports/inventory
    } catch (err: any) {
      playSound('error');
      setErrorStatus(err.message || 'Database error processing sale.');
    }
  };

  // Handle Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + S to focus scan input
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        scannerInputRef.current?.focus();
        setInfoStatus('Barcode scanner focused.');
        setTimeout(() => setInfoStatus(null), 2000);
      }

      // F10 to checkout / Save
      if (e.key === 'F10') {
        e.preventDefault();
        handleSaveCheckout();
      }

      // Escape to trigger logout
      if (e.key === 'Escape') {
        e.preventDefault();
        if (confirm('Are you sure you want to log out of the POS terminal?')) {
          onLogout();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, manualDiscountPercent, activeEmployee, tenderedAmount, paymentMethod, selectedCustomer, remarks]);

  return (
    <div className="flex-1 p-6 bg-[#FEF7E5] flex flex-col justify-between overflow-y-auto select-none font-sans h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">

        {/* Left Side: Scanner, Cart & Banners (Cols 1-3) */}
        <div className="xl:col-span-3 space-y-6">
          <ScannerPanel
            scannerInput={scannerInput}
            onScannerInput={setScannerInput}
            onScannerSubmit={handleScannerSubmit}
            scannerInputRef={scannerInputRef}
            selectedCustomer={selectedCustomer}
            onCustomerChange={setSelectedCustomer}
            onQuickSelect={handleDirectScan}
            lowStockThreshold={lowStockThreshold}
            onThresholdChange={setLowStockThreshold}
            onResetBasket={handleClearCart}
          />

          <CartPanel
            cart={cart}
            lowStockThreshold={lowStockThreshold}
            lastScannedProduct={lastScannedProduct}
            lowStockAlerts={lowStockAlerts}
            errorStatus={errorStatus}
            infoStatus={infoStatus}
            onDismissAlert={(id) => setLowStockAlerts((prev) => prev.filter((a) => a.id !== id))}
            onQtyChange={handleQtyChange}
            onItemDiscountChange={handleItemDiscountChange}
            onRemoveItem={handleRemoveItem}
          />

          {/* Remarks block */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-100/50">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Transaction Remarks &amp; Internal Notes
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Type delivery schedules, partial payment terms, or custom instructions here..."
              className="w-full text-xs p-3 bg-white border border-[#B98B23] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B98B23] font-sans focus:bg-white transition text-[#2F2F2F]"
            />
          </div>
        </div>

        {/* Right Side: Totals, Discounts & Payment (Col 4) */}
        <PaymentPanel
          subTotal={subTotal}
          discountAmount={discountAmount}
          taxableAmount={taxableAmount}
          gstAmount={gstAmount}
          grandTotal={grandTotal}
          activeEmployee={activeEmployee}
          manualDiscountPercent={manualDiscountPercent}
          discountInput={discountInput}
          onDiscountInput={setDiscountInput}
          onApplyDiscount={handleApplyDiscount}
          paymentType={paymentType}
          onPaymentTypeChange={setPaymentType}
          selectedBank={selectedBank}
          onBankChange={setSelectedBank}
          selectedCustomer={selectedCustomer}
          tenderedAmount={tenderedAmount}
          onTenderedAmount={setTenderedAmount}
          changeDue={changeDue}
          cartCount={cart.length}
          onSave={handleSaveCheckout}
        />
      </div>

      <ShortcutsFooter />

      {/* Printable Receipt Modal Overlay */}
      {savedReceipt && (
        <ReceiptModal
          receipt={savedReceipt}
          cashierName={currentUser?.username || ''}
          customerName={selectedCustomer}
          onClose={() => setSavedReceipt(null)}
          onPrint={printReceipt}
        />
      )}
    </div>
  );
}
