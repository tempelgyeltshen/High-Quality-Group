import { Calculator, Percent, Coins, UserCheck, Barcode, Receipt } from 'lucide-react';
import type { Employee } from '../../types';
import type { PaymentType, BankCode } from './types';
import { playSound } from '../../utils/sound';

interface PaymentPanelProps {
  subTotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  activeEmployee: Employee | null;
  manualDiscountPercent: number;
  discountInput: string;
  onDiscountInput: (value: string) => void;
  onApplyDiscount: () => void;
  paymentType: PaymentType;
  onPaymentTypeChange: (type: PaymentType) => void;
  selectedBank: BankCode;
  onBankChange: (bank: BankCode) => void;
  selectedCustomer: string;
  tenderedAmount: string;
  onTenderedAmount: (value: string) => void;
  changeDue: number;
  cartCount: number;
  onSave: () => void;
}

const PAYMENT_MODES: { type: PaymentType; label: string; Icon: typeof Coins }[] = [
  { type: 'Cash', label: 'CASH', Icon: Coins },
  { type: 'Online', label: 'ONLINE', Icon: Barcode },
  { type: 'Credit', label: 'CREDIT', Icon: UserCheck },
];

const BANK_LABELS: Record<BankCode, string> = {
  BOB: 'Bank of Bhutan',
  BNB: 'Bhutan National Bank',
  DK: 'Druk PNB (DK)',
};

/** Right column: totals summary, discounts, payment mode, tender and submit. */
export default function PaymentPanel(props: PaymentPanelProps) {
  const {
    subTotal, discountAmount, taxableAmount, gstAmount, grandTotal,
    activeEmployee, manualDiscountPercent, discountInput, onDiscountInput, onApplyDiscount,
    paymentType, onPaymentTypeChange, selectedBank, onBankChange, selectedCustomer,
    tenderedAmount, onTenderedAmount, changeDue, cartCount, onSave,
  } = props;

  return (
    <div className="space-y-6">
      {/* Checkout calculations */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100/50 flex flex-col gap-4 font-sans">
        <h3 className="text-xs font-black text-[#2F2F2F]/60 uppercase tracking-widest border-b border-amber-100/40 pb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-[#B25712]" />
          Checkout Calculations
        </h3>

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
            <div className="bg-[#2F2F2F] p-2.5 sm:p-3.5 rounded-xl border border-slate-700/30 flex justify-between items-center shadow-inner mt-1">
              <span className="text-[9px] sm:text-[10px] font-black text-[#FEF7E5]/80 uppercase tracking-widest">NET PAYABLE</span>
              <span className="font-mono text-xs sm:text-sm md:text-base lg:text-lg font-black text-[#FCC923]">Nu. {grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks & discount application */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 xl:grid-cols-1">
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
                  onChange={(e) => onDiscountInput(e.target.value)}
                  className="w-full pl-8 pr-3 py-3 border border-[#B98B23] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#B98B23] text-[#2F2F2F] font-semibold bg-white"
                />
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                  <Percent className="w-3.5 h-3.5 text-[#B98B23]" />
                </div>
              </div>
              <button
                onClick={onApplyDiscount}
                className="bg-[#CC9900] hover:bg-[#b38600] text-white font-bold text-xs px-5 py-3 rounded-lg transition uppercase tracking-wide cursor-pointer border border-[#B98B23]"
              >
                Apply Discount
              </button>
            </div>
          </div>

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

      {/* Payment & cash management */}
      <div className="bg-white rounded-xl p-6 border border-amber-100/50 flex flex-col gap-4 font-sans shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-amber-150/40 pb-3">Cash Management</h3>

        <div className="flex flex-col gap-4">
          {/* Payment Method Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_MODES.map(({ type, label, Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onPaymentTypeChange(type)}
                  className={`py-3 px-2 rounded-xl font-bold text-[11px] flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer hover:brightness-95 active:scale-[0.98] ${
                    paymentType === type
                      ? 'bg-[#CC9900] border-[#B98B23] text-white shadow-md scale-[1.02]'
                      : 'bg-white border-amber-100 text-[#2F2F2F] hover:bg-[#FEF7E5]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* If Credit, show bill notice */}
          {paymentType === 'Credit' && (
            <div className="bg-[#FEF7E5] text-[#2F2F2F] border border-amber-200 p-3 rounded-lg text-[11px] font-sans flex flex-col gap-1 animate-fadeIn">
              <div className="font-extrabold text-[#B25712] uppercase tracking-wide text-[10px]">Charge to Credit Ledger</div>
              <div>
                This transaction will be logged as <strong>Unpaid Account Credit</strong> under customer:{' '}
                <strong className="underline text-[#2F2F2F]">{selectedCustomer}</strong>.
              </div>
            </div>
          )}

          {/* If Online, select Bank */}
          {paymentType === 'Online' && (
            <div className="flex flex-col gap-2 bg-[#FEF7E5]/45 p-3 rounded-lg border border-amber-100">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Select Bank (Bhutan)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['BOB', 'BNB', 'DK'] as const).map((bank) => (
                  <button
                    key={bank}
                    type="button"
                    onClick={() => onBankChange(bank)}
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
                QR Pay &bull; {BANK_LABELS[selectedBank]}
              </div>
            </div>
          )}

          {/* Tendered input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Amount Tendered (Nu.)</label>
            <div className="text-2xl font-mono text-[#2F2F2F] bg-white border border-[#B98B23] p-3 px-4 rounded-lg flex items-center justify-between shadow-sm focus-within:ring-1 focus-within:ring-[#B98B23] transition">
              <span className="text-slate-400 text-sm">Nu.</span>
              <input
                type="number"
                value={tenderedAmount}
                onChange={(e) => onTenderedAmount(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-right outline-none font-bold text-lg w-full text-[#2F2F2F]"
              />
            </div>
          </div>

          {/* Balance Return */}
          <div className="flex flex-col items-center justify-center p-4 bg-[#FEF7E5] rounded-lg border border-amber-100 shadow-inner">
            <span className="text-[10px] font-black text-[#B98B23] uppercase tracking-wider">Balance Return</span>
            <span className="text-2xl font-mono font-black text-[#B25712]">Nu. {changeDue.toFixed(2)}</span>
          </div>
        </div>

        {/* Complete Transaction */}
        <button
          onClick={() => {
            if (cartCount === 0) playSound('error');
            onSave();
          }}
          className="w-full h-11 sm:h-12 md:h-14 bg-[#CC9900] hover:bg-[#b38600] text-white font-black text-[10px] sm:text-xs md:text-sm shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-1.5 sm:gap-2 active:scale-95 uppercase tracking-wide cursor-pointer rounded-xl border border-[#B98B23]"
        >
          <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
          <span>Complete Transaction [F10]</span>
        </button>
      </div>
    </div>
  );
}
