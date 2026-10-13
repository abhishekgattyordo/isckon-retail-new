'use client';

import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { WarehouseZone, StockMovement, Product, InventoryBatch } from '../../types';
import {
  Warehouse,
  Thermometer,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Package,
  CheckCircle2,
  Lock,
  User,
  Activity,
  Layers,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Boxes,
  Tag,
  Filter,
  QrCode,
  Printer,
  Grid,
  List,
  RefreshCw,
  TrendingUp,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye
} from 'lucide-react';
import { ProductDetailModal } from '../products/ProductDetailModal';
import { WarehouseZoneManagement } from '../settings/WarehouseZoneManagement';
import { isProductInZone, calculateZoneStats } from '../../lib/warehouseUtils';

export const InventoryDashboard: React.FC = () => {
  const {
    zones,
    products,
    movements,
    setActiveModule,
    batches,
    transferStock,
    adjustStock,
    settings
  } = useERP();

  // Tab State: 'batches' (Zone Inventory Batches) vs 'audit' (Stock Movement Audit Trail) vs 'configure_zones'
  const [activeTab, setActiveTab] = useState<'batches' | 'audit' | 'configure_zones'>('batches');

  // Zone selection
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'zone-a');

  // Item Detail Modal State
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);

  // Search & Filter States for Batches Tab
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [batchViewMode, setBatchViewMode] = useState<'cards' | 'table'>('cards');

  // Search & Filter States for Audit Trail Tab
  const [searchMovement, setSearchMovement] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'all' | 'inward_grn' | 'pos_sale' | 'zone_transfer' | 'shrinkage_adjustment'>('all');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  // Interactive Stock Transfer modal state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSku, setTransferSku] = useState('');
  const [transferFromZone, setTransferFromZone] = useState('');
  const [transferToZone, setTransferToZone] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferBatchNo, setTransferBatchNo] = useState('');
  const [transferRefNo, setTransferRefNo] = useState('');

  // Interactive Stock Adjustment modal state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustSku, setAdjustSku] = useState('');
  const [adjustZone, setAdjustZone] = useState('');
  const [adjustQtyDelta, setAdjustQtyDelta] = useState(1);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('deduct');
  const [adjustBatchNo, setAdjustBatchNo] = useState('');
  const [adjustReason, setAdjustReason] = useState('Shrinkage / Damage');
  const [adjustRefNo, setAdjustRefNo] = useState('');

  // Ensure selectedZoneId syncs when zones change
  React.useEffect(() => {
    if (zones.length > 0 && !zones.some(z => z.id === selectedZoneId)) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones, selectedZoneId]);

  // Get current active zone
  const activeZone = zones.find(z => z.id === selectedZoneId) || zones[0];

  // Products belonging to the selected zone using robust zone matching
  const zoneProducts = React.useMemo(() => {
    if (!activeZone) return [];
    return products.filter(p => isProductInZone(p, activeZone, zones));
  }, [products, activeZone, zones]);

  // Filter products by search query and status
  const filteredZoneProducts = zoneProducts.filter(p => {
    const q = batchSearchQuery.toLowerCase().trim();

    // Status filter
    if (batchStatusFilter !== 'all' && p.status !== batchStatusFilter) {
      return false;
    }

    if (!q) return true;

    const nameMatch = p.name ? p.name.toLowerCase().includes(q) : false;
    const skuMatch = p.sku ? p.sku.toLowerCase().includes(q) : false;
    const barcodeMatch = p.barcode ? p.barcode.toLowerCase().includes(q) : false;
    const categoryMatch = p.category ? p.category.toLowerCase().includes(q) : false;
    const batchNoMatch = p.batchNo ? p.batchNo.toLowerCase().includes(q) : false;
    const supplierMatch = p.supplier ? p.supplier.toLowerCase().includes(q) : false;

    const productBatches = batches ? batches.filter(b => b.sku === p.sku) : [];
    const editionMatch = productBatches.some(b => b.edition ? b.edition.toLowerCase().includes(q) : false);

    return nameMatch || skuMatch || barcodeMatch || categoryMatch || batchNoMatch || supplierMatch || editionMatch;
  });

  // Global inventory stats
  const totalCap = zones.reduce((acc, z) => acc + (z.capacity || 0), 0);
  const totalOcc = products.reduce((acc, p) => acc + (Number(p.stock) || 0), 0);
  const overallPercent = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;
  const quarantineCount = products.filter(p => p.status === 'out_of_stock' || (p.warehouseZone && p.warehouseZone.toLowerCase().includes('quarantine'))).length;
  const totalStockValue = products.reduce((acc, p) => acc + (p.price || 0) * (p.stock || 0), 0);
  const totalCostBasis = products.reduce((acc, p) => acc + (p.cost || 0) * (p.stock || 0), 0);

  // Filtered movements for Audit Trail Tab
  const filteredMovements = movements.filter(m => {
    const matchesType = movementTypeFilter === 'all' || m.type === movementTypeFilter;
    const q = searchMovement.toLowerCase().trim();
    if (!q) return matchesType;

    const productMatch = m.productName.toLowerCase().includes(q);
    const skuMatch = m.sku.toLowerCase().includes(q);
    const refMatch = m.referenceNo.toLowerCase().includes(q);
    const opMatch = m.operator.toLowerCase().includes(q);
    const batchMatch = m.batchNo ? m.batchNo.toLowerCase().includes(q) : false;

    return matchesType && (productMatch || skuMatch || refMatch || opMatch || batchMatch);
  });

  // Pagination calculation for Audit Trail Tab
  const totalAuditItems = filteredMovements.length;
  const totalAuditPages = Math.max(1, Math.ceil(totalAuditItems / auditPageSize));
  const currentAuditPage = Math.min(Math.max(1, auditPage), totalAuditPages);
  const paginatedMovements = filteredMovements.slice(
    (currentAuditPage - 1) * auditPageSize,
    currentAuditPage * auditPageSize
  );
  const auditStartIndex = totalAuditItems === 0 ? 0 : (currentAuditPage - 1) * auditPageSize + 1;
  const auditEndIndex = Math.min(currentAuditPage * auditPageSize, totalAuditItems);

  const getTempBadge = (type: string) => {
    switch (type) {
      case 'cold':
        return (
          <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold flex items-center gap-1">
            <Thermometer className="w-3 h-3" /> Cold 4°C – 8°C
          </span>
        );
      case 'secure_cage':
        return (
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-bold flex items-center gap-1">
            <Lock className="w-3 h-3" /> Biometric Vault
          </span>
        );
      case 'quarantine':
        return (
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> QC Quarantine
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center gap-1">
            <Activity className="w-3 h-3" /> Ambient 21°C
          </span>
        );
    }
  };

  const handleOpenTransferModal = (prefillProd?: Product) => {
    const prod = prefillProd || products[0];
    if (!prod) return;
    setTransferSku(prod.sku);
    setTransferFromZone(prod.warehouseZone || (activeZone?.name || ''));
    setTransferToZone(zones.find(z => z.name !== prod.warehouseZone)?.name || '');
    setTransferBatchNo(prod.batchNo || '');
    setTransferQty(1);
    setTransferRefNo('');
    setIsTransferModalOpen(true);
  };

  const handleOpenAdjustModal = (prefillProd?: Product) => {
    const prod = prefillProd || products[0];
    if (!prod) return;
    setAdjustSku(prod.sku);
    setAdjustZone(prod.warehouseZone || (activeZone?.name || ''));
    setAdjustBatchNo(prod.batchNo || '');
    setAdjustQtyDelta(1);
    setAdjustType('deduct');
    setAdjustReason('Shrinkage / Damage');
    setAdjustRefNo('');
    setIsAdjustModalOpen(true);
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferSku || !transferFromZone || !transferToZone || transferQty <= 0) return;
    transferStock(
      transferSku,
      transferFromZone,
      transferToZone,
      transferQty,
      transferBatchNo,
      transferRefNo || `TRSF-${Math.floor(1000 + Math.random() * 9000)}`
    );
    setIsTransferModalOpen(false);
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustSku || !adjustZone || adjustQtyDelta <= 0) return;
    const signedDelta = adjustType === 'add' ? adjustQtyDelta : -adjustQtyDelta;
    adjustStock(
      adjustSku,
      adjustZone,
      signedDelta,
      adjustBatchNo,
      adjustReason,
      adjustRefNo || `ADJ-${Math.floor(1000 + Math.random() * 9000)}`
    );
    setIsAdjustModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Stock & Inventory Control
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                ZONE TELEMETRY • INVENTORY BATCHES • IMMUTABLE AUDIT TRAIL
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => handleOpenTransferModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer Stock</span>
          </button>
          <button
            onClick={() => handleOpenAdjustModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Adjust Stock</span>
          </button>
          <button
            onClick={() => setActiveModule('inward')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs transition-all shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>+ Receive Shipment (GRN)</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs: Inventory Batches vs Audit Trail */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'batches'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Facility Zones & Inventory Batches</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
            {products.length} Batches
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Stock Movement Audit Trail</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {movements.length} Logs
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('configure_zones')}
          className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
            activeTab === 'configure_zones'
              ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 font-extrabold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Configure Warehouses & Zones</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            {zones.length} Zones
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FACILITY ZONES & INVENTORY BATCHES                                 */}
      {/* ========================================================================= */}
      {activeTab === 'batches' && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary Stats Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-widest">Facility Occupancy</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                    {overallPercent}%
                  </span>
                  <span className="text-xs text-slate-400 font-mono">({totalOcc}/{totalCap} slots)</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full transition-all duration-500" style={{ width: `${Math.min(overallPercent, 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-widest">Active SKUs</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                    <Package className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                    {products.length}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                    {zones.length} Zones
                  </span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Cost Basis:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">₹{(totalCostBasis / 1000).toFixed(1)}k</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-widest">Quarantine & QC</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
                    {quarantineCount}
                  </span>
                  <span className="text-xs font-medium text-slate-400 font-mono">holds</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 font-medium truncate">
                {quarantineCount > 0 ? `${quarantineCount} items require inspection` : 'No active quarantine holds'}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-widest">Stock Health</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                    {products.filter(p => p.status === 'in_stock').length}
                  </span>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Healthy</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-rose-500 font-bold">
                <span>Action Required:</span>
                <span className="font-mono">{products.filter(p => p.status !== 'in_stock').length} items</span>
              </div>
            </div>
          </div>

          {/* Section 1: Interactive Facility Zone Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <span>[01] Interactive Facility Zone Matrix</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click any zone tile below to inspect and manage its active inventory batches.
                </p>
              </div>
              <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold font-mono hidden sm:inline">
                Selected: {activeZone?.code} ({zoneProducts.length} items)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {zones.map(zone => {
                const isSelected = (activeZone?.id === zone.id) || (zone.id === selectedZoneId);
                const {
                  assignedProducts: zoneProds,
                  occupiedSlots: zoneOccupancy,
                  skuCount: zoneActiveSKUs,
                  capacityPercent: occPct
                } = calculateZoneStats(zone, products, zones);

                let borderColor = 'border-slate-200 dark:border-slate-800';
                let bgStyle = 'bg-white dark:bg-slate-900';
                if (isSelected) {
                  borderColor = 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-500/20 shadow-md';
                  bgStyle = 'bg-purple-50/40 dark:bg-purple-950/20';
                }

                return (
                  <div
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${borderColor} ${bgStyle} hover:border-purple-400 dark:hover:border-purple-600`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-xs ${
                          isSelected
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                        }`}>
                          {zone.code}
                        </span>
                        {getTempBadge(zone.tempType)}
                      </div>

                      <div>
                        <h3 className={`font-bold text-sm transition-colors ${
                          isSelected ? 'text-purple-900 dark:text-purple-300' : 'text-slate-900 dark:text-white group-hover:text-purple-600'
                        }`}>
                          {zone.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {zone.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold font-mono">
                        <span className="text-slate-400">CAPACITY</span>
                        <span className="text-slate-900 dark:text-white font-bold">
                          {occPct}% <span className="text-[10px] font-normal text-slate-400">({zoneOccupancy}/{zone.capacity})</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            occPct >= 90 ? 'bg-rose-500' : occPct >= 75 ? 'bg-amber-500' : 'bg-purple-600'
                          }`}
                          style={{ width: `${Math.min(occPct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 font-mono">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" /> {zone.manager}
                        </span>
                        <span className="font-bold text-purple-700 dark:text-purple-300">
                          {zoneActiveSKUs} SKUs
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Selected Zone Inventory Batches List with Search Bar */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            {/* Header with Zone Info and Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 font-mono text-xs font-bold">
                    {activeZone?.code || 'ZA-01'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {activeZone?.name || 'Selected Warehouse Zone'} — Inventory Batches
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manager: <strong className="text-slate-800 dark:text-slate-200">{activeZone?.manager || 'Unassigned'}</strong> • Capacity Limit: {activeZone?.capacity || 1000} slots • Live SKU telemetry
                </p>
              </div>

              {/* View switch & quick actions */}
              <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setBatchViewMode('cards')}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      batchViewMode === 'cards'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Card Grid View"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      batchViewMode === 'table'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Detailed Table View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Table</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModule('barcode')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-purple-600" />
                  <span>Batch Barcodes</span>
                </button>
              </div>
            </div>

            {/* Dedicated Search Bar & Status Filter Chips */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xl">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={batchSearchQuery}
                  onChange={e => setBatchSearchQuery(e.target.value)}
                  placeholder={`Search batches in ${activeZone?.code || 'this zone'} by batch tag, SKU, product name, barcode...`}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                />
                {batchSearchQuery && (
                  <button
                    onClick={() => setBatchSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setBatchStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    batchStatusFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  All ({zoneProducts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBatchStatusFilter('in_stock')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    batchStatusFilter === 'in_stock'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                  }`}
                >
                  In Stock ({zoneProducts.filter(p => p.status === 'in_stock').length})
                </button>
                <button
                  type="button"
                  onClick={() => setBatchStatusFilter('low_stock')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    batchStatusFilter === 'low_stock'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                  }`}
                >
                  Low Stock ({zoneProducts.filter(p => p.status === 'low_stock').length})
                </button>
                <button
                  type="button"
                  onClick={() => setBatchStatusFilter('out_of_stock')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    batchStatusFilter === 'out_of_stock'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                  }`}
                >
                  Out of Stock ({zoneProducts.filter(p => p.status === 'out_of_stock').length})
                </button>
              </div>
            </div>

            {/* Results Count Notification */}
            {batchSearchQuery && (
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 font-mono">
                <span>Found <strong>{filteredZoneProducts.length}</strong> matching batches in {activeZone?.name}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              </div>
            )}

            {/* BATCH VIEW: CARDS MODE */}
            {batchViewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                {filteredZoneProducts.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs text-slate-400 font-mono bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    {batchSearchQuery
                      ? `No batches matching "${batchSearchQuery}" found in ${activeZone?.name}.`
                      : `No inventory batches currently allocated to ${activeZone?.name}.`}
                  </div>
                ) : (
                  filteredZoneProducts.map(prod => {
                    const isLow = prod.status !== 'in_stock';
                    const batchTag = prod.batchNo || 'BATCH-STD-01';

                    return (
                      <div
                        key={prod.id}
                        onClick={() => setSelectedProductForDetail(prod)}
                        className="p-5 rounded-2xl bg-slate-50/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-md transition-all group cursor-pointer"
                        title="Click to view detailed item specifications, batches, and inventory telemetry"
                      >
                        {/* Top: Product details & Batch Tag */}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={prod.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150'}
                                alt={prod.name}
                                className="w-12 h-12 rounded-xl object-cover bg-white dark:bg-slate-900 shrink-0 border border-slate-200 dark:border-slate-800 shadow-2xs group-hover:scale-105 transition-transform"
                              />
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 font-mono uppercase tracking-wider block truncate">
                                  {prod.category}
                                </span>
                                <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-purple-600 transition-colors">
                                  {prod.name}
                                </h4>
                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{prod.sku}</div>
                              </div>
                            </div>

                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase shrink-0 border ${
                              prod.status === 'in_stock'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : prod.status === 'low_stock'
                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 animate-pulse'
                                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}>
                              {prod.status.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Batch Metadata Card */}
                          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                                BATCH TAG
                              </span>
                              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono font-bold text-xs">
                                {batchTag}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                              <div>
                                <span className="text-slate-400 block text-[10px]">CURRENT STOCK</span>
                                <strong className="text-xs font-bold text-slate-900 dark:text-white">
                                  {prod.stock} Units
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">RETAIL PRICE</span>
                                <strong className="text-xs font-bold text-slate-900 dark:text-white">
                                  ₹{prod.price}
                                </strong>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">UNIT COST</span>
                                <span className="text-slate-600 dark:text-slate-400 font-semibold">
                                  ₹{prod.cost}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">BATCH VALUE</span>
                                <span className="text-slate-800 dark:text-slate-200 font-bold">
                                  ₹{((prod.price || 0) * (prod.stock || 0)).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductForDetail(prod);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-purple-200 dark:border-purple-800/50"
                            title="Open Item Details"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTransferModal(prod);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-800/50"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Transfer</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAdjustModal(prod);
                            }}
                            className="flex-1 py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-amber-200 dark:border-amber-800/50"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Adjust</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* BATCH VIEW: TABLE MODE */}
            {batchViewMode === 'table' && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-3.5">Product & SKU</th>
                        <th className="p-3.5">Batch Tag</th>
                        <th className="p-3.5">Zone</th>
                        <th className="p-3.5 text-right">Balance</th>
                        <th className="p-3.5 text-right">Cost Price</th>
                        <th className="p-3.5 text-right">Selling Price</th>
                        <th className="p-3.5 text-right">Total Valuation</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredZoneProducts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-xs text-slate-400 font-mono">
                            No batches found in {activeZone?.name}.
                          </td>
                        </tr>
                      ) : (
                        filteredZoneProducts.map(prod => (
                          <tr
                            key={prod.id}
                            onClick={() => setSelectedProductForDetail(prod)}
                            className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors cursor-pointer group"
                            title="Click to inspect item specifications and batch history"
                          >
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <img
                                  src={prod.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150'}
                                  alt={prod.name}
                                  className="w-9 h-9 rounded-lg object-cover bg-slate-100 border border-slate-200 dark:border-slate-800 shrink-0 group-hover:scale-105 transition-transform"
                                />
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[180px] group-hover:text-purple-600 transition-colors">
                                    {prod.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">{prod.sku}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 font-mono">
                              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 text-[11px]">
                                {prod.batchNo || 'BATCH-STD-01'}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                              {activeZone?.code}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {prod.stock} Units
                            </td>
                            <td className="p-3.5 text-right font-mono text-slate-600 dark:text-slate-400">
                              ₹{prod.cost}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                              ₹{prod.price}
                            </td>
                            <td className="p-3.5 text-right font-mono font-bold text-purple-600 dark:text-purple-400">
                              ₹{((prod.price || 0) * (prod.stock || 0)).toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                prod.status === 'in_stock'
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : prod.status === 'low_stock'
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              }`}>
                                {prod.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProductForDetail(prod);
                                  }}
                                  className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/60 transition-colors"
                                  title="View Item Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTransferModal(prod);
                                  }}
                                  className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
                                  title="Transfer Stock"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAdjustModal(prod);
                                  }}
                                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/60 transition-colors"
                                  title="Adjust Stock"
                                >
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STOCK MOVEMENT AUDIT TRAIL                                         */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-fade-in">
          {/* Audit Trail Summary Banner */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Immutable Stock Movement Timeline
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Chronological tamper-evident audit ledger capturing every inbound shipment receipt, POS register sale, internal zone transfer, and shrinkage adjustment.
                </p>
              </div>

              {/* Movement Count Badge */}
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800">
                  {filteredMovements.length} Total Logs
                </span>
              </div>
            </div>

            {/* Filter Pills and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => { setMovementTypeFilter('all'); setAuditPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    movementTypeFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  All ({movements.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setMovementTypeFilter('inward_grn'); setAuditPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    movementTypeFilter === 'inward_grn'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  Inward GRN ({movements.filter(m => m.type === 'inward_grn').length})
                </button>
                <button
                  type="button"
                  onClick={() => { setMovementTypeFilter('pos_sale'); setAuditPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    movementTypeFilter === 'pos_sale'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  POS Sales ({movements.filter(m => m.type === 'pos_sale').length})
                </button>
                <button
                  type="button"
                  onClick={() => { setMovementTypeFilter('zone_transfer'); setAuditPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    movementTypeFilter === 'zone_transfer'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Transfers ({movements.filter(m => m.type === 'zone_transfer').length})
                </button>
                <button
                  type="button"
                  onClick={() => { setMovementTypeFilter('shrinkage_adjustment'); setAuditPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    movementTypeFilter === 'shrinkage_adjustment'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Adjustments ({movements.filter(m => m.type === 'shrinkage_adjustment').length})
                </button>
              </div>

              {/* Search Audit Logs */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchMovement}
                  onChange={e => {
                    setSearchMovement(e.target.value);
                    setAuditPage(1);
                  }}
                  placeholder="Filter by SKU, ref, operator..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                />
                {searchMovement && (
                  <button
                    onClick={() => {
                      setSearchMovement('');
                      setAuditPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Audit Log Cards List */}
            <div className="space-y-2.5 pt-2">
              {paginatedMovements.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-mono bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  No stock movement audit records match your current filter.
                </div>
              ) : (
                paginatedMovements.map(mov => {
                  const isPos = mov.type === 'pos_sale';
                  const isGrn = mov.type === 'inward_grn';
                  const isTransfer = mov.type === 'zone_transfer';
                  const isAdjustment = mov.type === 'shrinkage_adjustment';

                  let typeIcon = <ArrowRightLeft className="w-4 h-4" />;
                  let typeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-800';
                  let typeLabel = 'System Log';

                  if (isGrn) {
                    typeIcon = <ArrowDownRight className="w-4 h-4" />;
                    typeClass = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
                    typeLabel = 'Inward GRN';
                  } else if (isPos) {
                    typeIcon = <ArrowUpRight className="w-4 h-4" />;
                    typeClass = 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/60';
                    typeLabel = 'POS Sale';
                  } else if (isTransfer) {
                    typeIcon = <ArrowRightLeft className="w-4 h-4" />;
                    typeClass = 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60';
                    typeLabel = 'Zone Transfer';
                  } else if (isAdjustment) {
                    typeIcon = <AlertTriangle className="w-4 h-4" />;
                    typeClass = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/60';
                    typeLabel = 'Stock Adjustment';
                  }

                  return (
                    <div
                      key={mov.id}
                      className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 border ${typeClass} shadow-2xs`}>
                          {typeIcon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                            <span className="truncate">{mov.productName}</span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 font-bold">
                              {mov.sku}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase tracking-wider shrink-0">
                              {typeLabel}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2 font-mono">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{mov.referenceNo}</span>
                            <span>•</span>
                            {mov.batchNo && (
                              <>
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                                  Batch: {mov.batchNo}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span>Operator: {mov.operator}</span>
                            <span>•</span>
                            <span>{mov.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 shrink-0">
                        <span className={`text-sm font-bold font-mono ${
                          mov.qtyDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {mov.qtyDelta > 0 ? `+${mov.qtyDelta}` : mov.qtyDelta} UNIT
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {mov.toZone ? `TO ${mov.toZone.split('—')[0]}` : ''} {mov.fromZone ? `FROM ${mov.fromZone.split('—')[0]}` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalAuditItems > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                {/* Entries Info & Page Size Selector */}
                <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono">
                  <span>
                    Showing <strong className="text-slate-800 dark:text-slate-200">{auditStartIndex}</strong> to{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{auditEndIndex}</strong> of{' '}
                    <strong className="text-slate-800 dark:text-slate-200">{totalAuditItems}</strong> logs
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">| Per page:</span>
                    <select
                      value={auditPageSize}
                      onChange={e => {
                        setAuditPageSize(Number(e.target.value));
                        setAuditPage(1);
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1 font-mono">
                  <button
                    type="button"
                    onClick={() => setAuditPage(1)}
                    disabled={currentAuditPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                    disabled={currentAuditPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalAuditPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, and window around current page
                        return (
                          page === 1 ||
                          page === totalAuditPages ||
                          Math.abs(page - currentAuditPage) <= 1
                        );
                      })
                      .map((page, index, array) => {
                        const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;

                        return (
                          <React.Fragment key={page}>
                            {showEllipsisBefore && (
                              <span className="px-1 text-slate-400">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setAuditPage(page)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                currentAuditPage === page
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setAuditPage(prev => Math.min(totalAuditPages, prev + 1))}
                    disabled={currentAuditPage === totalAuditPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditPage(totalAuditPages)}
                    disabled={currentAuditPage === totalAuditPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONFIGURE WAREHOUSES & STORAGE ZONES                               */}
      {/* ========================================================================= */}
      {activeTab === 'configure_zones' && (
        <div className="animate-fade-in pt-2">
          <WarehouseZoneManagement />
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* Stock Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                  Execute Stock Transfer
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Move merchandise across warehouse zones.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Product</label>
                <select
                  value={transferSku}
                  onChange={e => {
                    const sku = e.target.value;
                    setTransferSku(sku);
                    const prod = products.find(p => p.sku === sku);
                    if (prod) {
                      setTransferFromZone(prod.warehouseZone || '');
                      setTransferBatchNo(prod.batchNo || '');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.sku}>
                      {p.name} ({p.sku}) — Zone: {p.warehouseZone?.split('—')[0]} ({p.stock} Units)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From Zone</label>
                  <input
                    type="text"
                    readOnly
                    value={transferFromZone}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold focus:outline-none truncate"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">To Destination Zone</label>
                  <select
                    value={transferToZone}
                    onChange={e => setTransferToZone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  >
                    {zones
                      .filter(z => z.name !== transferFromZone)
                      .map(z => (
                        <option key={z.id} value={z.name}>
                          {z.name.split('—')[0]}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Batch Number</label>
                  <input
                    type="text"
                    value={transferBatchNo}
                    onChange={e => setTransferBatchNo(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold font-mono"
                    placeholder="e.g. BATCH-2026-A"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    value={transferQty}
                    onChange={e => setTransferQty(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference Code (Optional)</label>
                <input
                  type="text"
                  value={transferRefNo}
                  onChange={e => setTransferRefNo(e.target.value)}
                  placeholder="Leave empty for auto-generation"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Execute Stock Adjustment
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Deduct shrinkage/damage or log audit surplus.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Product</label>
                <select
                  value={adjustSku}
                  onChange={e => {
                    const sku = e.target.value;
                    setAdjustSku(sku);
                    const prod = products.find(p => p.sku === sku);
                    if (prod) {
                      setAdjustZone(prod.warehouseZone || '');
                      setAdjustBatchNo(prod.batchNo || '');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.sku}>
                      {p.name} ({p.sku}) — Zone: {p.warehouseZone?.split('—')[0]} ({p.stock} Units)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Zone</label>
                  <select
                    value={adjustZone}
                    onChange={e => setAdjustZone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.name}>
                        {z.name.split('—')[0]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-slate-950 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setAdjustType('add')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        adjustType === 'add'
                          ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Surplus (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('deduct')}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                        adjustType === 'deduct'
                          ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Shrinkage (-)
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Batch Number</label>
                  <input
                    type="text"
                    value={adjustBatchNo}
                    onChange={e => setAdjustBatchNo(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold font-mono"
                    placeholder="e.g. BATCH-2026-A"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Adjustment Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={adjustQtyDelta}
                    onChange={e => setAdjustQtyDelta(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Adjustment Reason</label>
                  <select
                    value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  >
                    <option value="Shrinkage / Damage">Shrinkage / Damage</option>
                    <option value="Audit Surplus Correction">Audit Surplus Correction</option>
                    <option value="Supplier Inward Defect">Supplier Inward Defect</option>
                    <option value="Stall Return Allocation">Stall Return Allocation</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference Code (Optional)</label>
                  <input
                    type="text"
                    value={adjustRefNo}
                    onChange={e => setAdjustRefNo(e.target.value)}
                    placeholder="Leave empty for auto-gen"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Execute Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          onEdit={() => {
            setSelectedProductForDetail(null);
            setActiveModule('products');
          }}
          onPrintBarcode={() => {
            setSelectedProductForDetail(null);
            setActiveModule('barcode');
          }}
        />
      )}
    </div>
  );
};
