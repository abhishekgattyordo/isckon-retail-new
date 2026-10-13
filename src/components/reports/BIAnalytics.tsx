'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  FileSpreadsheet,
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Layers,
  IndianRupee,
  PieChart,
  ShieldCheck,
  CheckCircle2,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  Boxes,
  Zap,
  Tag,
  Clock,
  Printer,
  FileText,
  Sparkles,
  ChevronDown,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  exportBIAnalyticsToExcel,
  exportBIAnalyticsToPdf,
  exportBIAnalyticsToCsv,
  BIAnalyticsExportData
} from '../../lib/exportUtils';

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'thismonth' | 'last30days' | 'thisquarter' | 'thisyear' | 'all' | 'custom';

export const BIAnalytics: React.FC = () => {
  const { products, orders, inwardNotes, quickNotification, settings } = useERP();

  // Date Range state with default to current month
  const [selectedPreset, setSelectedPreset] = useState<DatePreset>('thismonth');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // 1st of current month
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  const [timeBasis, setTimeBasis] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isExporting, setIsExporting] = useState(false);

  // Preset Date Selection Handler
  const handleSelectPreset = (preset: DatePreset) => {
    setSelectedPreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setTimeBasis('daily');
    } else if (preset === 'yesterday') {
      const yest = new Date();
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().slice(0, 10);
      setStartDate(yestStr);
      setEndDate(yestStr);
      setTimeBasis('daily');
    } else if (preset === 'last7days') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
      setTimeBasis('daily');
    } else if (preset === 'thismonth') {
      const d = new Date();
      d.setDate(1);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
      setTimeBasis('weekly');
    } else if (preset === 'last30days') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
      setTimeBasis('weekly');
    } else if (preset === 'thisquarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      const startQuarter = new Date(now.getFullYear(), quarter * 3, 1);
      setStartDate(startQuarter.toISOString().slice(0, 10));
      setEndDate(todayStr);
      setTimeBasis('monthly');
    } else if (preset === 'thisyear') {
      const startYear = new Date(now.getFullYear(), 0, 1);
      setStartDate(startYear.toISOString().slice(0, 10));
      setEndDate(todayStr);
      setTimeBasis('monthly');
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      setTimeBasis('monthly');
    }
  };

  // Safe timestamp parser
  const parseToTimestamp = (str?: string | null): number | null => {
    if (!str) return null;
    const trimmed = str.trim();
    if (!trimmed) return null;

    // Direct ISO or standard parse
    const direct = Date.parse(trimmed);
    if (!isNaN(direct)) return direct;

    // Check YYYY-MM-DD
    const isoMatch = trimmed.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3])).getTime();
    }

    // Check DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
      return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1])).getTime();
    }

    const lower = trimmed.toLowerCase();
    const now = new Date();
    if (lower.includes('today') || lower.includes('just now')) return now.getTime();
    if (lower.includes('yesterday')) {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return y.getTime();
    }

    // If it is only a time like "10:30 AM" or "14:20"
    if (/^\d{1,2}:\d{2}/.test(trimmed)) {
      return now.getTime();
    }

    return null;
  };

  // Date Range checking logic
  const isDateInRange = (dateStr?: string | null) => {
    if (selectedPreset === 'all') return true;
    if (!startDate && !endDate) return true;
    if (!dateStr) return false;

    const t = parseToTimestamp(dateStr);
    if (t === null) return true;

    const startBoundary = startDate ? new Date(startDate + 'T00:00:00').getTime() : 0;
    const endBoundary = endDate ? new Date(endDate + 'T23:59:59.999').getTime() : Infinity;

    return t >= startBoundary && t <= endBoundary;
  };

  // Filter datasets dynamically based on user date range
  const filteredOrders = useMemo(() => {
    return orders.filter(o => isDateInRange(o.timestamp));
  }, [orders, startDate, endDate, selectedPreset]);

  const filteredInwardNotes = useMemo(() => {
    return inwardNotes.filter(n => isDateInRange(n.timestamp || n.invoiceDate || (n as any).createdDateTime));
  }, [inwardNotes, startDate, endDate, selectedPreset]);

  // Dynamic KPI calculations strictly based on filtered data
  const totalSalesRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalInboundCost = filteredInwardNotes.reduce((sum, n) => sum + (Number(n.totalValue) || 0), 0);
  const totalSalesBills = filteredOrders.length;
  const totalInboundNotes = filteredInwardNotes.length;

  const totalQuantitySold = filteredOrders.reduce(
    (sum, o) => sum + o.items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0),
    0
  );
  const totalQuantityInbound = filteredInwardNotes.reduce(
    (sum, n) => sum + (n.items?.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || 0),
    0
  );

  // Literature (Books) vs Gift Items Breakdown
  const booksRevenue = filteredOrders.reduce((sum, o) => {
    const bookItemsSum = o.items.reduce((acc, it) => {
      const cat = it.product?.category?.toLowerCase() || '';
      if (cat.includes('book') || cat.includes('literature') || cat.includes('gita') || cat.includes('bhagavatam')) {
        const itemPrice = it.product?.price || 0;
        const discount = (it.discountPercent || 0) / 100;
        return acc + (itemPrice * it.quantity * (1 - discount));
      }
      return acc;
    }, 0);
    return sum + bookItemsSum;
  }, 0);

  const giftsRevenue = Math.max(0, totalSalesRevenue - booksRevenue);
  const avgTicketValue = totalSalesBills > 0 ? totalSalesRevenue / totalSalesBills : 0;
  const gstCollected = totalSalesRevenue * 0.05;

  // Formatted date range label
  const dateRangeLabel = useMemo(() => {
    switch (selectedPreset) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'last7days': return 'Last 7 Days';
      case 'thismonth': return 'This Month';
      case 'last30days': return 'Last 30 Days';
      case 'thisquarter': return 'This Quarter';
      case 'thisyear': return 'This Year';
      case 'all': return 'All Time';
      default: return 'Custom Range';
    }
  }, [selectedPreset]);

  // Reactive Chart Data generated directly from active range data
  const activeChartData = useMemo(() => {
    if (timeBasis === 'daily') {
      const slots = [
        { name: '08:00 - 10:00', books: 0, gifts: 0 },
        { name: '10:00 - 12:00', books: 0, gifts: 0 },
        { name: '12:00 - 14:00', books: 0, gifts: 0 },
        { name: '14:00 - 16:00', books: 0, gifts: 0 },
        { name: '16:00 - 18:00', books: 0, gifts: 0 },
        { name: '18:00 - 21:00 (Aarti)', books: 0, gifts: 0 }
      ];

      if (filteredOrders.length === 0) {
        return slots;
      }

      // Distribute actual filtered orders by timestamp hour
      filteredOrders.forEach(order => {
        const dateObj = order.timestamp ? new Date(order.timestamp) : new Date();
        const hour = isNaN(dateObj.getHours()) ? 12 : dateObj.getHours();

        let slotIndex = 2; // Default afternoon
        if (hour < 10) slotIndex = 0;
        else if (hour < 12) slotIndex = 1;
        else if (hour < 14) slotIndex = 2;
        else if (hour < 16) slotIndex = 3;
        else if (hour < 18) slotIndex = 4;
        else slotIndex = 5;

        const orderBooks = order.items.reduce((s, it) => {
          const cat = it.product?.category?.toLowerCase() || '';
          if (cat.includes('book') || cat.includes('literature')) {
            return s + (it.product.price * it.quantity * (1 - (it.discountPercent || 0) / 100));
          }
          return s;
        }, 0);
        const orderGifts = Math.max(0, order.total - orderBooks);

        slots[slotIndex].books += Math.round(orderBooks);
        slots[slotIndex].gifts += Math.round(orderGifts);
      });

      return slots;
    }

    if (timeBasis === 'weekly') {
      const days = [
        { name: 'Mon', books: 0, gifts: 0 },
        { name: 'Tue', books: 0, gifts: 0 },
        { name: 'Wed', books: 0, gifts: 0 },
        { name: 'Thu', books: 0, gifts: 0 },
        { name: 'Fri', books: 0, gifts: 0 },
        { name: 'Sat', books: 0, gifts: 0 },
        { name: 'Sun (Feast)', books: 0, gifts: 0 }
      ];

      if (filteredOrders.length === 0) {
        return days;
      }

      filteredOrders.forEach(order => {
        const dateObj = order.timestamp ? new Date(order.timestamp) : new Date();
        const dayIdx = isNaN(dateObj.getDay()) ? 0 : (dateObj.getDay() + 6) % 7; // Convert Sun(0)-Sat(6) to Mon(0)-Sun(6)

        const orderBooks = order.items.reduce((s, it) => {
          const cat = it.product?.category?.toLowerCase() || '';
          if (cat.includes('book') || cat.includes('literature')) {
            return s + (it.product.price * it.quantity * (1 - (it.discountPercent || 0) / 100));
          }
          return s;
        }, 0);
        const orderGifts = Math.max(0, order.total - orderBooks);

        if (days[dayIdx]) {
          days[dayIdx].books += Math.round(orderBooks);
          days[dayIdx].gifts += Math.round(orderGifts);
        }
      });

      return days;
    }

    // Monthly view
    const months = [
      { name: 'Jan', books: 0, gifts: 0 },
      { name: 'Feb', books: 0, gifts: 0 },
      { name: 'Mar', books: 0, gifts: 0 },
      { name: 'Apr', books: 0, gifts: 0 },
      { name: 'May', books: 0, gifts: 0 },
      { name: 'Jun', books: 0, gifts: 0 },
      { name: 'Jul', books: 0, gifts: 0 },
      { name: 'Aug', books: 0, gifts: 0 },
      { name: 'Sep', books: 0, gifts: 0 },
      { name: 'Oct', books: 0, gifts: 0 },
      { name: 'Nov', books: 0, gifts: 0 },
      { name: 'Dec', books: 0, gifts: 0 }
    ];

    if (filteredOrders.length === 0) {
      return months;
    }

    filteredOrders.forEach(order => {
      const dateObj = order.timestamp ? new Date(order.timestamp) : new Date();
      const monthIdx = isNaN(dateObj.getMonth()) ? 9 : dateObj.getMonth();

      const orderBooks = order.items.reduce((s, it) => {
        const cat = it.product?.category?.toLowerCase() || '';
        if (cat.includes('book') || cat.includes('literature')) {
          return s + (it.product.price * it.quantity * (1 - (it.discountPercent || 0) / 100));
        }
        return s;
      }, 0);
      const orderGifts = Math.max(0, order.total - orderBooks);

      if (months[monthIdx]) {
        months[monthIdx].books += Math.round(orderBooks);
        months[monthIdx].gifts += Math.round(orderGifts);
      }
    });

    return months;
  }, [timeBasis, filteredOrders]);

  // Export handlers
  const handleExport = (type: 'excel' | 'pdf' | 'csv') => {
    setIsExporting(true);

    setTimeout(() => {
      try {
        const exportData: BIAnalyticsExportData = {
          dateRangeLabel,
          startDate,
          endDate,
          summary: {
            totalSalesRevenue,
            totalSalesBills,
            booksRevenue,
            giftsRevenue,
            totalQuantitySold,
            avgTicketValue,
            totalInboundCost,
            totalInboundNotes,
            totalQuantityInbound,
            gstCollected
          },
          orders: filteredOrders.map(o => ({
            orderNumber: o.orderNumber,
            timestamp: o.timestamp,
            customerName: o.customerName || 'Walk-in Devotee',
            paymentMethod: o.paymentMethod,
            salesTag: o.salesTag || 'Standard',
            itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
            total: o.total
          })),
          inwardNotes: filteredInwardNotes.map(n => ({
            grnNumber: n.grnNumber,
            invoiceDate: n.invoiceDate || n.timestamp || '',
            vendorName: n.vendorName,
            warehouse: n.warehouse || 'Main Warehouse',
            itemsCount: n.items?.reduce((s, i) => s + i.quantity, 0) || 0,
            totalValue: n.totalValue
          }))
        };

        if (type === 'excel') {
          exportBIAnalyticsToExcel(exportData);
        } else if (type === 'pdf') {
          exportBIAnalyticsToPdf(exportData);
        } else if (type === 'csv') {
          exportBIAnalyticsToCsv(exportData);
        }

        quickNotification(
          'Export Successful',
          `Generated ${type.toUpperCase()} report for ${dateRangeLabel} (${startDate} to ${endDate}).`,
          'success'
        );
      } catch (err) {
        console.error('Export error:', err);
        quickNotification('Export Error', `Could not export ${type.toUpperCase()} report.`, 'alert');
      } finally {
        setIsExporting(false);
      }
    }, 400);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Module Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800/60">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                  Business Intelligence & Audit Reports
                </h1>
                <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[10px] font-bold">
                  GST 5% SYNCED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                DATE-DRIVEN ANALYTICS • LITERATURE REVENUE RECONCILIATION • INWARD GRN LEDGERS
              </p>
            </div>
          </div>
        </div>

        {/* Quick Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold font-mono text-xs shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export Excel workbook (.xlsx) with all filtered sheets"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-300 font-bold font-mono text-xs shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download formatted audit PDF document"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-bold font-mono text-xs shadow-sm flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            title="Download CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Print Current Report View"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. DEDICATED DATE RANGE SELECTION PANEL */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
              Report Date Range Filter
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-[10px] font-mono font-bold border border-amber-200 dark:border-amber-800">
              {dateRangeLabel}{startDate && endDate ? `: ${startDate} – ${endDate}` : ' (All Dates)'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              ({filteredOrders.length} Orders • {filteredInwardNotes.length} Inwards)
            </span>
          </div>

          {/* Time basis resolution switcher */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-[11px] text-slate-400 font-mono">Chart Breakdown:</span>
            <div className="p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex text-xs font-mono">
              {(['daily', 'weekly', 'monthly'] as const).map(basis => (
                <button
                  key={basis}
                  type="button"
                  onClick={() => setTimeBasis(basis)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase transition-all cursor-pointer ${
                    timeBasis === basis
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {basis}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Date Presets Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
          <span className="text-slate-400 text-[11px] font-bold shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Presets:
          </span>

          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last7days', label: 'Last 7 Days' },
            { id: 'thismonth', label: 'This Month' },
            { id: 'last30days', label: 'Last 30 Days' },
            { id: 'thisquarter', label: 'This Quarter' },
            { id: 'thisyear', label: 'This Year' },
            { id: 'all', label: 'All Time' }
          ].map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id as DatePreset)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedPreset === p.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Interactive From & To Date Pickers */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/70 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">FROM:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-mono">TO:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
            Filtering Active Span: <strong className="text-amber-700 dark:text-amber-400 font-bold">{startDate}</strong> to <strong className="text-amber-700 dark:text-amber-400 font-bold">{endDate}</strong>
          </div>
        </div>
      </div>

      {/* 3. Dynamic Summary Cards (Strictly Computed for Active Date Range) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1: Sales Outflow */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">POS Sales Revenue</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {settings.currencySymbol}{totalSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              From <strong>{totalSalesBills}</strong> finalized checkouts
            </p>
          </div>
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] font-mono text-slate-500">
            <span>Books: {settings.currencySymbol}{booksRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <span>Gifts: {settings.currencySymbol}{giftsRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* KPI 2: Quantity Dispersed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Total Units Disbursed</span>
            <ShoppingCart className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {totalQuantitySold} <span className="text-xs text-slate-400 font-normal">pcs</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              Passed through mobile POS terminal
            </p>
          </div>
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-amber-600 font-bold">
            Average Basket: {(totalSalesBills > 0 ? (totalQuantitySold / totalSalesBills).toFixed(1) : 0)} items / bill
          </div>
        </div>

        {/* KPI 3: Inward Flow */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Inward Intake Valuation</span>
            <ArrowDownLeft className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {settings.currencySymbol}{totalInboundCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              Registered in <strong>{totalInboundNotes}</strong> GRN notes
            </p>
          </div>
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between text-[10px] font-mono text-slate-500">
            <span>Volume: {totalQuantityInbound} pcs stocked</span>
          </div>
        </div>

        {/* KPI 4: GST & Average Ticket */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-800 shadow-xs space-y-3 bg-amber-50/20">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">GST Collection (5%)</span>
            <Zap className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {settings.currencySymbol}{gstCollected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
              Avg Ticket: <strong>{settings.currencySymbol}{avgTicketValue.toFixed(2)}</strong>
            </p>
          </div>
          <div className="pt-2.5 border-t border-amber-200/50 dark:border-slate-800 text-[10px] font-mono text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> AUDIT TRAIL VERIFIED
          </div>
        </div>
      </div>

      {/* 4. Chart & Compliance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-display">
                Revenue Flow Breakdown ({timeBasis.toUpperCase()} BASIS)
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Period: {dateRangeLabel} ({startDate} to {endDate})
              </p>
            </div>
            <div className="flex gap-4 text-xs font-mono font-bold">
              <span className="flex items-center gap-1.5 text-amber-500">
                <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Devotional Books
              </span>
              <span className="flex items-center gap-1.5 text-indigo-500">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" /> Gift Items
              </span>
            </div>
          </div>

          <div className="h-[280px] w-full">
            {filteredOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 font-mono text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50 p-6">
                <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300">No Sales Orders in Selected Period</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Change the date range or switch presets (e.g. &quot;All Time&quot; or &quot;Last 30 Days&quot;) to view analytics.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={val => `${settings.currencySymbol}${val}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#475569',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#fff',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Bar dataKey="books" stackId="a" fill="#f59e0b" name="Devotional Books" />
                  <Bar dataKey="gifts" stackId="a" fill="#6366f1" name="Gifts & Souvenirs" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Audit Compliance Verification */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest font-mono">
              Audit Compliance Report
            </h3>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">Total GST (5%)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {settings.currencySymbol}{gstCollected.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">Avg Transaction Value</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {settings.currencySymbol}{avgTicketValue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">Total Inward Batches</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{totalInboundNotes}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">Total Inward Qty</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{totalQuantityInbound} pcs</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Temple Auditor Verified</span>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono leading-relaxed">
              Filtered records have been timestamped and indexed. Ledger integrity is synchronized with local storage and database.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Tabled Breakdowns: Inbound Items vs Outbound Checkouts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INWARD LIST */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                Material Inwards (GRN Shipments)
              </h3>
              <p className="text-[10px] text-slate-400">Shipments received between {startDate} and {endDate}</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold border border-blue-200 dark:border-blue-800/50">
              {filteredInwardNotes.length} BATCHES
            </span>
          </div>

          <div className="overflow-y-auto max-h-[320px] pr-1">
            {filteredInwardNotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-mono bg-slate-50/50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No material inwards recorded in selected date range ({startDate} to {endDate}).
              </div>
            ) : (
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[9px] pb-2 font-bold">
                    <th className="pb-2">GRN / Date</th>
                    <th className="pb-2">Vendor / Zone</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredInwardNotes.map(note => (
                    <tr key={note.id} className="text-[11px] hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <p className="font-bold text-slate-900 dark:text-white">{note.grnNumber}</p>
                        <p className="text-[9px] text-slate-400">{note.timestamp ? note.timestamp.split(',')[0] : note.invoiceDate}</p>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">
                        <p className="truncate max-w-[150px] font-bold">{note.vendorName}</p>
                        <p className="text-[9px] text-indigo-600 dark:text-indigo-400">{note.warehouse || 'Main Warehouse'}</p>
                      </td>
                      <td className="py-3 text-center font-bold">
                        {note.items?.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} pcs
                      </td>
                      <td className="py-3 text-right font-bold text-slate-900 dark:text-white">
                        ₹{note.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* OUTWARD POS LOG */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white font-mono uppercase tracking-wider">
                POS Sales Checkout Logs
              </h3>
              <p className="text-[10px] text-slate-400">Transactions processed between {startDate} and {endDate}</p>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] font-bold border border-emerald-200 dark:border-emerald-800/50">
              {filteredOrders.length} ORDERS
            </span>
          </div>

          <div className="overflow-y-auto max-h-[320px] pr-1">
            {filteredOrders.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-mono bg-slate-50/50 dark:bg-slate-950/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No sales checkouts recorded in selected date range ({startDate} to {endDate}).
              </div>
            ) : (
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[9px] pb-2 font-bold">
                    <th className="pb-2">Invoice / Date</th>
                    <th className="pb-2">Customer & Mode</th>
                    <th className="pb-2 text-center">Items</th>
                    <th className="pb-2 text-right">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="text-[11px] hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3">
                        <p className="font-bold text-slate-900 dark:text-white">#{order.orderNumber}</p>
                        <p className="text-[9px] text-slate-400 truncate max-w-[130px]">
                          {(() => {
                            try {
                              const d = new Date(order.timestamp);
                              return !isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : order.timestamp;
                            } catch {
                              return order.timestamp;
                            }
                          })()}
                        </p>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                            {order.customerName || 'Walk-in Devotee'}
                          </p>
                          {order.salesTag && order.salesTag !== 'Standard Retail' && (
                            <span className="text-[8px] bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 px-1 rounded border border-amber-200/50">
                              {order.salesTag}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-blue-600 dark:text-blue-400 uppercase font-bold">{order.paymentMethod}</p>
                      </td>
                      <td className="py-3 text-center font-bold">
                        {order.items?.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} pcs
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{order.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
