'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useERP } from '../../context/ERPContext';
import { Product, SalesEvent, StockMovement } from '../../types';
import {
  Flame,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Gift,
  AlertCircle,
  MapPin,
  Calendar,
  Phone,
  User,
  ShoppingBag,
  IndianRupee,
  Receipt,
  FileSpreadsheet,
  TrendingUp,
  Boxes,
  ArrowLeftRight,
  Printer,
  Download,
  Eye,
  Check,
  Ban,
  Search,
  ShoppingCart,
  Percent,
  ChevronRight,
  FileText,
  Bookmark,
  Building,
  RefreshCw,
  Tags
} from 'lucide-react';
import {
  exportEventToExcel,
  exportEventToPdf,
  exportEventToCsv,
  EventExportData
} from '../../lib/exportUtils';

interface EventAllocation {
  id: string;
  eventId: string;
  sku: string;
  productName: string;
  category: string;
  allocatedQty: number;
  soldQty: number;
  damagedQty: number;
  returnedQty: number;
  price: number;
}

interface EventTransaction {
  id: string;
  eventId: string;
  orderNumber: string;
  items: { sku: string; name: string; quantity: number; price: number; discountPercent: number; total: number }[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  paymentMethod: 'cash' | 'upi';
  timestamp: string;
  cashierName: string;
}

const EVENT_TYPES = [
  'Janmashtami Festival',
  'Rath Yatra',
  'Book Fair',
  'Temple Festival',
  'College Book Distribution',
  'Spiritual Exhibition',
  'Weekend Outreach Program',
  'Donation Drive',
  'Mobile Book Stall',
  'Special Campaign'
];

export const SalesPromotions: React.FC = () => {
  const {
    products,
    updateProduct,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    quickNotification,
    user,
    currentBranch
  } = useERP();

  // Navigation State
  const [activeTab, setActiveTab] = useState<'directory' | 'workspace'>('directory');
  const [selectedEventId, setSelectedEventId] = useState<string>('evt-2026-01');
  const [workspaceSubTab, setWorkspaceSubTab] = useState<'dashboard' | 'inventory' | 'pos' | 'reports'>('dashboard');

  // Form States
  const [isCreating, setIsCreating] = useState(false);
  const [customEventType, setCustomEventType] = useState('');
  const [newEvent, setNewEvent] = useState({
    name: 'Janmashtami Maha Book Fair 2026',
    type: 'Book Fair' as any,
    description: 'Annual flagship event featuring book distribution stalls and cultural programs.',
    location: 'Main Temple Courtyard Pavilion A',
    address: 'ISKCON Bangalore, Hare Krishna Hill, Rajajinagar',
    organizer: 'ISKCON BBT Department',
    managerName: 'Sri Rama Das',
    contactNumber: '+91 94480 12345',
    startDate: '2026-08-10',
    startTime: '08:00',
    endDate: '2026-08-25',
    endTime: '22:00',
    notes: 'Expect huge crowds on peak days. Keep extra visual signage ready.',
    targetRevenue: 500000,
    discountRule: 'Flat 20% on all BBT hardcover publications'
  });

  // Current selected event object
  const selectedEvent = events?.find(e => e?.id === selectedEventId) || events?.[0] || null;

  // Dynamic allocations & transactions state from database
  const [allocations, setAllocations] = useState<EventAllocation[]>([]);
  const [eventTransactions, setEventTransactions] = useState<EventTransaction[]>([]);
  const [isLoadingEventData, setIsLoadingEventData] = useState(false);

  // Synchronize selectedEventId when events list loads from database
  useEffect(() => {
    if (events.length > 0) {
      if (!selectedEventId || !events.some(e => e.id === selectedEventId)) {
        setSelectedEventId(events[0].id);
      }
    }
  }, [events, selectedEventId]);

  // Fetch live allocations and transactions for the active event from PostgreSQL
  const fetchLiveEventData = useCallback(async (eventId: string) => {
    if (!eventId) return;
    try {
      setIsLoadingEventData(true);
      const [allocRes, txRes] = await Promise.all([
        fetch(`/api/events/allocations?eventId=${encodeURIComponent(eventId)}`).then(r => r.json()).catch(() => ({ success: false })),
        fetch(`/api/events/transactions?eventId=${encodeURIComponent(eventId)}`).then(r => r.json()).catch(() => ({ success: false }))
      ]);

      if (allocRes.success && Array.isArray(allocRes.allocations)) {
        setAllocations(allocRes.allocations);
      }
      if (txRes.success && Array.isArray(txRes.transactions)) {
        setEventTransactions(txRes.transactions);
      }
    } catch (err) {
      console.warn('Error fetching live allocations/transactions from database:', err);
    } finally {
      setIsLoadingEventData(false);
    }
  }, []);

  useEffect(() => {
    const targetId = selectedEvent?.id || selectedEventId;
    if (targetId) {
      fetchLiveEventData(targetId);
    }
  }, [selectedEventId, selectedEvent?.id, fetchLiveEventData]);

  // Allocation Form State
  const [allocProductId, setAllocProductId] = useState('');
  const [allocQty, setAllocQty] = useState<number>(10);

  // POS State
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number; discount: number }[]>([]);
  const [posSearch, setPosSearch] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'upi'>('upi');
  const [posSalesTag, setPosSalesTag] = useState<string>('Event Standard');
  const [lastReceipt, setLastReceipt] = useState<EventTransaction | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'excel' | 'csv' | null>(null);

  // Inventory adjustment / Damage states
  const [editingAllocationId, setEditingAllocationId] = useState<string | null>(null);
  const [damagedInput, setDamagedInput] = useState<number>(0);
  const [returnedInput, setReturnedInput] = useState<number>(0);

  // Auto-generate Event Code
  const generateEventCode = (name: string, type: string) => {
    const prefix = type.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) || 'EVT';
    const year = new Date().getFullYear();
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
    return `${prefix}-${year}-${cleanName || 'STALL'}`;
  };

  // Create Event Handler
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = newEvent.type === 'custom' ? customEventType : newEvent.type;
    const code = generateEventCode(newEvent.name, finalType);

    addEvent({
      name: newEvent.name,
      type: finalType.toLowerCase().replace(/\s+/g, '_') as any,
      startDate: `${newEvent.startDate}T${newEvent.startTime}:00Z`,
      endDate: `${newEvent.endDate}T${newEvent.endTime}:00Z`,
      status: 'upcoming',
      targetRevenue: Number(newEvent.targetRevenue) || 100000,
      allocatedSKUs: 0,
      discountRule: newEvent.discountRule || 'Standard discounts apply',
      description: `${newEvent.description} | Location: ${newEvent.location} | Organizer: ${newEvent.organizer} | Address: ${newEvent.address} | Contact: ${newEvent.contactNumber}`,
      bannerColor: 'from-[#D97706] to-[#B45309]',
      stallLocation: newEvent.location,
      managerName: newEvent.managerName,
      branchId: currentBranch?.id || 'branch-mayapur-hq',
      branchName: currentBranch?.name || 'Mayapur HQ Central'
    });

    setIsCreating(false);
    setActiveTab('directory');
  };

  // Add inventory allocation handler
  const handleAllocateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEventId = selectedEvent?.id || selectedEventId;
    if (!targetEventId) {
      quickNotification('Selection Error', 'Please select or activate an event first.', 'alert');
      return;
    }
    const product = products.find(p => p.id === allocProductId);
    if (!product) return;

    if (allocQty <= 0) {
      quickNotification('Invalid Qty', 'Allocation quantity must be greater than 0.', 'warning');
      return;
    }

    if (allocQty > product.stock) {
      quickNotification(
        'Stock Deficit',
        `Cannot allocate ${allocQty} units. Only ${product.stock} units available in central warehouse.`,
        'alert'
      );
      return;
    }

    // Deduct stock from main product
    updateProduct(product.id, {
      stock: product.stock - allocQty,
      status: (product.stock - allocQty) <= product.minStock ? 'low_stock' : 'in_stock'
    });

    // Check if allocation already exists
    const existingAlloc = allocations.find(a => (a.eventId === targetEventId || a.eventId === selectedEventId) && a.sku === product.sku);
    let targetAlloc: EventAllocation;

    if (existingAlloc) {
      targetAlloc = {
        ...existingAlloc,
        allocatedQty: existingAlloc.allocatedQty + allocQty
      };
    } else {
      targetAlloc = {
        id: `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        eventId: targetEventId,
        sku: product.sku,
        productName: product.name,
        category: product.category,
        allocatedQty: allocQty,
        soldQty: 0,
        damagedQty: 0,
        returnedQty: 0,
        price: product.price
      };
    }

    // Immediate optimistic state update
    setAllocations(prev => {
      const idx = prev.findIndex(a => a.id === targetAlloc.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = targetAlloc;
        return copy;
      }
      return [...prev, targetAlloc];
    });

    // Persist allocation to PostgreSQL backend
    try {
      const res = await fetch('/api/events/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetAlloc)
      });
      const data = await res.json();
      if (data.success && data.allocation) {
        setAllocations(prev => prev.map(a => a.id === targetAlloc.id ? data.allocation : a));
      }
    } catch (err) {
      console.warn('Error saving allocation to backend:', err);
    }

    // Update allocated SKUs count on the event
    const uniqueSKUs = new Set(
      allocations
        .filter(a => a.eventId === targetEventId || a.eventId === selectedEventId)
        .map(a => a.sku)
    );
    uniqueSKUs.add(product.sku);
    await updateEvent(targetEventId, { allocatedSKUs: uniqueSKUs.size });

    // Add warehouse stock movement record
    quickNotification(
      'Stock Transferred',
      `Transferred ${allocQty} units of "${product.name}" to event storage.`,
      'success'
    );

    setAllocProductId('');
    setAllocQty(10);
  };

  // Adjust Damaged / Returned stock
  const handleUpdateAdjustments = async (allocId: string) => {
    const alloc = allocations.find(a => a.id === allocId);
    if (!alloc) return;

    const remaining = alloc.allocatedQty - alloc.soldQty - damagedInput - returnedInput;
    if (remaining < 0) {
      quickNotification('Limit Exceeded', 'Damaged & Returned quantities cannot exceed remaining stock.', 'warning');
      return;
    }

    const updatedAlloc: EventAllocation = {
      ...alloc,
      damagedQty: damagedInput,
      returnedQty: returnedInput
    };

    setAllocations(prev => prev.map(a => a.id === allocId ? updatedAlloc : a));
    setEditingAllocationId(null);

    try {
      await fetch('/api/events/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAlloc)
      });
      quickNotification('Stock Tracked', 'Recorded damages/returns successfully.', 'success');
    } catch (err) {
      console.warn('Error saving adjustment to backend:', err);
    }
  };

  // POS: Add item to event cart
  const handlePOSAddToCart = (product: Product) => {
    // Verify event has allocated stock
    const alloc = allocations.find(a => a.eventId === selectedEventId && a.sku === product.sku);
    if (!alloc) {
      quickNotification('Not Allocated', 'This product is not allocated to this event inventory.', 'warning');
      return;
    }

    const available = alloc.allocatedQty - alloc.soldQty - alloc.damagedQty;
    const existing = posCart.find(item => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + 1 > available) {
      quickNotification('Stock Limit', `Only ${available} units available in event inventory.`, 'alert');
      return;
    }

    if (existing) {
      setPosCart(prev =>
        prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setPosCart(prev => [...prev, { product, quantity: 1, discount: 0 }]);
    }
  };

  // POS: Update quantity
  const handlePOSUpdateQty = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const alloc = allocations.find(a => a.eventId === selectedEventId && a.sku === product.sku);
    if (!alloc) return;

    const available = alloc.allocatedQty - alloc.soldQty - alloc.damagedQty;
    if (qty > available) {
      quickNotification('Stock Limit', `Only ${available} units available in event inventory.`, 'alert');
      return;
    }

    if (qty <= 0) {
      setPosCart(prev => prev.filter(item => item.product.id !== productId));
    } else {
      setPosCart(prev =>
        prev.map(item =>
          item.product.id === productId ? { ...item, quantity: qty } : item
        )
      );
    }
  };

  // POS Checkout Complete
  const handlePOSCheckout = async () => {
    if (posCart.length === 0) return;
    const targetEventId = selectedEvent?.id || selectedEventId;
    if (selectedEvent?.status !== 'active') {
      quickNotification('Event Inactive', 'You can only complete checkouts on an ACTIVE event.', 'alert');
      return;
    }

    // Calculation
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    const txItems = posCart.map(item => {
      const lineSubtotal = item.product.price * item.quantity;
      const lineDiscount = (lineSubtotal * item.discount) / 100;
      const lineTotal = lineSubtotal - lineDiscount;
      subtotal += lineSubtotal;
      discountAmount += lineDiscount;

      // GST Rates: Books 5%, others 12%
      const gstRate = item.product.category === 'Books' ? 5 : 12;
      const lineTax = lineTotal - (lineTotal / (1 + gstRate / 100));
      taxAmount += lineTax;

      return {
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        discountPercent: item.discount,
        total: lineTotal
      };
    });

    const grandTotal = subtotal - discountAmount;
    const orderNo = `INV-EVT-${Date.now().toString().slice(-6)}`;

    const newTx: EventTransaction = {
      id: `etx-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      eventId: targetEventId,
      orderNumber: orderNo,
      items: txItems,
      subtotal,
      taxAmount,
      discountAmount,
      total: grandTotal,
      paymentMethod: posPaymentMethod,
      timestamp: new Date().toISOString(),
      cashierName: selectedEvent.managerName || user?.name || 'Store Manager'
    };

    // Update event inventory allocations sold quantity in state
    const updatedAllocs = allocations.map(a => {
      const cartItem = posCart.find(item => item.product.sku === a.sku);
      if (cartItem && (a.eventId === targetEventId || a.eventId === selectedEventId)) {
        return {
          ...a,
          soldQty: a.soldQty + cartItem.quantity
        };
      }
      return a;
    });
    setAllocations(updatedAllocs);

    // Append to transactions list
    setEventTransactions(prev => [newTx, ...prev]);

    // Persist new transaction to database
    try {
      await fetch('/api/events/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx)
      });
    } catch (e) {
      console.warn('Could not persist event transaction to database:', e);
    }

    // Persist updated sold quantities for each allocated item in database
    for (const item of posCart) {
      const matchingAlloc = updatedAllocs.find(a => (a.eventId === targetEventId || a.eventId === selectedEventId) && a.sku === item.product.sku);
      if (matchingAlloc) {
        try {
          await fetch('/api/events/allocations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchingAlloc)
          });
        } catch (e) {
          console.warn('Could not update allocation soldQty in DB:', e);
        }
      }
    }

    // Update event revenue stats
    const booksQty = txItems
      .filter(item => {
        const prod = products.find(p => p.sku === item.sku);
        return prod?.category === 'Books';
      })
      .reduce((sum, item) => sum + item.quantity, 0);

    const booksRev = txItems
      .filter(item => {
        const prod = products.find(p => p.sku === item.sku);
        return prod?.category === 'Books';
      })
      .reduce((sum, item) => sum + item.total, 0);

    const giftsQty = txItems
      .filter(item => {
        const prod = products.find(p => p.sku === item.sku);
        return prod?.category !== 'Books';
      })
      .reduce((sum, item) => sum + item.quantity, 0);

    const giftsRev = txItems
      .filter(item => {
        const prod = products.find(p => p.sku === item.sku);
        return prod?.category !== 'Books';
      })
      .reduce((sum, item) => sum + item.total, 0);

    await updateEvent(targetEventId, {
      currentRevenue: selectedEvent.currentRevenue + grandTotal,
      booksSoldQty: (selectedEvent.booksSoldQty || 0) + booksQty,
      booksSoldRevenue: (selectedEvent.booksSoldRevenue || 0) + booksRev,
      giftsSoldQty: (selectedEvent.giftsSoldQty || 0) + giftsQty,
      giftsSoldRevenue: (selectedEvent.giftsSoldRevenue || 0) + giftsRev
    });

    // Notify & reset
    setLastReceipt(newTx);
    setReceiptModalOpen(true);
    setPosCart([]);
    quickNotification(
      'Checkout Completed',
      `Receipt ${orderNo} printed. Revenue updated.`,
      'success'
    );
  };

  // Event Closure and stock refund
  const handleCloseEvent = async () => {
    if (!window.confirm('Are you sure you want to close this sales event? All sales will be locked and remaining stock returned to the main warehouse.')) {
      return;
    }

    const targetEventId = selectedEvent?.id || selectedEventId;
    const eventAllocs = allocations.filter(a => a.eventId === targetEventId || a.eventId === selectedEventId);
    let refundedCount = 0;

    for (const alloc of eventAllocs) {
      const product = products.find(p => p.sku === alloc.sku);
      if (product) {
        // Remaining stock = Allocated - Sold - Damaged
        const remaining = Math.max(0, alloc.allocatedQty - alloc.soldQty - alloc.damagedQty);
        if (remaining > 0) {
          updateProduct(product.id, {
            stock: product.stock + remaining,
            status: 'in_stock'
          });
          refundedCount += remaining;
        }
      }
    }

    // Update status to ended in database
    await updateEvent(targetEventId, { status: 'ended' });
    quickNotification(
      'Event Closed & Reconciled',
      `Returned ${refundedCount} unsold units back to central inventory. Sales locked.`,
      'success'
    );
  };

  // Status controls
  const handleStartEvent = async () => {
    const targetEventId = selectedEvent?.id || selectedEventId;
    await updateEvent(targetEventId, { status: 'active' });
    quickNotification('Event Launched', 'Stall/Event status updated to ACTIVE. POS terminal is now live!', 'success');
  };

  const handleCancelEvent = async () => {
    if (window.confirm('Cancel this event? Inventory will be returned to warehouse.')) {
      const targetEventId = selectedEvent?.id || selectedEventId;
      const eventAllocs = allocations.filter(a => a.eventId === targetEventId || a.eventId === selectedEventId);
      for (const alloc of eventAllocs) {
        const product = products.find(p => p.sku === alloc.sku);
        if (product) {
          const remaining = Math.max(0, alloc.allocatedQty - alloc.soldQty - alloc.damagedQty);
          updateProduct(product.id, {
            stock: product.stock + remaining
          });
        }
      }
      await updateEvent(targetEventId, { status: 'ended' });
      quickNotification('Event Cancelled', 'Reverted allocated stocks back to warehouse.', 'info');
    }
  };

  // Calculation helpers for Dashboard & Reports Tabs
  const eventAllocatedItems = allocations.filter(a => a.eventId === selectedEventId || a.eventId === selectedEvent?.id);
  const totalAllocatedQty = eventAllocatedItems.reduce((sum, a) => sum + a.allocatedQty, 0);
  const totalSoldQty = eventAllocatedItems.reduce((sum, a) => sum + a.soldQty, 0);
  const totalRemainingQty = eventAllocatedItems.reduce((sum, a) => sum + Math.max(0, a.allocatedQty - a.soldQty - a.damagedQty), 0);
  const totalDamagedQty = eventAllocatedItems.reduce((sum, a) => sum + a.damagedQty, 0);

  const txs = eventTransactions.filter(t => t.eventId === selectedEventId || t.eventId === selectedEvent?.id);
  const cashCollection = txs.filter(t => t.paymentMethod === 'cash').reduce((sum, t) => sum + t.total, 0);
  const upiCollection = txs.filter(t => t.paymentMethod === 'upi').reduce((sum, t) => sum + t.total, 0);

  // Real Export handler supporting Excel (.xlsx), PDF (.pdf), and CSV
  const handleExport = (type: 'pdf' | 'excel' | 'csv') => {
    if (!selectedEvent) return;

    setIsExporting(true);
    setExportType(type);

    setTimeout(() => {
      try {
        const eventAny = selectedEvent as any;
        const exportData: EventExportData = {
          event: {
            id: selectedEvent.id,
            name: selectedEvent.name,
            code: eventAny.code || selectedEvent.id,
            eventType: selectedEvent.type,
            startDate: selectedEvent.startDate,
            endDate: selectedEvent.endDate,
            stallLocation: selectedEvent.stallLocation || 'Main Stall Area',
            stallManager: selectedEvent.managerName || eventAny.stallManager || 'Unassigned',
            targetSales: selectedEvent.targetRevenue || eventAny.targetSales || 0,
            discountPercent: eventAny.discountPercent || 0,
            status: selectedEvent?.status || 'active'
          },
          allocations: (eventAllocatedItems || []).map(a => ({
            sku: a.sku,
            productName: a.productName,
            category: a.category,
            allocatedQty: a.allocatedQty,
            soldQty: a.soldQty,
            damagedQty: a.damagedQty,
            returnedQty: a.returnedQty,
            price: a.price
          })),
          transactions: txs.map(t => ({
            orderNumber: t.orderNumber,
            timestamp: t.timestamp,
            cashierName: t.cashierName,
            paymentMethod: t.paymentMethod,
            subtotal: t.subtotal,
            discountAmount: t.discountAmount,
            taxAmount: t.taxAmount,
            total: t.total,
            items: t.items || []
          })),
          summary: {
            totalRevenue: selectedEvent.currentRevenue || (cashCollection + upiCollection) || eventAllocatedItems.reduce((s, a) => s + (a.soldQty * a.price), 0),
            totalTransactions: txs.length,
            cashCollection: cashCollection,
            upiCollection: upiCollection,
            avgTicketValue: txs.length > 0 ? (selectedEvent.currentRevenue || (cashCollection + upiCollection)) / txs.length : 0,
            totalAllocated: totalAllocatedQty,
            totalSold: totalSoldQty,
            totalDamaged: totalDamagedQty,
            totalRemaining: totalRemainingQty
          }
        };

        if (type === 'excel') {
          exportEventToExcel(exportData);
        } else if (type === 'pdf') {
          exportEventToPdf(exportData);
        } else if (type === 'csv') {
          exportEventToCsv(exportData);
        }

        quickNotification(
          'Export Successful',
          `Successfully generated and downloaded ${type.toUpperCase()} reconciliation report for ${selectedEvent.name}.`,
          'success'
        );
      } catch (err) {
        console.error('Export error:', err);
        quickNotification(
          'Export Error',
          `Failed to generate ${type.toUpperCase()} document. Please try again.`,
          'alert'
        );
      } finally {
        setIsExporting(false);
        setExportType(null);
      }
    }, 600);
  };

  // Top selling products logic
  const topProducts = [...eventAllocatedItems]
    .sort((a, b) => b.soldQty - a.soldQty)
    .filter(a => a.soldQty > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* 1. Header Banner */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-display">
                Sales Events & Mobile Stalls
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage outdoor Book Fairs, Rath Yatra stalls, and festivals. Separate inventories with centralized reconciliation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setActiveTab('directory');
              setIsCreating(false);
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'directory' && !isCreating
                ? 'bg-amber-100 text-[#B45309]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            Events Directory
          </button>
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === 'workspace'
                ? 'bg-amber-100 text-[#B45309]'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Event Workspace</span>
          </button>
          <button
            onClick={() => {
              setIsCreating(true);
              setActiveTab('directory');
            }}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white flex items-center gap-1.5 shadow-sm shadow-amber-600/10"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        </div>
      </div>

      {/* 2. Main Directory Tab */}
      {activeTab === 'directory' && !isCreating && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Active Events</span>
              <p className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {events?.filter(e => e?.status === 'active').length || 0}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Upcoming Events</span>
              <p className="text-xl font-bold font-mono text-amber-500 mt-1">
                {events?.filter(e => e?.status === 'upcoming').length || 0}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Completed</span>
              <p className="text-xl font-bold font-mono text-slate-600 dark:text-slate-400 mt-1">
                {events?.filter(e => e?.status === 'ended').length || 0}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Total Event Sales</span>
              <p className="text-xl font-bold font-mono text-amber-600 mt-1">
                ₹{(events || []).reduce((sum, e) => sum + (e?.currentRevenue || 0), 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Events List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(!events || events.length === 0) ? (
              <div className="col-span-full p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">No Sales Events Scheduled</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No sales events or stalls are currently registered for this branch. Click below to register your first event.
                </p>
                <button
                  onClick={() => setIsCreating(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >
                  Create New Event
                </button>
              </div>
            ) : (
              (events || []).map(event => {
                if (!event) return null;
                const eventSales = (allocations || []).filter(a => a?.eventId === event?.id);
                const totalItemsAllocated = eventSales.reduce((sum, a) => sum + (a?.allocatedQty || 0), 0);
                const progress = Math.min(100, Math.round(((event?.currentRevenue || 0) / (event?.targetRevenue || 1)) * 100));
                const eventStatus = event?.status || 'upcoming';

                return (
                  <div
                    key={event.id}
                    className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between hover:shadow-sm transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[9px] font-mono font-bold uppercase text-[#D97706] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/50">
                            {(event.type || 'STALL').replace('_', ' ').toUpperCase()}
                          </span>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1.5 font-display line-clamp-1">
                            {event.name}
                          </h3>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase shrink-0 border ${
                          eventStatus === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : eventStatus === 'upcoming'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {eventStatus}
                        </span>
                      </div>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {event.description.split('|')[0]}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 font-mono text-xs">
                      <div>
                        <span className="text-slate-400 block text-[9px]">Event Manager</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {event.managerName || 'TBD'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Stall Location</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                          {event.stallLocation || 'TBD'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Allocated Items</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                          {totalItemsAllocated} Units ({event.allocatedSKUs} SKUs)
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">Current Sales</span>
                        <span className="font-bold text-amber-600 font-mono">
                          ₹{event.currentRevenue.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Progress relative to Target */}
                    <div className="mt-4 space-y-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Target: ₹{event.targetRevenue.toLocaleString('en-IN')}</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">{progress}% reached</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (confirm(`Move event "${event.name}" to Recycle Bin? (You can restore it later)`)) {
                            deleteEvent(event.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Move to Recycle Bin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedEventId(event.id);
                          setWorkspaceSubTab('dashboard');
                          setActiveTab('workspace');
                        }}
                        className="px-3 py-1.5 text-[11px] font-bold text-[#B45309] hover:underline flex items-center gap-1"
                      >
                        <span>Enter Workspace</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      )}

      {/* 3. New Event Creation Form */}
      {activeTab === 'directory' && isCreating && (
        <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-base text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Gift className="w-5 h-5 text-amber-500" />
              <span>Create New Retail Sales Event</span>
            </h2>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs font-mono font-bold text-slate-400 hover:text-slate-600"
            >
              CANCEL
            </button>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  value={newEvent.name}
                  onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  placeholder="e.g. Rath Yatra Book Pavilion"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Event Type</label>
                <select
                  value={newEvent.type}
                  onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="custom">-- Custom Type --</option>
                </select>
                {newEvent.type === 'custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom type"
                    value={customEventType}
                    onChange={e => setCustomEventType(e.target.value)}
                    className="w-full px-3 py-2 mt-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Stall / Event Manager</label>
                <input
                  type="text"
                  required
                  value={newEvent.managerName}
                  onChange={e => setNewEvent({ ...newEvent, managerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  placeholder="e.g. Sri Rama Das"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Manager Contact Number</label>
                <input
                  type="text"
                  required
                  value={newEvent.contactNumber}
                  onChange={e => setNewEvent({ ...newEvent, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  placeholder="e.g. +91 94480 12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Location / Stall Spot</label>
                <input
                  type="text"
                  required
                  value={newEvent.location}
                  onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  placeholder="e.g. Pavilion A, Temple Entry Gate"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Target Sales Revenue (₹)</label>
                <input
                  type="number"
                  required
                  value={newEvent.targetRevenue}
                  onChange={e => setNewEvent({ ...newEvent, targetRevenue: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Organizer Division</label>
              <input
                type="text"
                required
                value={newEvent.organizer}
                onChange={e => setNewEvent({ ...newEvent, organizer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                placeholder="e.g. ISKCON BBT Department"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Start Date & Time</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={newEvent.startDate}
                    onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                  <input
                    type="time"
                    required
                    value={newEvent.startTime}
                    onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">End Date & Time</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    required
                    value={newEvent.endDate}
                    onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                  <input
                    type="time"
                    required
                    value={newEvent.endTime}
                    onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Discount Campaign Rules</label>
              <input
                type="text"
                value={newEvent.discountRule}
                onChange={e => setNewEvent({ ...newEvent, discountRule: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                placeholder="e.g. Flat 20% on Devotional Books, 10% on Gifts"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">Brief Description</label>
              <textarea
                value={newEvent.description}
                onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-xs shadow-md transition-transform active:scale-95"
            >
              CREATE & INITIALIZE SALES EVENT
            </button>
          </form>
        </div>
      )}

      {/* 4. Event Workspace Tab */}
      {activeTab === 'workspace' && (
        !selectedEvent ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">No Event Selected</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Please choose an active event from the Event Directory or create a new event first.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setActiveTab('directory')}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
              >
                Go to Event Directory
              </button>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
              >
                Create New Event
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event Quick Selector Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#FAF8F5] dark:bg-slate-950 border border-[#E8E2D9] dark:border-slate-800/80">
              <div className="flex items-center gap-3">
                <Bookmark className="w-5 h-5 text-[#D97706]" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-mono">SELECTED WORKSPACE EVENT</span>
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="font-bold text-sm bg-transparent border-none text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    {(events || []).map(ev => {
                      if (!ev) return null;
                      return (
                        <option key={ev.id} value={ev.id} className="dark:bg-slate-900">
                          {ev.name || 'Untitled Event'} ({((ev?.status || 'upcoming')).toUpperCase()})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                  selectedEvent?.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : selectedEvent?.status === 'upcoming'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {selectedEvent?.status || 'UPCOMING'}
                </span>

              {selectedEvent?.status === 'upcoming' && (
                <button
                  onClick={handleStartEvent}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[10px] font-mono shadow-sm"
                >
                  START EVENT
                </button>
              )}

              {selectedEvent?.status === 'active' && (
                <button
                  onClick={handleCloseEvent}
                  className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] font-mono shadow-sm"
                >
                  CLOSE EVENT & REFUND STOCK
                </button>
              )}

              {selectedEvent?.status === 'active' && (
                <button
                  onClick={handleCancelEvent}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Cancel Event"
                >
                  <Ban className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Sub-tabs Panel */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            {[
              { id: 'dashboard', label: 'Dashboard & Stats', icon: TrendingUp },
              { id: 'inventory', label: 'Allocated Inventory', icon: Boxes },
              { id: 'pos', label: 'Event POS checkout', icon: ShoppingCart, badge: selectedEvent?.status === 'active' ? 'Live' : null },
              { id: 'reports', label: 'Reports & Reconciliation', icon: FileSpreadsheet }
            ].map(tab => {
              const Icon = tab.icon;
              const isSubActive = workspaceSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setWorkspaceSubTab(tab.id as any)}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all relative ${
                    isSubActive
                      ? 'border-amber-500 text-amber-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.badge && (
                    <span className="bg-emerald-500 text-white text-[8px] font-mono px-1 py-0.2 rounded-md uppercase shrink-0">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sub-tab 1: Workspace Dashboard */}
          {workspaceSubTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Event Revenue</span>
                    <IndianRupee className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                    ₹{selectedEvent?.currentRevenue.toLocaleString('en-IN') || 0}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                    <span className="font-semibold text-emerald-600">Cash: ₹{cashCollection}</span>
                    <span>•</span>
                    <span className="font-semibold text-indigo-500">UPI: ₹{upiCollection}</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Books Distributed</span>
                    <ShoppingBag className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                    {selectedEvent?.booksSoldQty || 0} <span className="text-xs font-normal text-slate-400">Units</span>
                  </p>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-2">
                    Revenue: ₹{(selectedEvent?.booksSoldRevenue || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Gifts / Other Sold</span>
                    <Gift className="w-4 h-4 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                    {selectedEvent?.giftsSoldQty || 0} <span className="text-xs font-normal text-slate-400">Units</span>
                  </p>
                  <span className="text-[10px] text-slate-400 font-semibold block mt-2">
                    Revenue: ₹{(selectedEvent?.giftsSoldRevenue || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Allocated stock</span>
                    <Boxes className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-2">
                    {totalRemainingQty} / {totalAllocatedQty}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                    <span className="font-semibold text-rose-500">{totalDamagedQty} Damaged</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel: Detailed Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Event details card */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                    <h3 className="font-bold text-sm text-slate-950 dark:text-white uppercase font-mono tracking-wider">
                      Event Stalls Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-mono uppercase text-[9px]">Event Manager</span>
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                          <User className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-semibold">{selectedEvent?.managerName || 'Not Assigned'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-mono uppercase text-[9px]">Stall location</span>
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                          <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-semibold">{selectedEvent?.stallLocation || 'Not Set'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-mono uppercase text-[9px]">Dates</span>
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                          <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-semibold">
                            {selectedEvent ? new Date(selectedEvent.startDate).toLocaleDateString() : ''} -{' '}
                            {selectedEvent ? new Date(selectedEvent.endDate).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block font-mono uppercase text-[9px]">Discount Rules</span>
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                          <Tags className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-semibold">{selectedEvent?.discountRule}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 text-[11px] text-[#786C65] dark:text-slate-300 leading-relaxed">
                      <p className="font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5 mb-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Manager Instruction Note</span>
                      </p>
                      {selectedEvent?.description.split('|')[1] || 'Ensure stock counts are recorded daily. For cash collections, deposit securely at the central temple account desk daily.'}
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                    <h3 className="font-bold text-sm text-slate-950 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Best Selling Products inside Event</span>
                    </h3>

                    {topProducts.length === 0 ? (
                      <p className="p-8 text-center text-xs text-slate-400">No products sold in this event yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {topProducts.map((p, index) => (
                          <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-950 flex items-center justify-center font-bold font-mono text-[10px] text-[#D97706]">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {p.productName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{p.sku}</p>
                              </div>
                            </div>

                            <div className="text-right font-mono">
                              <p className="font-bold text-slate-950 dark:text-white">{p.soldQty} Sold</p>
                              <p className="text-[10px] text-slate-400">₹{(p.soldQty * p.price).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Recent Transactions */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                  <h3 className="font-bold text-sm text-slate-950 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-500" />
                    <span>Recent Stalls Receipts</span>
                  </h3>

                  {txs.length === 0 ? (
                    <p className="p-8 text-center text-xs text-slate-400">No transactions recorded yet.</p>
                  ) : (
                    <div className="space-y-3 max-h-[360px] overflow-y-auto scrollbar-thin">
                      {txs.map(tx => (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 transition-colors bg-slate-50/50 dark:bg-slate-950/40 text-xs flex justify-between gap-3"
                        >
                          <div>
                            <p className="font-mono font-bold text-slate-900 dark:text-white">{tx.orderNumber}</p>
                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {new Date(tx.timestamp).toLocaleTimeString()}
                            </p>
                            <span className="text-[9px] text-slate-400 font-mono block mt-1">
                              Cashier: {tx.cashierName}
                            </span>
                          </div>

                          <div className="text-right flex flex-col justify-between items-end">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                              tx.paymentMethod === 'upi'
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                : 'bg-amber-50 text-[#B45309] border-amber-100'
                            }`}>
                              {tx.paymentMethod}
                            </span>
                            <span className="font-bold font-mono text-slate-950 dark:text-white block mt-1">
                              ₹{tx.total.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sub-tab 2: Inventory Allocation */}
          {workspaceSubTab === 'inventory' && (
            <div className="space-y-6">
              {/* Allocation form */}
              {selectedEvent?.status !== 'ended' && (
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                  <h3 className="font-bold text-sm text-slate-950 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-[#D97706]" />
                    <span>Allocate Stock from Central Warehouse</span>
                  </h3>

                  <form onSubmit={handleAllocateInventory} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end text-xs">
                    <div>
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
                        Select Product Catalog SKU
                      </label>
                      <select
                        value={allocProductId}
                        onChange={e => setAllocProductId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                        required
                      >
                        <option value="">-- Choose Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Available: {p.stock} units) - ₹{p.price}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
                        Transfer Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={allocQty}
                        onChange={e => setAllocQty(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-xs shadow-md transition-transform active:scale-95"
                    >
                      ALLOCATE TO STALLS
                    </button>
                  </form>
                </div>
              )}

              {/* Allocation List */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <h3 className="font-bold text-sm text-slate-950 dark:text-white uppercase font-mono tracking-wider">
                    Allocated Items Inventory Ledger
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Total SKUs Allocated: {eventAllocatedItems.length}
                  </span>
                </div>

                {eventAllocatedItems.length === 0 ? (
                  <p className="p-12 text-center text-xs text-slate-400">
                    No items allocated yet. Transfer items using the form above.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-mono font-bold uppercase text-[9px]">
                          <th className="pb-3">Product Name / SKU</th>
                          <th className="pb-3 text-center">Allocated Qty</th>
                          <th className="pb-3 text-center">Sold Qty</th>
                          <th className="pb-3 text-center">Damaged Qty</th>
                          <th className="pb-3 text-center">Returned Qty</th>
                          <th className="pb-3 text-center">Remaining Stock</th>
                          <th className="pb-3 text-right">Price</th>
                          <th className="pb-3 text-right">Total sales</th>
                          <th className="pb-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {eventAllocatedItems.map(a => {
                          const remaining = Math.max(0, a.allocatedQty - a.soldQty - a.damagedQty);
                          const isEditing = editingAllocationId === a.id;

                          return (
                            <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                              <td className="py-3">
                                <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                  {a.productName}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{a.sku}</p>
                              </td>
                              <td className="py-3 text-center font-mono">{a.allocatedQty}</td>
                              <td className="py-3 text-center font-mono text-emerald-600 font-bold">{a.soldQty}</td>
                              <td className="py-3 text-center font-mono">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={damagedInput}
                                    onChange={e => setDamagedInput(Number(e.target.value))}
                                    className="w-12 px-1 border border-slate-300 rounded font-mono text-center text-rose-500"
                                  />
                                ) : (
                                  <span className={a.damagedQty > 0 ? 'text-rose-500 font-bold font-mono' : 'font-mono'}>
                                    {a.damagedQty}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-center font-mono">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={returnedInput}
                                    onChange={e => setReturnedInput(Number(e.target.value))}
                                    className="w-12 px-1 border border-slate-300 rounded font-mono text-center text-amber-500"
                                  />
                                ) : (
                                  <span className={a.returnedQty > 0 ? 'text-amber-500 font-bold font-mono' : 'font-mono'}>
                                    {a.returnedQty}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-center font-mono">
                                <span className={`px-2 py-0.5 rounded font-bold ${
                                  remaining === 0
                                    ? 'bg-rose-50 text-rose-700'
                                    : remaining <= 5
                                    ? 'bg-amber-50 text-amber-700 font-bold'
                                    : 'text-slate-800 dark:text-slate-200'
                                }`}>
                                  {remaining}
                                </span>
                              </td>
                              <td className="py-3 text-right font-mono">₹{a.price.toLocaleString('en-IN')}</td>
                              <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                ₹{(a.soldQty * a.price).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 text-center">
                                {selectedEvent?.status !== 'ended' && (
                                  <>
                                    {isEditing ? (
                                      <div className="flex justify-center gap-1">
                                        <button
                                          onClick={() => handleUpdateAdjustments(a.id)}
                                          className="p-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-200"
                                          title="Save"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditingAllocationId(null)}
                                          className="p-1 rounded bg-slate-50 text-slate-400 border border-slate-200"
                                          title="Cancel"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setEditingAllocationId(a.id);
                                          setDamagedInput(a.damagedQty);
                                          setReturnedInput(a.returnedQty);
                                        }}
                                        className="text-[10px] font-bold text-[#B45309] hover:underline"
                                      >
                                        Record Damage
                                      </button>
                                    )}
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab 3: Event POS Checkout */}
          {workspaceSubTab === 'pos' && (
            <div className="space-y-6 text-xs">
              {selectedEvent?.status !== 'active' ? (
                <div className="p-8 rounded-2xl bg-amber-50 border border-amber-200 text-center text-amber-800">
                  <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                  <p className="font-bold">POS Terminal Locked</p>
                  <p className="text-xs mt-1">
                    This terminal can only accept sales while the event status is **ACTIVE**.
                  </p>
                  <button
                    onClick={handleStartEvent}
                    className="mt-3 px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  >
                    Start & Launch Event POS now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Left Side: Product catalog selection & search */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={posSearch}
                          onChange={e => setPosSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
                          placeholder="Search allocated books / gift items manually or enter product barcode..."
                        />
                      </div>
                    </div>

                    {/* Products grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {products
                        .filter(p => {
                          const alloc = allocations.find(a => a.eventId === selectedEventId && a.sku === p.sku);
                          if (!alloc) return false;
                          const matchesSearch =
                            p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
                            p.sku.toLowerCase().includes(posSearch.toLowerCase()) ||
                            p.barcode === posSearch;
                          return matchesSearch;
                        })
                        .map(p => {
                          const alloc = allocations.find(a => a.eventId === selectedEventId && a.sku === p.sku)!;
                          const remaining = Math.max(0, alloc.allocatedQty - alloc.soldQty - alloc.damagedQty);

                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                if (remaining > 0) handlePOSAddToCart(p);
                              }}
                              className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden group ${
                                remaining === 0
                                  ? 'opacity-60 border-slate-200 cursor-not-allowed bg-slate-50/50'
                                  : 'border-slate-200 dark:border-slate-800 shadow-2xs'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[9px] font-mono font-bold uppercase text-slate-400">
                                    {p.category}
                                  </span>
                                  <h4 className="font-bold text-xs text-slate-950 dark:text-white mt-0.5 line-clamp-1 font-display">
                                    {p.name}
                                  </h4>
                                </div>
                                <span className="font-bold font-mono text-[#D97706] text-xs">₹{p.price}</span>
                              </div>

                              <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-slate-400">Available:</span>
                                <span className={`font-bold ${remaining === 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                  {remaining === 0 ? 'OUT OF STOCK' : `${remaining} units`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Right Side: Event Cart */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <h3 className="font-bold text-sm text-slate-950 dark:text-white uppercase font-mono tracking-wider flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-amber-500" />
                        <span>Event Cart</span>
                      </h3>
                      {posCart.length > 0 && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium border border-blue-200/80 dark:border-blue-800/80">
                            {posCart.length} {posCart.length === 1 ? 'item' : 'items'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200/80 dark:border-emerald-800/80">
                            {posCart.reduce((acc, it) => acc + it.quantity, 0)} {posCart.reduce((acc, it) => acc + it.quantity, 0) === 1 ? 'unit' : 'units'}
                          </span>
                        </div>
                      )}
                    </div>

                    {posCart.length === 0 ? (
                      <p className="p-12 text-center text-slate-400 text-xs">Event cart is empty. Click items to add.</p>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {posCart.map(item => {
                            const lineTotal = item.product.price * item.quantity;
                            const lineDiscount = (lineTotal * item.discount) / 100;
                            return (
                              <div
                                key={item.product.id}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5"
                              >
                                <div className="flex justify-between items-start font-medium">
                                  <span className="font-bold truncate max-w-[120px]">{item.product.name}</span>
                                  <span className="font-mono font-bold">₹{(lineTotal - lineDiscount).toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between items-center text-[10px]">
                                  <div className="flex items-center gap-1 border border-slate-200 rounded px-1.5 py-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handlePOSUpdateQty(item.product.id, item.quantity - 1)}
                                      className="font-bold text-slate-400 hover:text-slate-700"
                                    >
                                      -
                                    </button>
                                    <span className="font-mono font-bold px-1">{item.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={() => handlePOSUpdateQty(item.product.id, item.quantity + 1)}
                                      className="font-bold text-slate-400 hover:text-slate-700"
                                    >
                                      +
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-1 font-mono">
                                    <span className="text-slate-400">Discount:</span>
                                    <select
                                      value={item.discount}
                                      onChange={e => {
                                        const disc = Number(e.target.value);
                                        setPosCart(prev =>
                                          prev.map(c =>
                                            c.product.id === item.product.id
                                              ? { ...c, discount: disc }
                                              : c
                                          )
                                        );
                                      }}
                                      className="border rounded bg-transparent focus:outline-none"
                                    >
                                      <option value={0}>0%</option>
                                      <option value={10}>10%</option>
                                      <option value={20}>20%</option>
                                      <option value={50}>50%</option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Payment & sales options */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">
                              Payment Method
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setPosPaymentMethod('upi')}
                                className={`py-1.5 rounded-xl border text-center font-bold transition-all ${
                                  posPaymentMethod === 'upi'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                    : 'border-slate-200 text-slate-600'
                                }`}
                              >
                                UPI Payment
                              </button>
                              <button
                                type="button"
                                onClick={() => setPosPaymentMethod('cash')}
                                className={`py-1.5 rounded-xl border text-center font-bold transition-all ${
                                  posPaymentMethod === 'cash'
                                    ? 'bg-amber-50 border-amber-200 text-[#B45309]'
                                    : 'border-slate-200 text-slate-600'
                                }`}
                              >
                                Cash Payment
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Checkout button */}
                        <button
                          type="button"
                          onClick={handlePOSCheckout}
                          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold font-mono text-xs shadow-md mt-2 transition-all flex items-center justify-center gap-1.5"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>COMPLETE STALL CHECKOUT</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 4: Reports & Reconciliation */}
          {workspaceSubTab === 'reports' && (
            <div className="space-y-6">
              {/* Detailed Event Reports Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* 1. Sales summary report */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <h3 className="font-bold text-slate-950 dark:text-white uppercase font-mono tracking-wider">
                      Event Sales Summary Report
                    </h3>
                    <button
                      onClick={() => handleExport('csv')}
                      className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Event Revenue:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        ₹{selectedEvent?.currentRevenue.toLocaleString('en-IN') || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Bill Transactions:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {txs.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Books Distributed Sold:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {selectedEvent?.booksSoldQty || 0} Units (₹
                        {(selectedEvent?.booksSoldRevenue || 0).toLocaleString('en-IN')})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gifts / Souvenirs Sold:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {selectedEvent?.giftsSoldQty || 0} Units (₹
                        {(selectedEvent?.giftsSoldRevenue || 0).toLocaleString('en-IN')})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average Bill/Ticket Value:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        ₹
                        {txs.length > 0
                          ? Math.round((selectedEvent?.currentRevenue || 0) / txs.length).toLocaleString('en-IN')
                          : 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Payment collection reconciliation */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800/80">
                    <h3 className="font-bold text-slate-950 dark:text-white uppercase font-mono tracking-wider">
                      Stall Financial Reconciliation
                    </h3>
                    <button
                      onClick={() => window.print()}
                      className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Summary</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">UPI Payments Collection</span>
                      </div>
                      <span className="font-bold text-indigo-500 font-mono">₹{upiCollection.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="flex justify-between items-center p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">Cash Payments Collection</span>
                      </div>
                      <span className="font-bold text-[#B45309] font-mono">₹{cashCollection.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="p-3 bg-amber-50/40 border border-amber-100 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-[#B45309] font-mono block mb-1">
                        Deposit Instructions
                      </span>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Verify cash drawer balance against Cash Payment receipts before final closing. Send UPI settlement slips to accounts department.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Reconciliation summary */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-950 dark:text-white uppercase font-mono tracking-wider">
                    Inventory Reconciliation Ledger
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport('excel')}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1.5 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                      title="Download Excel spreadsheet of allocated inventory & revenue (.xlsx)"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export Excel</span>
                    </button>
                    <button
                      onClick={() => handleExport('pdf')}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 text-slate-700 dark:text-slate-200 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-1.5 font-bold text-xs transition-colors cursor-pointer shadow-2xs"
                      title="Download formatted PDF reconciliation report (.pdf)"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block font-mono text-[9px] uppercase">Allocated Stock</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white text-base mt-1 block">
                      {totalAllocatedQty}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block font-mono text-[9px] uppercase">Sold Units</span>
                    <span className="font-bold font-mono text-emerald-600 text-base mt-1 block">
                      {totalSoldQty}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block font-mono text-[9px] uppercase">Damaged Units</span>
                    <span className="font-bold font-mono text-rose-500 text-base mt-1 block">
                      {totalDamagedQty}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block font-mono text-[9px] uppercase">Unsold Stock Refunded</span>
                    <span className="font-bold font-mono text-indigo-500 text-base mt-1 block">
                      {selectedEvent?.status === 'ended' ? totalRemainingQty : 'Pending Event End'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )
      )}

      {/* 5. Customer Printable Receipt Modal */}
      {receiptModalOpen && lastReceipt && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-w-sm w-full space-y-4 shadow-xl text-xs font-mono relative">
            <button
              onClick={() => setReceiptModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Simulated Receipt Slip header */}
            <div className="text-center space-y-1">
              <span className="text-slate-900 dark:text-white font-bold block text-sm">ISKCON TEMPLE RETAIL</span>
              <span className="text-[10px] text-slate-500 block">Hare Krishna Hill, Rajajinagar, Bangalore</span>
              <span className="text-[10px] text-slate-500 block uppercase font-bold text-amber-600">
                {selectedEvent?.name || 'Sales Event'}
              </span>
              <div className="border-b border-dashed border-slate-200 dark:border-slate-800 my-2" />
            </div>

            {/* Receipt Info details */}
            <div className="space-y-1 text-[10px] text-slate-500">
              <div className="flex justify-between">
                <span>Receipt Code:</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{lastReceipt.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Date & Time:</span>
                <span>{new Date(lastReceipt.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier Staff:</span>
                <span>{lastReceipt.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Stall Spot:</span>
                <span>{selectedEvent?.stallLocation || 'Main Stall Area'}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 my-2" />

            {/* Item Table */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>Item Name</span>
                <span>Qty x Price</span>
                <span>Total</span>
              </div>

              <div className="space-y-1.5 text-[10px]">
                {lastReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-800 dark:text-slate-300">
                    <div className="max-w-[140px]">
                      <p className="font-bold truncate">{item.name}</p>
                      {item.discountPercent > 0 && (
                        <p className="text-[8px] text-[#B45309] font-mono font-semibold">({item.discountPercent}% OFF Event Promo)</p>
                      )}
                    </div>
                    <span>
                      {item.quantity} x {item.price}
                    </span>
                    <span className="font-bold">₹{item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 my-2" />

            {/* Calculation details */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-mono">₹{lastReceipt.subtotal.toFixed(2)}</span>
              </div>
              {lastReceipt.discountAmount > 0 && (
                <div className="flex justify-between text-[#B45309]">
                  <span>Discount Off:</span>
                  <span>-₹{lastReceipt.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated CGST + SGST:</span>
                <span className="font-mono">₹{lastReceipt.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white pt-1">
                <span>GRAND TOTAL:</span>
                <span className="font-mono">₹{lastReceipt.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase pt-1">
                <span>Settled Payment via:</span>
                <span>{lastReceipt.paymentMethod}</span>
              </div>
            </div>

            <div className="border-b border-dashed border-slate-200 dark:border-slate-800 my-2" />

            <div className="text-center space-y-1 pt-1">
              <p className="text-[9px] text-slate-400">THANK YOU FOR SUPPORTING BOOK DISTRIBUTION</p>
              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Hare Krishna! 🙏</p>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-[10px] flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT SLIP</span>
              </button>
              <button
                onClick={() => setReceiptModalOpen(false)}
                className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px]"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export loading modal */}
      {isExporting && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-w-xs w-full text-center space-y-3 shadow-xl">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="font-bold text-xs text-slate-900 dark:text-white font-mono uppercase tracking-widest">
              GENERATING {exportType?.toUpperCase()} REPORT...
            </p>
            <p className="text-[10px] text-slate-400">
              Please wait while the system compiles the transaction ledgers and reconciles allocated stock.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple X component fallback for simple inline dismiss button
const X: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
