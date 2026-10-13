import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Search,
  X,
  Package,
  Terminal,
  FileSpreadsheet,
  Warehouse,
  Megaphone,
  BarChart3,
  ArrowRight,
  QrCode,
  Tag,
  IndianRupee,
  Trash2
} from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const { isSearchModalOpen, setIsSearchModalOpen, products, orders, setActiveModule } = useERP();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isSearchModalOpen) {
      setQuery('');
    }
  }, [isSearchModalOpen]);

  if (!isSearchModalOpen) return null;

  let cleanQuery = query.trim();
  if (cleanQuery.startsWith('*') && cleanQuery.endsWith('*') && cleanQuery.length > 2) {
    cleanQuery = cleanQuery.slice(1, -1).trim();
  }

  const toDigits = (s: string) => s.replace(/[^0-9]/g, '');
  const toAlphaNum = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

  const cleanQueryAlphaNum = toAlphaNum(cleanQuery);
  const cleanQueryDigits = toDigits(cleanQuery);

  const filteredProducts = products.filter(
    p =>
      p &&
      ((p.name || '').toLowerCase().includes(cleanQuery.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(cleanQuery.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(cleanQuery.toLowerCase()))
  ).slice(0, 5);

  const filteredOrders = orders.filter(
    o => {
      const orderNoLower = o.orderNumber.toLowerCase();
      const customerLower = (o.customerName || '').toLowerCase();
      const queryLower = cleanQuery.toLowerCase();

      // 1. Simple includes check
      if (orderNoLower.includes(queryLower) || customerLower.includes(queryLower)) return true;

      // 2. Alphanumeric matching
      if (cleanQueryAlphaNum && toAlphaNum(o.orderNumber).includes(cleanQueryAlphaNum)) return true;

      // 3. Digits-only matching (require at least 5 digits to avoid overmatching small indices)
      if (cleanQueryDigits.length >= 5 && toDigits(o.orderNumber).includes(cleanQueryDigits)) return true;

      return false;
    }
  ).slice(0, 3);

  const modules = [
    { id: 'pos', name: 'POS Checkout Terminal', desc: 'Fast cashier scanning and payment processing', icon: Terminal, bg: 'bg-emerald-500/10 text-emerald-500' },
    { id: 'inward', name: 'Material Inward Note (GRN)', desc: 'Multi-step wizard for receiving inventory shipments', icon: FileSpreadsheet, bg: 'bg-blue-500/10 text-blue-500' },
    { id: 'products', name: 'Product Catalog & Pricing', desc: 'Search, edit, and bulk manage SKU database', icon: Package, bg: 'bg-indigo-500/10 text-indigo-500' },
    { id: 'inventory', name: 'Warehouse & Zones Dashboard', desc: 'Real-time pallet slots, temperature zones & stock movements', icon: Warehouse, bg: 'bg-purple-500/10 text-purple-500' },
    { id: 'barcode', name: 'Barcode & Sticker Generator', desc: 'Print 1x2 tags, shelf labels and Code-128 barcodes', icon: QrCode, bg: 'bg-amber-500/10 text-amber-500' },
    { id: 'events', name: 'Sales Promotions & Events', desc: 'Manage clearance sales, flash events and discounts', icon: Megaphone, bg: 'bg-rose-500/10 text-rose-500' },
    { id: 'reports', name: 'BI Executive Analytics', desc: 'Interactive charts, tax reports and export options', icon: BarChart3, bg: 'bg-teal-500/10 text-teal-500' },
    { id: 'recycle_bin', name: 'Recycle Bin & Trash', desc: 'Restore or permanently delete archived products, users, GRNs and events', icon: Trash2, bg: 'bg-rose-500/10 text-rose-500' }
  ].filter(m => m.name.toLowerCase().includes(cleanQuery.toLowerCase()) || m.desc.toLowerCase().includes(cleanQuery.toLowerCase()));

  const handleSelectModule = (modId: any) => {
    setActiveModule(modId);
    setIsSearchModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3 bg-slate-50/50 dark:bg-slate-950/50">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search SKUs, orders, or modules..."
            className="flex-1 bg-transparent border-0 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchModalOpen(false)}
            className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Search Results / Suggestions */}
        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4 divide-y divide-slate-100 dark:divide-slate-800/60">
          {/* Quick Module Navigation */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigation & Modules
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {modules.map(mod => {
                const Icon = mod.icon;
                return (
                  <button
                    key={mod.id}
                    onClick={() => handleSelectModule(mod.id)}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all text-left group"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${mod.bg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                        {mod.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {mod.desc}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product SKU Results */}
          {filteredProducts.length > 0 && (
            <div className="pt-3">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Products & Inventory ({filteredProducts.length})
              </div>
              <div className="space-y-1">
                {filteredProducts.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectModule('products')}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img src={prod.imageUrl} alt={prod.name} className="w-8 h-8 rounded-lg object-cover bg-slate-100" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                          <span className="font-mono text-indigo-500">{prod.sku}</span>
                          <span>•</span>
                          <span>{prod.warehouseZone.split('—')[0]}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">₹{prod.price}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        prod.status === 'in_stock' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {prod.stock} in stock
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders Results */}
          {filteredOrders.length > 0 && (
            <div className="pt-3">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Recent POS Transactions
              </div>
              <div className="space-y-1">
                {filteredOrders.map(ord => (
                  <div
                    key={ord.id}
                    onClick={() => handleSelectModule('pos')}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                        <IndianRupee className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {ord.orderNumber} {ord.customerName && `• ${ord.customerName}`}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {ord.items.length} items • Cashier: {ord.cashierName}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{ord.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">↑↓</kbd> to navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">ENTER</kbd> to select</span>
          </div>
          <span className="font-mono">ISKCON Retail Enterprise Search</span>
        </div>
      </div>
    </div>
  );
};
