'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Search,
  Filter,
  Calendar,
  User,
  Download,
  ShieldCheck,
  Lock,
  FileText,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpLeft,
  Info,
  Clock,
  AlertTriangle,
  Database,
  Building,
  Activity,
  Maximize2
} from 'lucide-react';

export const AuditLogPage: React.FC = () => {
  const { auditLogs, movements, users, user, setActiveModule } = useERP();

  // Tab State
  const [activeTab, setActiveTab] = useState<'activity' | 'movements'>('activity');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedActionType, setSelectedActionType] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Details Modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Reset Filters helper
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedUser('all');
    setSelectedModule('all');
    setSelectedActionType('all');
    setSelectedBranch('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Unique branches from audit logs
  const branches = useMemo(() => {
    const list = new Set<string>();
    auditLogs.forEach(log => {
      if (log.branch) list.add(log.branch);
    });
    return Array.from(list);
  }, [auditLogs]);

  // Action types list from audit logs
  const actionTypes = useMemo(() => {
    const list = new Set<string>();
    auditLogs.forEach(log => {
      if (log.action) list.add(log.action);
    });
    return Array.from(list);
  }, [auditLogs]);

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Search text matches (User Name, Action, SKU, Ref, Details)
      const q = searchQuery.toLowerCase().trim();
      const textMatch =
        !q ||
        log.staffName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.referenceNo && log.referenceNo.toLowerCase().includes(q)) ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        log.role.toLowerCase().includes(q);

      // Dropdown filters
      const userMatch = selectedUser === 'all' || log.userId === selectedUser || log.staffName === selectedUser;
      const moduleMatch = selectedModule === 'all' || log.module.toLowerCase() === selectedModule.toLowerCase();
      const actionMatch = selectedActionType === 'all' || log.action === selectedActionType;
      const branchMatch = selectedBranch === 'all' || log.branch === selectedBranch;

      // Date Filters
      let dateMatch = true;
      if (startDate) {
        dateMatch = dateMatch && new Date(log.timestamp) >= new Date(startDate);
      }
      if (endDate) {
        // Include full end day by adding 23:59:59
        const endWithTime = new Date(endDate);
        endWithTime.setHours(23, 59, 59, 999);
        dateMatch = dateMatch && new Date(log.timestamp) <= endWithTime;
      }

      return textMatch && userMatch && moduleMatch && actionMatch && branchMatch && dateMatch;
    });
  }, [auditLogs, searchQuery, selectedUser, selectedModule, selectedActionType, selectedBranch, startDate, endDate]);

  // Filtered Stock Movements
  const filteredMovements = useMemo(() => {
    return movements.filter(mov => {
      const q = searchQuery.toLowerCase().trim();
      const textMatch =
        !q ||
        mov.sku.toLowerCase().includes(q) ||
        mov.productName.toLowerCase().includes(q) ||
        mov.operator.toLowerCase().includes(q) ||
        (mov.referenceNo && mov.referenceNo.toLowerCase().includes(q)) ||
        (mov.batchNo && mov.batchNo.toLowerCase().includes(q));

      const typeMatch = selectedActionType === 'all' || mov.type === selectedActionType;
      const operatorMatch = selectedUser === 'all' || mov.operator === selectedUser;

      let dateMatch = true;
      if (startDate) {
        dateMatch = dateMatch && new Date(mov.timestamp) >= new Date(startDate);
      }
      if (endDate) {
        const endWithTime = new Date(endDate);
        endWithTime.setHours(23, 59, 59, 999);
        dateMatch = dateMatch && new Date(mov.timestamp) <= endWithTime;
      }

      return textMatch && typeMatch && operatorMatch && dateMatch;
    });
  }, [movements, searchQuery, selectedActionType, selectedUser, startDate, endDate]);

  // Current Paginated dataset
  const paginatedData = useMemo(() => {
    const data = activeTab === 'activity' ? filteredAuditLogs : filteredMovements;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  }, [activeTab, filteredAuditLogs, filteredMovements, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    const dataLen = activeTab === 'activity' ? filteredAuditLogs.length : filteredMovements.length;
    return Math.max(1, Math.ceil(dataLen / itemsPerPage));
  }, [activeTab, filteredAuditLogs.length, filteredMovements.length, itemsPerPage]);

  // KPI Metrics Calculation
  const metrics = useMemo(() => {
    const totalOps = auditLogs.length;
    
    // Processed Inwards (GRNs)
    const grnLogsCount = auditLogs.filter(l => l.module === 'inward' && l.action.toLowerCase().includes('inward')).length;
    
    // POS checkouts
    const posSalesCount = auditLogs.filter(l => l.module === 'pos').length;
    
    // Inventory adjustments
    const adjCount = movements.filter(m => m.type === 'shrinkage_adjustment').length;

    return { totalOps, grnLogsCount, posSalesCount, adjCount };
  }, [auditLogs, movements]);

  // Formatter for timestamp
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) + ' ' + date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  // Helper to export current logs view to CSV
  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeTab === 'activity') {
      csvContent += "Timestamp,User ID,Staff Name,Role,Branch,Action Performed,Module,Reference No,Details\n";
      filteredAuditLogs.forEach(log => {
        const row = [
          log.timestamp,
          log.userId || "",
          `"${log.staffName.replace(/"/g, '""')}"`,
          `"${log.role.replace(/"/g, '""')}"`,
          `"${(log.branch || "").replace(/"/g, '""')}"`,
          `"${log.action.replace(/"/g, '""')}"`,
          log.module,
          `"${(log.referenceNo || "").replace(/"/g, '""')}"`,
          `"${(log.details || "").replace(/"/g, '""')}"`
        ].join(",");
        csvContent += row + "\n";
      });
    } else {
      csvContent += "Timestamp,Type,SKU,Product Name,Qty Delta,From Zone,ToZone,Operator,Reference No,Batch No\n";
      filteredMovements.forEach(mov => {
        const row = [
          mov.timestamp,
          mov.type,
          mov.sku,
          `"${mov.productName.replace(/"/g, '""')}"`,
          mov.qtyDelta,
          mov.fromZone || "",
          mov.toZone || "",
          `"${mov.operator.replace(/"/g, '""')}"`,
          mov.referenceNo || "",
          mov.batchNo || ""
        ].join(",");
        csvContent += row + "\n";
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", activeTab === 'activity' ? "ISKCON_ERP_Audit_Trails.csv" : "ISKCON_ERP_Inventory_Movements.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Module Badges mapping
  const getModuleBadgeColor = (mod: string) => {
    switch (mod.toLowerCase()) {
      case 'pos':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50';
      case 'inward':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50';
      case 'products':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50';
      case 'inventory':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50';
      case 'barcode':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50';
      case 'events':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50';
      case 'settings':
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-[#FAF8F5] dark:bg-slate-950 min-h-screen flex flex-col gap-6 font-sans">
      
      {/* Upper Navigation Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E2D9] dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#D97706] dark:text-amber-400 uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>System Compliance & Ledger</span>
          </div>
          <h1 className="font-display font-black text-2xl lg:text-3xl text-slate-900 dark:text-white uppercase tracking-tight mt-1">
            Audit Trails & Stock Movements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authorized administrative ledger tracking every staff transaction, POS sale, GRN inward note, and stock adjustment.
          </p>
        </div>

        {/* Tab Controls and Actions */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/60 flex">
            <button
              onClick={() => { setActiveTab('activity'); setCurrentPage(1); }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'activity'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Activity Logs
            </button>
            <button
              onClick={() => { setActiveTab('movements'); setCurrentPage(1); }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'movements'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Stock Movements
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center shrink-0 text-[#D97706] dark:text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Total Operations logged</p>
            <h3 className="font-mono text-xl font-extrabold text-slate-950 dark:text-white mt-1">{metrics.totalOps}</h3>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">GRNs Processed</p>
            <h3 className="font-mono text-xl font-extrabold text-slate-950 dark:text-white mt-1">{metrics.grnLogsCount}</h3>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">POS Sales Logs</p>
            <h3 className="font-mono text-xl font-extrabold text-slate-950 dark:text-white mt-1">{metrics.posSalesCount}</h3>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-3xs">
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Inventory Adjustments</p>
            <h3 className="font-mono text-xl font-extrabold text-slate-950 dark:text-white mt-1">{metrics.adjCount}</h3>
          </div>
        </div>
      </div>

      {/* Multi-Criteria Advanced Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800/80 rounded-xl p-5 shadow-3xs">
        <div className="flex items-center gap-2 font-display font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/50 pb-3 mb-4">
          <Filter className="w-4 h-4 text-[#D97706]" />
          <span>Ledger Filter Explorer</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Query Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Search Query</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={activeTab === 'activity' ? "Search user, details, ref..." : "Search SKU, product, operator..."}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* User / Staff Filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Staff / Operator</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedUser}
                onChange={e => { setSelectedUser(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 appearance-none"
              >
                <option value="all">All Staff Members</option>
                {users.map(u => (
                  <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Module Filter (Only applicable to Activity logs) */}
          {activeTab === 'activity' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ERP System Module</label>
              <div className="relative">
                <Database className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedModule}
                  onChange={e => { setSelectedModule(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 appearance-none"
                >
                  <option value="all">All Modules</option>
                  <option value="pos">POS Checkout</option>
                  <option value="inward">Material Inward (GRN)</option>
                  <option value="products">Product Catalog</option>
                  <option value="inventory">Warehouse Inventory</option>
                  <option value="barcode">Barcodes & Prints</option>
                  <option value="events">Events & Stalls</option>
                  <option value="settings">Settings & Users</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Movement Type</label>
              <div className="relative">
                <ArrowLeftRight className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedActionType}
                  onChange={e => { setSelectedActionType(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 appearance-none"
                >
                  <option value="all">All Stock Types</option>
                  <option value="inward_grn">GRN Receipts</option>
                  <option value="pos_sale">POS Cashier Sales</option>
                  <option value="zone_transfer">Warehouse transfers</option>
                  <option value="shrinkage_adjustment">Stock Adjustments</option>
                  <option value="return_restock">Returns & Restock</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Action Type or Branch (Depending on tab) */}
          {activeTab === 'activity' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action Category</label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedActionType}
                  onChange={e => { setSelectedActionType(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 appearance-none"
                >
                  <option value="all">All Action Types</option>
                  {actionTypes.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Adjustment Search helper</label>
              <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/20 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Filter by SKU or Batch in the main search bar</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
          
          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ledger Start Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ledger End Date</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Branch Filter (Only Activity logs) */}
          {activeTab === 'activity' ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ISKCON Branch Location</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={selectedBranch}
                  onChange={e => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500 appearance-none"
                >
                  <option value="all">All Locations</option>
                  {branches.map(br => (
                    <option key={br} value={br}>{br}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Location Scope</label>
              <div className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/20 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Movements reflect actual inventory warehouse zones</span>
              </div>
            </div>
          )}

          {/* Reset Action */}
          <div className="flex flex-col justify-end">
            <button
              onClick={handleResetFilters}
              className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-700 rounded-lg py-2 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shadow-3xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Ledgers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Ledger Table Grid */}
      <div className="bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800/80 rounded-xl shadow-3xs flex-1 flex flex-col overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Displaying {activeTab === 'activity' ? filteredAuditLogs.length : filteredMovements.length} records matching criteria
          </span>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Page size:</span>
            <select
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Outer overflow container */}
        <div className="flex-1 overflow-x-auto">
          {activeTab === 'activity' ? (
            /* ACTIVITY TAB TABLE */
            <table className="w-full text-left border-collapse table-auto min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider bg-slate-50/20 dark:bg-slate-950/25">
                  <th className="px-5 py-3">Timestamp / Date</th>
                  <th className="px-5 py-3">System Module</th>
                  <th className="px-5 py-3">Action Type</th>
                  <th className="px-5 py-3">Performed By</th>
                  <th className="px-5 py-3">Reference No</th>
                  <th className="px-5 py-3">Details Summary</th>
                  <th className="px-5 py-3 text-right">Ledger Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        <span>No compliance audit logs match your search criteria. Try relaxing your filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (paginatedData as any[]).map((log, index) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-xs text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono font-medium">{formatDateTime(log.timestamp)}</span>
                        </div>
                      </td>

                      {/* Module */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getModuleBadgeColor(log.module)}`}>
                          {log.module}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        {log.action}
                      </td>

                      {/* User */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div>
                          <p className="font-bold">{log.staffName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{log.role} &bull; {log.branch || 'MainHQ'}</p>
                        </div>
                      </td>

                      {/* Reference */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-[#B45309] dark:text-amber-400">
                        {log.referenceNo || '—'}
                      </td>

                      {/* Details Summary */}
                      <td className="px-5 py-3.5 max-w-[280px] truncate" title={log.details}>
                        <span className="text-slate-600 dark:text-slate-400">{log.details || '—'}</span>
                      </td>

                      {/* Action trigger button */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all inline-flex items-center gap-1.5 text-[11px] font-bold"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* STOCK MOVEMENTS TAB TABLE */
            <table className="w-full text-left border-collapse table-auto min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider bg-slate-50/20 dark:bg-slate-950/25">
                  <th className="px-5 py-3">Timestamp / Date</th>
                  <th className="px-5 py-3">Movement Type</th>
                  <th className="px-5 py-3">Product SKU</th>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3 text-right">Quantity Delta</th>
                  <th className="px-5 py-3">From Zone</th>
                  <th className="px-5 py-3">To Zone</th>
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3">Ref Code / Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        <span>No inventory movements found matching filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  (paginatedData as any[]).map((mov, index) => {
                    const isPositive = mov.qtyDelta > 0;
                    return (
                      <tr
                        key={mov.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 text-xs text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        {/* Timestamp */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono">{formatDateTime(mov.timestamp)}</span>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-bold">
                          {mov.type === 'inward_grn' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-950/30 dark:text-blue-300 text-[10px] uppercase font-bold">
                              GRN Inward Receipt
                            </span>
                          )}
                          {mov.type === 'pos_sale' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 text-[10px] uppercase font-bold">
                              POS Cashier Sale
                            </span>
                          )}
                          {mov.type === 'zone_transfer' && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300 text-[10px] uppercase font-bold">
                              Stock Zone Transfer
                            </span>
                          )}
                          {mov.type === 'shrinkage_adjustment' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100 dark:bg-rose-950/30 dark:text-rose-300 text-[10px] uppercase font-bold">
                              Stock Adjustment
                            </span>
                          )}
                          {mov.type !== 'inward_grn' && mov.type !== 'pos_sale' && mov.type !== 'zone_transfer' && mov.type !== 'shrinkage_adjustment' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 text-[10px] uppercase font-bold">
                              {mov.type.replace('_', ' ')}
                            </span>
                          )}
                        </td>

                        {/* SKU */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white">
                          {mov.sku}
                        </td>

                        {/* Name */}
                        <td className="px-5 py-3.5 max-w-[200px] truncate" title={mov.productName}>
                          {mov.productName}
                        </td>

                        {/* Qty Delta */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap font-mono font-bold">
                          <span className={isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isPositive ? `+${mov.qtyDelta}` : mov.qtyDelta}
                          </span>
                        </td>

                        {/* From Zone */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {mov.fromZone ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-medium">
                              {mov.fromZone}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* To Zone */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {mov.toZone ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-medium">
                              {mov.toZone}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Operator */}
                        <td className="px-5 py-3.5 whitespace-nowrap font-bold">
                          {mov.operator}
                        </td>

                        {/* Reference / Batch */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div>
                            <span className="font-mono text-[11px] font-bold text-amber-700 dark:text-amber-400">{mov.referenceNo}</span>
                            {mov.batchNo && (
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">Batch: {mov.batchNo}</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginated Footer Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/10 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing Page **{currentPage}** of **{totalPages}**
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, i, arr) => {
                const showEllipsis = i > 0 && p - arr[i - 1] > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="text-slate-400 text-xs px-1">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 text-xs font-bold rounded-lg transition-all ${
                        currentPage === p
                          ? 'bg-[#D97706] text-white shadow-xs'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all shrink-0"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* INSPECT DETAILS MODAL POPUP */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Title Row */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D97706]" />
                <h3 className="font-display font-black text-sm uppercase tracking-wider text-slate-900 dark:text-white">
                  Compliance Audit Inspect
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-xs font-bold"
              >
                Close
              </button>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Basic transaction overview banner */}
              <div className="p-4 rounded-xl border border-[#FDE68A]/60 dark:border-amber-800/40 bg-[#FFFBEB]/50 dark:bg-amber-950/10 flex items-start gap-3">
                <Info className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900 dark:text-amber-100 text-xs">
                    Operation: {selectedLog.action}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    Logged system-wide as a secure, immutable operational record.
                  </p>
                </div>
              </div>

              {/* Key Value metadata parameters */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Log Reference ID</p>
                  <p className="font-mono text-xs font-bold text-slate-900 dark:text-white mt-1 truncate">{selectedLog.id}</p>
                </div>

                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Exact Timestamp</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">{formatDateTime(selectedLog.timestamp)}</p>
                </div>

                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Staff / Operator</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">{selectedLog.staffName}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{selectedLog.role} (User: {selectedLog.userId || 'System'})</p>
                </div>

                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Location Branch</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-1">{selectedLog.branch || '—'}</p>
                </div>

                <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-[#E8E2D9] dark:border-slate-800 rounded-xl col-span-2">
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Ref Number / Key Document</p>
                  <p className="font-mono text-xs font-bold text-[#B45309] dark:text-amber-400 mt-1">{selectedLog.referenceNo || '—'}</p>
                </div>
              </div>

              {/* Complete details statement */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audit Details Statement</span>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-mono">
                  {selectedLog.details || 'No additional summary provided.'}
                </div>
              </div>

              {/* JSON Payload Explorer */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">JSON Ledger Metadata Payload</span>
                <pre className="p-4 bg-slate-900 text-slate-200 dark:bg-slate-950 dark:text-emerald-400 rounded-xl text-[11px] leading-relaxed font-mono overflow-x-auto max-h-[160px]">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end bg-slate-50/30 dark:bg-slate-900/10">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Close Ledger Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
