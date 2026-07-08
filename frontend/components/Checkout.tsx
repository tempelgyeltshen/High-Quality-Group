import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  Trash2, 
  Percent, 
  Calculator, 
  Receipt, 
  Coins, 
  AlertTriangle,
  UserCheck,
  Plus,
  Minus,
  Printer
} from 'lucide-react';
import { Product, Employee, CartItem, User } from '../types';
import { api } from '@/src/services/api';
// @ts-ignore
import logoImg from '../assets/images/Logo.svg';

interface CheckoutProps {
  currentUser: User | null;
  onLogout: () => void;
  onSaleSaved: () => void;
}

export default function Checkout({ currentUser, onLogout, onSaleSaved }: CheckoutProps) {
  const [scannerInput, setScannerInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [remarks, setRemarks] = useState('');
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  
  // Low Stock Warning System States
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [lowStockAlerts, setLowStockAlerts] = useState<{
    id: string;
    productName: string;
    itemCode: string;
    stockQty: number;
    threshold: number;
    timestamp: number;
  }[]>([]);
  
  // Discount states
  const [manualDiscountPercent, setManualDiscountPercent] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState('');
  const [activeEmployee, setActiveEmployee] = useState<Employee | null>(null);

  // Cashier payment states
  const [tenderedAmount, setTenderedAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<'Cash' | 'Online' | 'Credit'>('Cash');
  const [selectedBank, setSelectedBank] = useState<'BOB' | 'BNB' | 'DK'>('BOB');
  const [selectedCustomer, setSelectedCustomer] = useState('Walk-In Customer');

  const paymentMethod = paymentType === 'Online' ? `Online (${selectedBank})` : paymentType;

  // Scanner autofocus management
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Status and receipt modal states
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [infoStatus, setInfoStatus] = useState<string | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<any | null>(null);

  // Sound effects generator using standard Web Audio API (No dependencies!)
  const playSound = (type: 'beep' | 'employee' | 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1kHz beep
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'employee') {
        // Dual chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08); // E6
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'success') {
        // Cash register chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.1); // D6
        osc.frequency.setValueAtTime(1760, audioCtx.currentTime + 0.2); // A6
        osc.stop(audioCtx.currentTime + 0.4);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime); // Low buzz
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('AudioContext failed to trigger sound:', e);
    }
  };

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

  // Intercept Scanner Input (Honeywell types barcode & sends Enter event)
  const handleDirectScan = async (barcode: string) => {
    if (!barcode) return;
    setErrorStatus(null);

    // 1. Employee Scan Rule: starts with EMP or HQG or matches employee in firestore
    if (barcode.toUpperCase().startsWith('EMP') || barcode.toUpperCase().startsWith('HQG')) {
      try {
        const employee = await api.getEmployeeByCode(barcode);
        if (employee) {
          setActiveEmployee(employee);
          setManualDiscountPercent(0); // Employee discount replaces manual discount
          setInfoStatus(`Employee applied: ${employee.employee_name} (${(employee.discount_rate * 100).toFixed(0)}% Employee Discount)`);
          playSound('employee');
          setTimeout(() => setInfoStatus(null), 3000);
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
        // Try searching employees in database as fallback in case code doesn't start with EMP but matches employee_code
        const employee = await api.getEmployeeByCode(barcode);
        if (employee) {
          setActiveEmployee(employee);
          setManualDiscountPercent(0);
          setInfoStatus(`Employee applied: ${employee.employee_name} (${(employee.discount_rate * 100).toFixed(0)}% Employee Discount)`);
          playSound('employee');
          setTimeout(() => setInfoStatus(null), 3000);
          return;
        }

        // If not product nor employee
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
        // Trigger alert
        setLowStockAlerts((prev) => {
          // Avoid duplicate active warnings for the same item code
          if (prev.some((alert) => alert.itemCode === product.item_code)) {
            return prev.map((alert) => 
              alert.itemCode === product.item_code 
                ? { ...alert, stockQty: product.stock_qty, threshold: lowStockThreshold }
                : alert
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
        if (existingIdx > -1) {
          const updated = [...prevCart];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: updated[existingIdx].quantity + 1,
          };
          playSound('beep');
          return updated;
        } else {
          playSound('beep');
          return [...prevCart, { product, quantity: 1, discount: 0 }];
        }
      });
    } catch (err) {
      playSound('error');
      setErrorStatus('Connection failed. Database unavailable.');
    }
  };

  const handleScannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = scannerInput.trim();
    if (!barcode) return;

    setScannerInput(''); // Instant clear for next scan
    await handleDirectScan(barcode);
  };

  // Manual input modifications
  const handleQtyChange = (itemCode: string, qty: number) => {
    if (qty < 1) return;
    setCart((prev) =>
      prev.map((item) =>
        item.product.item_code === itemCode ? { ...item, quantity: qty } : item
      )
    );
  };

  const handleItemDiscountChange = (itemCode: string, disc: number) => {
    if (disc < 0 || disc > 100) return;
    setCart((prev) =>
      prev.map((item) =>
        item.product.item_code === itemCode ? { ...item, discount: disc } : item
      )
    );
  };

  const handleRemoveItem = (itemCode: string) => {
    setCart((prev) => prev.filter((item) => item.product.item_code !== itemCode));
  };

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

  // General discounts
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

  // Computations
  const subTotal = cart.reduce((acc, item) => {
    const price = item.product.retail_price;
    const discountFactor = 1 - item.discount / 100;
    return acc + price * item.quantity * discountFactor;
  }, 0);

  const discountRate = activeEmployee ? activeEmployee.discount_rate : manualDiscountPercent / 100;
  const discountAmount = subTotal * discountRate;
  
  const gstRate = 0.05; // Standard 5% GST
  const taxableAmount = subTotal - discountAmount;
  const gstAmount = taxableAmount * gstRate;
  const grandTotal = taxableAmount + gstAmount;

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

  const handlePrintReceipt = () => {
    playSound('beep');
    const printArea = document.getElementById('receipt-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    // Modern hidden iframe printing approach (fully sandboxed and pop-up friendly)
    let printIframe = document.getElementById('receipt-print-iframe') as HTMLIFrameElement | null;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'receipt-print-iframe';
      printIframe.style.position = 'absolute';
      printIframe.style.width = '0px';
      printIframe.style.height = '0px';
      printIframe.style.border = 'none';
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!iframeDoc) {
      window.print();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(`
      <html>
        <head>
          <title>Thermal Receipt - ${savedReceipt ? savedReceipt.sale_no : 'Receipt'}</title>
          <style>
            @media print {
              body {
                margin: 0;
                padding: 10px;
                background: #ffffff;
                color: #000000;
              }
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              font-size: 11px;
              line-height: 1.4;
              width: 80mm;
              margin: 0 auto;
              color: #000000;
              background: #ffffff;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .my-1 { margin-top: 4px; margin-bottom: 4px; }
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            .pt-1 { padding-top: 4px; }
            .font-extrabold { font-weight: 800; }
            .font-semibold { font-weight: 600; }
            .text-sm { font-size: 13px; }
            .text-red-600 { color: #000000; }
            .text-slate-500 { color: #000000; }
            .text-slate-400 { color: #000000; }
            .border-t { border-top: 1px solid #000000; }
            .border-dashed { border-style: dashed; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .gap-4 { gap: 16px; }
            .gap-6 { gap: 24px; }
            .logo-img {
              max-height: 40px;
              max-width: 140px;
              object-fit: contain;
              display: block;
              margin: 0 auto 8px auto;
            }
          </style>
        </head>
        <body>
          <div style="width: 76mm; margin: 0 auto;">
            ${printArea.innerHTML}
          </div>
          <script>
            setTimeout(function() {
              window.focus();
              window.print();
            }, 300);
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
  };

  return (
    <div className="flex-1 p-6 bg-[#FEF7E5] flex flex-col justify-between overflow-y-auto select-none font-sans h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Cart & Scan controls (Cols 1-3) */}
        <div className="xl:col-span-3 space-y-6">
          
          {/* Top Panel containing Scanner Input and Details in specific B25712 background */}
          <div className="bg-[#B25712] p-5 rounded-xl shadow-sm border border-amber-100/50 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#FEF7E5]/20 p-2.5 rounded-lg border border-[#FEF7E5]/30">
                <Barcode className="w-6 h-6 text-[#FCC923]" />
              </div>
              <div>
                <h2 className="text-sm font-black text-[#FEF7E5] uppercase leading-none tracking-wide">New Sale Register</h2>
                <span className="text-[10px] text-amber-200/95 font-mono">No. 19925 &bull; Active Cart Session</span>
              </div>
            </div>

            {/* Honeywell hardware keyboard emulator scan input */}
            <form onSubmit={handleScannerSubmit} className="flex-1 max-w-md min-w-[250px]">
              <div className="flex items-center bg-white border border-[#B98B23] rounded-lg px-4 gap-3 py-1">
                <Barcode className="w-5 h-5 text-[#CC9900] animate-pulse shrink-0" />
                <input
                  ref={scannerInputRef}
                  type="text"
                  autoFocus
                  placeholder="SCAN ITEM OR BADGE..."
                  value={scannerInput}
                  onChange={(e) => setScannerInput(e.target.value)}
                  className="bg-transparent border-none outline-none text-[#2F2F2F] font-mono text-xs font-bold tracking-widest flex-1 py-3 px-4 focus:ring-0 uppercase placeholder-[#2F2F2F]/40"
                  id="scanner-input-field"
                />
                <span className="text-[#2F2F2F]/60 text-[9px] font-mono border border-slate-200 px-2 py-0.5 rounded shrink-0 hidden sm:inline">F1: SCAN</span>
              </div>
            </form>

            <div className="flex flex-wrap items-end gap-4">
              {/* Customer dropdown */}
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-amber-200/90 uppercase tracking-widest mb-1">Customer Profile</span>
                <select 
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="bg-white border border-[#B98B23] text-[#2F2F2F] text-xs h-[42px] px-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B98B23] font-semibold font-sans w-full sm:w-[180px]"
                >
                  <option>Walk-In Customer</option>
                  <option>Dorji Hardware Corp</option>
                  <option>Wangdue Builders Ltd</option>
                  <option>Govt Procurement Agency</option>
                </select>
              </div>

              {/* Compact Quick Select Item for manual testing without physical scanner */}
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-amber-200/90 uppercase tracking-widest mb-1">Quick Select Item</span>
                <select 
                  onChange={(e) => {
                    if (e.target.value) {
                      handleDirectScan(e.target.value);
                      e.target.value = ''; // Reset select
                    }
                  }}
                  className="bg-white border border-[#B98B23] text-[#B25712] font-bold text-xs h-[42px] px-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B98B23] font-sans w-full sm:w-[220px]"
                >
                  <option value="" className="text-slate-400 font-normal">-- Choose Item/Badge --</option>
                  <optgroup label="Seeded Products">
                    <option value="900113">Bosch Armature (900113) - Nu. 1,950</option>
                    <option value="900114">Carbon Brush (900114) - Nu. 180</option>
                    <option value="900115">Makita Grinder (900115) - Nu. 3,200</option>
                    <option value="880120">Dewalt Drill (880120) - Nu. 4,500</option>
                    <option value="880121">Screwdriver Set (880121) - Nu. 650</option>
                    <option value="501221">WD-40 Spray (501221) - Nu. 420</option>
                    <option value="302450">Measuring Tape (302450) - Nu. 250</option>
                  </optgroup>
                  <optgroup label="Bhutan Staff Badges">
                    <option value="HQG-BLHT-T001">Dorji (HQG-BLHT-T001) - 20% OFF</option>
                    <option value="EMP102">Karma (EMP102) - 20% OFF</option>
                    <option value="EMP103">Pema (EMP103) - 15% OFF</option>
                  </optgroup>
                </select>
              </div>

              {/* Low Stock Warning Threshold Control */}
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-amber-200/90 uppercase tracking-widest mb-1">Stock Threshold</span>
                <div className="flex items-center bg-white border border-[#B98B23] rounded-lg h-[42px] px-3 w-[120px]">
                  <AlertTriangle className="w-4 h-4 text-[#B25712] mr-2 shrink-0 animate-pulse" />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={lowStockThreshold}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setLowStockThreshold(isNaN(val) ? 0 : val);
                      playSound('beep');
                    }}
                    className="w-full bg-transparent border-none outline-none text-[#2F2F2F] font-bold text-xs"
                    title="Alert trigger threshold"
                  />
                </div>
              </div>

              {/* Reset Basket aligning perfectly with same flex wrapper */}
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-transparent select-none uppercase tracking-widest mb-1 block">Reset</span>
                <button 
                  onClick={handleClearCart}
                  className="bg-[#CC9900] hover:bg-[#b38600] text-white text-xs px-5 h-[42px] rounded-lg font-bold transition border border-[#B98B23] shadow-sm shrink-0 cursor-pointer flex items-center justify-center whitespace-nowrap active:scale-95"
                >
                  Reset Basket
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Banners */}
          {errorStatus && (
            <div className="bg-red-50 border-l-4 border-red-600 text-red-800 p-3 rounded flex items-center gap-2.5 text-xs font-semibold animate-bounce">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
              <span>{errorStatus}</span>
            </div>
          )}

          {infoStatus && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3 rounded flex items-center gap-2.5 text-xs font-semibold">
              <UserCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
              <span>{infoStatus}</span>
            </div>
          )}

          {/* Low Stock Warning Notifications */}
          {lowStockAlerts.map((alert) => (
            <div 
              key={alert.id}
              className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-3.5 rounded-lg flex items-center justify-between gap-3 text-xs font-semibold animate-fadeIn shadow-sm border border-amber-200"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 animate-pulse" />
                <div>
                  <span className="text-amber-700 font-extrabold uppercase tracking-wide text-[10px] block">Low Stock Warning Alert</span>
                  <span className="mt-0.5 block">
                    Scanned item <strong className="font-mono text-[#B25712]">{alert.itemCode}</strong> (<strong>{alert.productName}</strong>) has critically low stock! 
                    Current stock is <strong className="text-red-600 underline font-mono">{alert.stockQty} Units</strong> (Set threshold is {alert.threshold} units).
                  </span>
                </div>
              </div>
              <button
                onClick={() => setLowStockAlerts(prev => prev.filter(a => a.id !== alert.id))}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer transition uppercase shrink-0"
              >
                Dismiss
              </button>
            </div>
          ))}

          {/* Live Scan Monitor (The Mart Display) */}
          {lastScannedProduct ? (
            <div className="bg-white border border-[#B98B23]/30 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fadeIn shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="bg-[#FEF7E5] text-[#B25712] px-3 py-2 rounded-lg font-mono text-xs font-black border border-[#B98B23]/30 shadow-sm shrink-0">
                  {lastScannedProduct.item_code}
                </div>
                <div>
                  <div className="text-[9px] font-black text-[#B98B23] uppercase tracking-widest leading-none">Scanned Product Mart Detail</div>
                  <div className="text-sm font-black text-[#2F2F2F] mt-1.5">{lastScannedProduct.product_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-amber-500/10 pt-3 sm:pt-0">
                <div className="text-left sm:text-right">
                  <div className="text-[9px] text-[#2F2F2F]/60 font-black uppercase tracking-wider">Available Stock</div>
                  <div className="text-xs font-extrabold text-[#2F2F2F] mt-0.5">{lastScannedProduct.stock_qty} Units</div>
                </div>
                <div className="h-8 w-[1px] bg-amber-500/20 hidden sm:block"></div>
                <div className="text-right">
                  <div className="text-[9px] text-[#2F2F2F]/60 font-black uppercase tracking-wider">Product Price</div>
                  <div className="text-lg font-black text-[#B25712] font-mono mt-0.5">Nu. {lastScannedProduct.retail_price.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-amber-100/50 rounded-xl p-5 flex items-center justify-center text-[#2F2F2F]/60 text-xs font-medium italic shadow-sm">
              No product scanned yet. Zap a barcode or select from "Quick Select Item" to display the scanned details and price in the mart!
            </div>
          )}

          {/* Cart Table Data Grid in Sleek Interface design style */}
          <div className="bg-white rounded-xl shadow-sm border border-amber-100/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#B25712] text-white text-[10px] uppercase font-bold tracking-wider h-11 text-center">
                    <th className="px-4 py-2 w-10 text-center text-white border-r border-[#B25712]/10">Sl#</th>
                    <th className="px-4 py-2 w-24 border-r border-[#B25712]/10 text-left pl-4">Item Code</th>
                    <th className="px-4 py-2 border-r border-[#B25712]/10 text-left pl-4">Product Name</th>
                    <th className="px-4 py-2 w-20 border-r border-[#B25712]/10 text-center">Stock</th>
                    <th className="px-4 py-2 w-20 border-r border-[#B25712]/10 text-center">Qty</th>
                    <th className="px-4 py-2 w-24 border-r border-[#B25712]/10 text-right pr-4">SP (Nu.)</th>
                    <th className="px-4 py-2 w-20 border-r border-[#B25712]/10 text-center">Disc%</th>
                    <th className="px-4 py-2 w-28 text-right pr-4">Amount (Nu.)</th>
                    <th className="px-4 py-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/40 font-mono">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-[#2F2F2F]/60 font-sans italic text-xs bg-white">
                        Basket is empty. Zap product barcodes with the scanner to begin checkout!
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => {
                      const amount = item.product.retail_price * item.quantity * (1 - item.discount / 100);
                      return (
                        <tr key={item.product.item_code} className="hover:bg-[#FEF7E5]/50 transition h-12 text-[#2F2F2F] font-semibold border-b border-amber-100/30 bg-white">
                          <td className="px-4 py-2 text-center text-[#2F2F2F]/50 font-sans">{idx + 1}</td>
                          <td className="px-4 py-2 font-mono text-[11px] text-[#2F2F2F]/80">{item.product.item_code}</td>
                          <td className="px-4 py-2 font-sans text-[#2F2F2F] text-xs font-semibold max-w-[200px] truncate" title={item.product.product_name}>{item.product.product_name}</td>
                          <td className="px-4 py-2 text-center text-[11px]">
                            <span className={`px-2 py-0.5 rounded-full font-sans font-black text-[9px] ${
                              item.product.stock_qty <= lowStockThreshold ? 'bg-red-50 text-red-600 border border-red-100 animate-pulse' : 'bg-[#FEF7E5] text-[#B25712] border border-amber-100'
                            }`}>
                              {item.product.stock_qty}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <button 
                                onClick={() => handleQtyChange(item.product.item_code, item.quantity - 1)}
                                className="bg-[#FEF7E5] hover:bg-amber-150 text-[#B25712] p-1.5 rounded-lg border border-amber-100/60 transition cursor-pointer"
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleQtyChange(item.product.item_code, parseInt(e.target.value) || 1)}
                                className="w-12 text-center bg-white border border-[#B98B23] rounded-lg text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#B98B23] p-1 text-[#2F2F2F]"
                              />
                              <button 
                                onClick={() => handleQtyChange(item.product.item_code, item.quantity + 1)}
                                className="bg-[#FEF7E5] hover:bg-amber-150 text-[#B25712] p-1.5 rounded-lg border border-amber-100/60 transition cursor-pointer"
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-right text-[#2F2F2F]/80 font-mono pr-4">{item.product.retail_price.toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount === 0 ? '' : item.discount}
                              placeholder="0"
                              onChange={(e) => handleItemDiscountChange(item.product.item_code, parseFloat(e.target.value) || 0)}
                              className="w-full text-center bg-white border border-[#B98B23] rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-[#B98B23] p-1 text-[#2F2F2F] font-bold"
                            />
                          </td>
                          <td className="px-4 py-2 text-right text-[#2F2F2F] font-bold font-mono pr-4">{amount.toFixed(2)}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleRemoveItem(item.product.item_code)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Remarks & Individual Discount blocks in Sleek layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Remarks block */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-100/50">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Transaction Remarks & Internal Notes
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Type delivery schedules, partial payment terms, or custom instructions here..."
                className="w-full text-xs p-3 bg-white border border-[#B98B23] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B98B23] font-sans focus:bg-white transition text-[#2F2F2F]"
              />
            </div>

            {/* Discount application block */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-100/50 flex flex-col justify-between gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Global Basket Discount (%)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      placeholder="Enter percentage..."
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-3 border border-[#B98B23] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#B98B23] text-[#2F2F2F] font-semibold bg-white"
                    />
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Percent className="w-3.5 h-3.5 text-[#B98B23]" />
                    </div>
                  </div>
                  <button
                    onClick={handleApplyDiscount}
                    className="bg-[#CC9900] hover:bg-[#b38600] text-white font-bold text-xs px-5 py-3 rounded-lg transition uppercase tracking-wide cursor-pointer border border-[#B98B23]"
                  >
                    Apply Discount
                  </button>
                </div>
              </div>

              {/* Display applied discounts (employee badge discounts or manuals) using exact theme styles */}
              <div className="mt-1 text-[10px] flex justify-between items-center">
                {activeEmployee ? (
                  <div className="bg-[#FEF7E5] border-l-4 border-[#B98B23] p-3 rounded-r-lg w-full flex justify-between items-center text-[#B25712]">
                    <span className="font-sans font-semibold">Applied: {activeEmployee.employee_name}</span>
                    <span className="bg-amber-100 text-[#B25712] px-2.5 py-0.5 rounded font-bold font-mono text-[10px]">
                      {(activeEmployee.discount_rate * 100).toFixed(0)}% Employee Discount
                    </span>
                  </div>
                ) : manualDiscountPercent > 0 ? (
                  <div className="bg-[#FEF7E5] border-l-4 border-[#B98B23] p-3 rounded-r-lg w-full flex justify-between items-center text-[#B25712]">
                    <span className="font-sans font-semibold">Applied Manual Discount</span>
                    <span className="bg-amber-100 text-[#B25712] px-2.5 py-0.5 rounded font-bold font-mono text-[10px]">
                      {manualDiscountPercent}% Discount
                    </span>
                  </div>
                ) : (
                  <div className="bg-[#FEF7E5] p-2.5 rounded-lg border border-amber-100/50 w-full text-center text-[#2F2F2F]/60 font-bold italic">
                    No active discount applied to this transaction
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Totals & Calculation Block (Col 4) */}
        <div className="space-y-6">
          
          {/* Checkout calculations in clean white rounded-xl container */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100/50 flex flex-col gap-4 font-sans">
            <h3 className="text-xs font-black text-[#2F2F2F]/60 uppercase tracking-widest border-b border-amber-100/40 pb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#B25712]" />
              Checkout Calculations
            </h3>

            {/* Calculations lines */}
            <div className="space-y-3 text-xs text-[#2F2F2F]">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">SUB TOTAL</span>
                <span className="font-mono font-bold text-[#2F2F2F]">Nu. {subTotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-[#B25712]">
                <span className="font-semibold uppercase tracking-wider text-[10px]">DISCOUNT</span>
                <span className="font-mono font-bold">- Nu. {discountAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">TAXABLE TOTAL</span>
                <span className="font-mono text-[#2F2F2F]">Nu. {taxableAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">GST (5%)</span>
                <span className="font-mono text-[#2F2F2F]">Nu. {gstAmount.toFixed(2)}</span>
              </div>

              <div className="flex flex-col gap-2 border-t border-dashed border-amber-100 pt-4 mt-2">
                <span className="font-black text-[#2F2F2F] uppercase text-[10px] tracking-wider">Total Due</span>
                {/* Outstanding Financial Highlight: bold, oversized, with color #FCC923 popping out of a dark high-contrast box */}
                <div className="bg-[#2F2F2F] p-2.5 sm:p-3.5 rounded-xl border border-slate-700/30 flex justify-between items-center shadow-inner mt-1">
                  <span className="text-[9px] sm:text-[10px] font-black text-[#FEF7E5]/80 uppercase tracking-widest">NET PAYABLE</span>
                  <span className="font-mono text-xs sm:text-sm md:text-base lg:text-lg font-black text-[#FCC923]">Nu. {grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Cash Management variables in elegant White card container */}
          <div className="bg-white rounded-xl p-6 border border-amber-100/50 flex flex-col gap-4 font-sans shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-amber-150/40 pb-3">Cash Management</h3>

            <div className="flex flex-col gap-4">
              {/* Payment Method Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('Cash')}
                    className={`py-3 px-2 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer hover:brightness-95 active:scale-[0.98] ${
                      paymentType === 'Cash'
                        ? 'bg-[#CC9900] border-[#B98B23] text-white shadow-md scale-[1.02]'
                        : 'bg-white border-amber-100 text-[#2F2F2F] hover:bg-[#FEF7E5]'
                    }`}
                  >
                    <Coins className="w-5 h-5" />
                    <span>CASH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('Online')}
                    className={`py-3 px-2 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer hover:brightness-95 active:scale-[0.98] ${
                      paymentType === 'Online'
                        ? 'bg-[#CC9900] border-[#B98B23] text-white shadow-md scale-[1.02]'
                        : 'bg-white border-amber-100 text-[#2F2F2F] hover:bg-[#FEF7E5]'
                    }`}
                  >
                    <Barcode className="w-5 h-5" />
                    <span>ONLINE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('Credit')}
                    className={`py-3 px-2 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer hover:brightness-95 active:scale-[0.98] ${
                      paymentType === 'Credit'
                        ? 'bg-[#CC9900] border-[#B98B23] text-white shadow-md scale-[1.02]'
                        : 'bg-white border-amber-100 text-[#2F2F2F] hover:bg-[#FEF7E5]'
                    }`}
                  >
                    <UserCheck className="w-5 h-5" />
                    <span>CREDIT</span>
                  </button>
                </div>
              </div>

              {/* If Credit, show bill notice */}
              {paymentType === 'Credit' && (
                <div className="bg-[#FEF7E5] text-[#2F2F2F] border border-amber-200 p-3 rounded-lg text-[11px] font-sans flex flex-col gap-1 animate-fadeIn">
                  <div className="font-extrabold text-[#B25712] uppercase tracking-wide text-[10px]">Charge to Credit Ledger</div>
                  <div>This transaction will be logged as <strong>Unpaid Account Credit</strong> under customer: <strong className="underline text-[#2F2F2F]">{selectedCustomer}</strong>.</div>
                </div>
              )}

              {/* If Online, select Bank */}
              {paymentType === 'Online' && (
                <div className="flex flex-col gap-2 bg-[#FEF7E5]/45 p-3 rounded-lg border border-amber-100">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Select Bank (Bhutan)
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['BOB', 'BNB', 'DK'] as const).map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        className={`py-2 px-1 rounded-md font-extrabold text-xs text-center border transition cursor-pointer ${
                          selectedBank === bank
                            ? 'bg-[#B25712] border-[#B25712] text-white shadow-sm'
                            : 'bg-white border-amber-150 text-[#2F2F2F] hover:bg-[#FEF7E5]'
                        }`}
                      >
                        {bank}
                      </button>
                    ))}
                  </div>
                  <div className="text-[9px] text-[#B98B23] font-medium mt-1 text-center font-mono uppercase tracking-wide">
                    QR Pay &bull; {selectedBank === 'BOB' ? 'Bank of Bhutan' : selectedBank === 'BNB' ? 'Bhutan National Bank' : 'Druk PNB (DK)'}
                  </div>
                </div>
              )}

              {/* Tendered input styled with antique gold border */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Amount Tendered (Nu.)
                </label>
                <div className="text-2xl font-mono text-[#2F2F2F] bg-white border border-[#B98B23] p-3 px-4 rounded-lg flex items-center justify-between shadow-sm focus-within:ring-1 focus-within:ring-[#B98B23] transition">
                  <span className="text-slate-400 text-sm">Nu.</span>
                  <input
                    type="number"
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent text-right outline-none font-bold text-lg w-full text-[#2F2F2F]"
                  />
                </div>
              </div>

              {/* Balance Return styled beautifully in warm container */}
              <div className="flex flex-col items-center justify-center p-4 bg-[#FEF7E5] rounded-lg border border-amber-100 shadow-inner">
                <span className="text-[10px] font-black text-[#B98B23] uppercase tracking-wider">Balance Return</span>
                <span className="text-2xl font-mono font-black text-[#B25712]">Nu. {changeDue.toFixed(2)}</span>
              </div>
            </div>

            {/* Complete Transaction Premium Vibrant Gold Button */}
            <button
              onClick={handleSaveCheckout}
              className="w-full h-11 sm:h-12 md:h-14 bg-[#CC9900] hover:bg-[#b38600] text-white font-black text-[10px] sm:text-xs md:text-sm shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 uppercase tracking-wide cursor-pointer rounded-xl border border-[#B98B23]"
            >
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
              <span>Complete Transaction [F10]</span>
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Shortcuts Ribbon (Sleek Space Theme) */}
      <footer className="bg-[#2F2F2F] mt-6 px-6 py-3 rounded-xl flex flex-wrap items-center justify-between text-[11px] font-bold text-[#FEF7E5]/80 border border-slate-700/45 shadow-lg select-none">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="bg-[#FEF7E5]/10 text-[#FCC923] px-2.5 py-1 rounded-md font-mono text-[9px] border border-slate-700 shadow-sm">Alt + S</span>
            <span className="text-slate-200">New Sale Scan</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#FEF7E5]/10 text-[#FCC923] px-2.5 py-1 rounded-md font-mono text-[9px] border border-slate-700 shadow-sm">Alt + T</span>
            <span className="text-slate-200">Sales Return</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#FEF7E5]/10 text-[#FCC923] px-2.5 py-1 rounded-md font-mono text-[9px] border border-slate-700 shadow-sm">Ctrl + H</span>
            <span className="text-slate-200">Hold Cart</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#FCC923] text-[#2F2F2F] px-2.5 py-1 rounded-md font-mono text-[9px] border border-amber-500/20 shadow-sm font-black">F10</span>
            <span className="text-[#FCC923] font-bold">Complete Trans</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#FEF7E5]/10 text-[#FCC923] px-2.5 py-1 rounded-md font-mono text-[9px] border border-slate-700 shadow-sm">ESC</span>
            <span className="text-slate-200">Logout Session</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span>Active Scanner Status:</span>
          <span className="px-2 py-0.5 bg-slate-800 text-emerald-400 rounded-md font-bold animate-pulse border border-emerald-950/20 text-[9px] uppercase tracking-wide">
            AUTO-SCAN READY
          </span>
        </div>
      </footer>

      {/* Printable Receipt Modal Overlay */}
      {savedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full border border-slate-300 overflow-hidden text-slate-900 font-mono">
            {/* Modal actions */}
            <div className="bg-[#2F2F2F] text-white px-4 py-2.5 flex justify-between items-center text-xs font-sans">
              <span className="font-bold">Thermal Receipt Preview</span>
              <button 
                onClick={() => setSavedReceipt(null)}
                className="text-slate-300 hover:text-white font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Receipt Printable layout */}
            <div id="receipt-print-area" className="p-5 max-h-[450px] overflow-y-auto text-xs font-mono text-slate-800 flex flex-col items-center bg-white">
              <img 
                src={logoImg} 
                className="h-10 max-w-[140px] object-contain mb-2.5" 
                alt="HQ Enterprise Logo" 
                referrerPolicy="no-referrer" 
              />
              <h2 className="font-extrabold text-sm text-center uppercase tracking-wide text-[#2F2F2F]">HIGH QUALITY ENTERPRISE</h2>
              <p className="text-[10px] text-center">Enterprise Station, Thimphu, Bhutan</p>
              <p className="text-[10px] text-center">TEL: +975-2-324567 &bull; ID: 01</p>
              
              <p className="text-[10px] my-1 text-center font-bold">
                --------------------------------
              </p>
              
              <div className="w-full text-[10px]">
                <div className="flex justify-between">
                  <span>SALE NO:</span>
                  <span className="font-bold">{savedReceipt.sale_no}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span>{new Date(savedReceipt.transaction_date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CASHIER:</span>
                  <span className="uppercase">{currentUser?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span className="uppercase">{selectedCustomer}</span>
                </div>
              </div>

              <p className="text-[10px] my-1 text-center font-bold">
                ================================
              </p>

              <div className="w-full text-[10px] space-y-1">
                <div className="flex justify-between font-extrabold">
                  <span>ITEM</span>
                  <div className="flex gap-4">
                    <span>QTY</span>
                    <span>AMOUNT</span>
                  </div>
                </div>
                {savedReceipt.items && savedReceipt.items.map((it: any) => (
                  <div key={it.item_code} className="flex justify-between">
                    <span className="truncate max-w-[150px]">{it.product_name || it.item_code}</span>
                    <div className="flex gap-6">
                      <span>x{it.quantity}</span>
                      <span>{((it.unit_price || it.retail_price || 0) * it.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[10px] my-1 text-center font-bold">
                --------------------------------
              </p>

              <div className="w-full text-[10px] space-y-1">
                <div className="flex justify-between font-semibold">
                  <span>SUBTOTAL:</span>
                  <span>Nu. {savedReceipt.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-[#B25712]">
                  <span>DISCOUNT:</span>
                  <span>-Nu. {savedReceipt.discount_applied.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>GST CHARGED (5%):</span>
                  <span>Nu. {((savedReceipt.net_amount - (savedReceipt.total_amount - savedReceipt.discount_applied))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm border-t border-dashed border-slate-400 pt-1">
                  <span>GRAND TOTAL:</span>
                  <span>Nu. {savedReceipt.net_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[9px] pt-1">
                  <span>PAYMENT METHOD:</span>
                  <span className="font-bold uppercase">{savedReceipt.payment_method}</span>
                </div>
              </div>

              <p className="text-[10px] my-2 text-center font-bold">
                ================================
              </p>
              
              <p className="text-[9px] text-center italic">Thank You for Shopping with High Quality Enterprise!</p>
              <p className="text-[8px] text-center text-slate-400">Professional Enterprise POS Solution</p>
            </div>

            {/* Print trigger */}
            <div className="bg-[#FEF7E5]/55 p-4 flex flex-col gap-2.5 border-t border-amber-100">
              <button 
                onClick={handlePrintReceipt}
                className="w-full bg-[#CC9900] hover:bg-[#b38600] text-white py-3 rounded-xl text-xs font-sans font-black uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:translate-y-[-1px] cursor-pointer border border-[#B98B23]"
              >
                <Printer className="w-4 h-4 text-white" />
                Print Thermal Receipt
              </button>
              <button 
                onClick={() => setSavedReceipt(null)}
                className="w-full bg-[#2F2F2F] hover:bg-slate-900 text-slate-100 py-2.5 rounded-lg text-xs font-sans font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Close & New Checkout
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
