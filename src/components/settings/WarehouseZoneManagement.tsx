'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { WarehouseZone } from '../../types';
import { calculateZoneStats, isProductInZone } from '../../lib/warehouseUtils';
import {
  Warehouse,
  Plus,
  Search,
  Filter,
  Layers,
  Thermometer,
  ShieldCheck,
  Building2,
  User,
  Package,
  Boxes,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin,
  ArrowUpDown,
  Lock,
  Flame,
  Snowflake,
  Sparkles,
  X
} from 'lucide-react';

const STORAGE_TYPES = [
  {
    id: 'ambient',
    label: 'Ambient Room Temp',
    desc: 'Spiritual books, incenses, cloth & regular merchandise',
    icon: Thermometer,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
  },
  {
    id: 'cold',
    label: 'Cold Storage (2°C–8°C)',
    desc: 'Pure Cow Ghee, Sandalwood paste, sacred oils & prasadam',
    icon: Snowflake,
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
  },
  {
    id: 'secure_cage',
    label: 'Secure Vault & Brassware Cage',
    desc: 'Locked cage for Deity brass idols, silver lamps & high-value items',
    icon: Lock,
    badgeColor: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
  },
  {
    id: 'quarantine',
    label: 'Quarantine & Inspection Bay',
    desc: 'Pending QC, damaged books return & vendor rejection hold',
    icon: AlertTriangle,
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
  }
];

const PRESET_WAREHOUSES = [
  'Main Temple Store — Mayapur HQ',
  'Mayapur Central Godown',
  'Bengaluru Central Distribution Depot',
  'Sri Radha Vrindavan Hub',
  'Delhi Sri Sri Radha Parthasarathi Hub',
  'Festival Mobile Container Unit'
];

export const WarehouseZoneManagement: React.FC = () => {
  const { zones, addZone, updateZone, deleteZone, products, users, quickNotification } = useERP();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<WarehouseZone | null>(null);
  const [deletingZone, setDeletingZone] = useState<WarehouseZone | null>(null);
  const [inspectingZone, setInspectingZone] = useState<WarehouseZone | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    warehouseName: 'Main Temple Store — Mayapur HQ',
    customWarehouseName: '',
    capacity: 2000,
    tempType: 'ambient' as WarehouseZone['tempType'],
    manager: 'Sri Rama Das',
    aislesCount: 4,
    shelvesPerAisle: 4,
    location: '',
    description: ''
  });

  // Calculate live occupancy and active products per zone
  const zoneStats = useMemo(() => {
    const stats: Record<string, { productCount: number; totalUnits: number; occupancyPercent: number }> = {};

    zones.forEach(zone => {
      const { skuCount, occupiedSlots, capacityPercent } = calculateZoneStats(zone, products, zones);
      stats[zone.id] = {
        productCount: skuCount,
        totalUnits: occupiedSlots,
        occupancyPercent: capacityPercent
      };
    });

    return stats;
  }, [zones, products]);

  // Unique list of warehouses
  const uniqueWarehouses = useMemo(() => {
    const set = new Set<string>();
    zones.forEach(z => {
      if (z.warehouseName) set.add(z.warehouseName);
    });
    PRESET_WAREHOUSES.forEach(w => set.add(w));
    return Array.from(set);
  }, [zones]);

  // Filtered zones
  const filteredZones = useMemo(() => {
    return zones.filter(zone => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        zone.name.toLowerCase().includes(q) ||
        zone.code.toLowerCase().includes(q) ||
        (zone.warehouseName && zone.warehouseName.toLowerCase().includes(q)) ||
        zone.manager.toLowerCase().includes(q) ||
        zone.description.toLowerCase().includes(q);

      const matchesWarehouse =
        selectedWarehouseFilter === 'all' || zone.warehouseName === selectedWarehouseFilter;

      const matchesType =
        selectedTypeFilter === 'all' || zone.tempType === selectedTypeFilter;

      return matchesSearch && matchesWarehouse && matchesType;
    });
  }, [zones, searchQuery, selectedWarehouseFilter, selectedTypeFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    // Generate next zone code suggestion
    const nextNum = zones.length + 1;
    const nextCode = `Z${String.fromCharCode(64 + Math.min(26, nextNum))}-0${nextNum}`;

    setFormData({
      code: nextCode,
      name: `Zone ${String.fromCharCode(64 + Math.min(26, nextNum))} — General Literature Storage`,
      warehouseName: uniqueWarehouses[0] || 'Main Temple Store — Mayapur HQ',
      customWarehouseName: '',
      capacity: 2500,
      tempType: 'ambient',
      manager: users[0]?.name || 'Store Manager',
      aislesCount: 6,
      shelvesPerAisle: 4,
      location: 'Ground Floor, North Wing',
      description: 'Standard pallet and shelving storage for devotional goods.'
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (zone: WarehouseZone) => {
    setEditingZone(zone);
    setFormData({
      code: zone.code,
      name: zone.name,
      warehouseName: zone.warehouseName || 'Main Temple Store — Mayapur HQ',
      customWarehouseName: '',
      capacity: zone.capacity,
      tempType: zone.tempType,
      manager: zone.manager,
      aislesCount: zone.aislesCount || 4,
      shelvesPerAisle: zone.shelvesPerAisle || 4,
      location: zone.location || '',
      description: zone.description || ''
    });
  };

  // Submit Add Zone
  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.name.trim()) {
      quickNotification('Missing Fields', 'Please provide a valid zone code and title.', 'alert');
      return;
    }

    const finalWarehouse =
      formData.warehouseName === 'custom'
        ? formData.customWarehouseName.trim() || 'Custom Facility'
        : formData.warehouseName;

    addZone({
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      warehouseName: finalWarehouse,
      capacity: Number(formData.capacity) || 1000,
      tempType: formData.tempType,
      manager: formData.manager.trim() || 'Store Manager',
      aislesCount: Number(formData.aislesCount) || 4,
      shelvesPerAisle: Number(formData.shelvesPerAisle) || 4,
      location: formData.location.trim(),
      description: formData.description.trim()
    });

    setIsAddModalOpen(false);
  };

  // Submit Edit Zone
  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone) return;

    const finalWarehouse =
      formData.warehouseName === 'custom'
        ? formData.customWarehouseName.trim() || 'Custom Facility'
        : formData.warehouseName;

    updateZone(editingZone.id, {
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
      warehouseName: finalWarehouse,
      capacity: Number(formData.capacity) || 1000,
      tempType: formData.tempType,
      manager: formData.manager.trim(),
      aislesCount: Number(formData.aislesCount) || 4,
      shelvesPerAisle: Number(formData.shelvesPerAisle) || 4,
      location: formData.location.trim(),
      description: formData.description.trim()
    });

    setEditingZone(null);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingZone) return;
    deleteZone(deletingZone.id);
    setDeletingZone(null);
  };

  // Total summary metrics
  const totalCapacitySum = zones.reduce((sum, z) => sum + (z.capacity || 0), 0);
  const totalUnitsStored = Object.values(zoneStats).reduce((sum, s) => sum + s.totalUnits, 0);
  const overallOccupancy = totalCapacitySum > 0 ? Math.round((totalUnitsStored / totalCapacitySum) * 100) : 0;
  const totalWarehousesCount = new Set(zones.map(z => z.warehouseName || 'Main')).size;

  return (
    <div className="space-y-6">
      {/* Top Header & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            <Warehouse className="w-4 h-4" />
            <span>Facility & Storage Infrastructure</span>
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white uppercase mt-1">
            Warehouse & Storage Zones Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure godowns, secondary distribution hubs, temperature classifications, and storage zones.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Warehouse / Storage Zone</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Warehouses & Hubs
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-slate-900 dark:text-white">
              {totalWarehousesCount}
            </span>
            <span className="text-[11px] font-medium text-slate-400">Facilities Active</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Total Storage Zones
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-slate-900 dark:text-white">
              {zones.length}
            </span>
            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
              {zones.filter(z => z.tempType === 'cold').length} Cold / {zones.filter(z => z.tempType === 'secure_cage').length} Vault
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Total Pallet / Unit Capacity
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-display text-slate-900 dark:text-white">
              {totalCapacitySum.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-slate-400">Slots Configured</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Overall Space Occupancy
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black font-display text-slate-900 dark:text-white">
              {overallOccupancy}%
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-500">
              {totalUnitsStored.toLocaleString()} units stored
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                overallOccupancy > 85 ? 'bg-rose-500' : overallOccupancy > 60 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, overallOccupancy)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 shadow-xs">
        <div className="flex flex-1 items-center gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search zones by title, code (ZA-01), warehouse or manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Warehouse Facility Filter */}
          <select
            value={selectedWarehouseFilter}
            onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
            className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer font-medium"
          >
            <option value="all">All Warehouses ({uniqueWarehouses.length})</option>
            {uniqueWarehouses.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>

          {/* Storage Type Filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer font-medium hidden md:block"
          >
            <option value="all">All Storage Types</option>
            <option value="ambient">Ambient Room Temp</option>
            <option value="cold">Cold Storage (2°C–8°C)</option>
            <option value="secure_cage">Locked Secure Vault</option>
            <option value="quarantine">Quarantine & Returns</option>
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Grid Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Data Table
          </button>
        </div>
      </div>

      {/* Grid Cards View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredZones.map(zone => {
            const stats = zoneStats[zone.id] || { productCount: 0, totalUnits: 0, occupancyPercent: 0 };
            const typeConfig = STORAGE_TYPES.find(t => t.id === zone.tempType) || STORAGE_TYPES[0];
            const TypeIcon = typeConfig.icon;

            return (
              <div
                key={zone.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs hover:border-amber-500/40 transition-all flex flex-col justify-between group relative"
              >
                <div>
                  {/* Top line with Code & Type Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-800 dark:text-amber-400">
                          {zone.code}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${typeConfig.badgeColor}`}>
                          <TypeIcon className="w-3 h-3" />
                          <span>{typeConfig.label.split(' ')[0]}</span>
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 leading-snug">
                        {zone.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(zone)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                        title="Edit storage zone configuration"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingZone(zone)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Delete storage zone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Warehouse Facility Tag */}
                  <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-50/60 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg mb-3 border border-amber-200/50 dark:border-amber-900/30">
                    <Building2 className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{zone.warehouseName || 'Main Temple Store — Mayapur HQ'}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {zone.description || 'No specific operational notes defined.'}
                  </p>

                  {/* Layout info: Aisles & Shelves */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/60 mb-4 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Layout</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {zone.aislesCount || 4} Aisles • {zone.shelvesPerAisle || 4} Shelves
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-mono">Supervisor</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                        {zone.manager}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Capacity & Live Inventory Progress */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Occupancy</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {stats.totalUnits.toLocaleString()} / {zone.capacity.toLocaleString()} slots ({stats.occupancyPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        stats.occupancyPercent > 85 ? 'bg-rose-500' : stats.occupancyPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${stats.occupancyPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{stats.productCount} SKUs Stored</span>
                    <span>{zone.capacity - stats.totalUnits > 0 ? `${(zone.capacity - stats.totalUnits).toLocaleString()} slots free` : 'Capacity Full'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Data Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Zone & Description</th>
                  <th className="py-3 px-4">Facility Warehouse</th>
                  <th className="py-3 px-4">Storage Climate</th>
                  <th className="py-3 px-4">Supervisor</th>
                  <th className="py-3 px-4">Capacity & Occupancy</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredZones.map(zone => {
                  const stats = zoneStats[zone.id] || { productCount: 0, totalUnits: 0, occupancyPercent: 0 };
                  const typeConfig = STORAGE_TYPES.find(t => t.id === zone.tempType) || STORAGE_TYPES[0];

                  return (
                    <tr key={zone.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                          {zone.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 dark:text-white">{zone.name}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{zone.description || '—'}</p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-amber-700 dark:text-amber-400">
                        {zone.warehouseName || 'Main Temple Store — Mayapur HQ'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeConfig.badgeColor}`}>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {zone.manager}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span>{stats.totalUnits} / {zone.capacity}</span>
                            <span className="font-bold">{stats.occupancyPercent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                stats.occupancyPercent > 85 ? 'bg-rose-500' : stats.occupancyPercent > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${stats.occupancyPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(zone)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingZone(zone)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD NEW ZONE / WAREHOUSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Add New Warehouse or Storage Zone
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    PHYSICAL GODOWN & INVENTORY PLACEMENT CONFIGURATION
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="space-y-4">
              {/* Facility Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Warehouse Facility / Godown Location *
                </label>
                <select
                  value={formData.warehouseName}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseName: e.target.value }))}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {uniqueWarehouses.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                  <option value="custom">+ Create New Warehouse Facility Name...</option>
                </select>
              </div>

              {formData.warehouseName === 'custom' && (
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 animate-in fade-in">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                    New Warehouse / Godown Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vrindavan Ashram Distribution Depot"
                    value={formData.customWarehouseName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customWarehouseName: e.target.value }))}
                    className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              {/* Code & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Zone Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ZE-05"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 uppercase"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Zone Title / Section Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zone E — Festival Stalls & Prasadam Hub"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Storage Classification & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Storage Climate & Security *
                  </label>
                  <select
                    value={formData.tempType}
                    onChange={(e) => setFormData(prev => ({ ...prev, tempType: e.target.value as any }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                  >
                    {STORAGE_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pallet / Unit Capacity Limit *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    max={50000}
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Supervisor & Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Zone Supervisor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Staff Manager Name"
                    value={formData.manager}
                    onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Aisles Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.aislesCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, aislesCount: Number(e.target.value) }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Shelves / Aisle
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.shelvesPerAisle}
                    onChange={(e) => setFormData(prev => ({ ...prev, shelvesPerAisle: Number(e.target.value) }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Zone Description & Goods Handled
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Storage for translated sets of Bhagavad-gita As It Is, prasadam gift boxes, and deity paraphernalia."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Storage Zone</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ZONE MODAL */}
      {editingZone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Edit Storage Zone Configuration
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ZONE {editingZone.code} • {editingZone.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingZone(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Warehouse Facility / Godown Location *
                </label>
                <select
                  value={formData.warehouseName}
                  onChange={(e) => setFormData(prev => ({ ...prev, warehouseName: e.target.value }))}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {uniqueWarehouses.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                  <option value="custom">+ Create New Warehouse Facility Name...</option>
                </select>
              </div>

              {formData.warehouseName === 'custom' && (
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40">
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200">
                    New Warehouse / Godown Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vrindavan Ashram Distribution Depot"
                    value={formData.customWarehouseName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customWarehouseName: e.target.value }))}
                    className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Zone Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Zone Title / Section Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Storage Climate & Security *
                  </label>
                  <select
                    value={formData.tempType}
                    onChange={(e) => setFormData(prev => ({ ...prev, tempType: e.target.value as any }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {STORAGE_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pallet / Unit Capacity Limit *
                  </label>
                  <input
                    type="number"
                    required
                    min={100}
                    max={50000}
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Zone Supervisor *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.manager}
                    onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Aisles Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.aislesCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, aislesCount: Number(e.target.value) }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Shelves / Aisle
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.shelvesPerAisle}
                    onChange={(e) => setFormData(prev => ({ ...prev, shelvesPerAisle: Number(e.target.value) }))}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Zone Description & Goods Handled
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingZone(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingZone && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Delete Storage Zone "{deletingZone.name}"?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to remove zone <strong>{deletingZone.code}</strong> from <strong>{deletingZone.warehouseName}</strong>?
              </p>
            </div>

            {/* Inventory warning if items are mapped */}
            {(() => {
              const count = products.filter(
                p => isProductInZone(p, deletingZone, zones)
              ).length;
              if (count > 0) {
                return (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 rounded-xl space-y-1">
                    <p className="font-bold">Cannot delete active zone:</p>
                    <p>{count} catalog products are currently mapped to this zone. Please reassign products to another zone before deleting.</p>
                  </div>
                );
              }
              return (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-400">
                  This zone currently has no assigned products and can be safely removed.
                </div>
              );
            })()}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingZone(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
