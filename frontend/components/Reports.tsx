import { useState, useEffect, Fragment } from 'react';
import { 
  CalendarDays, 
  Search, 
  FileText, 
  TrendingUp, 
  Percent, 
  Coins, 
  Layers, 
  Eye, 
  CreditCard,
  Undo2,
  Printer,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { Sale, Product } from '../types';
// @ts-ignore
import logoImg from '../assets/images/Logo.png';

interface ReportsProps {
  mode: 'credit' | 'return' | 'day-end' | 'gst';
  currentUser: any;
}

export default function Reports({ mode, currentUser }: ReportsProps) {
  const getTodayLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayLocalDateString();

  // Date filters
  const [fromDate, setFromDate] = useState(() => getTodayLocalDateString());
  const [toDate, setToDate] = useState(() => getTodayLocalDateString());
  const [paymentDate, setPaymentDate] = useState(() => getTodayLocalDateString());

  // Search and filter states
  const [searchSaleNo, setSearchSaleNo] = useState('');
  const [searchItemCode, setSearchItemCode] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('All');
  const [selectedCustomer, setSelectedCustomer] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');

  // DB Data states
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState({
    total_cash_sales: 0,
    total_bank_sales: 0,
    total_credit_sales: 0,
    total_discount_claims: 0,
    net_revenue: 0,
    total_transactions: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected receipt preview
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [actionStatus, setActionStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (message: string, type: 'success' | 'error' = 'success') => {
    setActionStatus({ message, type });
    setTimeout(() => setActionStatus(null), 5000);
  };

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        from: fromDate,
        to: toDate
      });
      const response = await fetch(`/api/sales/report/day-end?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve shift aggregates');
      }
      const data = await response.json();
      setSales(data.sales);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'Error communicating with database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [fromDate, toDate, mode]);

  const handleDisplay = () => {
    fetchReportData();
  };

  const handleClear = () => {
    setFromDate(todayStr);
    setToDate(todayStr);
    setSearchSaleNo('');
    setSearchItemCode('');
    setSelectedAgent('All');
    setSelectedCustomer('All');
    setSelectedLocation('All');
  };

  const handlePrintDuplicateReceipt = () => {
    if (!selectedReceipt) return;
    const printArea = document.getElementById('report-receipt-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Thermal Receipt - \${selectedReceipt.sale_no}</title>
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
            .border-t { border-top: 1px solid #000000; }
            .border-dashed { border-style: dashed; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .logo-img {
              max-height: 40px;
              max-width: 140px;
              object-fit: contain;
              display: block;
              margin: 0 auto 8px auto;
            }
          </style>
        </head>
        <body onload="setTimeout(function(){ window.print(); window.close(); }, 350);">
          <div style="width: 80mm;">
            \${printArea.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Record safe persistent credit payment
  const handleRecordCreditPayment = async (saleNo: string) => {
    if (!confirm(`Are you sure you want to record credit payment for Sale No. ${saleNo}?`)) return;
    try {
      const res = await fetch(`/api/sales/${saleNo}/payment`, {
        method: 'PUT'
      });
      if (res.ok) {
        showStatus(`Credit payment of invoice ${saleNo} saved successfully.`, 'success');
        fetchReportData();
      } else {
        const err = await res.json();
        showStatus(`Error: ${err.error || 'Failed to update ledger'}`, 'error');
      }
    } catch (e) {
      showStatus('Network failure recording payment.', 'error');
    }
  };

  // Process Sales Return and restock products list
  const handleProcessReturn = async (saleNo: string) => {
    if (!confirm(`Are you sure you want to return and restock items for Sale No. ${saleNo}? This will refund the amount and replenish inventory.`)) return;
    try {
      const res = await fetch(`/api/sales/${saleNo}/return`, {
        method: 'PUT'
      });
      if (res.ok) {
        showStatus(`Sale invoice ${saleNo} successfully marked as Returned. Items restocked into SQLite inventory.`, 'success');
        fetchReportData();
      } else {
        const err = await res.json();
        showStatus(`Error: ${err.error || 'Failed to process return'}`, 'error');
      }
    } catch (e) {
      showStatus('Network failure processing return.', 'error');
    }
  };

  // Filter local sales lists based on search inputs
  const filteredSales = sales.filter(sale => {
    if (searchSaleNo && !sale.sale_no.toLowerCase().includes(searchSaleNo.toLowerCase())) {
      return false;
    }
    if (selectedAgent !== 'All' && sale.payment_method === 'Credit' && selectedAgent !== 'thimphucounter') {
      // Sourced from currentUser or cashier
      return false;
    }
    if (selectedCustomer !== 'All' && sale.customer_name && sale.customer_name !== selectedCustomer) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 p-6 bg-[#FEF7E5] overflow-y-auto font-sans h-[calc(100vh-3.5rem)] select-none">
      
      {/* 1. View Header with Orange box style exactly matching images */}
      <div className="bg-[#B25712] text-white px-5 py-3 rounded-t-lg font-black text-xs uppercase tracking-wider shadow-sm flex justify-between items-center border-b border-amber-100/30">
        <span>
          {mode === 'day-end' && 'DAY END REPORT'}
          {mode === 'credit' && 'CREDIT REPORT'}
          {mode === 'return' && 'SALE REGISTER (SALES RETURNS)'}
          {mode === 'gst' && 'GST RETURN REPORT'}
        </span>
        <span className="text-[10px] font-mono text-[#FCC923] uppercase">
          Station: Thimphu Counter &bull; Active Connection
        </span>
      </div>

      {/* Action Notification Banner */}
      {actionStatus && (
        <div className={`p-4 rounded-b-lg text-xs font-bold border-x border-b flex items-center gap-2.5 shadow-sm animate-fadeIn ${
          actionStatus.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className={`w-4.5 h-4.5 shrink-0 ${actionStatus.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`} />
          <span>{actionStatus.message}</span>
        </div>
      )}

      {/* 2. Filters Row styled exactly like screenshots */}
      <div className="bg-white p-5 rounded-b-lg shadow-sm border-x border-b border-amber-100 flex flex-wrap gap-4 items-end justify-between mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          
          {/* Sale No. filter (for Sale Register / Return screen) */}
          {mode === 'return' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale No.</span>
              <input
                type="text"
                placeholder="Enter sale no..."
                value={searchSaleNo}
                onChange={(e) => setSearchSaleNo(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-slate-700 font-bold transition"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From Date</span>
            <input
              type="date"
              value={fromDate}
              max={todayStr}
              onChange={(e) => {
                const val = e.target.value;
                setFromDate(val > todayStr ? todayStr : val);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-slate-700 font-mono font-bold transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To Date</span>
            <input
              type="date"
              value={toDate}
              max={todayStr}
              onChange={(e) => {
                const val = e.target.value;
                setToDate(val > todayStr ? todayStr : val);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-slate-700 font-mono font-bold transition"
            />
          </div>

          {/* Payment Date filter for Credit Payment */}
          {mode === 'credit' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Date</span>
              <input
                type="date"
                value={paymentDate}
                max={todayStr}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaymentDate(val > todayStr ? todayStr : val);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-slate-700 font-mono font-bold transition"
              />
            </div>
          )}

          {/* Agent filter for Credit Payment */}
          {mode === 'credit' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent</span>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] text-slate-700 font-semibold focus:bg-white"
              >
                <option value="All">All Agents</option>
                <option value="thimphucounter">thimphucounter</option>
              </select>
            </div>
          )}

          {/* Location filter for GST */}
          {mode === 'gst' && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</span>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs py-2.5 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] text-slate-700 font-semibold focus:bg-white"
              >
                <option value="All">All Locations</option>
                <option value="Thimphu Counter">Thimphu Counter</option>
              </select>
            </div>
          )}

          <div className="flex gap-2 self-end">
            <button
              onClick={handleDisplay}
              className="bg-[#CC9900] hover:brightness-95 active:scale-[0.98] text-white font-black text-xs px-5 py-2.5 rounded-lg transition-all uppercase border border-[#B98B23] shadow-sm cursor-pointer"
            >
              Display
            </button>
            <button
              onClick={handleClear}
              className="bg-[#B25712] hover:brightness-95 active:scale-[0.98] text-white font-black text-xs px-5 py-2.5 rounded-lg border border-[#B25712] transition-all uppercase shadow-sm cursor-pointer"
            >
              Clear
            </button>
            
            {/* Excel button shown on Credit report screen */}
            {mode === 'credit' && (
              <button
                onClick={() => alert('Exporting credit accounts ledger report to MS Excel spreadsheet format...')}
                className="bg-[#16A34A] hover:brightness-95 active:scale-[0.98] text-white font-black text-xs px-5 py-2.5 rounded-lg transition-all uppercase shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel
              </button>
            )}
          </div>
        </div>

        <div className="text-right text-slate-400 text-[10px] font-mono">
          Bhutan Station &bull; SQLite Ledger Live
        </div>
      </div>

      {/* 3. Screen-Specific Render Blocks */}

      {/* VIEW A: DAY END REPORT */}
      {mode === 'day-end' && (
        <div className="space-y-6">
          {/* Highlights aggregation strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Credit Sale</span>
              <span className="text-sm font-black text-slate-800 font-mono mt-1 block">Nu. {summary.total_credit_sales.toFixed(2)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Credit Payment</span>
              <span className="text-sm font-black text-emerald-600 font-mono mt-1 block">
                Nu. {sales.filter(s => s.payment_method === 'Credit' && s.status === 'paid').reduce((acc, s) => acc + s.net_amount, 0).toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Cash Sale</span>
              <span className="text-sm font-black text-slate-800 font-mono mt-1 block">Nu. {summary.total_cash_sales.toFixed(2)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Bank Sale</span>
              <span className="text-sm font-black text-slate-800 font-mono mt-1 block">Nu. {summary.total_bank_sales.toFixed(2)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Return/Exchange</span>
              <span className="text-sm font-black text-red-600 font-mono mt-1 block">
                Nu. {sales.filter(s => s.status === 'returned').reduce((acc, s) => acc + s.net_amount, 0).toFixed(2)}
              </span>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Discounts</span>
              <span className="text-sm font-black text-orange-600 font-mono mt-1 block">Nu. {summary.total_discount_claims.toFixed(2)}</span>
            </div>
            <div className="bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-800 text-white">
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider block">Total Sale</span>
              <span className="text-sm font-black text-amber-400 font-mono mt-1 block">Nu. {summary.net_revenue.toFixed(2)}</span>
            </div>
          </div>

          {/* Table matching Photo 1 exactly */}
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#B25712] text-[10px] uppercase font-bold tracking-wider h-11 border-b border-amber-100/30 text-white font-mono">
                    <th className="px-4 py-2 w-12 text-center text-white border-r border-[#B25712]/10">Sl#</th>
                    <th className="px-4 py-2 text-white border-r border-[#B25712]/10 pl-4">User</th>
                    <th className="px-4 py-2 text-right text-white border-r border-[#B25712]/10 pr-4">Credit Sale</th>
                    <th className="px-4 py-2 text-right text-white border-r border-[#B25712]/10 pr-4">Credit Payment</th>
                    <th className="px-4 py-2 text-right text-white border-r border-[#B25712]/10 pr-4">Cash Sale</th>
                    <th className="px-4 py-2 text-right text-white border-r border-[#B25712]/10 pr-4">Bank Sale</th>
                    <th className="px-4 py-2 text-right text-white border-r border-[#B25712]/10 pr-4">Sale Return/Exchange</th>
                    <th className="px-4 py-2 text-right text-white border-r border-[#B25712]/10 pr-4">Discount</th>
                    <th className="px-4 py-2 text-right text-white pr-4">Total Sale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100/40 font-mono text-[#2F2F2F] text-xs bg-white">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400 italic font-sans">
                        No sales data captured in this date range. Go process a sale first!
                      </td>
                    </tr>
                  ) : (
                    <Fragment key="day-end-summary-rows">
                      {/* Operational Counter cashier entry row */}
                      <tr key="day-end-row-1" className="h-12 hover:bg-slate-50 font-semibold">
                        <td className="px-4 py-2 text-center text-slate-400 font-sans">1</td>
                        <td className="px-4 py-2 font-sans text-slate-900 font-bold">thimphucounter</td>
                        <td className="px-4 py-2 text-right">{summary.total_credit_sales.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-emerald-600">
                          {sales.filter(s => s.payment_method === 'Credit' && s.status === 'paid').reduce((acc, s) => acc + s.net_amount, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">{summary.total_cash_sales.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">{summary.total_bank_sales.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-red-500">
                          {sales.filter(s => s.status === 'returned').reduce((acc, s) => acc + s.net_amount, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-orange-600">{summary.total_discount_claims.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-black text-[#E65100]">{summary.net_revenue.toFixed(2)}</td>
                      </tr>

                      {/* Bottom Total Summary Row */}
                      <tr key="day-end-row-total" className="h-12 bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-950 text-xs">
                        <td className="px-4 py-2 text-center"></td>
                        <td className="px-4 py-2 font-sans font-black uppercase text-slate-600">Total:</td>
                        <td className="px-4 py-2 text-right text-slate-950">{summary.total_credit_sales.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-emerald-600">
                          {sales.filter(s => s.payment_method === 'Credit' && s.status === 'paid').reduce((acc, s) => acc + s.net_amount, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-950">{summary.total_cash_sales.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-slate-950">{summary.total_bank_sales.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-red-600">
                          {sales.filter(s => s.status === 'returned').reduce((acc, s) => acc + s.net_amount, 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-orange-600">{summary.total_discount_claims.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-amber-600 font-extrabold bg-amber-50/50">Nu. {summary.net_revenue.toFixed(2)}</td>
                      </tr>
                    </Fragment>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: CREDIT REPORT (Image 3) */}
      {mode === 'credit' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-bold tracking-wider h-11 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="px-4 py-2 w-12 text-center">Sl#</th>
                  <th className="px-4 py-2 w-48">Sale</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2 text-center">Items Count</th>
                  <th className="px-4 py-2 text-right">Total Amount</th>
                  <th className="px-4 py-2 text-right">Paid Amount</th>
                  <th className="px-4 py-2 text-right">Unpaid Amount</th>
                  <th className="px-4 py-2 text-center w-64">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-800 text-xs">
                {filteredSales.filter(s => s.payment_method === 'Credit').length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 italic font-sans">
                      No outstanding accounts credit balances found.
                    </td>
                  </tr>
                ) : (
                  filteredSales.filter(s => s.payment_method === 'Credit').map((sale, idx) => {
                    const isPaid = sale.status === 'paid';
                    const unpaidAmount = isPaid ? 0 : sale.net_amount;
                    const paidAmount = isPaid ? sale.net_amount : 0;

                    return (
                      <tr key={sale.sale_no} className="hover:bg-slate-50 border-b border-slate-100 h-12">
                        <td className="px-4 py-2 text-center text-slate-400 font-sans">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <span className="font-bold text-slate-900 block">{sale.sale_no}</span>
                          <span className="text-[10px] text-slate-400 block font-sans">dt. {new Date(sale.transaction_date).toLocaleDateString()}</span>
                        </td>
                        <td className="px-4 py-2 font-sans font-bold text-slate-600">{sale.customer_name || 'Walk-In Customer'}</td>
                        <td className="px-4 py-2 text-center font-sans">1 (Hardware item)</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-700">{sale.net_amount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-emerald-600 font-bold">{paidAmount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-red-600 font-bold">{unpaidAmount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1.5 h-12">
                            <button
                              onClick={() => setSelectedReceipt(sale)}
                              className="text-blue-600 hover:text-blue-800 text-[10px] font-bold uppercase hover:underline font-sans cursor-pointer"
                            >
                              Print
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => setSelectedReceipt(sale)}
                              className="text-slate-600 hover:text-slate-800 text-[10px] font-bold uppercase hover:underline font-sans cursor-pointer"
                            >
                              Print Thermal
                            </button>
                            <span className="text-slate-300">|</span>
                            {!isPaid ? (
                              <button
                                onClick={() => handleRecordCreditPayment(sale.sale_no)}
                                className="bg-[#16A34A] hover:bg-[#15803D] text-white text-[10px] px-2.5 py-1 rounded font-bold uppercase font-sans cursor-pointer shadow-sm"
                              >
                                Record Payment
                              </button>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[9px] font-bold font-sans">
                                Paid
                              </span>
                            )}
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => setSelectedReceipt(sale)}
                              className="text-blue-600 hover:text-blue-800 text-[10px] font-bold uppercase hover:underline font-sans cursor-pointer"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW C: SALE RETURN / REGISTER (Image 4) */}
      {mode === 'return' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-bold tracking-wider h-11 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="px-4 py-2 w-12 text-center">Sl#</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">No</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2 text-center">Quantity</th>
                  <th className="px-4 py-2 text-right">GST (5%)</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2 text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-800 text-xs">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400 italic font-sans">
                      No transactional logs matched your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, idx) => {
                    const isReturned = sale.status === 'returned';
                    const gstVal = sale.net_amount * 0.05;

                    return (
                      <tr key={sale.sale_no} className="hover:bg-slate-50 border-b border-slate-100 h-12">
                        <td className="px-4 py-2 text-center text-slate-400 font-sans">{idx + 1}</td>
                        <td className="px-4 py-2 font-sans text-slate-500 text-[10px]">
                          {new Date(sale.transaction_date).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-900">{sale.sale_no}</td>
                        <td className="px-4 py-2 font-sans font-bold text-slate-600">{sale.customer_name || 'Walk-In Customer'}</td>
                        <td className="px-4 py-2 text-center font-sans">1</td>
                        <td className="px-4 py-2 text-right text-slate-500">{gstVal.toFixed(2)}</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900">{sale.net_amount.toFixed(2)}</td>
                        <td className="px-4 py-2 font-sans text-slate-500">thimphucounter</td>
                        <td className="px-4 py-2 text-center">
                          {!isReturned ? (
                            <button
                              onClick={() => handleProcessReturn(sale.sale_no)}
                              className="bg-[#EA580C] hover:bg-[#C2410C] text-white font-sans text-[10px] font-bold px-3 py-1 rounded transition uppercase shadow-sm cursor-pointer"
                            >
                              Return
                            </button>
                          ) : (
                            <span className="bg-red-50 text-red-600 border border-red-200 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase font-sans">
                              Returned
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW D: GST RETURN REPORT (Image 5) */}
      {mode === 'gst' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-bold tracking-wider h-11 border-b border-slate-200 text-slate-600 font-mono">
                  <th className="px-4 py-2 w-12 text-center">Sl#</th>
                  <th className="px-4 py-2">Sale No</th>
                  <th className="px-4 py-2">Transaction Date</th>
                  <th className="px-4 py-2">Customer</th>
                  <th className="px-4 py-2 text-right">Gross Sales (Nu.)</th>
                  <th className="px-4 py-2 text-right">Taxable Amount (Nu.)</th>
                  <th className="px-4 py-2 text-center">GST Rate</th>
                  <th className="px-4 py-2 text-right">GST Paid (Nu.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-800 text-xs">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 italic font-sans">
                      No GST transaction records available.
                    </td>
                  </tr>
                ) : (
                  <Fragment key="gst-summary-rows">
                    {sales.map((sale, idx) => {
                      const taxable = sale.net_amount / 1.05;
                      const gstPaid = sale.net_amount - taxable;

                      return (
                        <tr key={sale.sale_no} className="hover:bg-slate-50 border-b border-slate-100 h-12">
                          <td className="px-4 py-2 text-center text-slate-400 font-sans">{idx + 1}</td>
                          <td className="px-4 py-2 font-bold text-slate-900">{sale.sale_no}</td>
                          <td className="px-4 py-2 font-sans text-slate-500">
                            {new Date(sale.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 font-sans font-semibold text-slate-600">{sale.customer_name || 'Walk-In Customer'}</td>
                          <td className="px-4 py-2 text-right">{sale.net_amount.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">{taxable.toFixed(2)}</td>
                          <td className="px-4 py-2 text-center font-sans">5% STANDARD</td>
                          <td className="px-4 py-2 text-right text-emerald-600 font-bold">{gstPaid.toFixed(2)}</td>
                        </tr>
                      );
                    })}

                    {/* Bottom Summary row */}
                    <tr key="gst-summary-total-row" className="h-12 bg-slate-50 font-bold border-t-2 border-slate-200 text-slate-950 text-xs">
                      <td className="px-4 py-2 text-center"></td>
                      <td className="px-4 py-2 font-sans font-black uppercase text-slate-600" colSpan={2}>Aggregate GST Paid:</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right">Nu. {sales.reduce((acc, s) => acc + s.net_amount, 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">Nu. {sales.reduce((acc, s) => acc + (s.net_amount / 1.05), 0).toFixed(2)}</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right text-emerald-600 font-extrabold bg-emerald-50/50">
                        Nu. {sales.reduce((acc, s) => acc + (s.net_amount - (s.net_amount / 1.05)), 0).toFixed(2)}
                      </td>
                    </tr>
                  </Fragment>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Receipt Preview Modal duplication for Reports panel */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-300 overflow-hidden text-slate-900 font-mono flex flex-col my-8">
            
            <div className="bg-[#0f172a] text-white px-4 py-3 flex justify-between items-center text-xs font-sans border-b border-slate-800">
              <span className="font-bold uppercase tracking-wider">Historical Invoice Copy</span>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer bg-slate-800 hover:bg-slate-700 h-6 w-6 rounded-full flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-xs font-mono text-slate-800 flex-1 overflow-y-auto max-h-[60vh] flex flex-col items-center" id="report-receipt-print-area">
              <img 
                src={logoImg} 
                className="h-10 max-w-[140px] object-contain mb-2.5" 
                alt="HQ Group Logo" 
                referrerPolicy="no-referrer" 
              />
              <h2 className="font-extrabold text-sm text-center uppercase tracking-wide">HIGH QUALITY GROUP</h2>
              <p className="text-[10px] text-center text-slate-400">HQ Retail Station, Thimphu, Bhutan</p>
              
              <p className="text-[10px] my-2 text-center font-bold text-slate-300">
                --------------------------------
              </p>
              
              <div className="w-full text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">SALE NO:</span>
                  <span className="font-bold">{selectedReceipt.sale_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">DATE:</span>
                  <span>{new Date(selectedReceipt.transaction_date).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">CASHIER:</span>
                  <span className="uppercase">thimphucounter</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">CUSTOMER:</span>
                  <span className="uppercase">{selectedReceipt.customer_name || 'Walk-In Customer'}</span>
                </div>
              </div>

              <p className="text-[10px] my-2 text-center font-bold text-slate-300">
                ================================
              </p>

              <div className="w-full text-[10px] space-y-1">
                <div className="flex justify-between font-bold text-slate-950">
                  <span>ITEMS SUB-TOTAL:</span>
                  <span>Nu. {selectedReceipt.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-[10px] my-2 text-center font-bold text-slate-300">
                --------------------------------
              </p>

              <div className="w-full text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">SUBTOTAL:</span>
                  <span>Nu. {selectedReceipt.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="font-sans">DISCOUNT:</span>
                  <span>-Nu. {selectedReceipt.discount_applied.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm border-t border-dashed border-slate-300 pt-1.5 mt-1 text-slate-950">
                  <span>GRAND TOTAL:</span>
                  <span>Nu. {selectedReceipt.net_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[9px] pt-1">
                  <span className="font-sans">PAYMENT METHOD:</span>
                  <span className="font-bold uppercase text-[#E65100]">{selectedReceipt.payment_method}</span>
                </div>
              </div>

              <p className="text-[10px] my-2 text-center font-bold text-slate-300">
                ================================
              </p>
              
              <p className="text-[9px] text-center italic text-slate-400">Duplicate record sourced from SQLite pos.db</p>
            </div>

            <div className="bg-slate-100 p-4 flex flex-col gap-2 border-t border-slate-200">
              <button 
                onClick={handlePrintDuplicateReceipt}
                className="w-full bg-[#E65100] hover:bg-[#c24400] text-white py-3 rounded-xl text-xs font-sans font-black uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer hover:translate-y-[-1px]"
              >
                <Printer className="w-4 h-4 text-white" />
                Print Duplicate Receipt
              </button>
              <button 
                onClick={() => setSelectedReceipt(null)}
                className="w-full bg-slate-800 hover:bg-slate-900 text-slate-100 py-2.5 rounded-lg text-xs font-sans font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Close Copy
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
