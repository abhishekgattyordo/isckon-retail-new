'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Trash2, Layers, Search, ChevronDown, X } from 'lucide-react';

export interface ShipmentItemRow {
  id: string;
  sku: string;
  description: string;
  quantity: number | '';
  unitCost: number | '';
  sellingPrice: number | '';
  batchNo: string;
  taxRate: number; // 0, 5, 12, 18
  total: number;
}

export interface SkuProductInfo {
  sku: string;
  name?: string;
  description?: string;
  cost?: number;
  unitCost?: number;
  price?: number;
  sellingPrice?: number;
  batchNo?: string;
  taxRate?: number;
}

export interface DynamicShipmentItemsTableProps {
  /** Real product catalog passed from parent or fetched from an API */
  availableProducts?: SkuProductInfo[];
  /** Optional lookup handler when a SKU is selected */
  onSkuLookup?: (sku: string) => Promise<SkuProductInfo | null> | SkuProductInfo | null;
  /** Initial row list (defaults to 1 empty row ready for input) */
  initialRows?: ShipmentItemRow[];
  /** Callback triggered whenever items or calculations change */
  onChange?: (
    rows: ShipmentItemRow[],
    summary: { totalUnits: number; totalValuation: number }
  ) => void;
  /** Currency symbol (defaults to ₹) */
  currencySymbol?: string;
  /** Read-only mode for audit or review view */
  readOnly?: boolean;
  /** Custom container styling classes */
  className?: string;
}

const TAX_OPTIONS = [
  { label: '0%', value: 0 },
  { label: '5%', value: 5 },
  { label: '12%', value: 12 },
  { label: '18%', value: 18 }
];

export const createEmptyRow = (): ShipmentItemRow => ({
  id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  sku: '',
  description: '',
  quantity: 1,
  unitCost: '',
  sellingPrice: '',
  batchNo: '',
  taxRate: 0,
  total: 0
});

interface SkuSearchLookupProps {
  value: string;
  disabled?: boolean;
  availableProducts: SkuProductInfo[];
  onSelect: (sku: string) => void;
  currencySymbol?: string;
}

const SkuSearchLookup: React.FC<SkuSearchLookupProps> = ({
  value,
  disabled = false,
  availableProducts = [],
  onSelect,
  currencySymbol = '₹'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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

  // Filter products by SKU or Product Name starting with typed letters, followed by substring matches
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableProducts;
    }
    const q = searchTerm.trim().toLowerCase();

    const startsWithSku: SkuProductInfo[] = [];
    const startsWithName: SkuProductInfo[] = [];
    const containsQuery: SkuProductInfo[] = [];

    for (const p of availableProducts) {
      const skuLower = p.sku.toLowerCase();
      const nameLower = (p.name || p.description || '').toLowerCase();

      if (skuLower.startsWith(q)) {
        startsWithSku.push(p);
      } else if (nameLower.startsWith(q)) {
        startsWithName.push(p);
      } else if (skuLower.includes(q) || nameLower.includes(q)) {
        containsQuery.push(p);
      }
    }

    return [...startsWithSku, ...startsWithName, ...containsQuery];
  }, [availableProducts, searchTerm]);

  // Reset highlighted index when searchTerm changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectProduct = (sku: string) => {
    onSelect(sku);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      setSearchTerm(value || '');
      setIsOpen(true);
      return;
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredProducts.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
          handleSelectProduct(filteredProducts[highlightedIndex].sku);
        } else if (searchTerm.trim()) {
          handleSelectProduct(searchTerm.trim());
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search SKU or Name..."
          disabled={disabled}
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
          className="w-full h-10 pl-9 pr-8 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all disabled:opacity-60 placeholder:text-gray-400"
        />

        {value && !disabled ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onSelect('');
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Clear SKU"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>

      {/* Search Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-[340px] sm:w-[400px] max-w-[90vw] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/90 dark:bg-slate-950/80 flex items-center justify-between text-[11px] font-mono text-gray-500 uppercase tracking-wider">
            <span>SKU Search Lookup ({filteredProducts.length} results)</span>
            <span className="text-[10px] text-gray-400">↑↓ navigate, ↵ select</span>
          </div>

          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800/60"
          >
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p, idx) => {
                const isSelected = p.sku === value;
                const isHighlighted = idx === highlightedIndex;
                const displayName = p.name || p.description || 'Catalog SKU Item';

                return (
                  <div
                    key={p.sku}
                    onClick={() => handleSelectProduct(p.sku)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-3 cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                      isHighlighted
                        ? 'bg-gray-100 dark:bg-slate-800'
                        : isSelected
                        ? 'bg-gray-50 dark:bg-slate-800/50'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Format: SKU — Product Name */}
                      <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {p.sku}
                        </span>
                        <span className="text-gray-400 mx-1.5">—</span>
                        <span className="text-gray-800 dark:text-gray-200">
                          {displayName}
                        </span>
                      </div>

                      {/* Details: Tax rate & tags */}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-gray-500">
                        {p.taxRate !== undefined && (
                          <span className="bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                            GST: {p.taxRate}%
                          </span>
                        )}
                        {p.batchNo && (
                          <span className="text-gray-400 truncate">
                            Batch: {p.batchNo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="text-right shrink-0">
                      {(p.unitCost !== undefined || p.cost !== undefined) && (
                        <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          Cost: {currencySymbol}{(p.unitCost ?? p.cost)?.toFixed(2)}
                        </div>
                      )}
                      {(p.sellingPrice !== undefined || p.price !== undefined) && (
                        <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                          MRP: {currencySymbol}{(p.sellingPrice ?? p.price)?.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-5 text-center text-xs text-gray-400">
                <p>No matching SKU or product starting with "{searchTerm}"</p>
                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelectProduct(searchTerm.trim())}
                    className="mt-2.5 text-xs font-semibold text-black dark:text-white underline hover:opacity-80 cursor-pointer block mx-auto font-mono"
                  >
                    Select custom SKU "{searchTerm.trim()}"
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

export const DynamicShipmentItemsTable: React.FC<DynamicShipmentItemsTableProps> = ({
  availableProducts = [],
  onSkuLookup,
  initialRows,
  onChange,
  currencySymbol = '₹',
  readOnly = false,
  className = ''
}) => {
  // Initialize state with exactly 1 empty row ready for input (no mock data)
  const [rows, setRows] = useState<ShipmentItemRow[]>(() => {
    if (initialRows && initialRows.length > 0) {
      return initialRows;
    }
    return [createEmptyRow()];
  });

  // Calculate row total dynamically: (Unit Cost * Qty) + (Tax % applied)
  const calculateRowTotal = (
    qty: number | '',
    cost: number | '',
    taxRate: number
  ): number => {
    const q = typeof qty === 'number' ? qty : parseFloat(qty) || 0;
    const c = typeof cost === 'number' ? cost : parseFloat(cost) || 0;
    const subtotal = q * c;
    const taxAmount = subtotal * (taxRate / 100);
    return Number((subtotal + taxAmount).toFixed(2));
  };

  // Summaries
  const totalUnits = useMemo(() => {
    return rows.reduce((sum, row) => {
      const q = typeof row.quantity === 'number' ? row.quantity : parseFloat(row.quantity) || 0;
      return sum + q;
    }, 0);
  }, [rows]);

  const totalValuation = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.total, 0);
  }, [rows]);

  // Stable onChange reference to prevent re-render cascading loops
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Notify parent of updates when rows change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (onChangeRef.current) {
      onChangeRef.current(rows, { totalUnits, totalValuation });
    }
  }, [rows, totalUnits, totalValuation]);

  // Handle SKU lookup selection and auto-fill callback
  const handleSkuSelect = useCallback(
    async (rowId: string, selectedSku: string) => {
      let matchedProd: SkuProductInfo | null | undefined = null;

      if (onSkuLookup) {
        matchedProd = await onSkuLookup(selectedSku);
      }

      if (!matchedProd && availableProducts.length > 0) {
        matchedProd = availableProducts.find(p => p.sku === selectedSku);
      }

      setRows(prev =>
        prev.map(row => {
          if (row.id === rowId) {
            if (!selectedSku) {
              return {
                ...row,
                sku: '',
                description: '',
                unitCost: '',
                sellingPrice: '',
                batchNo: '',
                taxRate: 0,
                total: 0
              };
            }

            const desc = matchedProd?.description || matchedProd?.name || '';
            const cost = matchedProd?.unitCost ?? matchedProd?.cost ?? '';
            const price = matchedProd?.sellingPrice ?? matchedProd?.price ?? '';
            const batch = matchedProd?.batchNo || row.batchNo || '';
            const tax = matchedProd?.taxRate ?? 0;
            const validTax = [0, 5, 12, 18].includes(tax) ? tax : 0;

            const total = calculateRowTotal(row.quantity, cost, validTax);

            return {
              ...row,
              sku: selectedSku,
              description: desc,
              unitCost: cost,
              sellingPrice: price,
              batchNo: batch,
              taxRate: validTax,
              total
            };
          }
          return row;
        })
      );
    },
    [availableProducts, onSkuLookup]
  );

  // Update specific row fields
  const handleRowChange = (
    rowId: string,
    field: keyof ShipmentItemRow,
    value: any
  ) => {
    setRows(prev =>
      prev.map(row => {
        if (row.id === rowId) {
          const updated: ShipmentItemRow = { ...row, [field]: value };

          // Recalculate total if quantity, unit cost, or tax rate changed
          if (field === 'quantity' || field === 'unitCost' || field === 'taxRate') {
            updated.total = calculateRowTotal(
              field === 'quantity' ? value : row.quantity,
              field === 'unitCost' ? value : row.unitCost,
              field === 'taxRate' ? Number(value) : row.taxRate
            );
          }

          return updated;
        }
        return row;
      })
    );
  };

  // Add new empty row
  const handleAddRow = () => {
    setRows(prev => [...prev, createEmptyRow()]);
  };

  // Remove specific row
  const handleRemoveRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  // Clear rows that have no SKU entered
  const handleClearEmptyRows = () => {
    setRows(prev => {
      const filtered = prev.filter(r => r.sku && r.sku.trim().length > 0);
      return filtered;
    });
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs font-sans ${className}`}
    >
      {/* Table Header Bar */}
      <div className="px-6 py-4.5 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-800 dark:text-gray-200">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Dynamic Shipment Items
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Goods Received Note (GRN) line item valuation & inward inventory
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {rows.some(r => !r.sku || !r.sku.trim()) && (
              <button
                type="button"
                onClick={handleClearEmptyRows}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-semibold transition-colors cursor-pointer"
                title="Remove any unassigned or empty rows"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>CLEAR EMPTY</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ ADD SKU ROW</span>
            </button>
          </div>
        )}
      </div>

      {/* Responsive Table Container with generous row spacing */}
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full text-left border-collapse min-w-[1060px]">
          <thead>
            <tr className="bg-gray-50/90 dark:bg-slate-950/70 border-b border-gray-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 font-mono h-12">
              <th className="py-3 px-4 w-[21%] align-middle">
                <span>SKU LOOKUP</span>
                <span className="text-rose-500 font-bold ml-1" title="Mandatory Field">*</span>
              </th>
              <th className="py-3 px-3 w-[22%] align-middle">
                <span>PRODUCT NAME</span>
                <span className="text-rose-500 font-bold ml-1" title="Mandatory Field">*</span>
              </th>
              <th className="py-3 px-3 w-[8%] text-center align-middle">
                <span>QTY</span>
                <span className="text-rose-500 font-bold ml-1" title="Mandatory Field">*</span>
              </th>
              <th className="py-3 px-3 w-[11%] align-middle">UNIT COST ({currencySymbol})</th>
              <th className="py-3 px-3 w-[11%] align-middle">SELLING PRICE ({currencySymbol})</th>
              <th className="py-3 px-3 w-[10%] align-middle">BATCH #</th>
              <th className="py-3 px-3 w-[8%] align-middle">TAX (%)</th>
              <th className="py-3 px-4 w-[11%] text-right align-middle">ROW TOTAL</th>
              {!readOnly && (
                <th className="py-3 px-3 w-[5%] text-center align-middle">ACTION</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80 text-xs sm:text-sm">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 8 : 9} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-900/60">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        No product item rows in this shipment note
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        At least one product item with quantity &gt; 0 is required to proceed.
                      </p>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="px-4 py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold font-mono text-xs hover:opacity-90 shadow-sm cursor-pointer"
                      >
                        + Add First SKU Row
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-gray-50/70 dark:hover:bg-slate-800/40 transition-colors min-h-[60px] h-[64px]"
              >
                {/* 1. SKU LOOKUP (Searchable Combobox / Typeahead) */}
                <td className="py-3.5 px-4 align-middle">
                  <SkuSearchLookup
                    value={row.sku}
                    disabled={readOnly}
                    availableProducts={availableProducts}
                    onSelect={sku => handleSkuSelect(row.id, sku)}
                    currencySymbol={currencySymbol}
                  />
                </td>

                {/* 2. PRODUCT DESCRIPTION (Read-only) */}
                <td className="py-3.5 px-3 align-middle">
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    placeholder="Auto-filled description"
                    value={row.description}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-950/80 text-gray-700 dark:text-gray-300 text-xs sm:text-sm focus:outline-none cursor-default truncate font-medium"
                    title={row.description}
                  />
                </td>

                {/* 3. QTY */}
                <td className="py-3.5 px-3 align-middle">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={readOnly}
                    value={row.quantity}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      handleRowChange(row.id, 'quantity', isNaN(val as number) ? '' : val);
                    }}
                    className="w-full h-10 px-2 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-center font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all disabled:opacity-60 font-mono"
                  />
                </td>

                {/* 4. UNIT COST (₹) */}
                <td className="py-3.5 px-3 align-middle">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    disabled={readOnly}
                    value={row.unitCost}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                      handleRowChange(row.id, 'unitCost', isNaN(val as number) ? '' : val);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all disabled:opacity-60"
                  />
                </td>

                {/* 5. SELLING PRICE (₹) */}
                <td className="py-3.5 px-3 align-middle">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    disabled={readOnly}
                    value={row.sellingPrice}
                    onChange={e => {
                      const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                      handleRowChange(row.id, 'sellingPrice', isNaN(val as number) ? '' : val);
                    }}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all disabled:opacity-60"
                  />
                </td>

                {/* 6. BATCH # */}
                <td className="py-3.5 px-3 align-middle">
                  <input
                    type="text"
                    placeholder="e.g. BAT-2026-01"
                    disabled={readOnly}
                    value={row.batchNo}
                    onChange={e => handleRowChange(row.id, 'batchNo', e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all disabled:opacity-60"
                  />
                </td>

                {/* 7. TAX (%) */}
                <td className="py-3.5 px-3 align-middle">
                  <select
                    disabled={readOnly}
                    value={row.taxRate}
                    onChange={e =>
                      handleRowChange(row.id, 'taxRate', parseFloat(e.target.value) || 0)
                    }
                    className="w-full h-10 px-2.5 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {TAX_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>

                {/* 8. ROW TOTAL */}
                <td className="py-3.5 px-4 text-right align-middle">
                  <div className="font-mono font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                    {currencySymbol}
                    {row.total.toFixed(2)}
                  </div>
                </td>

                {/* 9. ACTIONS */}
                {!readOnly && (
                  <td className="py-3.5 px-3 text-center align-middle">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(row.id)}
                      className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer inline-flex items-center justify-center"
                      title="Delete this row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Summary Section (Bottom of Table) */}
      <div className="p-5 bg-gray-50/90 dark:bg-slate-950/90 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-b-2xl">
        <div className="space-y-1">
          <div className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span>Total Units Received:</span>
            <span className="font-mono font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-gray-200 dark:border-slate-700">
              {totalUnits} pcs
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Valuation calculated as: (Unit Cost × Qty) + applicable Tax %
          </p>
        </div>

        <div className="flex items-baseline gap-2.5 sm:text-right">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-600 dark:text-gray-400 font-mono">
            TOTAL GRN VALUATION:
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white font-mono">
            {currencySymbol}
            {totalValuation.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
