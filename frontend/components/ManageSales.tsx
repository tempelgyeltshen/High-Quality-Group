import { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  Search, 
  FileText, 
  TrendingUp, 
  Percent, 
  Coins, 
  Eye, 
  Printer, 
  Undo2, 
  RefreshCw,
  Filter,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Sale, User } from '../types';
// @ts-ignore
import logoImg from '../assets/images/Logo.svg';

interface ManageSalesProps {
  currentUser: User | null;
}

export default function ManageSales({ currentUser }: ManageSalesProps) {
  // Date filters defaulting to last 30 days
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Search Mode & Filters
  const [searchMode, setSearchMode] = useState<'date' | 'id'>('date');
  const [transactionIdQuery, setTransactionIdQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // DB Data states
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected receipt detailed preview
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (message: string, type: 'success' | 'error' = 'success') => {
    setActionStatus({ message, type });
    setTimeout(() => setActionStatus(null), 5000);
  };

  // Web Audio sound player
  const playSound = (type: 'beep' | 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.1);
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(147, audioCtx.currentTime + 0.12);
        osc.stop(audioCtx.currentTime + 0.35);
      }
    } catch (e) {
      // Audio context block fallback
    }
  };

  const fetchSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (searchMode === 'id') {
        if (!transactionIdQuery.trim()) {
          setSales([]);
          setLoading(false);
          return;
        }
        queryParams.append('id', transactionIdQuery.trim());
      } else {
        queryParams.append('from', fromDate);
        queryParams.append('to', toDate);
      }
      const response = await fetch(`/api/sales?${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to retrieve sales logs from database');
      }
      const data = await response.json();
      setSales(data);
    } catch (err: any) {
      setError(err.message || 'Error communicating with SQL server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchMode === 'date') {
      fetchSales();
    }
  }, [fromDate, toDate, searchMode]);

  // Fetch full details of a specific sale including items
  const handleViewSaleDetails = async (saleNo: string) => {
    setLoadingDetails(true);
    playSound('beep');
    try {
      const res = await fetch(`/api/sales/${saleNo}`);
      if (!res.ok) {
        throw new Error('Failed to fetch detailed records for this transaction');
      }
      const detailedSale = await res.json();
      setSelectedSale(detailedSale);
    } catch (err: any) {
      showStatus(err.message || 'Error loading transaction items', 'error');
    } finally {
      setLoadingDetails(false);
    }
  };

  // Process return / void and restock products
  const handleProcessReturn = async (saleNo: string) => {
    if (!confirm(`Are you sure you want to void and return Sale No. ${saleNo}? This will replenish product stocks and mark this invoice as returned.`)) return;
    
    try {
      const res = await fetch(`/api/sales/${saleNo}/return`, {
        method: 'PUT'
      });
      if (res.ok) {
        playSound('success');
        showStatus(`Sale invoice ${saleNo} has been successfully returned and products restocked into inventory.`, 'success');
        
        // If the returned sale is currently open in details modal, update it
        if (selectedSale && selectedSale.sale_no === saleNo) {
          setSelectedSale((prev: any) => prev ? { ...prev, status: 'returned' } : null);
        }
        
        fetchSales();
      } else {
        const err = await res.json();
        playSound('error');
        showStatus(`Error: ${err.error || 'Failed to process return'}`, 'error');
      }
    } catch (e) {
      playSound('error');
      showStatus('Network failure processing transaction return.', 'error');
    }
  };

  // Direct print trigger specifically targeting the receipt print area
  const handlePrintReceipt = () => {
    if (!selectedSale) return;
    playSound('beep');
    const printArea = document.getElementById('receipt-print-area');
    if (!printArea) {
      window.print();
      return;
    }

    // Modern isolated printing technique
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Thermal Receipt - ${selectedSale.sale_no}</title>
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
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            .logo-img {
              max-height: 40px;
              max-width: 140px;
              object-contain: contain;
              display: block;
              margin: 0 auto 8px auto;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${printArea.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleResetFilters = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    setFromDate(d.toISOString().split('T')[0]);
    setToDate(new Date().toISOString().split('T')[0]);
    setSearchQuery('');
    setTransactionIdQuery('');
    setSearchMode('date');
    setPaymentMethod('All');
    setStatusFilter('All');
    playSound('beep');
  };

  // Filter list matching filters and search input
  const filteredSales = sales.filter(sale => {
    if (searchMode === 'id') {
      return true;
    }

    // Search query matches sale number or customer name
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesNo = sale.sale_no.toLowerCase().includes(q);
      const matchesCust = (sale.customer_name || 'Walk-In Customer').toLowerCase().includes(q);
      if (!matchesNo && !matchesCust) return false;
    }

    // Payment method filter
    if (paymentMethod !== 'All') {
      if (paymentMethod === 'Online') {
        if (!sale.payment_method.startsWith('Online')) return false;
      } else {
        if (sale.payment_method !== paymentMethod) return false;
      }
    }

    // Status filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'unpaid') {
        if (sale.status !== 'unpaid') return false;
      } else if (statusFilter === 'paid') {
        if (sale.status !== 'paid') return false;
      } else if (statusFilter === 'returned') {
        if (sale.status !== 'returned') return false;
      } else if (statusFilter === 'completed') {
        if (sale.status !== 'completed') return false;
      }
    }

    return true;
  });

  // Summaries
  const totalInvoicesCount = filteredSales.length;
  const grossBillings = filteredSales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalDiscounts = filteredSales.reduce((acc, s) => acc + s.discount_applied, 0);
  const netRevenue = filteredSales.reduce((acc, s) => acc + s.net_amount, 0);

  return (
    <div className="flex-1 p-6 bg-[#FEF7E5] overflow-y-auto font-sans h-[calc(100vh-4rem)] select-none">
      
      {/* View Header with Dark Slate Bar styling */}
      <div className="bg-[#B25712] text-white px-5 py-4 rounded-t-xl font-black text-xs uppercase tracking-wider shadow-md flex justify-between items-center border-b border-amber-100/30">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#FCC923]" />
          <span>Manage Sales Register</span>
        </div>
        <span className="text-[10px] font-mono text-[#FCC923] font-bold uppercase tracking-widest hidden sm:inline">
          Station: Thimphu Counter &bull; Active Connection
        </span>
      </div>

      {/* Action Notification Banner */}
      {actionStatus && (
        <div className={`p-4 rounded-xl mb-4 text-xs font-bold border flex items-center gap-2.5 shadow-sm animate-fadeIn ${
          actionStatus.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className={`w-4.5 h-4.5 shrink-0 ${actionStatus.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`} />
          <span>{actionStatus.message}</span>
        </div>
      )}

      {/* Modern Filter panel */}
      <div className="bg-white p-5 rounded-b-xl shadow-sm border-x border-b border-amber-100 mb-6">
        {/* Tab/Mode Toggle */}
        <div className="flex border-b border-amber-100/50 pb-2.5 mb-4 gap-4">
          <button
            onClick={() => { setSearchMode('date'); playSound('beep'); }}
            className={`pb-2 px-1 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              searchMode === 'date' 
                ? 'border-[#B25712] text-[#B25712]' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Filter by Date Range
          </button>
          <button
            onClick={() => { setSearchMode('id'); playSound('beep'); }}
            className={`pb-2 px-1 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              searchMode === 'id' 
                ? 'border-[#B25712] text-[#B25712]' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Lookup by Unique Transaction ID
          </button>
        </div>

        <div className="flex flex-wrap gap-4 items-end justify-between">
          <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
            {searchMode === 'date' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Invoice / Customer</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter sale number or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-[#FEF7E5]/10 border border-amber-150 rounded-lg text-xs py-2 pl-9 pr-3 w-56 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-slate-700 font-bold transition shadow-inner animate-fadeIn"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From Date</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-[#FEF7E5]/10 border border-amber-150 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-slate-700 font-mono font-bold transition shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To Date</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-[#FEF7E5]/10 border border-amber-150 rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-slate-700 font-mono font-bold transition shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</span>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="bg-[#FEF7E5]/10 border border-amber-150 rounded-lg text-xs py-2.5 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] text-slate-700 font-bold shadow-inner focus:bg-white"
                  >
                    <option value="All">All Methods</option>
                    <option value="Cash">Cash Only</option>
                    <option value="Bank">Bank Only</option>
                    <option value="Online">Online / QR Code</option>
                    <option value="Credit">Store Credit / Ledger</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#FEF7E5]/10 border border-amber-150 rounded-lg text-xs py-2.5 px-3 focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] text-slate-700 font-bold shadow-inner focus:bg-white"
                  >
                    <option value="All">All Statuses</option>
                    <option value="completed">Completed (Paid)</option>
                    <option value="returned">Returned / Void</option>
                    <option value="unpaid">Credit - Outstanding</option>
                    <option value="paid">Credit - Settled</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end w-full animate-fadeIn">
                <div className="flex flex-col gap-1.5 w-full sm:w-80">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enter Unique Transaction / Sale ID</span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#B25712]" />
                    <input
                      type="text"
                      placeholder="e.g. SALE-1720392345 or transaction ID..."
                      value={transactionIdQuery}
                      onChange={(e) => setTransactionIdQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchSales();
                          playSound('beep');
                        }
                      }}
                      className="bg-[#FEF7E5]/20 border-2 border-amber-250 rounded-lg text-xs py-2 pl-9 pr-3 w-full focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white text-slate-900 font-bold font-mono transition shadow-inner"
                    />
                  </div>
                </div>
                <button
                  onClick={() => { fetchSales(); playSound('beep'); }}
                  className="bg-[#B25712] hover:brightness-95 active:scale-[0.98] text-white font-black text-xs px-6 py-2.5 rounded-lg transition uppercase shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Search className="w-3.5 h-3.5" />
                  Find Transaction
                </button>
                <div className="text-[10px] text-slate-500 font-sans leading-relaxed self-center mt-2 sm:mt-0 max-w-sm">
                  ⚡ Looks up the exact invoice across all historical data, completely bypassing date filters.
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            {searchMode === 'date' && (
              <button
                onClick={fetchSales}
                className="bg-[#CC9900] hover:brightness-95 active:scale-[0.98] text-white border border-[#B98B23] font-black text-xs px-5 py-2.5 rounded-lg transition uppercase shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync Ledger
              </button>
            )}
            <button
              onClick={handleResetFilters}
              className="bg-[#B25712] hover:brightness-95 active:scale-[0.98] text-white font-black text-xs px-5 py-2.5 rounded-lg transition uppercase shadow-sm flex items-center gap-1.5 cursor-pointer border border-[#B25712]"
            >
              <Filter className="w-3.5 h-3.5 text-[#FCC923]" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Key performance highlights strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Invoices Matched</span>
            <span className="text-xl font-black text-[#2F2F2F] font-mono mt-1 block">{totalInvoicesCount} Sales</span>
          </div>
          <div className="bg-[#FEF7E5] p-2.5 rounded-lg text-[#B25712]">
            <FileText className="w-5 h-5" />
          </div>
        </div>
        
        <div className="bg-[#2F2F2F] p-4 rounded-xl shadow-sm border border-[#2F2F2F]/10 flex items-center justify-between text-white">
          <div>
            <span className="text-[9px] font-black text-[#FEF7E5]/70 uppercase tracking-wider block">Gross Sales</span>
            <span className="text-xl font-black text-[#FCC923] font-mono mt-1 block">Nu. {grossBillings.toFixed(2)}</span>
          </div>
          <div className="bg-[#FEF7E5]/10 p-2.5 rounded-lg text-[#FCC923]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Total Discounts</span>
            <span className="text-xl font-black text-rose-600 font-mono mt-1 block">Nu. {totalDiscounts.toFixed(2)}</span>
          </div>
          <div className="bg-rose-50 p-2.5 rounded-lg text-rose-500">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#2F2F2F] p-4 rounded-xl shadow-md border border-[#2F2F2F]/20 text-white flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black text-[#FEF7E5]/70 uppercase tracking-wider block">Net Sales Volume</span>
            <span className="text-xl font-black text-[#FCC923] font-mono mt-1 block">Nu. {netRevenue.toFixed(2)}</span>
          </div>
          <div className="bg-[#FEF7E5]/10 p-2.5 rounded-lg text-[#FCC923]">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#B25712] text-[10px] uppercase font-bold tracking-wider h-11 border-b border-amber-100/30 text-white font-mono">
                <th className="px-4 py-2 w-12 text-center text-white border-r border-[#B25712]/10">Sl#</th>
                <th className="px-4 py-2 w-48 text-white border-r border-[#B25712]/10 pl-4">Sale / Invoice No</th>
                <th className="px-4 py-2 text-white border-r border-[#B25712]/10 pl-4">Transaction Date</th>
                <th className="px-4 py-2 text-white border-r border-[#B25712]/10 pl-4">Customer Name</th>
                <th className="px-4 py-2 text-center w-36 text-white border-r border-[#B25712]/10">Payment Mode</th>
                <th className="px-4 py-2 text-right w-28 text-white border-r border-[#B25712]/10 pr-4">Discount (Nu.)</th>
                <th className="px-4 py-2 text-right w-36 text-white border-r border-[#B25712]/10 pr-4">Net Total (Nu.)</th>
                <th className="px-4 py-2 text-center w-32 text-white border-r border-[#B25712]/10">Status</th>
                <th className="px-4 py-2 text-center w-64 text-white">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100/40 font-mono text-[#2F2F2F] text-xs bg-white">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
                      <span className="text-xs text-slate-500 font-sans italic">Connecting with Bhutan transaction logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400 italic font-sans">
                    <div className="max-w-md mx-auto space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700">No Sales Captured</p>
                      <p className="text-xs text-slate-400 font-normal leading-relaxed">No transactions matching your specified filters exist in this workspace. Make checkouts or reset date-ranges to start analyzing!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, idx) => {
                  const isReturned = sale.status === 'returned';
                  const isUnpaid = sale.status === 'unpaid';
                  const isPaidCredit = sale.status === 'paid';
                  
                  return (
                    <tr key={sale.sale_no} className={`hover:bg-[#FEF7E5]/50 border-b border-amber-100/30 h-14 transition ${isReturned ? 'bg-rose-50/20' : 'bg-white'}`}>
                      <td className="px-4 py-2 text-center text-slate-400 font-sans">{idx + 1}</td>
                      <td className="px-4 py-2">
                        <span className="font-extrabold text-slate-900 block tracking-tight">{sale.sale_no}</span>
                        <span className="text-[10px] text-slate-400 block font-sans">Cashier: thimphucounter</span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 text-slate-600">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(sale.transaction_date).toLocaleDateString()}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[10px] text-slate-400">{new Date(sale.transaction_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-sans font-bold text-slate-700 max-w-[200px] truncate" title={sale.customer_name || 'Walk-In Customer'}>{sale.customer_name || 'Walk-In Customer'}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-md font-sans ${
                          sale.payment_method === 'Credit' 
                            ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                            : sale.payment_method === 'Cash' 
                            ? 'bg-emerald-100 text-emerald-950 border border-emerald-200' 
                            : 'bg-indigo-100 text-indigo-950 border border-indigo-200'
                        }`}>
                          <CreditCard className="w-3 h-3 shrink-0" />
                          {sale.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-rose-600">-Nu. {sale.discount_applied.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-black text-slate-950">Nu. {sale.net_amount.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-sans border ${
                          isReturned 
                            ? 'bg-red-50 text-red-600 border-red-200' 
                            : isUnpaid 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : isPaidCredit
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            isReturned 
                              ? 'bg-red-500' 
                              : isUnpaid 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500'
                          }`}></span>
                          {isReturned ? 'Returned' : isUnpaid ? 'Unpaid Credit' : isPaidCredit ? 'Paid Credit' : 'Completed'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="flex items-center justify-center gap-2 h-14">
                          <button
                            onClick={() => handleViewSaleDetails(sale.sale_no)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-sans text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-slate-300/60 transition uppercase flex items-center gap-1 cursor-pointer shadow-sm"
                            title="Inspect complete invoice products list"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            Inspect
                          </button>

                          {!isReturned && (
                            <button
                              onClick={() => handleProcessReturn(sale.sale_no)}
                              className="bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-sans text-[10px] font-black px-2.5 py-1.5 rounded-lg border border-red-200 hover:border-red-500 transition uppercase flex items-center gap-1 cursor-pointer shadow-sm"
                              title="Void sale and return products to inventory"
                            >
                              <Undo2 className="w-3 h-3" />
                              Void
                            </button>
                          )}
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

      {/* 4. Thermal Receipt & Invoice Detail Preview Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-300 overflow-hidden text-slate-900 font-mono flex flex-col my-8">
            
            {/* Modal Header */}
            <div className="bg-[#0f172a] text-white px-4 py-3 flex justify-between items-center text-xs font-sans border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span className="font-extrabold uppercase tracking-wider">Historical Invoice Detail</span>
              </div>
              <button 
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-white font-bold cursor-pointer bg-slate-800 hover:bg-slate-700 h-6 w-6 rounded-full flex items-center justify-center transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Area Container */}
            <div className="p-6 text-xs font-mono text-slate-800 flex-1 overflow-y-auto max-h-[60vh]" id="receipt-print-area">
              <div className="flex flex-col items-center">
                {/* Five Gold Stars Logo */}
                <img 
                  src={logoImg} 
                  className="h-10 max-w-[140px] object-contain mb-2.5" 
                  alt="HQ Group Logo" 
                  referrerPolicy="no-referrer" 
                />
                <h2 className="font-black text-sm text-center uppercase tracking-wide text-slate-950 leading-tight">HIGH QUALITY GROUP</h2>
                <p className="text-[10px] text-center text-slate-500 font-sans mt-0.5 font-semibold">HQ Retail & Hardware Solutions</p>
                <p className="text-[9px] text-center text-slate-400 mt-0.5">Thimphu, Bhutan &bull; Ph: +975-2-321234</p>
                
                <p className="text-[10px] my-2 text-center font-bold text-slate-300">
                  ------------------------------------------
                </p>
                
                <div className="w-full text-[10px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans font-bold">INVOICE NO:</span>
                    <span className="font-black text-slate-950">{selectedSale.sale_no}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans font-bold">DATE:</span>
                    <span className="font-extrabold text-slate-800">{new Date(selectedSale.transaction_date).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans font-bold">CASHIER:</span>
                    <span className="uppercase font-extrabold text-slate-800">thimphucounter</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans font-bold">CUSTOMER:</span>
                    <span className="uppercase font-black text-slate-950">{selectedSale.customer_name || 'Walk-In Customer'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans font-bold">SALE STATUS:</span>
                    <span className="uppercase font-black text-amber-600">{selectedSale.status || 'Completed'}</span>
                  </div>
                </div>

                <p className="text-[10px] my-2 text-center font-bold text-slate-300">
                  ==========================================
                </p>

                {/* Scanned Items Header */}
                <div className="w-full text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 flex justify-between font-sans">
                  <span>Product Items List</span>
                  <span>Qty &times; Price</span>
                </div>

                {/* Items Detail Rows */}
                <div className="w-full space-y-2">
                  {selectedSale.items && selectedSale.items.length > 0 ? (
                    selectedSale.items.map((item: any, idx: number) => (
                      <div key={idx} className="w-full text-[10px] leading-tight">
                        <div className="flex justify-between font-black text-slate-950">
                          <span>{item.product_name || `Product: ${item.item_code}`}</span>
                          <span className="font-mono">Nu. {item.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          Code: {item.item_code} &bull; {item.quantity} Unit(s) &times; Nu. {item.unit_price.toFixed(2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 italic text-center py-2">Sourced hardware items detail is empty.</p>
                  )}
                </div>

                <p className="text-[10px] my-2 text-center font-bold text-slate-300">
                  ==========================================
                </p>

                {/* Pricing Summary Block */}
                <div className="w-full text-[10px] space-y-1.5 font-mono">
                  <div className="flex justify-between text-slate-600 font-semibold">
                    <span>ITEMS SUB-TOTAL:</span>
                    <span>Nu. {selectedSale.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600 font-bold">
                    <span>TOTAL MARGIN DISCOUNT:</span>
                    <span>-Nu. {selectedSale.discount_applied.toFixed(2)}</span>
                  </div>
                  
                  <div className="h-[1px] bg-slate-200 my-1"></div>

                  <div className="flex justify-between font-black text-sm text-slate-950 pt-1">
                    <span>GRAND NET TOTAL:</span>
                    <span>Nu. {selectedSale.net_amount.toFixed(2)}</span>
                  </div>

                  <div className="h-[1px] bg-slate-200 my-1"></div>

                  <div className="flex justify-between text-slate-500 text-[9px]">
                    <span className="font-sans font-bold">PAYMENT TYPE:</span>
                    <span className="font-black uppercase text-slate-800">{selectedSale.payment_method}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[9px]">
                    <span className="font-sans font-bold">PAID AMOUNT:</span>
                    <span className="font-black uppercase text-slate-800">Nu. {selectedSale.paid_amount !== undefined ? selectedSale.paid_amount.toFixed(2) : selectedSale.net_amount.toFixed(2)}</span>
                  </div>
                </div>

                <p className="text-[10px] my-2 text-center font-bold text-slate-300">
                  ==========================================
                </p>
                
                {/* Bottom Custom Tag lines */}
                <p className="text-[9px] text-center font-black text-slate-950 font-sans tracking-tight">THANK YOU & VISIT AGAIN!</p>
                <p className="text-[8px] text-center italic text-slate-400 mt-1 font-sans">Official Duplicate invoice copy sourced from SQLite ledger</p>
              </div>
            </div>

            {/* Print and Close controls */}
            <div className="bg-slate-100 p-4 flex flex-col gap-2 border-t border-slate-200">
              <button 
                onClick={handlePrintReceipt}
                className="w-full bg-[#E65100] hover:bg-[#c24400] text-white py-3 rounded-xl text-xs font-sans font-black uppercase transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg cursor-pointer hover:translate-y-[-1px]"
              >
                <Printer className="w-4 h-4 text-white" />
                Print Thermal Receipt
              </button>
              <button 
                onClick={() => setSelectedSale(null)}
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
