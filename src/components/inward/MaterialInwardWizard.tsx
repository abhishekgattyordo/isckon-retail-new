'use client';

import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { InwardItem, MaterialInwardNote } from '../../types';
import { BarcodeView } from '../barcode/BarcodeView';
import { DynamicShipmentItemsTable, ShipmentItemRow } from './DynamicShipmentItemsTable';
import { GrnListPage } from './GrnListPage';
import { exportGrnBarcodesToPdf, exportGrnBarcodesOnlyToPdf, exportBarcodesToPdf } from '../../lib/exportUtils';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Calendar,
  Warehouse,
  QrCode,
  Printer,
  Barcode as BarcodeIcon,
  Check,
  ShieldCheck,
  IndianRupee,
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Tag
} from 'lucide-react';

export const MaterialInwardWizard: React.FC = () => {
  const { products, zones, suppliers, addSupplier, addInwardNote, addBarcodeRecord, user, setActiveModule, quickNotification, currentBranch, settings } = useERP();
  
  // List-First Page View State ('list' | 'wizard')
  const [viewMode, setViewMode] = useState<'list' | 'wizard'>('list');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1 Form (Empty by default)
  const [vendorName, setVendorName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedZone, setSelectedZone] = useState(zones[0]?.name || 'Zone A — Main Retail Floor');
  const [grnNotes, setGrnNotes] = useState('');

  // Step 2 Dynamic Items (Empty by default)
  const [items, setItems] = useState<InwardItem[]>([]);

  // Step 3 Options
  const [autoPrintLabels, setAutoPrintLabels] = useState(true);
  const [generatedGrnNumber, setGeneratedGrnNumber] = useState('');
  const [completedItems, setCompletedItems] = useState<Array<InwardItem & { barcode?: string }>>([]);

  // Auto calculation helper
  const updateRow = (id: string, updates: Partial<InwardItem>) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          // If SKU changed, try to auto-fill name, cost, and selling price from products catalog
          if (updates.sku) {
            const foundProd = products.find(p => p.sku === updates.sku);
            if (foundProd) {
              updated.name = foundProd.name;
              updated.unitCost = foundProd.cost;
              updated.sellingPrice = foundProd.price;
            }
          }
          // Recalculate total
          const sub = updated.quantity * updated.unitCost;
          const tax = sub * (updated.taxRate / 100);
          updated.total = Number((sub + tax).toFixed(2));
          return updated;
        }
        return item;
      })
    );
  };

  const addRow = () => {
    const defaultProd = products[Math.min(items.length, products.length - 1)] || products[0];
    const newRow: InwardItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      sku: defaultProd ? defaultProd.sku : 'SKU-NEW-100',
      name: defaultProd ? defaultProd.name : 'New Merch Item',
      quantity: 10,
      unitCost: defaultProd ? defaultProd.cost : 50.00,
      sellingPrice: defaultProd ? defaultProd.price : 150.00,
      batchNo: `BAT-2026-Q3-${Math.floor(10 + Math.random() * 89)}`,
      expiryDate: '2030-12-31',
      taxRate: 0,
      total: Number((10 * (defaultProd ? defaultProd.cost : 50)).toFixed(2))
    };
    setItems(prev => [...prev, newRow]);
  };

  const removeRow = (id: string) => {
    if (items.length === 1) {
      alert("At least one product item is required for a Goods Received Note.");
      return;
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const totalGrnValue = items.reduce((acc, i) => acc + i.total, 0);
  const totalUnits = items.reduce((acc, i) => acc + Number(i.quantity), 0);

  const handleCompleteGrn = () => {
    const grnNo = `GRN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setGeneratedGrnNumber(grnNo);

    // Prepare items with unique batch-wise barcodes and selling prices
    const itemsWithBarcodes = items.map(item => {
      const matchedProd = products.find(p => p.sku === item.sku);
      const batchIdStr = item.batchId || `bat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const batchNoStr = item.batchNo && item.batchNo.trim() ? item.batchNo.trim() : `B-${Math.floor(1000 + Math.random() * 9000)}`;
      const barcodeVal = `BC-${item.sku}-${batchNoStr}`;
      const resolvedSellPrice = item.sellingPrice && item.sellingPrice > 0 ? item.sellingPrice : (matchedProd?.price || Number((item.unitCost * 1.5).toFixed(2)));
      return {
        ...item,
        batchId: batchIdStr,
        batchNo: batchNoStr,
        barcode: barcodeVal,
        sellingPrice: resolvedSellPrice
      };
    });

    setCompletedItems(itemsWithBarcodes);

    // 1. Add Inward Note to ERP
    addInwardNote({
      grnNumber: grnNo,
      poNumber: poNumber || 'PO-0000',
      vendorName: vendorName || 'Unknown Vendor',
      invoiceDate: invoiceDate,
      warehouse: selectedZone,
      branchId: currentBranch?.id || 'branch-mayapur-hq',
      branchName: currentBranch?.name || 'Mayapur HQ Central',
      items: itemsWithBarcodes,
      status: 'completed',
      totalValue: totalGrnValue,
      receivedBy: user?.name || 'Radha Govinda Das',
      timestamp: new Date().toLocaleString(),
      notes: grnNotes
    });

    // 2. Automatically register each batch barcode into the central Barcodes collection
    itemsWithBarcodes.forEach(item => {
      addBarcodeRecord({
        sku: item.sku,
        productName: item.name,
        barcodeValue: item.barcode,
        format: 'code128',
        template: 'retail_tag_1x2',
        generatedAt: new Date().toISOString(),
        batchNo: item.batchNo,
        batchId: item.batchId,
        printCount: item.quantity,
        branchId: currentBranch?.id || 'branch-mayapur-hq',
        branchName: currentBranch?.name || 'Mayapur HQ Central',
        grnNumber: grnNo,
        price: item.sellingPrice,
        purchaseCost: item.unitCost,
        sellingPrice: item.sellingPrice
      });
    });

    if (autoPrintLabels) {
      quickNotification('Barcode Stickers Ready', `Created ${totalUnits} serialized barcode tags for GRN ${grnNo}.`, 'success');
    }

    setStep(4);
  };

  if (viewMode === 'list') {
    return (
      <GrnListPage
        onAddNewGrn={() => {
          setStep(1);
          setVendorName('');
          setPoNumber('');
          setGrnNotes('');
          setItems([]);
          setCompletedItems([]);
          setViewMode('wizard');
        }}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-blue-500 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Material Inward Note (GRN Wizard)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            INTAKE PROCESS • TAX COMPUTATION • BARCODE VERIFICATION • INVENTORY SYNC
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>&larr; Back to GRN List</span>
          </button>
          <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            PO: {poNumber || 'New PO'}
          </div>
        </div>
      </div>

      {/* Bento Summary Grid (3 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-widest font-mono">Total PO Value</span>
            <IndianRupee className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              ₹{items.reduce((sum, i) => sum + i.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-widest font-mono">Carton Items</span>
            <BarcodeIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
              {items.reduce((sum, i) => sum + i.quantity, 0)} <span className="text-xs text-slate-400 font-normal">units</span>
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">({items.length} SKUs)</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-widest font-mono">Destination Zone</span>
            <Warehouse className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </div>
          <div className="mt-3 truncate">
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-white truncate block">
              {selectedZone.split('—')[0]}
            </span>
            <span className="text-[10px] text-slate-400 font-mono truncate block">
              {selectedZone.split('—')[1] || 'Retail Floor'}
            </span>
          </div>
        </div>
      </div>

      {/* Wizard Progress Stepper */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center relative">
          {[
            { num: 1, title: 'Vendor PO Info' },
            { num: 2, title: 'Dynamic Items' },
            { num: 3, title: 'Batch Barcode QC' },
            { num: 4, title: 'Confirmation' }
          ].map(st => {
            const isDone = step > st.num;
            const isCurrent = step === st.num;
            return (
              <div key={st.num} className="flex flex-col items-center gap-1.5 z-10">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono transition-all ${
                    isDone
                      ? 'bg-[#15803D] text-white shadow-sm'
                      : isCurrent
                      ? 'bg-[#D97706] text-white shadow-sm font-extrabold ring-2 ring-[#D97706]/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-[#786C65] border border-[#E8E2D9] dark:border-slate-700'
                  }`}
                >
                  {isDone ? <Check className="w-4 h-4" /> : st.num}
                </div>
                <span className={`text-[11px] font-bold font-mono uppercase tracking-wider truncate max-w-full ${
                  isCurrent ? 'text-[#D97706] dark:text-amber-400' : isDone ? 'text-[#15803D] dark:text-emerald-400' : 'text-[#786C65]'
                }`}>
                  {st.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Vendor & Document Details */}
      {step === 1 && (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              <span>Step 1: Supplier & Purchase Order Information</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Specify origin vendor and destination warehouse zone.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">Supplier / Vendor Name *</label>
                <button
                  type="button"
                  onClick={() => {
                    const name = prompt("Enter new supplier name:");
                    if (name && name.trim()) {
                      const newSup = {
                        id: `sup-${Date.now()}`,
                        code: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
                        supplierName: name.trim(),
                        contactPerson: '',
                        email: '',
                        phone: '',
                        address: '',
                        gstin: '',
                        paymentTerms: 'Net 30',
                        performanceRating: 5,
                        status: 'active' as const,
                        category: 'General Goods',
                        createdAt: new Date().toISOString()
                      };
                      addSupplier(newSup);
                      setVendorName(name.trim());
                      quickNotification(`Supplier "${name.trim()}" added successfully.`, 'success');
                    }
                  }}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Supplier
                </button>
              </div>
              <select
                value={vendorName}
                onChange={e => setVendorName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="">-- Select Supplier / Vendor --</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.supplierName}>
                    {sup.supplierName} ({sup.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Purchase Order (PO) Number</label>
              <input
                type="text"
                value={poNumber}
                onChange={e => setPoNumber(e.target.value)}
                placeholder="Enter PO number (e.g. PO-88941)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-indigo-600 dark:text-indigo-400 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Invoice Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Destination Warehouse Zone</label>
              <div className="relative">
                <Warehouse className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={selectedZone}
                  onChange={e => setSelectedZone(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {zones.map(z => (
                    <option key={z.id} value={z.name}>
                      {z.code} • {z.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Inspection & Delivery Notes</label>
              <textarea
                rows={2}
                value={grnNotes}
                onChange={e => setGrnNotes(e.target.value)}
                placeholder="Optional carrier notes, seal numbers, or QC instructions..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => {
                if (!vendorName || !poNumber) {
                  alert("Please enter Supplier Name and PO Number.");
                  return;
                }
                setStep(2);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold text-xs sm:text-sm shadow-sm transition-all hover:opacity-90 font-mono"
            >
              <span>NEXT: ADD PRODUCT ROWS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Dynamic Product Rows & Calculations */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <DynamicShipmentItemsTable
            availableProducts={products}
            initialRows={
              items.length > 0
                ? items.map(item => ({
                    id: item.id,
                    sku: item.sku,
                    description: item.name,
                    quantity: item.quantity,
                    unitCost: item.unitCost,
                    sellingPrice: item.sellingPrice ?? '',
                    batchNo: item.batchNo,
                    taxRate: item.taxRate,
                    total: item.total
                  }))
                : undefined
            }
            onChange={(newRows) => {
              setItems(
                newRows.map(r => ({
                  id: r.id,
                  sku: r.sku || 'SKU-UNASSIGNED',
                  name: r.description || 'General Merchandise Item',
                  quantity: typeof r.quantity === 'number' ? r.quantity : parseFloat(r.quantity) || 0,
                  unitCost: typeof r.unitCost === 'number' ? r.unitCost : parseFloat(r.unitCost) || 0,
                  sellingPrice: typeof r.sellingPrice === 'number' ? r.sellingPrice : parseFloat(r.sellingPrice) || 0,
                  batchNo: r.batchNo || 'BAT-DEFAULT',
                  expiryDate: '2036-12-31',
                  taxRate: r.taxRate,
                  total: r.total
                }))
              );
            }}
          />

          {/* Navigation buttons */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>BACK: VENDOR PO</span>
            </button>
            <button
              onClick={() => {
                if (items.some(i => !i.sku || i.quantity <= 0)) {
                  alert("Please ensure all items have a valid SKU and quantity > 0.");
                  return;
                }
                setStep(3);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-black dark:bg-white text-white dark:text-black font-bold text-xs sm:text-sm shadow-sm transition-all hover:opacity-90 font-mono"
            >
              <span>NEXT: BARCODE & BATCH REVIEW</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Barcode & Batch Verification */}
      {step === 3 && (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-amber-500" />
              <span>Step 3: Barcode & Batch Label Preview</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Verify auto-generated serial barcodes and sticker print queues before final commitment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((row, idx) => {
              const matchedProd = products.find(p => p.sku === row.sku);
              const barcodeVal = matchedProd?.barcode || `49000${Math.abs(row.sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 1234567).toString().padStart(8, '0').slice(0, 8)}`;
              return (
                <div key={row.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold text-[10px]">
                        {row.sku}
                      </span>
                      <span className="text-[10px] text-slate-400">Qty: {row.quantity}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {row.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Batch: <strong className="text-slate-700 dark:text-slate-300">{row.batchNo}</strong> • Exp: {row.expiryDate}
                    </div>
                  </div>

                  {/* Real Barcode View */}
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shrink-0 shadow-sm">
                    <BarcodeView value={barcodeVal} width={1} height={32} fontSize={9} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Printer Options Toggle */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Printer className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300">Auto-Print Adhesive Sticker Labels (1x2 inch)</h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400/80">
                  When enabled, {totalUnits} individual barcode stickers will dispatch immediately to Terminal Printer #1 upon GRN confirmation.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={autoPrintLabels}
                onChange={e => setAutoPrintLabels(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Navigation */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs sm:text-sm transition-colors font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>BACK: DYNAMIC ITEMS</span>
            </button>
            <button
              onClick={handleCompleteGrn}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all font-mono"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>CONFIRM & COMMIT GRN</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success Confirmation Screen */}
      {step === 4 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              MATERIAL INWARD NOTE PROCESSED
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">
              GRN NUMBER <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{generatedGrnNumber}</strong> RECORDED SUCCESSFULLY.
            </p>
          </div>

          {/* Primary Action Buttons: Download PDF & Direct Print Options */}
          <div className="max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex flex-col md:flex-row items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 font-mono">
                <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>BATCH BARCODES & GRN VOUCHER EXPORT</span>
              </h4>
              <p className="text-[11px] text-amber-700 dark:text-amber-400/90 leading-tight">
                Export all {completedItems.length} product batch barcodes generated during this GRN session ({totalUnits} total units) as a printable PDF or dispatch directly to your label printer.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              {/* Option 1: Full GRN Voucher + Barcode Sheet PDF */}
              <button
                type="button"
                onClick={() => {
                  exportGrnBarcodesToPdf({
                    grnNumber: generatedGrnNumber,
                    poNumber,
                    vendorName,
                    invoiceDate,
                    warehouse: selectedZone,
                    branchName: currentBranch?.name,
                    receivedBy: user?.name,
                    totalValue: totalGrnValue,
                    notes: grnNotes,
                    items: completedItems,
                    settings
                  });
                  quickNotification('GRN PDF Downloaded', `Generated complete voucher and barcode sheets for ${generatedGrnNumber}.`, 'success');
                }}
                className="py-2.5 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs font-mono shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:-translate-y-0.5"
                title="Download combined GRN Voucher + Barcode Sheets"
              >
                <Download className="w-3.5 h-3.5" />
                <span>DOWNLOAD PDF</span>
              </button>

              {/* Option 2: Barcodes Sticker Sheet Only PDF */}
              <button
                type="button"
                onClick={() => {
                  exportGrnBarcodesOnlyToPdf({
                    grnNumber: generatedGrnNumber,
                    poNumber,
                    vendorName,
                    invoiceDate,
                    warehouse: selectedZone,
                    branchName: currentBranch?.name,
                    receivedBy: user?.name,
                    totalValue: totalGrnValue,
                    notes: grnNotes,
                    items: completedItems,
                    settings
                  });
                  quickNotification('Barcodes PDF Downloaded', `Exported barcode sticker sheet for GRN ${generatedGrnNumber}.`, 'success');
                }}
                className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700"
                title="Download only barcode stickers without voucher header"
              >
                <BarcodeIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>BARCODES ONLY (PDF)</span>
              </button>

              {/* Option 3: Direct Print Voucher */}
              <button
                type="button"
                onClick={() => {
                  quickNotification('Printing GRN Voucher', `Dispatching ${generatedGrnNumber} document to browser printer dialog.`, 'info');
                  const printSection = document.getElementById('grn-print-preview');
                  if (printSection) {
                    const printClone = printSection.cloneNode(true) as HTMLElement;
                    printClone.id = 'grn-print-active';
                    printClone.classList.remove('hidden');
                    printClone.classList.add('active-print-element');
                    document.body.appendChild(printClone);
                    document.body.classList.add('print-labels-only');
                    window.print();
                    setTimeout(() => {
                      printClone.remove();
                      document.body.classList.remove('print-labels-only');
                    }, 500);
                  } else {
                    window.print();
                  }
                }}
                className="py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Direct browser print dialog for GRN document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT VOUCHER</span>
              </button>

              {/* Option 4: Direct Print Barcode Roll */}
              <button
                type="button"
                onClick={() => {
                  quickNotification('Printing Barcode Labels', `Dispatching barcode sticker roll for ${generatedGrnNumber} to printer.`, 'info');
                  const printSection = document.getElementById('grn-labels-print-preview');
                  if (printSection) {
                    const printClone = printSection.cloneNode(true) as HTMLElement;
                    printClone.id = 'grn-labels-print-active';
                    printClone.classList.remove('hidden');
                    printClone.classList.add('active-print-element');
                    document.body.appendChild(printClone);
                    document.body.classList.add('print-labels-only');
                    
                    const pageStyle = document.createElement('style');
                    pageStyle.id = 'dynamic-grn-labels-style';
                    pageStyle.innerHTML = `@page { size: auto; margin: 4mm; }`;
                    document.head.appendChild(pageStyle);

                    window.print();
                    setTimeout(() => {
                      printClone.remove();
                      document.body.classList.remove('print-labels-only');
                      const pStyle = document.getElementById('dynamic-grn-labels-style');
                      if (pStyle) pStyle.remove();
                    }, 500);
                  } else {
                    window.print();
                  }
                }}
                className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Direct browser print of barcode stickers roll"
              >
                <QrCode className="w-3.5 h-3.5 text-rose-500" />
                <span>PRINT STICKERS</span>
              </button>
            </div>
          </div>

          {/* Bento Summary Grid */}
          <div className="max-w-2xl mx-auto p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left space-y-3 text-xs font-mono">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Warehouse</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{selectedZone.split('—')[0]}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Total Units</span>
                <span className="font-bold text-slate-900 dark:text-white">{totalUnits} units</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Total Valuation</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{totalGrnValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Received By</span>
                <span className="font-bold text-slate-900 dark:text-white truncate block">{user?.name || 'Radha Govinda Das'}</span>
              </div>
            </div>

            {autoPrintLabels && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-[11px]">
                <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>All {totalUnits} serialized barcode stickers have been registered in the system.</span>
              </div>
            )}
          </div>

          {/* Generated Batch Barcodes Gallery in this Session */}
          <div className="max-w-3xl mx-auto space-y-3 text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BarcodeIcon className="w-4 h-4 text-amber-600" />
                <span>Session Batch Barcodes ({completedItems.length} SKUs)</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('active_grn_filter', generatedGrnNumber);
                  }
                  setActiveModule('barcode');
                }}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-mono font-bold flex items-center gap-1 cursor-pointer"
                title={`Open Barcode Center filtered to ${generatedGrnNumber}`}
              >
                <span>Filter in Barcode Center</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-1">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        {item.sku}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">Qty: {item.quantity}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500">
                      Batch: <strong className="text-slate-700 dark:text-slate-300">{item.batchNo}</strong> • Sell: ₹{(item.sellingPrice || item.unitCost * 1.5).toFixed(2)}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5">
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-center">
                      <BarcodeView value={item.barcode || '490001234567'} width={1} height={28} fontSize={9} />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        exportBarcodesToPdf({
                          title: `${item.name} Barcode`,
                          subtitle: `SKU: ${item.sku} • GRN: ${generatedGrnNumber} • Batch: ${item.batchNo} • Qty: ${item.quantity}`,
                          items: [{
                            sku: item.sku,
                            productName: item.name,
                            barcodeValue: item.barcode || '490001234567',
                            batchNo: item.batchNo,
                            price: item.sellingPrice,
                            grnNumber: generatedGrnNumber,
                            printCount: item.quantity
                          }],
                          settings
                        });
                        quickNotification('Barcode PDF Ready', `Exported barcode sticker for ${item.sku}.`, 'success');
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Download PDF sticker for this item"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 font-mono">
            <button
              onClick={() => {
                setStep(1);
                setVendorName('');
                setPoNumber('');
                setGrnNotes('');
                setItems([]);
                setCompletedItems([]);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              + NEW GRN NOTE
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('active_grn_filter', generatedGrnNumber);
                }
                setActiveModule('barcode');
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>BARCODES & LABELS CENTER</span>
            </button>
            <button
              onClick={() => setActiveModule('inventory')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
            >
              WAREHOUSE DASHBOARD &rarr;
            </button>
          </div>

          {/* Hidden Print-Ready GRN Layout for Direct Browser Print */}
          <div id="grn-print-preview" className="hidden">
            <div className="p-6 bg-white text-black space-y-6 max-w-4xl mx-auto">
              <div className="border-b-2 border-black pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold uppercase">{settings.orgName || 'ISKCON Foundation'}</h1>
                  <h2 className="text-sm font-semibold">{settings.appTitle || 'ISKCON Retail ERP'} — GOODS RECEIVED NOTE</h2>
                  <p className="text-xs">GRN Number: <strong>{generatedGrnNumber}</strong> | PO: {poNumber || 'N/A'}</p>
                </div>
                <div className="text-right text-xs">
                  <p>Date: {invoiceDate}</p>
                  <p>Branch: {currentBranch?.name}</p>
                  <p>Vendor: {vendorName || 'N/A'}</p>
                </div>
              </div>

              <table className="w-full text-xs border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-100 border-b border-black text-left">
                    <th className="p-2 border border-black">#</th>
                    <th className="p-2 border border-black">SKU</th>
                    <th className="p-2 border border-black">Product Title</th>
                    <th className="p-2 border border-black">Batch No</th>
                    <th className="p-2 border border-black text-center">Qty</th>
                    <th className="p-2 border border-black text-right">Cost (₹)</th>
                    <th className="p-2 border border-black text-right">Price (₹)</th>
                    <th className="p-2 border border-black text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {completedItems.map((item, idx) => (
                    <tr key={item.id} className="border-b border-black">
                      <td className="p-2 border border-black text-center">{idx + 1}</td>
                      <td className="p-2 border border-black font-mono font-bold">{item.sku}</td>
                      <td className="p-2 border border-black">{item.name}</td>
                      <td className="p-2 border border-black font-mono">{item.batchNo}</td>
                      <td className="p-2 border border-black text-center font-bold">{item.quantity}</td>
                      <td className="p-2 border border-black text-right">₹{item.unitCost.toFixed(2)}</td>
                      <td className="p-2 border border-black text-right">₹{(item.sellingPrice || item.unitCost * 1.5).toFixed(2)}</td>
                      <td className="p-2 border border-black text-right font-bold">₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-slate-50">
                    <td colSpan={4} className="p-2 border border-black text-right">TOTALS</td>
                    <td className="p-2 border border-black text-center">{totalUnits} Units</td>
                    <td colSpan={2} className="p-2 border border-black"></td>
                    <td className="p-2 border border-black text-right">₹{totalGrnValue.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-4">
                <h3 className="text-xs font-bold uppercase mb-2">Serialized Barcode Stickers for this GRN:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {completedItems.map(item => (
                    <div key={item.id} className="border border-black p-2 rounded flex flex-col justify-between">
                      <div className="flex justify-between text-[8px] font-bold">
                        <span>{settings.orgName}</span>
                        <span>₹{(item.sellingPrice || item.unitCost * 1.5).toFixed(2)}</span>
                      </div>
                      <p className="text-[9px] font-bold truncate">{item.name}</p>
                      <div className="py-1 flex justify-center">
                        <BarcodeView value={item.barcode || '490001234567'} width={1} height={28} fontSize={8} />
                      </div>
                      <div className="flex justify-between text-[7px] font-mono">
                        <span>SKU: {item.sku}</span>
                        <span>BATCH: {item.batchNo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden Print-Ready Dedicated Barcode Stickers Roll Layout */}
          <div id="grn-labels-print-preview" className="hidden">
            <div className="p-4 bg-white text-black space-y-4 max-w-4xl mx-auto">
              <div className="border-b-2 border-black pb-2 flex justify-between items-center text-xs font-mono">
                <span className="font-bold uppercase">{settings.orgName} — SERIALIZED STICKER ROLL</span>
                <span>GRN: {generatedGrnNumber} • {totalUnits} TOTAL UNITS</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {completedItems.map(item => (
                  <div
                    key={`label-roll-${item.id}`}
                    className="print-sticker p-2.5 bg-white text-black border-2 border-black rounded flex flex-col justify-between space-y-1"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    <div className="flex justify-between items-start text-[8px] font-bold font-mono">
                      <span className="truncate max-w-[70%]">{settings.orgName}</span>
                      <span>₹{(item.sellingPrice || item.unitCost * 1.5).toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] font-bold leading-tight line-clamp-1">{item.name}</p>
                    <div className="py-1 flex justify-center border-y border-dashed border-black">
                      <BarcodeView value={item.barcode || '490001234567'} width={1} height={28} fontSize={8} />
                    </div>
                    <div className="flex justify-between items-center text-[7px] font-mono font-bold">
                      <span>SKU: {item.sku}</span>
                      <span>BATCH: {item.batchNo}</span>
                      <span>QTY: {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
