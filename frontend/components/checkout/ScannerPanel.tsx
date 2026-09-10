import React from 'react';
import { Barcode, AlertTriangle } from 'lucide-react';
import type { LowStockAlert } from './types';

interface ScannerPanelProps {
  scannerInput: string;
  onScannerInput: (value: string) => void;
  onScannerSubmit: () => void;
  scannerInputRef: React.RefObject<HTMLInputElement | null>;
  selectedCustomer: string;
  onCustomerChange: (value: string) => void;
  onQuickSelect: (code: string) => void;
  lowStockThreshold: number;
  onThresholdChange: (value: number) => void;
  onResetBasket: () => void;
}

const QUICK_PRODUCTS: { code: string; label: string }[] = [
  { code: '900113', label: 'Bosch Armature (900113) - Nu. 1,950' },
  { code: '900114', label: 'Carbon Brush (900114) - Nu. 180' },
  { code: '900115', label: 'Makita Grinder (900115) - Nu. 3,200' },
  { code: '880120', label: 'Dewalt Drill (880120) - Nu. 4,500' },
  { code: '880121', label: 'Screwdriver Set (880121) - Nu. 650' },
  { code: '501221', label: 'WD-40 Spray (501221) - Nu. 420' },
  { code: '302450', label: 'Measuring Tape (302450) - Nu. 250' },
];

const QUICK_BADGES: { code: string; label: string }[] = [
  { code: 'HQG-BLHT-T001', label: 'Dorji (HQG-BLHT-T001) - 20% OFF' },
  { code: 'EMP102', label: 'Karma (EMP102) - 20% OFF' },
  { code: 'EMP103', label: 'Pema (EMP103) - 15% OFF' },
];

/** Header bar: hardware-scanner input plus customer, quick-select and reset controls. */
export default function ScannerPanel(props: ScannerPanelProps) {
  const {
    scannerInput, onScannerInput, onScannerSubmit, scannerInputRef,
    selectedCustomer, onCustomerChange, onQuickSelect,
    lowStockThreshold, onThresholdChange, onResetBasket,
  } = props;

  return (
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onScannerSubmit();
        }}
        className="flex-1 max-w-md min-w-[250px]"
      >
        <div className="flex items-center bg-white border border-[#B98B23] rounded-lg px-4 gap-3 py-1">
          <Barcode className="w-5 h-5 text-[#CC9900] animate-pulse shrink-0" />
          <input
            ref={scannerInputRef}
            type="text"
            autoFocus
            placeholder="SCAN ITEM OR BADGE..."
            value={scannerInput}
            onChange={(e) => onScannerInput(e.target.value)}
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
            onChange={(e) => onCustomerChange(e.target.value)}
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
                onQuickSelect(e.target.value);
                e.target.value = ''; // Reset select
              }
            }}
            className="bg-white border border-[#B98B23] text-[#B25712] font-bold text-xs h-[42px] px-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B98B23] font-sans w-full sm:w-[220px]"
          >
            <option value="" className="text-slate-400 font-normal">-- Choose Item/Badge --</option>
            <optgroup label="Seeded Products">
              {QUICK_PRODUCTS.map((p) => (
                <option key={p.code} value={p.code}>{p.label}</option>
              ))}
            </optgroup>
            <optgroup label="Bhutan Staff Badges">
              {QUICK_BADGES.map((b) => (
                <option key={b.code} value={b.code}>{b.label}</option>
              ))}
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
                onThresholdChange(isNaN(val) ? 0 : val);
              }}
              className="w-full bg-transparent border-none outline-none text-[#2F2F2F] font-bold text-xs"
              title="Alert trigger threshold"
            />
          </div>
        </div>

        {/* Reset Basket */}
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-transparent select-none uppercase tracking-widest mb-1 block">Reset</span>
          <button
            onClick={onResetBasket}
            className="bg-[#CC9900] hover:bg-[#b38600] text-white text-xs px-5 h-[42px] rounded-lg font-bold transition border border-[#B98B23] shadow-sm shrink-0 cursor-pointer flex items-center justify-center whitespace-nowrap active:scale-95"
          >
            Reset Basket
          </button>
        </div>
      </div>
    </div>
  );
}
