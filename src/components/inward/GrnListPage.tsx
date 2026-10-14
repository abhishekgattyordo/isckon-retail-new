'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { MaterialInwardNote, InwardItem } from '../../types';
import { exportGrnBarcodesToPdf, exportGrnBarcodesOnlyToPdf } from '../../lib/exportUtils';
import { BarcodeView } from '../barcode/BarcodeView';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Calendar,
  Warehouse,
  Filter,
  Download,
  Printer,
  Barcode as BarcodeIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  ExternalLink,
  RotateCcw,
  Tag,
  Building2,
  PackageCheck,
  CheckCircle2,
  IndianRupee,
  Layers,
  Copy,
  Check
} from 'lucide-react';

interface GrnListPageProps {
  onAddNewGrn: () => void;
}

export const GrnListPage: React.FC<GrnListPageProps> = ({ onAddNewGrn }) => {
  const {
    inwardNotes,
    zones,
    settings,
    currentBranch,
    setActiveModule,
    quickNotification
  } = useERP();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selected GRN for detail preview modal
  const [activeModalNote, setActiveModalNote] = useState<MaterialInwardNote | null>(null);
  const [copiedGrn, setCopiedGrn] = useState<string | null>(null);

  // Filter logic
  const filteredNotes = useMemo(() => {
    return inwardNotes.filter(note => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchGrn = note.grnNumber.toLowerCase().includes(q);
        const matchPo = note.poNumber.toLowerCase().includes(q);
        const matchVendor = note.vendorName.toLowerCase().includes(q);
        const matchWarehouse = note.warehouse.toLowerCase().includes(q);
        const matchReceivedBy = note.receivedBy.toLowerCase().includes(q);
        const matchItems = note.items?.some(
          item => item.sku.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.batchNo.toLowerCase().includes(q)
        );
        if (!matchGrn && !matchPo && !matchVendor && !matchWarehouse && !matchReceivedBy && !matchItems) {
          return false;
        }
      }

      // 2. Warehouse Filter
      if (selectedWarehouse !== 'all') {
        if (!note.warehouse.toLowerCase().includes(selectedWarehouse.toLowerCase())) {
          return false;
        }
      }

      // 3. Status Filter
      if (selectedStatus !== 'all') {
        if (note.status !== selectedStatus) {
          return false;
        }
      }

      // 4. Date Range Filter
      if (datePreset !== 'all') {
        const noteDateStr = note.invoiceDate || note.timestamp?.slice(0, 10);
        if (!noteDateStr) return false;

        const noteDate = new Date(noteDateStr);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (datePreset === 'today') {
          if (noteDate < startOfToday) return false;
        } else if (datePreset === 'week') {
          const sevenDaysAgo = new Date(startOfToday);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          if (noteDate < sevenDaysAgo) return false;
        } else if (datePreset === 'month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (noteDate < startOfMonth) return false;
        } else if (datePreset === 'custom') {
          if (startDate) {
            const start = new Date(startDate);
            if (noteDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (noteDate > end) return false;
          }
        }
      }

      return true;
    });
  }, [inwardNotes, searchQuery, datePreset, startDate, endDate, selectedWarehouse, selectedStatus]);

  // Overall summary metrics based on filtered results
  const summaryMetrics = useMemo(() => {
    const totalCount = filteredNotes.length;
    const totalValuation = filteredNotes.reduce((sum, n) => sum + (Number(n.totalValue) || 0), 0);
    const totalUnits = filteredNotes.reduce((sum, n) => {
      const itemUnits = n.items?.reduce((iSum, i) => iSum + (Number(i.quantity) || 0), 0) || 0;
      return sum + itemUnits;
    }, 0);
    const uniqueVendors = new Set(filteredNotes.map(n => n.vendorName.trim().toLowerCase())).size;

    return { totalCount, totalValuation, totalUnits, uniqueVendors };
  }, [filteredNotes]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredNotes.length / pageSize));
  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredNotes.slice(start, start + pageSize);
  }, [filteredNotes, currentPage, pageSize]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, datePreset, startDate, endDate, selectedWarehouse, selectedStatus, pageSize]);

  const handleCopyGrn = (grn: string) => {
    navigator.clipboard?.writeText(grn);
    setCopiedGrn(grn);
    quickNotification('Copied', `GRN Number ${grn} copied to clipboard`, 'info');
    setTimeout(() => setCopiedGrn(null), 2000);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setSelectedWarehouse('all');
    setSelectedStatus('all');
  };

  const handleOpenInBarcodeCenter = (grnNo: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_grn_filter', grnNo);
    }
    setActiveModule('barcode');
    quickNotification('Barcode Center Filtered', `Filtered barcodes to ${grnNo}`, 'info');
  };

  const handleDirectPrintModal = () => {
    quickNotification('Printing GRN', 'Opening browser print dialog for GRN voucher', 'info');
    const printEl = document.getElementById('grn-detail-modal-print');
    if (printEl) {
      const printClone = printEl.cloneNode(true) as HTMLElement;
      printClone.id = 'grn-modal-print-active';
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
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Banner Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Material Inward Notes (GRN)
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {inwardNotes.length} REGISTERED
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                GOODS RECEIVED NOTES • INWARD INVENTORY • BATCH BARCODE REGISTRY
              </p>
            </div>
          </div>
        </div>

        {/* Primary Action Button: Add New GRN */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={onAddNewGrn}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-2 transition-all cursor-pointer hover:-translate-y-0.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ ADD NEW GRN</span>
          </button>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total GRNs</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {summaryMetrics.totalCount}
            </span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-normal">vouchers</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Inward Valuation</span>
            <IndianRupee className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{summaryMetrics.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Units Received</span>
            <PackageCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {summaryMetrics.totalUnits.toLocaleString('en-IN')}
            </span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-normal">items stocked</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Suppliers</span>
            <Building2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {summaryMetrics.uniqueVendors}
            </span>
            <span className="text-[11px] text-slate-400 ml-1.5 font-normal">publishers & vendors</span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar Bento Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box (5 cols) */}
          <div className="md:col-span-5 space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
              <Search className="w-3 h-3 text-amber-500" />
              <span>Search GRN / PO / Vendor / SKU</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search GRN number, PO#, vendor, SKU title..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Date Filter Preset (3 cols) */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-500" />
              <span>Date Range Filter</span>
            </label>
            <select
              value={datePreset}
              onChange={e => setDatePreset(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Dates Available</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Date Range...</option>
            </select>
          </div>

          {/* Warehouse Filter (2 cols) */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
              <Warehouse className="w-3 h-3 text-blue-500" />
              <span>Warehouse Zone</span>
            </label>
            <select
              value={selectedWarehouse}
              onChange={e => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Zones ({zones.length})</option>
              {zones.map(z => (
                <option key={z.id} value={z.name.split('—')[0].trim()}>
                  {z.name.split('—')[0].trim()}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter (2 cols) */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-500" />
              <span>Status</span>
            </label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="pending_qc">Pending QC</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Row (Shown only if datePreset === 'custom') */}
        {datePreset === 'custom' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Active Filter Tags & Reset */}
        {(searchQuery || datePreset !== 'all' || selectedWarehouse !== 'all' || selectedStatus !== 'all') && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Filtered:</span>
              {searchQuery && (
                <span className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold">
                  "{searchQuery}"
                </span>
              )}
              {datePreset !== 'all' && (
                <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 text-[11px] font-bold">
                  Date: {datePreset.toUpperCase()} {startDate && `from ${startDate}`} {endDate && `to ${endDate}`}
                </span>
              )}
              {selectedWarehouse !== 'all' && (
                <span className="px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 text-[11px] font-bold">
                  Zone: {selectedWarehouse}
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-[11px] font-bold">
                  Status: {selectedStatus}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        )}
      </div>

      {/* GRN Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {paginatedNotes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-900/60">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
              No Material Inward Notes Match Filters
            </h3>
            <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto">
              No previous GRNs matched the search or date range filters. Try clearing your filters or create a new Goods Received Note.
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold hover:bg-slate-200 cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={onAddNewGrn}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-mono font-bold hover:bg-amber-700 cursor-pointer shadow-sm"
              >
                + Add New GRN
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono h-11">
                  <th className="py-3 px-4 w-[16%]">GRN NUMBER</th>
                  <th className="py-3 px-3 w-[12%]">INVOICE DATE</th>
                  <th className="py-3 px-3 w-[20%]">SUPPLIER / VENDOR</th>
                  <th className="py-3 px-3 w-[14%]">PO & ZONE</th>
                  <th className="py-3 px-3 w-[12%] text-center">ITEMS RECEIVED</th>
                  <th className="py-3 px-4 w-[13%] text-right">TOTAL VALUATION</th>
                  <th className="py-3 px-3 w-[13%] text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {paginatedNotes.map(note => {
                  const itemCount = note.items?.length || 0;
                  const totalQty = note.items?.reduce((s, i) => s + (Number(i.quantity) || 0), 0) || 0;

                  return (
                    <tr
                      key={note.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => setActiveModalNote(note)}
                    >
                      {/* GRN Number */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-400 group-hover:underline">
                              {note.grnNumber}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyGrn(note.grnNumber);
                              }}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                              title="Copy GRN Number"
                            >
                              {copiedGrn === note.grnNumber ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {note.status || 'completed'}
                          </span>
                        </div>
                      </td>

                      {/* Invoice Date */}
                      <td className="py-3.5 px-3 align-middle font-mono text-slate-700 dark:text-slate-300">
                        <div>
                          <span className="font-semibold">{note.invoiceDate || note.timestamp?.slice(0, 10)}</span>
                          <span className="block text-[10px] text-slate-400">
                            {note.timestamp ? new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Logged'}
                          </span>
                        </div>
                      </td>

                      {/* Vendor / Supplier */}
                      <td className="py-3.5 px-3 align-middle">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {note.vendorName || 'General Supplier'}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">
                            Received by: {note.receivedBy || 'Store In-Charge'}
                          </span>
                        </div>
                      </td>

                      {/* PO Reference & Warehouse */}
                      <td className="py-3.5 px-3 align-middle font-mono">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                            PO: {note.poNumber || 'N/A'}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {note.warehouse?.split('—')[0]?.trim() || 'Central Zone'}
                          </span>
                        </div>
                      </td>

                      {/* Items Count & Units */}
                      <td className="py-3.5 px-3 align-middle text-center font-mono">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {itemCount} SKUs
                          </span>
                          <span className="text-[10px] text-slate-400">
                            ({totalQty} total pcs)
                          </span>
                        </div>
                      </td>

                      {/* Total Valuation */}
                      <td className="py-3.5 px-4 align-middle text-right font-mono">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm">
                          ₹{Number(note.totalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 align-middle text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveModalNote(note)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="View Full GRN Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              exportGrnBarcodesToPdf({
                                grnNumber: note.grnNumber,
                                poNumber: note.poNumber,
                                vendorName: note.vendorName,
                                invoiceDate: note.invoiceDate,
                                warehouse: note.warehouse,
                                branchName: note.branchName || currentBranch?.name,
                                receivedBy: note.receivedBy,
                                totalValue: Number(note.totalValue || 0),
                                notes: note.notes,
                                items: note.items || [],
                                settings
                              });
                              quickNotification('Voucher PDF Ready', `Exported voucher and barcode sheets for ${note.grnNumber}.`, 'success');
                            }}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                            title="Download Official Voucher + Barcode Sheet PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenInBarcodeCenter(note.grnNumber)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 transition-colors cursor-pointer"
                            title="Filter this GRN in Barcode Center"
                          >
                            <BarcodeIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredNotes.length > 0 && (
          <div className="p-4 bg-slate-50/80 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-3 text-slate-500">
              <span>
                Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                <strong>{Math.min(currentPage * pageSize, filteredNotes.length)}</strong> of{' '}
                <strong>{filteredNotes.length}</strong> GRNs
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">Rows:</span>
                <select
                  value={pageSize}
                  onChange={e => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-bold text-slate-800 dark:text-slate-200">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Detail Modal for Selected GRN */}
      {activeModalNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                      {activeModalNote.grnNumber}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {activeModalNote.status || 'completed'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400">
                    Vendor: <strong className="text-slate-700 dark:text-slate-300">{activeModalNote.vendorName}</strong> • PO: {activeModalNote.poNumber}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    exportGrnBarcodesToPdf({
                      grnNumber: activeModalNote.grnNumber,
                      poNumber: activeModalNote.poNumber,
                      vendorName: activeModalNote.vendorName,
                      invoiceDate: activeModalNote.invoiceDate,
                      warehouse: activeModalNote.warehouse,
                      branchName: activeModalNote.branchName || currentBranch?.name,
                      receivedBy: activeModalNote.receivedBy,
                      totalValue: Number(activeModalNote.totalValue || 0),
                      notes: activeModalNote.notes,
                      items: activeModalNote.items || [],
                      settings
                    });
                    quickNotification('Voucher PDF Ready', `Downloaded voucher for ${activeModalNote.grnNumber}.`, 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download Voucher PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Voucher PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportGrnBarcodesOnlyToPdf({
                      grnNumber: activeModalNote.grnNumber,
                      poNumber: activeModalNote.poNumber,
                      vendorName: activeModalNote.vendorName,
                      invoiceDate: activeModalNote.invoiceDate,
                      warehouse: activeModalNote.warehouse,
                      branchName: activeModalNote.branchName || currentBranch?.name,
                      receivedBy: activeModalNote.receivedBy,
                      totalValue: Number(activeModalNote.totalValue || 0),
                      notes: activeModalNote.notes,
                      items: activeModalNote.items || [],
                      settings
                    });
                    quickNotification('Barcodes PDF Ready', `Downloaded barcode sheet for ${activeModalNote.grnNumber}.`, 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 text-white font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Download Barcodes Sheet PDF"
                >
                  <BarcodeIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Barcodes PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveModalNote(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Details & Items */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Invoice Date</span>
                  <span className="font-bold text-slate-900 dark:text-white">{activeModalNote.invoiceDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Warehouse Zone</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate block">{activeModalNote.warehouse}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Received By</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate block">{activeModalNote.receivedBy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Valuation</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(activeModalNote.totalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {activeModalNote.notes && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-mono text-amber-900 dark:text-amber-200">
                  <span className="font-bold uppercase text-[10px] block mb-0.5">Shipment Notes / Inspection:</span>
                  <p>{activeModalNote.notes}</p>
                </div>
              )}

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Inward Line Items ({activeModalNote.items?.length || 0} Products)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleOpenInBarcodeCenter(activeModalNote.grnNumber)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-mono font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open in Barcode Center</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] font-mono font-bold uppercase text-slate-500">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Product Name</th>
                        <th className="py-2.5 px-3">Batch #</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Cost (₹)</th>
                        <th className="py-2.5 px-3 text-right">Price (₹)</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                        <th className="py-2.5 px-3 text-center">Barcode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {activeModalNote.items?.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-indigo-600 dark:text-indigo-400">{item.sku}</td>
                          <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-white">{item.name}</td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{item.batchNo}</td>
                          <td className="py-2 px-3 text-center font-bold">{item.quantity}</td>
                          <td className="py-2 px-3 text-right">₹{Number(item.unitCost).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right text-blue-600 dark:text-blue-400">₹{Number(item.sellingPrice || item.unitCost * 1.5).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold">₹{Number(item.total).toFixed(2)}</td>
                          <td className="py-2 px-3 text-center">
                            <div className="inline-block p-1 bg-white border border-slate-200 rounded">
                              <BarcodeView value={`49000${Math.abs(item.sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 1234567).toString().padStart(8, '0').slice(0, 8)}`} width={0.9} height={20} fontSize={8} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">
                Created: {activeModalNote.timestamp ? new Date(activeModalNote.timestamp).toLocaleString('en-IN') : 'Official Document'}
              </span>
              <button
                type="button"
                onClick={() => setActiveModalNote(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
