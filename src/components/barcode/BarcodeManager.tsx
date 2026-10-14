'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { BarcodeView } from './BarcodeView';
import { BarcodeRecord } from '../../types';
import { exportBarcodesToPdf } from '../../lib/exportUtils';
import {
  QrCode,
  Printer,
  Barcode as BarcodeIcon,
  Tag,
  Search,
  CheckCircle2,
  Copy,
  Layers,
  Sparkles,
  Download,
  Filter,
  CheckSquare,
  Square,
  RotateCcw,
  Building2,
  Calendar,
  FileSpreadsheet,
  Check
} from 'lucide-react';

export const BarcodeManager: React.FC = () => {
  const { products, barcodes, addBarcodeRecord, inwardNotes, quickNotification, settings } = useERP();

  // Mode View Switcher: 'batch_grn' (Bulk Manager) vs 'single_sku' (Individual Sticker Tool)
  const [activeTab, setActiveTab] = useState<'batch_grn' | 'single_sku'>('batch_grn');

  // Single SKU Generator State
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [stickerType, setStickerType] = useState<'standard' | 'shelf' | 'jewel'>('standard');
  const [printCount, setPrintCount] = useState(24);
  const [customSerial, setCustomSerial] = useState('ISK-2026-8849');
  const [isPrinting, setIsPrinting] = useState(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState(products.find(p => p.id === selectedProductId)?.name || '');

  // GRN & Batch Bulk Filtering State (auto-hydrate active GRN filter from session if navigated from GRN completion)
  const [selectedGrnFilter, setSelectedGrnFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('active_grn_filter') || '';
    }
    return '';
  });
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBarcodeIds, setSelectedBarcodeIds] = useState<Set<string>>(new Set());
  const [bulkPrintingItems, setBulkPrintingItems] = useState<Array<any>>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [repeatByQuantity, setRepeatByQuantity] = useState<boolean>(false);

  const handleSetGrnFilter = (grn: string) => {
    setSelectedGrnFilter(grn);
    if (typeof window !== 'undefined') {
      if (grn) sessionStorage.setItem('active_grn_filter', grn);
      else sessionStorage.removeItem('active_grn_filter');
    }
  };

  const handleClearAllFilters = () => {
    setSelectedGrnFilter('');
    setSelectedBatchFilter('');
    setSearchQuery('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('active_grn_filter');
    }
  };

  const selectedProd = products.find(p => p.id === selectedProductId) || products[0];

  // Keep custom serial/batch aligned with product default batch in single view
  useEffect(() => {
    if (selectedProd) {
      setCustomSerial(selectedProd.batchNo);
    }
  }, [selectedProductId, selectedProd]);

  // Combine recorded barcodes and inward items into a unified searchable list
  const combinedBarcodes = useMemo(() => {
    const list: Array<BarcodeRecord & { price?: number; vendorName?: string; invoiceDate?: string }> = [...barcodes];
    
    // Also include items from inwardNotes that may not be in barcodes yet
    inwardNotes.forEach(inw => {
      inw.items?.forEach(item => {
        const exists = list.some(b => b.grnNumber === inw.grnNumber && b.sku === item.sku && b.batchNo === item.batchNo);
        if (!exists) {
          const matchedProd = products.find(p => p.sku === item.sku);
          list.push({
            id: `inw-bar-${inw.grnNumber}-${item.id || item.sku}`,
            sku: item.sku,
            productName: item.name,
            barcodeValue: matchedProd?.barcode || `49000${Math.abs(item.sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 1234567).toString().padStart(8, '0').slice(0, 8)}`,
            format: 'code128',
            template: 'retail_tag_1x2',
            generatedAt: inw.invoiceDate || new Date().toISOString(),
            batchNo: item.batchNo || 'BAT-MAIN',
            printCount: item.quantity || 1,
            branchId: inw.branchId,
            branchName: inw.branchName,
            grnNumber: inw.grnNumber,
            price: item.sellingPrice || matchedProd?.price || Number((item.unitCost * 1.5).toFixed(2)),
            vendorName: inw.vendorName,
            invoiceDate: inw.invoiceDate
          });
        }
      });
    });

    return list;
  }, [barcodes, inwardNotes, products]);

  // Distinct GRN Numbers
  const distinctGrns = useMemo(() => {
    const grnSet = new Set<string>();
    combinedBarcodes.forEach(b => {
      if (b.grnNumber) grnSet.add(b.grnNumber);
    });
    return Array.from(grnSet).sort().reverse();
  }, [combinedBarcodes]);

  // Distinct Batch IDs
  const distinctBatches = useMemo(() => {
    const batchSet = new Set<string>();
    combinedBarcodes.forEach(b => {
      if (b.batchNo) batchSet.add(b.batchNo);
    });
    return Array.from(batchSet).sort();
  }, [combinedBarcodes]);

  // Filtered Barcodes
  const filteredBarcodes = useMemo(() => {
    return combinedBarcodes.filter(item => {
      if (selectedGrnFilter && item.grnNumber !== selectedGrnFilter) return false;
      if (selectedBatchFilter && item.batchNo !== selectedBatchFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchName = item.productName.toLowerCase().includes(q);
        const matchBarcode = item.barcodeValue.includes(q);
        const matchBatch = item.batchNo?.toLowerCase().includes(q);
        const matchGrn = item.grnNumber?.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchBarcode && !matchBatch && !matchGrn) return false;
      }
      return true;
    });
  }, [combinedBarcodes, selectedGrnFilter, selectedBatchFilter, searchQuery]);

  // Initialize selection when filtered items change
  useEffect(() => {
    const allIds = new Set(filteredBarcodes.map(b => b.id));
    setSelectedBarcodeIds(allIds);
  }, [filteredBarcodes.length, selectedGrnFilter, selectedBatchFilter]);

  // Toggle selection for an individual item
  const toggleSelectBarcode = (id: string) => {
    setSelectedBarcodeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle Select All
  const handleSelectAll = () => {
    if (selectedBarcodeIds.size === filteredBarcodes.length) {
      setSelectedBarcodeIds(new Set());
    } else {
      setSelectedBarcodeIds(new Set(filteredBarcodes.map(b => b.id)));
    }
  };

  // Bulk Download Barcodes PDF
  const handleBulkDownloadPdf = () => {
    const itemsToExport = filteredBarcodes.filter(b => selectedBarcodeIds.has(b.id));
    if (itemsToExport.length === 0) {
      quickNotification('No Barcodes Selected', 'Please select at least one barcode to export.', 'warning');
      return;
    }

    const title = selectedGrnFilter
      ? `Barcodes for ${selectedGrnFilter}`
      : selectedBatchFilter
      ? `Barcodes for Batch ${selectedBatchFilter}`
      : `Batch Barcodes Sheet`;

    exportBarcodesToPdf({
      title,
      subtitle: `Export of ${itemsToExport.length} serialized barcodes • ${itemsToExport.reduce((sum, i) => sum + (i.printCount || 1), 0)} total sticker units`,
      repeatByQuantity,
      items: itemsToExport.map(i => ({
        sku: i.sku,
        productName: i.productName,
        barcodeValue: i.barcodeValue,
        batchNo: i.batchNo,
        price: i.price,
        grnNumber: i.grnNumber,
        printCount: i.printCount
      })),
      settings
    });

    quickNotification('PDF Download Complete', `Generated bulk barcode sheets for ${itemsToExport.length} items.`, 'success');
  };

  // Bulk Print Barcodes
  const handleBulkPrint = () => {
    const itemsToPrint = filteredBarcodes.filter(b => selectedBarcodeIds.has(b.id));
    if (itemsToPrint.length === 0) {
      quickNotification('No Barcodes Selected', 'Please select at least one barcode to print.', 'warning');
      return;
    }

    const itemsForPrint = repeatByQuantity
      ? itemsToPrint.flatMap(item =>
          Array.from({ length: Math.min(item.printCount || 1, 50) }).map((_, idx) => ({
            ...item,
            unitIndex: idx + 1,
            totalUnits: item.printCount
          }))
        )
      : itemsToPrint;

    setBulkPrintingItems(itemsForPrint);
    quickNotification('Preparing Print Sheet', `Dispatched ${itemsForPrint.length} barcode stickers to printer layout.`, 'info');

    setTimeout(() => {
      const printSection = document.getElementById('bulk-print-section');
      if (printSection) {
        const printClone = printSection.cloneNode(true) as HTMLElement;
        printClone.id = 'bulk-print-active';
        printClone.classList.remove('hidden');
        printClone.classList.add('active-print-element');
        document.body.appendChild(printClone);
        document.body.classList.add('print-labels-only');

        const pageStyle = document.createElement('style');
        pageStyle.id = 'dynamic-bulk-print-style';
        pageStyle.innerHTML = `@page { size: auto; margin: 4mm; }`;
        document.head.appendChild(pageStyle);

        window.print();

        setTimeout(() => {
          printClone.remove();
          document.body.classList.remove('print-labels-only');
          const pStyle = document.getElementById('dynamic-bulk-print-style');
          if (pStyle) pStyle.remove();
          setBulkPrintingItems([]);
        }, 500);
      } else {
        window.print();
        setBulkPrintingItems([]);
      }
    }, 400);
  };

  // Single SKU Print handler
  const handlePrint = () => {
    setIsPrinting(true);
    addBarcodeRecord({
      sku: selectedProd?.sku || 'SKU-001',
      barcodeValue: selectedProd?.barcode || '1234567890123',
      productName: selectedProd?.name || 'Devotional Book Item',
      format: 'code128',
      template: (stickerType === 'standard' ? 'retail_tag_1x2' : stickerType === 'shelf' ? 'shelf_label_2x3' : 'jewelry_hangtag'),
      generatedAt: new Date().toISOString(),
      batchNo: customSerial,
      printCount: printCount,
      price: selectedProd?.price
    });

    setTimeout(() => {
      setIsPrinting(false);
      quickNotification('Stickers Dispatched', `Sent ${printCount} barcode tags (${stickerType.toUpperCase()}) to thermal printer.`, 'success');
      
      const printSection = document.getElementById('print-section');
      if (printSection) {
        const printClone = printSection.cloneNode(true) as HTMLElement;
        printClone.id = 'print-section-active';
        printClone.classList.remove('hidden');
        printClone.classList.add('active-print-element');
        document.body.appendChild(printClone);
        
        document.body.classList.add('print-labels-only');
        
        const pageStyle = document.createElement('style');
        pageStyle.id = 'dynamic-print-page-style';
        pageStyle.innerHTML = `@page { size: auto; margin: 3mm; }`;
        document.head.appendChild(pageStyle);
        
        window.print();
        
        setTimeout(() => {
          printClone.remove();
          document.body.classList.remove('print-labels-only');
          const pStyle = document.getElementById('dynamic-print-page-style');
          if (pStyle) pStyle.remove();
        }, 500);
      } else {
        window.print();
      }
    }, 800);
  };

  // Single SKU Download PDF handler
  const handleSinglePdfDownload = () => {
    exportBarcodesToPdf({
      title: `${selectedProd?.name || 'Item'} Barcode Sheet`,
      subtitle: `SKU: ${selectedProd?.sku} • Batch: ${customSerial} • ${printCount} stickers`,
      items: Array.from({ length: printCount }).map(() => ({
        sku: selectedProd?.sku || 'SKU-001',
        productName: selectedProd?.name || 'Item',
        barcodeValue: selectedProd?.barcode || '1234567890123',
        batchNo: customSerial,
        price: selectedProd?.price,
        printCount: 1
      })),
      settings
    });
    quickNotification('PDF Downloaded', `Generated ${printCount} sticker sheet for ${selectedProd?.sku}.`, 'success');
  };

  const handleCopyBarcode = (val: string, id: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedId(id);
    quickNotification('Barcode Copied', `Copied barcode ${val} to clipboard.`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-rose-500 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Barcode & Label Management Center
            </h1>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold border border-rose-500/20">
              GRN & BATCH READY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            GRN INWARD BARCODES • BATCH-WISE FILTERING • BULK PDF EXPORT • THERMAL STICKER ROLLS
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('batch_grn')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'batch_grn'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>GRN & BATCH FILTER ({combinedBarcodes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('single_sku')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'single_sku'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>SINGLE SKU GENERATOR</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: GRN & BATCH-WISE BULK MANAGER ================= */}
      {activeTab === 'batch_grn' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Filter & Search Bar Bento Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              {/* Filter controls row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                {/* 1. GRN Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3 text-amber-500" />
                    <span>Filter by GRN Number</span>
                  </label>
                  <select
                    value={selectedGrnFilter}
                    onChange={e => handleSetGrnFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">All GRN Inward Sessions ({distinctGrns.length})</option>
                    {distinctGrns.map(grn => {
                      const count = combinedBarcodes.filter(b => b.grnNumber === grn).length;
                      return (
                        <option key={grn} value={grn}>
                          {grn} ({count} barcodes)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Batch Filter */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-500" />
                    <span>Filter by Batch ID</span>
                  </label>
                  <select
                    value={selectedBatchFilter}
                    onChange={e => setSelectedBatchFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">All Batches ({distinctBatches.length})</option>
                    {distinctBatches.map(batch => {
                      const count = combinedBarcodes.filter(b => b.batchNo === batch).length;
                      return (
                        <option key={batch} value={batch}>
                          {batch} ({count} items)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 3. SKU / Product Search */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Search className="w-3 h-3 text-rose-500" />
                    <span>Search Title / SKU / Barcode</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="e.g. Gita, BLR-, 8901..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Reset button if filter active */}
              {(selectedGrnFilter || selectedBatchFilter || searchQuery) && (
                <div className="shrink-0 flex items-end">
                  <button
                    type="button"
                    onClick={handleClearAllFilters}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Filters</span>
                  </button>
                </div>
              )}
            </div>

            {/* Active Filter Pills Bar */}
            {(selectedGrnFilter || selectedBatchFilter || searchQuery) && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-mono">
                <span className="text-[11px] text-slate-400 font-bold uppercase">Active Filter:</span>
                {selectedGrnFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                    <FileSpreadsheet className="w-3 h-3 text-amber-600" />
                    <span>GRN: {selectedGrnFilter}</span>
                    <button
                      type="button"
                      onClick={() => handleSetGrnFilter('')}
                      className="ml-1 text-amber-700 hover:text-black dark:hover:text-white cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {selectedBatchFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800">
                    <Layers className="w-3 h-3 text-indigo-600" />
                    <span>Batch: {selectedBatchFilter}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedBatchFilter('')}
                      className="ml-1 text-indigo-700 hover:text-black dark:hover:text-white cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                    <Search className="w-3 h-3 text-rose-600" />
                    <span>"{searchQuery}"</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="ml-1 text-rose-700 hover:text-black dark:hover:text-white cursor-pointer font-bold"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Bulk Action Ribbon */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:text-rose-600 cursor-pointer"
                >
                  {selectedBarcodeIds.size === filteredBarcodes.length && filteredBarcodes.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-rose-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>
                    Select All ({selectedBarcodeIds.size}/{filteredBarcodes.length} SKUs)
                  </span>
                </button>

                {/* Label Multiplier toggle */}
                <label className="inline-flex items-center gap-2 text-xs font-mono text-slate-700 dark:text-slate-300 cursor-pointer select-none bg-slate-50 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                  <input
                    type="checkbox"
                    checked={repeatByQuantity}
                    onChange={e => setRepeatByQuantity(e.target.checked)}
                    className="rounded accent-rose-600 cursor-pointer w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-bold">
                    Multi-Copy by Stock Qty ({repeatByQuantity ? `${filteredBarcodes.filter(b => selectedBarcodeIds.has(b.id)).reduce((sum, b) => sum + (b.printCount || 1), 0)} Total Labels` : '1 Label/SKU'})
                  </span>
                </label>
              </div>

              {/* Bulk Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkDownloadPdf}
                  disabled={selectedBarcodeIds.size === 0}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-600/20 transition-all cursor-pointer hover:-translate-y-0.5"
                  title="Bulk download selected barcodes as printable PDF sticker sheet"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>BULK DOWNLOAD PDF ({selectedBarcodeIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkPrint}
                  disabled={selectedBarcodeIds.size === 0}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 disabled:opacity-40 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Print selected barcode labels directly to browser printer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>BULK PRINT LABELS ({selectedBarcodeIds.size})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Barcode Grid / List */}
          {filteredBarcodes.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Filter className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                No Barcodes Matching Selected Filters
              </h3>
              <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">
                No inventory records match the current GRN or batch selection. Try clearing filters or create a new GRN Note.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedGrnFilter('');
                  setSelectedBatchFilter('');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-mono text-xs font-bold hover:bg-amber-700 cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBarcodes.map(item => {
                const isSelected = selectedBarcodeIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelectBarcode(item.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${
                      isSelected
                        ? 'bg-white dark:bg-slate-900 border-rose-500/80 shadow-md shadow-rose-500/5 ring-1 ring-rose-500/40'
                        : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 opacity-80'
                    }`}
                  >
                    {/* Top Row: Checkbox & Tags */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 pt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          {item.sku}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {item.price !== undefined && (
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-black text-white dark:bg-white dark:text-black">
                            {settings.currencySymbol}{Number(item.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product Name */}
                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                      {item.productName}
                    </p>

                    {/* Live Barcode Rendering */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center flex flex-col items-center justify-center shadow-2xs">
                      <BarcodeView value={item.barcodeValue} width={1.2} height={32} fontSize={9} />
                    </div>

                    {/* Bottom Metadata & Badges */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono">
                      <div className="flex items-center justify-between text-slate-500">
                        <span>
                          Batch:{' '}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBatchFilter(item.batchNo);
                            }}
                            className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline cursor-pointer"
                            title="Click to filter by this Batch ID"
                          >
                            {item.batchNo}
                          </button>
                        </span>
                        <span>Stock Units: <strong>{item.printCount || 1}</strong></span>
                      </div>

                      <div className="flex items-center justify-between">
                        {item.grnNumber ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetGrnFilter(item.grnNumber || '');
                            }}
                            className="text-[9px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                            title="Click to filter by this GRN"
                          >
                            GRN: {item.grnNumber}
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-400">Manual Entry</span>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportBarcodesToPdf({
                                title: `${item.productName} Barcode`,
                                subtitle: `SKU: ${item.sku} • Batch: ${item.batchNo} • ${item.printCount || 1} units`,
                                items: [{
                                  sku: item.sku,
                                  productName: item.productName,
                                  barcodeValue: item.barcodeValue,
                                  batchNo: item.batchNo,
                                  price: item.price,
                                  grnNumber: item.grnNumber,
                                  printCount: item.printCount
                                }],
                                settings
                              });
                            }}
                            className="text-[9px] text-slate-400 hover:text-amber-600 flex items-center gap-0.5 cursor-pointer"
                            title="Download PDF sticker for this item"
                          >
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyBarcode(item.barcodeValue, item.id);
                            }}
                            className="text-[9px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-0.5 cursor-pointer"
                          >
                            {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === item.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hidden Bulk Print Section for window.print() */}
          <div id="bulk-print-section" className="hidden">
            <div className="p-4 bg-white text-black">
              <div className="mb-4 pb-2 border-b-2 border-black flex justify-between items-center text-xs font-mono">
                <span className="font-bold uppercase">{settings.orgName} — SERIALIZED BARCODE STICKERS</span>
                <span>{selectedGrnFilter ? `GRN: ${selectedGrnFilter}` : 'BULK PRINT BATCH'}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {bulkPrintingItems.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className="print-sticker p-3 bg-white text-black border-2 border-black rounded flex flex-col justify-between space-y-1"
                    style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                  >
                    <div className="flex justify-between items-start text-[8px] font-bold font-mono">
                      <span className="truncate max-w-[70%]">{settings.orgName}</span>
                      <span>{settings.currencySymbol}{Number(item.price || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-[9px] font-bold leading-tight line-clamp-1">{item.productName}</p>
                    <div className="py-1 flex justify-center border-y border-dashed border-black">
                      <BarcodeView value={item.barcodeValue} width={1} height={28} fontSize={8} />
                    </div>
                    <div className="flex justify-between items-center text-[7px] font-mono font-bold">
                      <span>SKU: {item.sku}</span>
                      <span>BATCH: {item.batchNo}</span>
                      {item.unitIndex ? <span>QTY: {item.unitIndex}/{item.totalUnits}</span> : <span>QTY: {item.printCount || 1}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: SINGLE SKU GENERATOR ================= */}
      {activeTab === 'single_sku' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-150">
          {/* Left Controls (6 Cols) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <h2 className="font-bold text-base text-slate-900 dark:text-white font-display flex items-center gap-2">
                <Tag className="w-4 h-4 text-rose-500" />
                <span>1. Select Merchandise SKU</span>
              </h2>

              <div className="space-y-2">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Product Catalog Target</label>
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search product name or SKU..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    value={skuSearchQuery}
                    onChange={(e) => setSkuSearchQuery(e.target.value)}
                    onFocus={() => setSkuSearchQuery('')}
                    onBlur={() => {
                        const selected = products.find(p => p.id === selectedProductId);
                        if (selected) setSkuSearchQuery(selected.name);
                    }}
                  />
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto hidden group-focus-within:block">
                    {products
                      .filter(p => p.name.toLowerCase().includes(skuSearchQuery.toLowerCase()) || p.sku.toLowerCase().includes(skuSearchQuery.toLowerCase()))
                      .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setSkuSearchQuery(p.name);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white hover:bg-rose-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        {p.sku} — {p.name} (₹{p.price.toFixed(2)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Barcode Value</label>
                  <input
                    type="text"
                    readOnly
                    value={selectedProd?.barcode || '88491029384'}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 border border-transparent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Custom Prefix / Batch</label>
                  <input
                    type="text"
                    value={customSerial}
                    onChange={e => setCustomSerial(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-xs font-mono text-slate-400 uppercase">2. Sticker Dimensions & Format</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'standard', name: '1" x 2" Standard Tag', desc: 'Books & Apparel' },
                    { id: 'shelf', name: '2" x 4" Shelf Label', desc: 'Aisle Headers' },
                    { id: 'jewel', name: '0.5" x 1.5" Mini Tag', desc: 'Japa Mala & Beads' },
                  ].map(type => (
                    <button
                      key={type.id}
                      onClick={() => setStickerType(type.id as any)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        stickerType === type.id
                          ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xs font-bold font-mono">{type.name}</span>
                      <span className="text-[10px] text-slate-400 mt-1">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">3. Quantity to Print</label>
                  <span className="font-mono font-bold text-rose-500 text-sm">{printCount} stickers</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="100"
                  step="4"
                  value={printCount}
                  onChange={e => setPrintCount(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>4 (1 row)</span>
                  <span>24 (1 sheet)</span>
                  <span>100 (bulk roll)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSinglePdfDownload}
                  className="py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>DOWNLOAD PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold font-mono text-xs shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isPrinting ? 'DISPATCHING...' : `PRINT LABELS`}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Live Sticker Preview (6 Cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold font-mono uppercase text-slate-400">LIVE PRINT SHEET PREVIEW (4x MATRIX)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  DPI: 300 THERMAL
                </span>
              </div>

              {/* Sticker Grid Preview */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-[480px] overflow-y-auto">
                {Array.from({ length: Math.min(printCount, 8) }).map((_, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg bg-white text-black shadow-md border border-slate-300 flex flex-col justify-between space-y-2 relative"
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[9px] font-bold font-mono tracking-tighter text-slate-600 uppercase truncate max-w-[70%]">{settings.orgName || settings.appTitle}</span>
                      <span className="text-[9px] font-bold font-mono bg-black text-white px-1 rounded shrink-0">{settings.currencySymbol}{selectedProd?.price.toFixed(2)}</span>
                    </div>
                    <p className="text-xs font-bold leading-tight line-clamp-1 text-black">{selectedProd?.name}</p>
                    
                    {/* Real Barcode View */}
                    <div className="py-1 flex flex-col items-center justify-center border-y border-dashed border-slate-300">
                      <BarcodeView value={selectedProd?.barcode || '88491029384'} width={1.2} height={34} fontSize={10} />
                    </div>
                    
                    <div className="flex justify-between items-center text-[8px] font-mono text-slate-500">
                      <span>SKU: {selectedProd?.sku}</span>
                      <span>{customSerial}</span>
                    </div>
                  </div>
                ))}
              </div>
              {printCount > 8 && (
                <p className="text-center text-[11px] font-mono text-slate-400">
                  + {printCount - 8} additional identical stickers ready on sheet...
                </p>
              )}
            </div>
          </div>

          {/* HIDDEN HIGH-CONTRAST PRINT-ONLY SECTION FOR SINGLE SKU */}
          <div id="print-section" className="hidden">
            <div className={stickerType === 'standard' ? 'grid grid-cols-3 gap-3 p-2' : stickerType === 'shelf' ? 'grid grid-cols-2 gap-4 p-2' : 'grid grid-cols-4 gap-2 p-1'}>
              {Array.from({ length: printCount }).map((_, i) => (
                <div
                  key={i}
                  className={`print-sticker p-4 bg-white text-black border-2 border-black flex flex-col justify-between space-y-2 relative rounded-md ${
                    stickerType === 'standard'
                      ? 'w-[2.25in] h-[1.25in]'
                      : stickerType === 'shelf'
                      ? 'w-[4in] h-[2in]'
                      : 'w-[1.75in] h-[0.75in] !p-2 !space-y-1'
                  }`}
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  {stickerType === 'jewel' ? (
                    <>
                      <div className="flex justify-between items-center text-[7px] font-bold font-mono text-black leading-none uppercase gap-1">
                        <span className="truncate max-w-[70%]">{settings.orgName || settings.appTitle}</span>
                        <span className="shrink-0">{settings.currencySymbol}{selectedProd?.price.toFixed(0)}</span>
                      </div>
                      <p className="text-[8px] font-bold leading-tight line-clamp-1 text-black font-sans">
                        {selectedProd?.name}
                      </p>
                      <div className="py-0.5 flex flex-col items-center justify-center border-y border-dashed border-black">
                        <BarcodeView value={selectedProd?.barcode || '88491029384'} width={0.9} height={20} fontSize={7} />
                      </div>
                      <div className="flex justify-between items-center text-[6px] font-bold font-mono text-black leading-none">
                        <span className="truncate">SKU: {selectedProd?.sku}</span>
                        <span>{customSerial}</span>
                      </div>
                    </>
                  ) : stickerType === 'shelf' ? (
                    <>
                      <div className="flex justify-between items-start border-b border-black pb-1 gap-2">
                        <div className="text-left min-w-0">
                          <span className="text-[9px] font-bold font-mono tracking-wider text-black block uppercase truncate">
                            {settings.orgName}
                          </span>
                          <span className="text-[10px] font-mono text-black font-semibold uppercase truncate block">
                            {settings.appTitle}
                          </span>
                        </div>
                        <div className="bg-black text-white px-2.5 py-1 rounded font-bold font-mono text-base text-center leading-none shrink-0">
                          {settings.currencySymbol}{selectedProd?.price.toFixed(2)}
                        </div>
                      </div>

                      <p className="text-sm font-black leading-snug line-clamp-2 text-black my-1 font-sans">
                        {selectedProd?.name}
                      </p>

                      <div className="py-1.5 flex flex-col items-center justify-center border-y-2 border-dashed border-black bg-white">
                        <BarcodeView value={selectedProd?.barcode || '88491029384'} width={1.5} height={48} fontSize={11} />
                      </div>

                      <div className="flex justify-between items-center text-[9px] font-mono font-bold text-black pt-1">
                        <span>SKU ID: {selectedProd?.sku}</span>
                        <span>BATCH: {customSerial}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[8px] font-bold font-mono tracking-tighter text-black uppercase truncate max-w-[70%]">
                          {settings.orgName || settings.appTitle}
                        </span>
                        <span className="text-[9px] font-mono font-bold bg-black text-white px-1.5 rounded shrink-0">
                          {settings.currencySymbol}{selectedProd?.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold leading-tight line-clamp-1 text-black font-sans">
                        {selectedProd?.name}
                      </p>

                      <div className="py-1 flex flex-col items-center justify-center border-y border-dashed border-black">
                        <BarcodeView value={selectedProd?.barcode || '88491029384'} width={1.2} height={30} fontSize={9} />
                      </div>

                      <div className="flex justify-between items-center text-[7px] font-mono text-black font-bold">
                        <span>SKU: {selectedProd?.sku}</span>
                        <span>BATCH: {customSerial}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
