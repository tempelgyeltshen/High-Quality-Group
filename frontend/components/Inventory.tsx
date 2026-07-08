import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Plus, 
  Pencil, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Barcode,
  Sparkles,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '@/src/services/api';

const ITEMS_PER_PAGE = 10;

interface InventoryProps {
  key?: number;
  onInventoryChanged: () => void;
}

export default function Inventory({ onInventoryChanged }: InventoryProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form state for creating a new product
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('');

  // Form state for editing a product
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');

  // Web Audio sound generator
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
        gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.1);
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio context block fallback
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newCode || !newName || !newPrice || !newStock) {
      setError('All product registration fields are required.');
      playSound('error');
      return;
    }

    try {
      const prodPayload = {
        item_code: newCode.trim(),
        product_name: newName.trim(),
        retail_price: parseFloat(newPrice),
        stock_qty: parseInt(newStock),
      };
      await api.createProduct(prodPayload);

      playSound('success');
      setSuccess(`Product "${prodPayload.product_name}" registered successfully.`);
      setNewCode('');
      setNewName('');
      setNewPrice('');
      setNewStock('');
      setIsModalOpen(false);
      
      fetchProducts();
      onInventoryChanged();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const handleStartEdit = (p: Product) => {
    playSound('beep');
    setSelectedProductCode(p.item_code);
    setEditName(p.product_name);
    setEditPrice(p.retail_price.toString());
    setEditStock(p.stock_qty.toString());
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductCode) return;
    setError(null);
    setSuccess(null);

    if (!editName || !editPrice || !editStock) {
      setError('All fields are required to update a product.');
      playSound('error');
      return;
    }

    try {
      const prodPayload = {
        product_name: editName.trim(),
        retail_price: parseFloat(editPrice),
        stock_qty: parseInt(editStock),
      };
      await api.updateProduct(selectedProductCode, prodPayload);

      playSound('success');
      setSuccess(`Product "${selectedProductCode}" updated successfully.`);
      setIsEditModalOpen(false);
      setSelectedProductCode(null);
      fetchProducts();
      onInventoryChanged();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const handleDeleteProduct = async (code: string) => {
    if (!confirm(`Are you absolutely sure you want to delete Product Code: ${code}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    playSound('beep');

    try {
      await api.deleteProduct(code);

      playSound('success');
      setSuccess(`Product ${code} successfully removed.`);
      fetchProducts();
      onInventoryChanged();
    } catch (err: any) {
      setError(err.message);
      playSound('error');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice(
    (activePage - 1) * ITEMS_PER_PAGE,
    activePage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex-1 p-6 bg-[#FEF7E5] overflow-y-auto font-sans h-[calc(100vh-4rem)] select-none animate-fadeIn">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-amber-200/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#B25712]/10 border border-[#B25712]/20 p-2 rounded-xl">
            <Boxes className="w-6 h-6 text-[#B25712]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase leading-none tracking-wide">Inventory Control</h1>
            <span className="text-xs text-slate-400 font-mono">Manage hardware listings and active stock levels</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => { playSound('beep'); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 bg-[#CC9900] hover:bg-[#b38600] text-white text-xs px-4 py-2 rounded-lg font-black uppercase border border-[#B98B23] shadow-md transition cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            Register Product
          </button>
          <button
            onClick={() => { playSound('beep'); fetchProducts(); }}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs px-4 py-2 rounded-lg border border-slate-200 font-bold shadow-sm transition cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload DB
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-lg mb-6 flex items-start gap-2.5 text-xs font-semibold shadow-sm animate-fadeIn">
          <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-4 rounded-lg mb-6 flex items-start gap-2.5 text-xs font-semibold shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="space-y-6">
        
        {/* Search bar row */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search products by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#FEF7E5]/20 border border-amber-100 rounded-lg text-xs focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition text-[#2F2F2F] font-semibold"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
          
          <div className="text-[11px] text-slate-400 font-mono">
            Total Database Items: <span className="font-bold text-[#B25712]">{products.length}</span>
          </div>
        </div>

        {/* Database Data Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#B25712] text-[10px] uppercase font-bold tracking-wider h-11 border-b border-amber-100/30 text-white font-mono">
                  <th className="px-4 py-2 w-12 text-center text-white border-r border-[#B25712]/10">Sl#</th>
                  <th className="px-4 py-2 w-32 text-white border-r border-[#B25712]/10 pl-4">Item Code</th>
                  <th className="px-4 py-2 text-white border-r border-[#B25712]/10 pl-4">Product Name</th>
                  <th className="px-4 py-2 w-36 text-right text-white border-r border-[#B25712]/10 pr-4">Retail Price (Nu.)</th>
                  <th className="px-4 py-2 w-32 text-center text-white border-r border-[#B25712]/10">Stock Level</th>
                  <th className="px-4 py-2 w-28 text-center text-white">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100/40 font-mono text-[#2F2F2F] text-xs bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 italic text-xs font-sans">
                      Querying database tables...
                    </td>
                  </tr>
                ) : paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400 italic text-xs font-sans">
                      No products match your search.
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p, idx) => {
                    return (
                      <motion.tr 
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        key={p.item_code} 
                        className="hover:bg-[#FEF7E5]/50 transition h-14 text-[#2F2F2F] font-semibold text-xs border-b border-amber-100/30"
                      >
                        <td className="px-4 py-2 text-center text-slate-400 font-sans font-mono">{(activePage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-2 font-mono text-slate-500 font-bold">{p.item_code}</td>
                        <td className="px-4 py-2 font-sans font-bold text-slate-950 max-w-[250px] truncate" title={p.product_name}>
                          {p.product_name}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-900 font-extrabold pr-4">Nu. {p.retail_price.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-sans font-black text-[9px] ${
                            p.stock_qty <= 5 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-[#FEF7E5] text-[#B25712] border border-amber-100'
                          }`}>
                            {p.stock_qty} pcs
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center font-sans">
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="text-amber-600 hover:text-amber-800 p-1.5 rounded-lg hover:bg-amber-50 transition cursor-pointer"
                              title="Edit item detail in popup"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.item_code)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredProducts.length > 0 && (
            <div className="bg-slate-50 border-t border-amber-100/30 px-4 py-3 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="text-slate-500 font-sans">
                Showing <span className="font-semibold text-slate-700">{(activePage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min(activePage * ITEMS_PER_PAGE, filteredProducts.length)}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{filteredProducts.length}</span> records
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { playSound('beep'); setCurrentPage((prev) => Math.max(prev - 1, 1)); }}
                  disabled={activePage === 1}
                  className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => { playSound('beep'); setCurrentPage(pNum); }}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer ${
                      activePage === pNum
                        ? 'bg-[#B25712] text-white font-black'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { playSound('beep'); setCurrentPage((prev) => Math.min(prev + 1, totalPages)); }}
                  disabled={activePage === totalPages}
                  className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-500 transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal 1: Register Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] flex justify-center items-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl border border-amber-100 w-full max-w-md relative my-8 animate-fadeIn"
            >
              <button
                onClick={() => { playSound('beep'); setIsModalOpen(false); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 pb-3 border-b border-amber-100/50 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#B25712]" />
                Add New Product Record
              </h2>
              
              <form onSubmit={handleAddProduct} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Item Barcode / SKU Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      placeholder="e.g. 900113"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition uppercase placeholder-slate-400"
                      required
                    />
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Product Label / Description
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Bosch Armature GWS 6-100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition placeholder-slate-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Retail Price (Nu.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition placeholder-slate-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Stock Qty
                    </label>
                    <input
                      type="number"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition placeholder-slate-400"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { playSound('beep'); setIsModalOpen(false); }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#CC9900] hover:brightness-95 active:scale-[0.98] border border-[#B98B23] text-white font-black uppercase text-[11px] tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    Register Item
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Edit Product Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] flex justify-center items-center z-50 p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white p-6 rounded-2xl shadow-2xl border border-amber-100 w-full max-w-md relative my-8 animate-fadeIn"
            >
              <button
                onClick={() => { playSound('beep'); setIsEditModalOpen(false); setSelectedProductCode(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
              
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 pb-3 border-b border-amber-100/50 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#B25712]" />
                Modify Product Record
              </h2>
              
              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Item Barcode / SKU Code (Read Only)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedProductCode || ''}
                      disabled
                      className="w-full pl-8 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono font-bold cursor-not-allowed uppercase"
                    />
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    Product Label / Description
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Bosch Armature GWS 6-100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Retail Price (Nu.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Stock Qty
                    </label>
                    <input
                      type="number"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      placeholder="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:outline-none focus:border-[#B25712] focus:ring-1 focus:ring-[#B25712] focus:bg-white transition"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { playSound('beep'); setIsEditModalOpen(false); setSelectedProductCode(null); }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-[11px] tracking-wider rounded-lg transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-[#B25712] hover:brightness-95 active:scale-[0.98] border border-[#B25712] text-white font-black uppercase text-[11px] tracking-wider rounded-lg transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 text-white" />
                    Save Product
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
