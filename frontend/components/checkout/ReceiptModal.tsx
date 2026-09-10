import { Printer } from 'lucide-react';
// @ts-ignore
import logoImg from '../../assets/images/Logo.svg';

interface ReceiptModalProps {
  receipt: any;
  cashierName: string;
  customerName: string;
  onClose: () => void;
  onPrint: () => void;
}

/** Modal overlay previewing the saved sale as a printable thermal receipt. */
export default function ReceiptModal({ receipt, cashierName, customerName, onClose, onPrint }: ReceiptModalProps) {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full border border-slate-300 overflow-hidden text-slate-900 font-mono">
        {/* Modal actions */}
        <div className="bg-[#2F2F2F] text-white px-4 py-2.5 flex justify-between items-center text-xs font-sans">
          <span className="font-bold">Thermal Receipt Preview</span>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white font-bold cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Receipt printable layout */}
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

          <p className="text-[10px] my-1 text-center font-bold">--------------------------------</p>

          <div className="w-full text-[10px]">
            <div className="flex justify-between">
              <span>SALE NO:</span>
              <span className="font-bold">{receipt.sale_no}</span>
            </div>
            <div className="flex justify-between">
              <span>DATE:</span>
              <span>{new Date(receipt.transaction_date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>CASHIER:</span>
              <span className="uppercase">{cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>CUSTOMER:</span>
              <span className="uppercase">{customerName}</span>
            </div>
          </div>

          <p className="text-[10px] my-1 text-center font-bold">================================</p>

          <div className="w-full text-[10px] space-y-1">
            <div className="flex justify-between font-extrabold">
              <span>ITEM</span>
              <div className="flex gap-4">
                <span>QTY</span>
                <span>AMOUNT</span>
              </div>
            </div>
            {receipt.items && receipt.items.map((it: any) => (
              <div key={it.item_code} className="flex justify-between">
                <span className="truncate max-w-[150px]">{it.product_name || it.item_code}</span>
                <div className="flex gap-6">
                  <span>x{it.quantity}</span>
                  <span>{((it.unit_price || it.retail_price || 0) * it.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] my-1 text-center font-bold">--------------------------------</p>

          <div className="w-full text-[10px] space-y-1">
            <div className="flex justify-between font-semibold">
              <span>SUBTOTAL:</span>
              <span>Nu. {receipt.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-[#B25712]">
              <span>DISCOUNT:</span>
              <span>-Nu. {receipt.discount_applied.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>GST CHARGED (5%):</span>
              <span>Nu. {((receipt.net_amount - (receipt.total_amount - receipt.discount_applied))).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-extrabold text-sm border-t border-dashed border-slate-400 pt-1">
              <span>GRAND TOTAL:</span>
              <span>Nu. {receipt.net_amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[9px] pt-1">
              <span>PAYMENT METHOD:</span>
              <span className="font-bold uppercase">{receipt.payment_method}</span>
            </div>
          </div>

          <p className="text-[10px] my-2 text-center font-bold">================================</p>

          <p className="text-[9px] text-center italic">Thank You for Shopping with High Quality Enterprise!</p>
          <p className="text-[8px] text-center text-slate-400">Professional Enterprise POS Solution</p>
        </div>

        {/* Print trigger */}
        <div className="bg-[#FEF7E5]/55 p-4 flex flex-col gap-2.5 border-t border-amber-100">
          <button
            onClick={onPrint}
            className="w-full bg-[#CC9900] hover:bg-[#b38600] text-white py-3 rounded-xl text-xs font-sans font-black uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:translate-y-[-1px] cursor-pointer border border-[#B98B23]"
          >
            <Printer className="w-4 h-4 text-white" />
            Print Thermal Receipt
          </button>
          <button
            onClick={onClose}
            className="w-full bg-[#2F2F2F] hover:bg-slate-900 text-slate-100 py-2.5 rounded-lg text-xs font-sans font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Close &amp; New Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
