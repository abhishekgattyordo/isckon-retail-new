'use client';

import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { RecycleBinItem, RecycleItemType } from '../../types';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  Filter,
  Package,
  Users,
  FileSpreadsheet,
  Flame,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Clock,
  User,
  ArrowRight,
  Info,
  X
} from 'lucide-react';

export const RecycleBinPage: React.FC = () => {
  const {
    recycleBinItems,
    restoreItem,
    permanentDeleteItem,
    emptyRecycleBin,
    fetchRecycleBin,
    user,
    quickNotification,
    setActiveModule,
  } = useERP();

  const [activeTab, setActiveTab] = useState<'all' | RecycleItemType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState<RecycleBinItem | null>(null);
  const [isEmptyingBin, setIsEmptyingBin] = useState(false);
  const [showEmptyConfirmModal, setShowEmptyConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Check authorization
  const isAuthorized =
    user.role === 'Store Manager' ||
    user.role === 'Administrator' ||
    user.role === 'System Admin' ||
    user.permissions.includes('settings') ||
    user.permissions.includes('recycle_bin');

  const filteredItems = recycleBinItems.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesTab;

    const matchesSearch =
      item.name.toLowerCase().includes(q) ||
      item.codeOrSku.toLowerCase().includes(q) ||
      item.categoryOrRole.toLowerCase().includes(q) ||
      item.deletedBy.toLowerCase().includes(q) ||
      (item.details && item.details.toLowerCase().includes(q));

    return matchesTab && matchesSearch;
  });

  const getCounts = () => {
    return {
      all: recycleBinItems.length,
      product: recycleBinItems.filter(i => i.type === 'product').length,
      user: recycleBinItems.filter(i => i.type === 'user').length,
      inward: recycleBinItems.filter(i => i.type === 'inward').length,
      event: recycleBinItems.filter(i => i.type === 'event').length,
    };
  };

  const counts = getCounts();

  const handleRestore = async (item: RecycleBinItem) => {
    if (!isAuthorized) {
      quickNotification('Access Denied', 'Only authorized Store Managers and Admins can restore records.', 'alert');
      return;
    }

    setIsProcessing(item.id);
    await restoreItem(item.type, item.id);
    setIsProcessing(null);
  };

  const handleConfirmPermanentDelete = async () => {
    if (!itemToDelete) return;
    if (!isAuthorized) {
      quickNotification('Access Denied', 'Only authorized Store Managers and Admins can permanently delete records.', 'alert');
      setItemToDelete(null);
      return;
    }

    setIsProcessing(itemToDelete.id);
    await permanentDeleteItem(itemToDelete.type, itemToDelete.id);
    setIsProcessing(null);
    setItemToDelete(null);
  };

  const handleConfirmEmptyBin = async () => {
    if (!isAuthorized) {
      quickNotification('Access Denied', 'Only authorized Store Managers and Admins can purge the Recycle Bin.', 'alert');
      setShowEmptyConfirmModal(false);
      return;
    }

    setIsEmptyingBin(true);
    const filterType = activeTab === 'all' ? undefined : activeTab;
    await emptyRecycleBin(filterType);
    setIsEmptyingBin(false);
    setShowEmptyConfirmModal(false);
  };

  const getItemTypeIcon = (type: RecycleItemType) => {
    switch (type) {
      case 'product':
        return <Package className="w-4 h-4 text-indigo-500" />;
      case 'user':
        return <Users className="w-4 h-4 text-emerald-500" />;
      case 'inward':
        return <FileSpreadsheet className="w-4 h-4 text-amber-500" />;
      case 'event':
        return <Flame className="w-4 h-4 text-rose-500" />;
      default:
        return <Package className="w-4 h-4 text-slate-500" />;
    }
  };

  const getItemTypeBadge = (type: RecycleItemType) => {
    switch (type) {
      case 'product':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">Product</span>;
      case 'user':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">User / Staff</span>;
      case 'inward':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Inward GRN</span>;
      case 'event':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Event</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">Record</span>;
    }
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Recent';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold">
              <Trash2 className="w-3.5 h-3.5" />
              <span>SOFT DELETE & RECOVERY SYSTEM</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Recycle Bin</h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Safely recover accidentally deleted catalog products, user accounts, festival events, and goods receipts. Records in the Recycle Bin are quarantined from active catalogs and POS registers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchRecycleBin()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer backdrop-blur-sm"
              title="Sync Recycle Bin"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>

            {recycleBinItems.length > 0 && isAuthorized && (
              <button
                onClick={() => setShowEmptyConfirmModal(true)}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold font-mono shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Recycle Bin</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Access Permission Notice for Restricted Roles */}
      {!isAuthorized && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 flex items-center gap-3 text-xs">
          <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
          <div>
            <span className="font-bold">Restricted Operator Access:</span> You are viewing the recycle bin with read-only permissions. Restoring or permanently deleting records requires Store Manager or Administrator privileges.
          </div>
        </div>
      )}

      {/* Tabs & Search Filter Row */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Entity Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Items', count: counts.all },
            { id: 'product', label: 'Products', count: counts.product },
            { id: 'user', label: 'Staff & Users', count: counts.user },
            { id: 'inward', label: 'Inward GRN', count: counts.inward },
            { id: 'event', label: 'Events', count: counts.event },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive
                    ? 'bg-white/20 dark:bg-black/20 text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px] md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search deleted records..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Deleted Records List */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Recycle Bin is Empty</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                {searchQuery
                  ? `No deleted records match your search "${searchQuery}".`
                  : activeTab !== 'all'
                  ? `There are no deleted ${activeTab} records in the recycle bin.`
                  : 'All operational records, products, staff, and festival events are active in the system.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <th className="py-3.5 px-6">Entity / Record</th>
                  <th className="py-3.5 px-6">Type & Identifier</th>
                  <th className="py-3.5 px-6">Original Summary</th>
                  <th className="py-3.5 px-6">Deletion Timestamp</th>
                  <th className="py-3.5 px-6">Deleted By</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredItems.map(item => (
                  <tr
                    key={`${item.type}-${item.id}`}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Entity Name */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                          {getItemTypeIcon(item.type)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {item.categoryOrRole}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type & Identifier */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div>{getItemTypeBadge(item.type)}</div>
                        <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {item.codeOrSku}
                        </div>
                      </div>
                    </td>

                    {/* Details */}
                    <td className="py-4 px-6">
                      <span className="text-slate-600 dark:text-slate-400 text-[11px] line-clamp-2">
                        {item.details || '—'}
                      </span>
                    </td>

                    {/* Deletion Timestamp */}
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTimestamp(item.deletedAt)}</span>
                      </div>
                    </td>

                    {/* Deleted By */}
                    <td className="py-4 px-6 whitespace-nowrap font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.deletedBy}</span>
                      </div>
                    </td>

                    {/* Actions: Restore & Permanent Delete */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestore(item)}
                          disabled={isProcessing === item.id || !isAuthorized}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          title="Restore back to active database"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{isProcessing === item.id ? 'Restoring...' : 'Restore'}</span>
                        </button>

                        <button
                          onClick={() => setItemToDelete(item)}
                          disabled={isProcessing === item.id || !isAuthorized}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all cursor-pointer disabled:opacity-50"
                          title="Permanently Delete (Irreversible)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Permanent Delete of Single Record */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Permanently Delete Record?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                You are about to permanently delete <strong className="text-slate-900 dark:text-white font-mono">"{itemToDelete.name}"</strong> ({itemToDelete.codeOrSku}). This action is <strong className="text-rose-600">irreversible</strong> and will wipe the record from the database.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 space-y-1">
              <div>Type: <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{itemToDelete.type}</span></div>
              <div>Deleted On: <span>{formatTimestamp(itemToDelete.deletedAt)}</span></div>
              <div>Deleted By: <span>{itemToDelete.deletedBy}</span></div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Emptying the Entire Recycle Bin */}
      {showEmptyConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-600/10 text-rose-600 flex items-center justify-center border border-rose-600/20 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Empty Recycle Bin?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will permanently remove all <strong className="text-slate-900 dark:text-white">{filteredItems.length} records</strong> currently in this view from the PostgreSQL database. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEmptyConfirmModal(false)}
                disabled={isEmptyingBin}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEmptyBin}
                disabled={isEmptyingBin}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isEmptyingBin ? 'Purging...' : 'Purge All Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
