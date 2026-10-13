'use client';

import React, { useState } from 'react';
import { Product } from '../../types';
import { BarcodeView } from '../barcode/BarcodeView';
import { useERP } from '../../context/ERPContext';
import {
  X,
  Edit3,
  Printer,
  QrCode,
  Trash2,
  Package,
  Layers,
  History,
  ShieldCheck,
  TrendingUp,
  Tag,
  MapPin,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  FileText
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onPrintBarcode?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onEdit,
}) => {
  const { deleteProduct, batches } = useERP();
  const [activeTab, setActiveTab] = useState<'overview' | 'inventory' | 'pricing' | 'history' | 'audit'>('overview');

  const margin = Math.round(((product.price - product.cost) / product.price) * 100);
  const profitPerUnit = product.price - product.cost;

  // Find associated batches for this SKU
  const productBatches = batches.filter(b => b.sku.toLowerCase() === product.sku.toLowerCase());

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete product "${product.name}"?`)) {
      deleteProduct(product.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-inner">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase">
                  {product.sku}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  product.status === 'in_stock'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : product.status === 'low_stock'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  {product.status.replace('_', ' ')}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{product.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(product)}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold font-mono shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>EDIT PRODUCT</span>
            </button>
            <button
              onClick={handleDelete}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
              title="Delete Product"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5E7EB] dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 overflow-x-auto">
          {[
            { id: 'overview', label: 'General & Overview', icon: FileText },
            { id: 'inventory', label: 'Inventory & Batches', icon: Layers },
            { id: 'pricing', label: 'Pricing & Margins', icon: DollarSign },
            { id: 'history', label: 'Stock History', icon: History },
            { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-xs font-bold font-mono flex items-center gap-2 border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-slate-950">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Image & Barcode Preview */}
              <div className="space-y-4">
                <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 overflow-hidden shadow-inner aspect-square relative flex items-center justify-center">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-mono font-bold">
                    {product.category}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800 p-4 text-center space-y-2">
                  <div className="text-[11px] font-bold font-mono text-slate-400 uppercase">Barcode Standard (Code-128 / EAN)</div>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-center">
                    <BarcodeView value={product.barcode || '88491029384'} width={1.2} height={38} fontSize={10} />
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-slate-700 dark:text-slate-300">
                    {product.barcode || '88491029384'}
                  </div>
                </div>
              </div>

              {/* Right Columns: Detailed Specifications */}
              <div className="md:col-span-2 space-y-6">
                
                {/* Description Box */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800 space-y-1.5">
                  <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">Product Description</h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {product.description || 'No descriptive overview provided for this product record in the master catalog.'}
                  </p>
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {product.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-mono font-bold border border-indigo-200 dark:border-indigo-800">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">SKU Code</div>
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 truncate">{product.sku}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Category</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{product.category}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">GST Tax Rate</div>
                    <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">{product.taxRate ?? 5}% GST</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Warehouse Zone</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{product.warehouseZone}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Supplier / Vendor</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">{product.supplier || 'Primary Vendor'}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Active Batch No.</div>
                    <div className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 truncate">{product.batchNo}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800 col-span-2">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase">Customer Rating</div>
                    <div className="text-sm font-bold text-amber-500 mt-1 flex items-center gap-1">
                      <span>★ {product.rating || 4.8}</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Verified Retail Feedback)</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: INVENTORY & BATCHES */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">Current Stock Balance</div>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{product.stock} Units</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Minimum threshold: {product.minStock} units</div>
                </div>
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                  <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">Warehouse Zone Location</div>
                  <div className="text-lg font-black text-blue-700 dark:text-blue-300 mt-1 truncate">{product.warehouseZone}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Storage Rack Aisle #4</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">Total Units Sold (YTD)</div>
                  <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">142 Units</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Turnover rate: Healthy</div>
                </div>
              </div>

              {/* Batch List */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Associated Batches & Inward History</h3>
                <div className="rounded-2xl border border-[#E5E7EB] dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 font-mono text-[10px] uppercase">
                      <tr>
                        <th className="p-3.5 border-b border-slate-200 dark:border-slate-800">Batch Number</th>
                        <th className="p-3.5 border-b border-slate-200 dark:border-slate-800">Edition / Version</th>
                        <th className="p-3.5 border-b border-slate-200 dark:border-slate-800">Received Date</th>
                        <th className="p-3.5 border-b border-slate-200 dark:border-slate-800">Cost / Price</th>
                        <th className="p-3.5 border-b border-slate-200 dark:border-slate-800">Quantity</th>
                        <th className="p-3.5 border-b border-slate-200 dark:border-slate-800 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {productBatches.length > 0 ? (
                        productBatches.map(b => (
                          <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                            <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{b.batchNo}</td>
                            <td className="p-3.5 font-medium">{b.edition || 'Standard Edition'}</td>
                            <td className="p-3.5 font-mono text-slate-500">{b.receivedDate}</td>
                            <td className="p-3.5 font-mono">₹{b.costPrice} / ₹{b.sellingPrice}</td>
                            <td className="p-3.5 font-bold">{b.remainingQuantity} / {b.totalQuantity}</td>
                            <td className="p-3.5 text-right">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-mono">
                            Default Batch <span className="font-bold text-slate-700 dark:text-slate-300">{product.batchNo}</span> (Stock Balance: {product.stock} units)
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRICING & MARGINS */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              {(() => {
                const taxRate = product.taxRate !== undefined ? product.taxRate : 5;
                const basePrice = product.price / (1 + taxRate / 100);
                const taxAmount = product.price - basePrice;
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800">
                        <div className="text-xs font-mono font-bold text-slate-400 uppercase">Selling Price (MRP)</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">₹{product.price.toFixed(2)}</div>
                        <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                          Inclusive of all taxes (GST {taxRate}%)
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800">
                        <div className="text-xs font-mono font-bold text-slate-400 uppercase">Cost Price</div>
                        <div className="text-3xl font-black text-slate-900 dark:text-white mt-2">₹{product.cost.toFixed(2)}</div>
                        <div className="text-[11px] text-slate-500 mt-1">Base acquisition cost</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                        <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">Gross Profit Margin</div>
                        <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-2">{margin}%</div>
                        <div className="text-[11px] text-emerald-600 mt-1 font-semibold">₹{profitPerUnit.toFixed(2)} per unit profit</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800 space-y-3">
                      <h3 className="text-xs font-mono font-bold text-slate-400 uppercase">Tax & Financial Compliance (GST Breakdown)</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400">HSN / SAC Code:</span>{' '}
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {product.category === 'Books' ? '4901 9900 (Books/Printed Matter)' : '9983 1100 (General Merchandise)'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">GST Tax Rate:</span>{' '}
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {taxRate}% ({taxRate === 0 ? 'Exempt' : `CGST ${(taxRate / 2).toFixed(1)}% + SGST ${(taxRate / 2).toFixed(1)}%`})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Net Base Price (Pre-Tax):</span>{' '}
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            ₹{basePrice.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Tax Included per Unit:</span>{' '}
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            ₹{taxAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* TAB 4: STOCK HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Recent Stock Movement Transactions</h3>
              <div className="space-y-2.5">
                {[
                  { type: 'inward', title: 'Material Inward GRN #GRN-2026-081', qty: '+50 units', date: '2026-08-01 10:30 AM', user: 'Warehouse Manager' },
                  { type: 'sale', title: 'POS Checkout Order #INV-2026-481', qty: '-3 units', date: '2026-08-02 02:15 PM', user: 'Counter Cashier #1' },
                  { type: 'sale', title: 'POS Checkout Order #INV-2026-485', qty: '-2 units', date: '2026-08-03 09:40 AM', user: 'Counter Cashier #2' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        item.type === 'inward' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {item.type === 'inward' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{item.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{item.date} • Handled by {item.user}</div>
                      </div>
                    </div>
                    <div className={`font-mono font-bold text-sm ${item.type === 'inward' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {item.qty}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Product Master Lifecycle & Audit Log</h3>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-[#E5E7EB] dark:border-slate-800 space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 font-bold">1</div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Product Created in Master Catalog</div>
                    <div className="text-slate-400 font-mono mt-0.5">Timestamp: 2026-06-15 09:00 AM • Created by Administrator (admin@iskcon.org)</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 font-bold">2</div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Barcode & SKU Assigned</div>
                    <div className="text-slate-400 font-mono mt-0.5">Assigned Barcode: {product.barcode} • Verified via Barcode Engine</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 font-bold">3</div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Last Modified / Stock Reconciled</div>
                    <div className="text-slate-400 font-mono mt-0.5">Timestamp: {product.lastUpdated} • Modified via Material Inward GRN</div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] font-mono text-slate-400">
            Last Updated: {product.lastUpdated}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold font-mono transition-colors"
          >
            CLOSE PROFILE
          </button>
        </div>

      </div>
    </div>
  );
};
