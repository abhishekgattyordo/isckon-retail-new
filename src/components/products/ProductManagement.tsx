'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product, StockStatus } from '../../types';
import { ProductDetailModal } from './ProductDetailModal';
import {
  Search,
  Plus,
  Filter,
  Grid,
  List,
  Edit3,
  Trash2,
  Tag,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Package,
  ArrowUpDown,
  Barcode,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  MoreVertical,
  SlidersHorizontal,
  IndianRupee,
  Lock,
  MapPin
} from 'lucide-react';

interface CategorySearchDropdownProps {
  value: string;
  onChange: (category: string) => void;
  existingCategories: string[];
}

const CategorySearchDropdown: React.FC<CategorySearchDropdownProps> = ({
  value,
  onChange,
  existingCategories
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Combined and deduplicated list of retail categories
  const allCategories = useMemo(() => {
    const defaultCategories = [
      'Books & Scriptures',
      'Deity Worship & Paraphernalia',
      'Clothing & Handlooms',
      'Organic & Ayurveda',
      'Incense & Dhoop',
      'Japa & Meditation',
      'Audio & Media',
      'Gifts & Souvenirs',
      'Food & Prasadam',
      'Jewelry & Accessories',
      'Puja Essentials',
      'General Merchandise'
    ];
    const set = new Set([...existingCategories, ...defaultCategories].filter(Boolean));
    return Array.from(set);
  }, [existingCategories]);

  // Filter categories by search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) {
      return allCategories;
    }
    const q = searchTerm.trim().toLowerCase();
    const startsWith: string[] = [];
    const contains: string[] = [];

    for (const cat of allCategories) {
      const lower = cat.toLowerCase();
      if (lower.startsWith(q)) {
        startsWith.push(cat);
      } else if (lower.includes(q)) {
        contains.push(cat);
      }
    }

    return [...startsWith, ...contains];
  }, [allCategories, searchTerm]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCategories]);

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      setSearchTerm(value || '');
      setIsOpen(true);
      return;
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredCategories.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCategories.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredCategories.length) {
          handleSelect(filteredCategories[highlightedIndex]);
        } else if (searchTerm.trim()) {
          handleSelect(searchTerm.trim());
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative flex items-center">
        <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search or select category..."
          value={isOpen ? searchTerm : value}
          onFocus={() => {
            setSearchTerm(value || '');
            setIsOpen(true);
          }}
          onChange={e => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
        />

        {value ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onChange('');
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
            title="Clear category"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            <span>Categories ({filteredCategories.length})</span>
            <span className="text-[9px] text-slate-400">↑↓ to navigate, ↵ to select</span>
          </div>

          <div
            ref={listRef}
            className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1"
          >
            {filteredCategories.length > 0 ? (
              filteredCategories.map((cat, idx) => {
                const isSelected = cat === value;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={cat}
                    onClick={() => handleSelect(cat)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs ${
                      isHighlighted
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                        : isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-slate-400">
                <p>No matching category found for "{searchTerm}"</p>
                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchTerm.trim())}
                    className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer block mx-auto"
                  >
                    + Create custom category "{searchTerm.trim()}"
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProductManagement: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, zones, quickNotification, batches, currentBranch } = useERP();
  
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortField, setSortField] = useState<'name' | 'price' | 'stock' | 'sku'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [viewingBatchesProduct, setViewingBatchesProduct] = useState<Product | null>(null);
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Drawer state (null = closed, 'new' = create, Product = edit)
  const [activeDrawer, setActiveDrawer] = useState<'new' | Product | null>(null);

  // Form state for new/edit
  const [formData, setFormData] = useState<Partial<Product>>({
    sku: '',
    name: '',
    category: '',
    price: '' as any,
    cost: '' as any,
    stock: '' as any,
    minStock: '' as any,
    warehouseZone: zones[0]?.name || 'Zone A — Main Retail Floor',
    batchNo: '',
    barcode: '',
    imageUrl: '',
    status: 'in_stock',
    supplier: '',
    rating: 5.0,
    description: ''
  });

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['All', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p) return false;
      const matchesSearch =
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode || '').includes(searchQuery);
      const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
      return matchesSearch && matchesCat && matchesStatus;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus, sortField, sortOrder]);

  const handleSort = (field: 'name' | 'price' | 'stock' | 'sku') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to move ${selectedIds.length} selected products to the Recycle Bin? (You can restore them anytime)`)) {
      selectedIds.forEach(id => deleteProduct(id));
      setSelectedIds([]);
      quickNotification('Moved to Recycle Bin', `Moved ${selectedIds.length} products to Recycle Bin.`, 'warning');
    }
  };

  const handleBulkDiscount = (pct: number) => {
    selectedIds.forEach(id => {
      const prod = products.find(p => p.id === id);
      if (prod) {
        const newPrice = Number((prod.price * (1 - pct / 100)).toFixed(2));
        updateProduct(id, { price: newPrice });
      }
    });
    quickNotification('Bulk Discount Applied', `Reduced price by ${pct}% on ${selectedIds.length} items.`, 'success');
  };

  const handleOpenDrawer = (item: 'new' | Product) => {
    if (item === 'new') {
      setFormData({
        sku: '',
        name: '',
        category: '',
        price: '' as any,
        cost: '' as any,
        taxRate: '' as any,
        stock: '' as any,
        minStock: '' as any,
        warehouseZone: zones[0]?.name || 'Zone A — Main Retail Floor',
        batchNo: '',
        barcode: '',
        imageUrl: '',
        status: 'in_stock',
        supplier: '',
        rating: 5.0,
        description: ''
      });
    } else {
      setFormData({ ...item, taxRate: item.taxRate ?? 5 });
    }
    setActiveDrawer(item);
  };

  const handleSaveDrawer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      alert("Please provide at least SKU and Product Name.");
      return;
    }

    const stockVal = Number(formData.stock) || 0;
    const minVal = Number(formData.minStock) || 0;
    const priceVal = Number(formData.price) || 0;
    const costVal = Number(formData.cost) || 0;
    const taxRateVal = Number(formData.taxRate) || 0;
    let computedStatus: StockStatus = 'in_stock';
    if (stockVal === 0) computedStatus = 'out_of_stock';
    else if (stockVal <= minVal) computedStatus = 'low_stock';

    if (activeDrawer === 'new') {
      addProduct({
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        category: (formData.category || 'General').trim(),
        price: priceVal,
        cost: costVal,
        taxRate: taxRateVal,
        stock: stockVal,
        minStock: minVal,
        warehouseZone: formData.warehouseZone || 'Zone A',
        batchNo: formData.batchNo || '',
        barcode: formData.barcode || '',
        imageUrl: formData.imageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80',
        status: computedStatus,
        lastUpdated: new Date().toISOString(),
        supplier: formData.supplier || '',
        rating: Number(formData.rating) || 5.0,
        description: formData.description || ''
      });
    } else if (activeDrawer && typeof activeDrawer !== 'string') {
      updateProduct(activeDrawer.id, {
        ...formData,
        sku: formData.sku ? formData.sku.trim() : undefined,
        name: formData.name ? formData.name.trim() : undefined,
        price: priceVal,
        cost: costVal,
        taxRate: taxRateVal,
        stock: stockVal,
        minStock: minVal,
        status: computedStatus
      });
      quickNotification('Product Updated', `Saved changes for ${formData.sku}.`, 'success');
    }

    setActiveDrawer(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      {/* Header & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <Package className="w-6 h-6 text-indigo-500 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Product Catalog & Pricing
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {products.length} SKUS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            MERCHANDISE PRICING • WAREHOUSE ASSIGNMENTS • BARCODE SERIALS • BALANCES
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              const csv = [
                ['SKU', 'Name', 'Category', 'Price (INR)', 'GST (%)', 'Cost (INR)', 'Stock', 'Zone', 'Barcode'].join(','),
                ...filteredProducts.map(p => [p.sku, `"${p.name}"`, p.category, p.price, p.taxRate ?? 5, p.cost, p.stock, `"${p.warehouseZone}"`, p.barcode].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `ISKCON_Retail_Catalog_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              quickNotification('Catalog Exported', 'Downloaded CSV data spreadsheet.', 'info');
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-800 transition-all font-mono"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">EXPORT CSV</span>
          </button>

          <button
            onClick={() => handleOpenDrawer('new')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-xs transition-all shadow-sm shadow-[#D97706]/20"
          >
            <Plus className="w-4 h-4" />
            <span>CREATE PRODUCT</span>
          </button>
        </div>
      </div>

      {/* Bento Summary Grid (3 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-widest">Catalog Valuation</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                ₹{(products.reduce((acc, p) => acc + p.price * p.stock, 0) / 1000).toFixed(1)}k
              </span>
              <span className="text-xs font-semibold text-slate-400 font-mono">retail value</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Cost basis:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">₹{(products.reduce((acc, p) => acc + p.cost * p.stock, 0) / 1000).toFixed(1)}k</span>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-widest">Gross Profit Margin</span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {Math.round(products.reduce((acc, p) => acc + ((p.price - p.cost) / p.price) * 100, 0) / (products.length || 1))}%
              </span>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">avg markup</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>High performer:</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">Sony XM5 (58%)</span>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-widest">Inventory Status</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                {products.filter(p => p.status === 'in_stock').length} <span className="text-sm text-slate-400 font-normal">/ {products.length}</span>
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Healthy</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-rose-500 font-bold">Reorder alert:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{products.filter(p => p.status !== 'in_stock').length} SKU(s) critical</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by SKU, Product Name, or Barcode..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
          />
        </div>

        {/* Dropdowns and View Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>Category: {cat}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="All">Status: All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock Alerts</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          {/* Grid vs Table View Toggle */}
          <div className="flex items-center p-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Table List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Card Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar (When items selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-xl bg-black dark:bg-white text-white dark:text-black shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 border border-slate-800 dark:border-slate-200">
          <div className="flex items-center gap-2 text-xs font-bold font-mono">
            <span className="px-2 py-0.5 rounded bg-white/20 dark:bg-black/20 text-white dark:text-black font-bold">{selectedIds.length} SELECTED</span>
            <span>BULK CATALOG MODIFICATION ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleBulkDiscount(10)}
              className="px-3 py-1.5 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 text-xs font-bold font-mono border border-white/15 dark:border-black/15 transition-all"
            >
              10% OFF
            </button>
            <button
              onClick={() => handleBulkDiscount(20)}
              className="px-3 py-1.5 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 text-xs font-bold font-mono border border-white/15 dark:border-black/15 transition-all"
            >
              20% OFF
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold font-mono shadow transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>DELETE SELECTED</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-lg hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Table or Grid View */}
      {viewMode === 'table' ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <th className="p-4 sm:p-5 w-16 text-center border-r border-b border-[#E5E7EB] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredProducts.length && filteredProducts.length > 0}
                      onChange={e => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="p-4 sm:p-5 w-[30%] border-r border-b border-[#E5E7EB] dark:border-slate-800 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1.5">
                      <span>Product & SKU</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 sm:p-5 w-[14%] border-r border-b border-[#E5E7EB] dark:border-slate-800">Category</th>
                  <th className="p-4 sm:p-5 w-[16%] border-r border-b border-[#E5E7EB] dark:border-slate-800 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('price')}>
                    <div className="flex items-center gap-1.5">
                      <span>Price / Cost</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 sm:p-5 w-[14%] border-r border-b border-[#E5E7EB] dark:border-slate-800 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('stock')}>
                    <div className="flex items-center gap-1.5">
                      <span>Stock Balance</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 sm:p-5 w-[14%] border-r border-b border-[#E5E7EB] dark:border-slate-800">Warehouse Zone</th>
                  <th className="p-4 sm:p-5 w-[12%] border-b border-[#E5E7EB] dark:border-slate-800 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs bg-white dark:bg-slate-900">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      No products found matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(prod => {
                    const isSelected = selectedIds.includes(prod.id);
                    const margin = Math.round(((prod.price - prod.cost) / prod.price) * 100);

                    return (
                      <tr
                        key={prod.id}
                        onClick={() => setSelectedDetailProduct(prod)}
                        className={`transition-colors group cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/30'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="p-4 sm:p-5 text-center border-r border-b border-[#E5E7EB] dark:border-slate-800" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(prod.id)}
                            className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-4 sm:p-5 border-r border-b border-[#E5E7EB] dark:border-slate-800 font-medium">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-10 h-10 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/50 dark:border-slate-700/50"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {prod.name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5 truncate">
                                <span>{prod.sku}</span>
                                <span>•</span>
                                <span className="text-slate-500">{prod.barcode}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 sm:p-5 border-r border-b border-[#E5E7EB] dark:border-slate-800 text-slate-600 dark:text-slate-400">
                          <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium inline-block truncate max-w-full">
                            {prod.category}
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 border-r border-b border-[#E5E7EB] dark:border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white truncate">₹{prod.price.toFixed(2)}</span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-bold shrink-0 border border-indigo-200/60 dark:border-indigo-800/60">
                              {prod.taxRate ?? 5}% GST
                            </span>
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate">
                            Cost: ₹{prod.cost.toFixed(2)} ({margin}% margin)
                          </div>
                        </td>
                        <td className="p-4 sm:p-5 border-r border-b border-[#E5E7EB] dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              prod.status === 'in_stock'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : prod.status === 'low_stock'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            }`}>
                              {prod.stock} units
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">Min: {prod.minStock}</div>
                        </td>
                        <td className="p-4 sm:p-5 border-r border-b border-[#E5E7EB] dark:border-slate-800 text-slate-600 dark:text-slate-400">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={prod.warehouseZone}>
                            {prod.warehouseZone.split('—')[0]}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">Batch: {prod.batchNo}</div>
                        </td>
                        <td className="p-4 sm:p-5 border-b border-[#E5E7EB] dark:border-slate-800 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingBatchesProduct(prod)}
                              className="p-2 rounded-xl text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-all shrink-0"
                              title="View Batches"
                            >
                              <Layers className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDrawer(prod)}
                              className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all shrink-0"
                              title="Edit Product"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Move "${prod.name}" to Recycle Bin? (You can restore it later)`)) deleteProduct(prod.id);
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all shrink-0"
                              title="Move to Recycle Bin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(prod => {
            const margin = Math.round(((prod.price - prod.cost) / prod.price) * 100);
            const isSelected = selectedIds.includes(prod.id);

            return (
              <div
                key={prod.id}
                className={`rounded-xl bg-white dark:bg-slate-900 border transition-all overflow-hidden flex flex-col justify-between group ${
                  isSelected
                    ? 'border-black dark:border-white ring-1 ring-black dark:ring-white shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 shadow-sm hover:shadow'
                }`}
              >
                <div>
                  <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(prod.id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shadow"
                      />
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase backdrop-blur-md ${
                        prod.status === 'in_stock'
                          ? 'bg-emerald-500/80 text-white'
                          : 'bg-rose-500/80 text-white animate-pulse'
                      }`}>
                        {prod.stock} left
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-mono text-indigo-500">{prod.sku}</span>
                      <span>{prod.category}</span>
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {prod.name}
                    </h3>
                    <div className="pt-2 flex items-baseline justify-between border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg font-bold text-slate-900 dark:text-white">₹{prod.price.toFixed(2)}</span>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-mono font-bold border border-indigo-200/60 dark:border-indigo-800/60">
                            {prod.taxRate ?? 5}% GST
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                          +{margin}% profit margin
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 text-right">
                        {prod.warehouseZone.split('—')[0]}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Batch: {prod.batchNo}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingBatchesProduct(prod)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 transition-colors"
                      title="View Batches"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenDrawer(prod)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Move "${prod.name}" to Recycle Bin? (You can restore it later)`)) deleteProduct(prod.id);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                      title="Move to Recycle Bin"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button (Mobile / Quick access) */}
      <button
        onClick={() => handleOpenDrawer('new')}
        className="fixed bottom-6 right-6 lg:hidden p-4 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 hover:scale-105 transition-all z-30"
        title="Create New Product"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Side Drawer for Creating / Editing Product */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200 overflow-y-auto">
            <form onSubmit={handleSaveDrawer} className="flex-1 flex flex-col justify-between p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {activeDrawer === 'new' ? 'Create New SKU Entry' : 'Edit Merchandise Profile'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {activeDrawer === 'new' ? 'Add a new product to the enterprise database.' : `Updating ${formData.sku}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDrawer(null)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Operating Branch Indicator */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs">
                  <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider block">Assigned Branch</span>
                    <span className="font-bold text-amber-900 dark:text-amber-200 truncate block">{currentBranch?.name || 'Mayapur HQ Central'} ({currentBranch?.code || 'MAY-HQ-01'})</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700 dark:text-slate-300">
                        SKU Identifier
                      </label>
                      {activeDrawer !== 'new' && (
                        <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                          <Lock className="w-2.5 h-2.5" />
                          Disabled on Edit
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        disabled={activeDrawer !== 'new'}
                        readOnly={activeDrawer !== 'new'}
                        value={formData.sku || ''}
                        onChange={e => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="e.g. BK-BG-2026"
                        className={`w-full pl-3.5 pr-9 py-2 rounded-xl border font-mono font-semibold text-xs focus:outline-none transition-colors ${
                          activeDrawer !== 'new'
                            ? 'bg-slate-100/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed select-none opacity-80'
                            : 'bg-slate-50 dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500'
                        }`}
                        title={activeDrawer !== 'new' ? 'SKU identifiers cannot be edited once created to maintain inventory and barcode traceability.' : undefined}
                      />
                      {activeDrawer !== 'new' && (
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      )}
                    </div>
                    {activeDrawer !== 'new' && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        SKU identifier is locked to preserve relational integrity across POS and GRN records.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Title</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Bhagavad Gita As It Is – Deluxe Edition"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                      <CategorySearchDropdown
                        value={formData.category || ''}
                        onChange={cat => setFormData({ ...formData, category: cat })}
                        existingCategories={categories}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Warehouse Zone</label>
                      <select
                        value={
                          zones.find(z => z.name === formData.warehouseZone || z.code === formData.warehouseZone || z.id === formData.warehouseZone)?.name ||
                          formData.warehouseZone ||
                          zones[0]?.name ||
                          ''
                        }
                        onChange={e => setFormData({ ...formData, warehouseZone: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      >
                        {zones.map(z => (
                          <option key={z.id} value={z.name}>
                            {z.code} • {z.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Retail Price (₹ MRP)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price !== undefined ? formData.price : ''}
                        onChange={e => setFormData({ ...formData, price: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Unit Cost Basis (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.cost !== undefined ? formData.cost : ''}
                        onChange={e => setFormData({ ...formData, cost: e.target.value === '' ? ('' as any) : parseFloat(e.target.value) })}
                        placeholder="0.00"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* GST Percentage Option & Calculation */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-semibold text-xs text-indigo-950 dark:text-indigo-200">
                        GST Tax Rate (%)
                      </label>
                      <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        Rate: {formData.taxRate !== undefined && formData.taxRate !== null ? `${formData.taxRate}%` : 'Not Set'}
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: '0% (Exempt)', val: 0 },
                        { label: '5% (Books)', val: 5 },
                        { label: '12% (Apparel/Ghee)', val: 12 },
                        { label: '18% (Deities/Crafts)', val: 18 },
                        { label: '28% (Luxury)', val: 28 }
                      ].map(slab => (
                        <button
                          key={slab.val}
                          type="button"
                          onClick={() => setFormData({ ...formData, taxRate: slab.val })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer ${
                            formData.taxRate === slab.val
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {slab.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Input & Tax Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.taxRate !== undefined ? formData.taxRate : ''}
                          onChange={e => setFormData({ ...formData, taxRate: e.target.value === '' ? ('' as any) : Math.max(0, parseFloat(e.target.value) || 0) })}
                          placeholder="Enter GST % (e.g. 0, 5, 12, 18)"
                          className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex flex-col justify-center">
                        {(() => {
                          const price = Number(formData.price) || 0;
                          const rate = Number(formData.taxRate) || 0;
                          if (price <= 0) return <span className="text-slate-400">Enter price to calculate tax</span>;
                          const base = price / (1 + rate / 100);
                          const gstAmt = price - base;
                          return (
                            <span>
                              Base: ₹{base.toFixed(2)} + GST: ₹{gstAmt.toFixed(2)}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Stock Balance</label>
                      <input
                        type="number"
                        value={formData.stock !== undefined ? formData.stock : ''}
                        onChange={e => setFormData({ ...formData, stock: e.target.value === '' ? ('' as any) : parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reorder Min Alert Level</label>
                      <input
                        type="number"
                        value={formData.minStock !== undefined ? formData.minStock : ''}
                        onChange={e => setFormData({ ...formData, minStock: e.target.value === '' ? ('' as any) : parseInt(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Barcode Serial EAN</label>
                      <input
                        type="text"
                        value={formData.barcode || ''}
                        onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                        placeholder="e.g. 8901234567890"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300">
                          Batch Number Tag
                        </label>
                        {activeDrawer !== 'new' && (
                          <span className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60">
                            <Lock className="w-2.5 h-2.5" />
                            Locked on Edit
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          disabled={activeDrawer !== 'new'}
                          readOnly={activeDrawer !== 'new'}
                          value={formData.batchNo || ''}
                          onChange={e => setFormData({ ...formData, batchNo: e.target.value })}
                          placeholder={activeDrawer !== 'new' ? 'No batch tag assigned' : 'e.g. BAT-2026-01'}
                          className={`w-full px-3.5 py-2 rounded-xl border font-mono text-xs focus:outline-none transition-colors ${
                            activeDrawer !== 'new'
                              ? 'bg-slate-100/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed select-none pr-9'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500'
                          }`}
                          title={activeDrawer !== 'new' ? 'Batch numbers are managed strictly through Goods Received Notes (GRN) Inward shipments to preserve inventory traceability.' : undefined}
                        />
                        {activeDrawer !== 'new' && (
                          <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                      </div>
                      {activeDrawer !== 'new' && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Batch tags are immutable during product edits to maintain GRN audit traceability.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Supplier / Publisher</label>
                    <input
                      type="text"
                      value={formData.supplier || ''}
                      onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="e.g. Bhaktivedanta Book Trust, Mayapur Handlooms"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Image URL</label>
                    <input
                      type="url"
                      value={formData.imageUrl || ''}
                      onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Product Description</label>
                    <textarea
                      rows={2}
                      value={formData.description || ''}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter product description, specifications, or notes..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveDrawer(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
                >
                  {activeDrawer === 'new' ? 'Save New SKU' : 'Commit Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Batches Modal */}
      {viewingBatchesProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                  Inventory Batch Tracking (FIFO Flow)
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{viewingBatchesProduct.name}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {viewingBatchesProduct.sku}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setViewingBatchesProduct(null);
                  setBatchSearchQuery('');
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Sub-header Controls */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Batch #, Edition, or GRN..."
                  value={batchSearchQuery}
                  onChange={e => setBatchSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                <span>Total Catalog Stock: <strong className="text-slate-900 dark:text-white font-sans">{viewingBatchesProduct.stock}</strong></span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>Active Batches: <strong className="text-slate-900 dark:text-white font-sans">{batches.filter(b => b.sku === viewingBatchesProduct.sku && b.remainingQuantity > 0).length}</strong></span>
              </div>
            </div>

            {/* Modal Body Table */}
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                // 1. Get all batches for this product SKU
                let filtered = batches.filter(b => b.sku === viewingBatchesProduct.sku);
                
                // 2. Filter by batchSearchQuery if any
                if (batchSearchQuery.trim()) {
                  const q = batchSearchQuery.toLowerCase();
                  filtered = filtered.filter(b => 
                    b.batchNo.toLowerCase().includes(q) || 
                    (b.edition && b.edition.toLowerCase().includes(q)) ||
                    (b.grnNumber && b.grnNumber.toLowerCase().includes(q))
                  );
                }
                
                // 3. Sort by receivedDate ascending (FIFO: oldest first)
                const sortedBatches = filtered.sort((a, b) => a.receivedDate.localeCompare(b.receivedDate));

                const activeBatchesSorted = batches
                  .filter(b => b.sku === viewingBatchesProduct.sku && b.remainingQuantity > 0)
                  .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate));

                if (sortedBatches.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No matching batches found</p>
                      <p className="text-xs text-slate-400 mt-1">There are either no batches recorded for this SKU, or they don't match your filter.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400">
                          <th className="pb-3 px-3">Batch Number / Edition</th>
                          <th className="pb-3 px-3">FIFO Queue Position</th>
                          <th className="pb-3 px-3">Received Date</th>
                          <th className="pb-3 px-3">Unit Costs (Cost / Sell)</th>
                          <th className="pb-3 px-3 text-right">Stock (Remaining / Total)</th>
                          <th className="pb-3 px-3 text-center">Inward Reference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {sortedBatches.map(batch => {
                          const activeIndex = activeBatchesSorted.findIndex(b => b.id === batch.id);
                          
                          return (
                            <tr key={batch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                              <td className="py-3 px-3">
                                <div className="font-semibold text-slate-900 dark:text-white font-mono">{batch.batchNo}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{batch.edition || 'Standard Edition'}</div>
                              </td>
                              <td className="py-3 px-3">
                                {batch.remainingQuantity === 0 ? (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500">
                                    Fully Consumed
                                  </span>
                                ) : activeIndex === 0 ? (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/55">
                                    1st Up (FIFO Next)
                                  </span>
                                ) : activeIndex > 0 ? (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/55">
                                    {activeIndex + 1} in queue
                                  </span>
                                ) : (
                                  <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500">
                                    Inactive
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-mono">
                                {batch.receivedDate}
                              </td>
                              <td className="py-3 px-3">
                                <div className="text-slate-800 dark:text-slate-200 font-medium">
                                  Cost: <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹{batch.costPrice.toFixed(2)}</span>
                                </div>
                                <div className="text-slate-500 mt-0.5">
                                  Sell: <span className="text-indigo-600 dark:text-indigo-400 font-mono font-semibold">₹{batch.sellingPrice.toFixed(2)}</span>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="font-bold text-slate-900 dark:text-white">
                                  {batch.remainingQuantity} <span className="text-[10px] text-slate-400 font-normal">pcs left</span>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  of {batch.totalQuantity} received
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {batch.grnNumber ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {batch.grnNumber}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 flex justify-end">
              <button
                onClick={() => {
                  setViewingBatchesProduct(null);
                  setBatchSearchQuery('');
                }}
                className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Product Detail Modal */}
      {selectedDetailProduct && (
        <ProductDetailModal
          product={selectedDetailProduct}
          onClose={() => setSelectedDetailProduct(null)}
          onEdit={prod => {
            setSelectedDetailProduct(null);
            handleOpenDrawer(prod);
          }}
          onPrintBarcode={prod => {
            setSelectedDetailProduct(null);
            quickNotification('Barcode Queue', `Dispatched label for ${prod.name} to barcode printer.`, 'success');
          }}
        />
      )}
    </div>
  );
};
