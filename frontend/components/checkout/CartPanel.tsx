import { AlertTriangle, UserCheck, Plus, Minus, Trash2 } from 'lucide-react';
import type { CartItem, LowStockAlert } from './types';
import type { Product } from '../../types';

interface CartPanelProps {
  cart: CartItem[];
  lowStockThreshold: number;
  lastScannedProduct: Product | null;
  lowStockAlerts: LowStockAlert[];
  errorStatus: string | null;
  infoStatus: string | null;
  onDismissAlert: (id: string) => void;
  onQtyChange: (itemCode: string, qty: number) => void;
  onItemDiscountChange: (itemCode: string, disc: number) => void;
  onRemoveItem: (itemCode: string) => void;
}

const FeedbackBanners = ({ error, info }: { error: string | null; info: string | null }) => (
  <>
    {error && (
      <div className="bg-red-50 border-l-4 border-red-600 text-red-800 p-3 rounded flex items-center gap-2.5 text-xs font-semibold animate-bounce">
        <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
        <span>{error}</span>
      </div>
    )}
    {info && (
      <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3 rounded flex items-center gap-2.5 text-xs font-semibold">
        <UserCheck className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
        <span>{info}</span>
      </div>
    )}
  </>
);

const LowStockBanners = ({ alerts, onDismiss }: { alerts: LowStockAlert[]; onDismiss: (id: string) => void }) => (
  <>
    {alerts.map((alert) => (
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
          onClick={() => onDismiss(alert.id)}
          className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer transition uppercase shrink-0"
        >
          Dismiss
        </button>
      </div>
    ))}
  </>
);

const ScanMonitor = ({ product }: { product: Product | null }) =>
  product ? (
    <div className="bg-white border border-[#B98B23]/30 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fadeIn shadow-sm">
      <div className="flex items-center gap-3.5">
        <div className="bg-[#FEF7E5] text-[#B25712] px-3 py-2 rounded-lg font-mono text-xs font-black border border-[#B98B23]/30 shadow-sm shrink-0">
          {product.item_code}
        </div>
        <div>
          <div className="text-[9px] font-black text-[#B98B23] uppercase tracking-widest leading-none">Scanned Product Mart Detail</div>
          <div className="text-sm font-black text-[#2F2F2F] mt-1.5">{product.product_name}</div>
        </div>
      </div>
      <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-amber-500/10 pt-3 sm:pt-0">
        <div className="text-left sm:text-right">
          <div className="text-[9px] text-[#2F2F2F]/60 font-black uppercase tracking-wider">Available Stock</div>
          <div className="text-xs font-extrabold text-[#2F2F2F] mt-0.5">{product.stock_qty} Units</div>
        </div>
        <div className="h-8 w-[1px] bg-amber-500/20 hidden sm:block"></div>
        <div className="text-right">
          <div className="text-[9px] text-[#2F2F2F]/60 font-black uppercase tracking-wider">Product Price</div>
          <div className="text-lg font-black text-[#B25712] font-mono mt-0.5">Nu. {product.retail_price.toFixed(2)}</div>
        </div>
      </div>
    </div>
  ) : (
    <div className="bg-white border border-amber-100/50 rounded-xl p-5 flex items-center justify-center text-[#2F2F2F]/60 text-xs font-medium italic shadow-sm">
      No product scanned yet. Zap a barcode or select from "Quick Select Item" to display the scanned details and price in the mart!
    </div>
  );

/** Cart table plus feedback, low-stock and scan-monitor banners. */
export default function CartPanel(props: CartPanelProps) {
  const {
    cart, lowStockThreshold, lastScannedProduct, lowStockAlerts,
    errorStatus, infoStatus, onDismissAlert, onQtyChange, onItemDiscountChange, onRemoveItem,
  } = props;

  return (
    <div className="space-y-6">
      <FeedbackBanners error={errorStatus} info={infoStatus} />
      <LowStockBanners alerts={lowStockAlerts} onDismiss={onDismissAlert} />
      <ScanMonitor product={lastScannedProduct} />

      {/* Cart Table Data Grid */}
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
                            onClick={() => onQtyChange(item.product.item_code, item.quantity - 1)}
                            className="bg-[#FEF7E5] hover:bg-amber-150 text-[#B25712] p-1.5 rounded-lg border border-amber-100/60 transition cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => onQtyChange(item.product.item_code, parseInt(e.target.value) || 1)}
                            className="w-12 text-center bg-white border border-[#B98B23] rounded-lg text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#B98B23] p-1 text-[#2F2F2F]"
                          />
                          <button
                            onClick={() => onQtyChange(item.product.item_code, item.quantity + 1)}
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
                          onChange={(e) => onItemDiscountChange(item.product.item_code, parseFloat(e.target.value) || 0)}
                          className="w-full text-center bg-white border border-[#B98B23] rounded-lg text-[11px] focus:outline-none focus:ring-1 focus:ring-[#B98B23] p-1 text-[#2F2F2F] font-bold"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-[#2F2F2F] font-bold font-mono pr-4">{amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => onRemoveItem(item.product.item_code)}
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
    </div>
  );
}
