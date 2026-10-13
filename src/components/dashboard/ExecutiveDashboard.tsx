'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  IndianRupee,
  BookOpen,
  Gift,
  Heart,
  Package,
  AlertTriangle,
  TrendingUp,
  ShoppingCart,
  FileSpreadsheet,
  Receipt,
  ArrowLeftRight,
  ChevronDown,
  Building2,
  MapPin,
  Sparkles
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export const ExecutiveDashboard: React.FC = () => {
  const {
    products,
    orders,
    events,
    inwardNotes,
    setActiveModule,
    user,
    settings,
    currentBranch
  } = useERP();

  const [salesTimeframe, setSalesTimeframe] = useState<'week' | 'month' | 'year'>('week');
  const [showSalesDropdown, setShowSalesDropdown] = useState(false);
  const [topBooksTimeframe, setTopBooksTimeframe] = useState<'week' | 'month' | 'all_time'>('month');
  const [showTopBooksDropdown, setShowTopBooksDropdown] = useState(false);

  // Compute metrics dynamically from actual orders & products
  const metrics = useMemo(() => {
    let todaySales = 0;
    let booksSold = 0;
    let giftsSold = 0;
    let donationsTotal = 0;

    const now = new Date();
    const todayStr = now.toDateString();

    orders.forEach(ord => {
      const ordDate = new Date(ord.timestamp);
      const isToday = ordDate.toDateString() === todayStr;

      if (isToday) {
        todaySales += ord.total;
      }

      ord.items.forEach(item => {
        const cat = item.product.category?.toLowerCase() || '';
        if (cat.includes('book')) {
          booksSold += item.quantity;
        } else if (cat.includes('gift') || cat.includes('deity') || cat.includes('apparel')) {
          giftsSold += item.quantity;
        }
      });
    });

    const inventoryValue = products.reduce((acc, p) => acc + (Number(p.stock || 0) * Number(p.cost || 0)), 0);
    const lowStockCount = products.filter(p => Number(p.stock || 0) <= Number(p.minStock || 10)).length;

    return {
      todaySales,
      booksSold,
      giftsSold,
      donationsTotal,
      inventoryValue,
      lowStockCount
    };
  }, [orders, products]);

  // Dynamic Sales Trend Data from orders
  const salesTrendData = useMemo(() => {
    if (orders.length === 0) {
      return [
        { date: 'Mon', revenue: 0 },
        { date: 'Tue', revenue: 0 },
        { date: 'Wed', revenue: 0 },
        { date: 'Thu', revenue: 0 },
        { date: 'Fri', revenue: 0 },
        { date: 'Sat', revenue: 0 },
        { date: 'Sun', revenue: 0 },
      ];
    }
    // Group orders by date formatted string
    const map: { [key: string]: number } = {};
    orders.forEach(o => {
      const d = new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map[d] = (map[d] || 0) + o.total;
    });
    return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
  }, [orders]);

  // Dynamic Top Selling Books from orders
  const topBooksData = useMemo(() => {
    const bookMap: { [title: string]: { code: string; copies: number; revenue: number } } = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        if (item.product.category?.toLowerCase().includes('book')) {
          const title = item.product.name;
          const code = item.product.sku.slice(0, 3).toUpperCase();
          if (!bookMap[title]) {
            bookMap[title] = { code, copies: 0, revenue: 0 };
          }
          bookMap[title].copies += item.quantity;
          bookMap[title].revenue += item.quantity * item.product.price;
        }
      });
    });

    const list = Object.entries(bookMap).map(([title, data]) => ({
      title,
      code: data.code,
      copies: data.copies,
      revenue: data.revenue,
      color: 'bg-blue-800'
    }));

    return list.sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders]);

  // Dynamic Sales by Category
  const categoryPieData = useMemo(() => {
    const catMap: { [cat: string]: number } = {
      'Books': 0,
      'Gift Items': 0,
      'Prasadam': 0,
      'Clothing': 0,
      'Others': 0
    };

    let totalVal = 0;
    orders.forEach(o => {
      o.items.forEach(item => {
        const c = item.product.category || 'Others';
        const amt = item.quantity * item.product.price;
        totalVal += amt;
        if (c.toLowerCase().includes('book')) catMap['Books'] += amt;
        else if (c.toLowerCase().includes('gift')) catMap['Gift Items'] += amt;
        else if (c.toLowerCase().includes('prasadam') || c.toLowerCase().includes('food')) catMap['Prasadam'] += amt;
        else if (c.toLowerCase().includes('clothing') || c.toLowerCase().includes('apparel')) catMap['Clothing'] += amt;
        else catMap['Others'] += amt;
      });
    });

    const colors = ['#2563EB', '#D97706', '#15803D', '#7C3AED', '#94A3B8'];
    const keys = Object.keys(catMap);

    return keys.map((name, idx) => {
      const val = totalVal > 0 ? Math.round((catMap[name] / totalVal) * 100) : (name === 'Books' && totalVal === 0 ? 0 : 0);
      return { name, value: val, color: colors[idx % colors.length] };
    });
  }, [orders]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      
      {/* 1. Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFF5E9] via-[#FFF8F2] to-[#FAF5EC] border border-[#E8E2D9] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none" />
        
        <div className="space-y-4 max-w-xl z-10 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/60">
              <span className="text-xs font-bold text-[#D97706] tracking-wide flex items-center gap-1 uppercase">
                Hare Krishna! 🙏
              </span>
            </div>
            {/* Active Branch Display */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{currentBranch?.name || 'Assigned Branch'}</span>
              <span className="px-1.5 py-0.2 bg-amber-200 dark:bg-amber-900 text-amber-950 dark:text-amber-100 rounded text-[10px] font-mono">
                {currentBranch?.code || 'HQ'}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold tracking-tight text-[#1F1916]">
              Welcome back, {user?.name || 'Staff Member'}
            </h1>
            <p className="text-xs sm:text-sm text-[#786C65] font-medium leading-relaxed">
              Operating <span className="font-bold text-[#1F1916]">{currentBranch?.name}</span> ({currentBranch?.city}, {currentBranch?.state}). Showing only branch-specific inventory, sales, and metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
            <button
              onClick={() => setActiveModule('pos')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>POS Checkout</span>
            </button>
            <button
              onClick={() => setActiveModule('reports')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E8E2D9] hover:bg-[#FAF8F5] text-[#786C65] font-bold text-xs transition-all cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#D97706]" />
            </button>
          </div>
        </div>

        {/* Right Side Graphic */}
        <div className="relative w-full max-w-md h-40 md:h-44 flex items-center justify-center shrink-0 overflow-hidden md:-mr-4">
          <div className="absolute inset-0 flex items-center justify-center scale-95 md:scale-100">
            <svg viewBox="0 0 500 200" className="w-full h-full text-amber-200/45 dark:text-amber-800/10 fill-currentColor absolute bottom-0">
              <path d="M50,180 L450,180 L450,170 C450,170 410,130 380,130 C350,130 340,160 340,160 C340,160 310,100 280,100 C250,100 240,150 240,150 L240,140 C240,140 210,60 170,60 C130,60 110,140 110,140 C110,140 90,120 70,120 C50,120 50,180 50,180 Z" />
            </svg>
            <div className="absolute bottom-2 flex items-center gap-4 z-10">
              <div className="w-16 h-24 rounded-md bg-gradient-to-b from-[#B91C1C] to-[#7F1D1D] shadow-md border border-[#E5A93C]/40 flex flex-col justify-between p-1.5 text-white transform -rotate-6">
                <div className="border border-[#E5A93C]/40 rounded-sm h-full flex flex-col justify-between p-1">
                  <div className="text-[7px] font-bold text-center text-[#FEF3C7] tracking-wider font-display leading-none">BHAGAVAD GITA</div>
                  <div className="w-7 h-7 mx-auto rounded-full bg-[#FEF3C7]/10 flex items-center justify-center border border-[#FEF3C7]/20">
                    <Sparkles className="w-3.5 h-3.5 text-[#E5A93C]" />
                  </div>
                </div>
              </div>
              <div className="w-16 h-24 rounded-md bg-gradient-to-b from-[#1E3A8A] to-[#1E1B4B] shadow-md border border-[#FEF3C7]/30 flex flex-col justify-between p-1.5 text-white transform rotate-3">
                <div className="border border-[#FEF3C7]/20 rounded-sm h-full flex flex-col justify-between p-1">
                  <div className="text-[7px] font-bold text-center text-blue-200 tracking-wider font-display leading-none">SRIMAD BHAGAVATAM</div>
                  <div className="w-7 h-7 mx-auto rounded-full bg-[#FEF3C7]/10 flex items-center justify-center border border-[#FEF3C7]/20">
                    <span className="text-[9px] text-[#FEF3C7]">ॐ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Metrics KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#D97706]">
              <IndianRupee className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#786C65] uppercase">Today's Sales</span>
          </div>
          <div className="mt-3.5 space-y-0.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#1F1916]">
              {settings.currencySymbol}{metrics.todaySales.toLocaleString()}
            </span>
            <p className="text-[10px] text-[#786C65] font-semibold">{orders.length} total orders recorded</p>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#2563EB]">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#786C65] uppercase">Books Sold</span>
          </div>
          <div className="mt-3.5 space-y-0.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#1F1916]">{metrics.booksSold}</span>
            <p className="text-[10px] text-[#786C65] font-semibold">from POS & events</p>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#D97706]">
              <Gift className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#786C65] uppercase">Gift Items</span>
          </div>
          <div className="mt-3.5 space-y-0.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#1F1916]">{metrics.giftsSold}</span>
            <p className="text-[10px] text-[#786C65] font-semibold">items delivered</p>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#EF4444]">
              <Heart className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#786C65] uppercase">Donations</span>
          </div>
          <div className="mt-3.5 space-y-0.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#1F1916]">
              {settings.currencySymbol}{metrics.donationsTotal.toLocaleString()}
            </span>
            <p className="text-[10px] text-[#786C65] font-semibold">contributions</p>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="p-4 rounded-2xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#D97706]">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#786C65] uppercase">Inventory Value</span>
          </div>
          <div className="mt-3.5 space-y-0.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#1F1916]">
              {settings.currencySymbol}{metrics.inventoryValue.toLocaleString()}
            </span>
            <p className="text-[10px] text-[#15803D] font-bold font-mono">{products.length} SKUs in stock</p>
          </div>
        </div>

        {/* KPI 6 */}
        <div
          onClick={() => setActiveModule('products')}
          className="p-4 rounded-2xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs hover:border-[#D97706] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-[#B91C1C]">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-[#786C65] uppercase">Low Stock</span>
          </div>
          <div className="mt-3.5 space-y-0.5">
            <span className="text-xl sm:text-2xl font-bold font-mono text-[#B91C1C]">{metrics.lowStockCount}</span>
            <p className="text-[10px] text-[#D97706] font-bold flex items-center gap-0.5">
              View Items <ChevronDown className="w-3 h-3 rotate-270" />
            </p>
          </div>
        </div>
      </div>

      {/* 3. Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales Overview */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
              <h2 className="font-display font-bold text-sm tracking-tight text-[#1F1916]">Sales Overview</h2>
            </div>
            <div className="h-48 w-full mt-4">
              {orders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-[#786C65]">
                  <p>No sales orders recorded yet.</p>
                  <button onClick={() => setActiveModule('pos')} className="mt-2 text-[#D97706] font-bold underline">
                    Start a POS Sale
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D9" opacity={0.5} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#786C65', fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#786C65', fontWeight: 'bold' }} tickFormatter={(v) => `${settings.currencySymbol}${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E8E2D9', borderRadius: '12px', fontSize: '11px', color: '#1F1916' }}
                      formatter={(val: any) => [`${settings.currencySymbol}${val.toLocaleString()}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#D97706" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Top Selling Books */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
              <h2 className="font-display font-bold text-sm tracking-tight text-[#1F1916]">Top Selling Books</h2>
            </div>
            
            <div className="mt-4 space-y-3.5">
              {topBooksData.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#786C65]">
                  No book sales recorded yet.
                </div>
              ) : (
                topBooksData.map((book, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-7 h-8 rounded-sm ${book.color} flex items-center justify-center text-[9px] text-white font-bold shrink-0 shadow-2xs`}>
                        {book.code}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[#1F1916] truncate leading-tight">{book.title}</p>
                        <p className="text-[10px] text-[#786C65] font-semibold">{book.copies} copies</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold font-mono text-[#1F1916]">{settings.currencySymbol}{book.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sales by Category */}
        <div className="lg:col-span-3 p-5 rounded-3xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
              <h2 className="font-display font-bold text-sm tracking-tight text-[#1F1916]">Sales by Category</h2>
            </div>
            
            <div className="relative h-40 w-full mt-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={44}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E8E2D9', borderRadius: '12px', fontSize: '11px' }}
                    formatter={(val: any) => [`${val}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute text-center">
                <p className="text-base font-bold font-mono text-[#1F1916] leading-none">
                  {settings.currencySymbol}{metrics.todaySales.toLocaleString()}
                </p>
                <p className="text-[9px] text-[#786C65] font-bold uppercase tracking-tight mt-0.5">Total Sales</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
              {categoryPieData.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="font-bold text-[#786C65] truncate">{cat.name}</span>
                  <span className="font-bold text-[#1F1916] ml-auto font-mono">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 4. Bottom Row: Recent Material Inward, Events, Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recent Material Inward */}
        <div className="lg:col-span-5 p-5 rounded-3xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
              <h2 className="font-display font-bold text-sm tracking-tight text-[#1F1916]">Recent Material Inward</h2>
              <button onClick={() => setActiveModule('inward')} className="text-[11px] font-bold text-[#D97706] hover:underline">
                View All
              </button>
            </div>
            
            <div className="mt-4 space-y-3.5">
              {inwardNotes.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#786C65]">
                  No material inward notes (GRNs) recorded yet.
                </div>
              ) : (
                inwardNotes.slice(0, 4).map((item, idx) => (
                  <div key={item.id || idx} className="flex items-center justify-between text-xs py-1">
                    <div>
                      <span className="font-mono font-bold text-[#1F1916] bg-[#FAF8F5] border border-[#E8E2D9] px-2 py-0.5 rounded-md text-[10px]">
                        {item.grnNumber}
                      </span>
                      <span className="text-[11px] text-[#786C65] font-semibold ml-2">{item.vendorName}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-[#1F1916]">{settings.currencySymbol}{item.totalValue.toLocaleString()}</p>
                      <p className="text-[9px] text-[#786C65] font-semibold">{item.invoiceDate}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sales Events & Stalls */}
        <div className="lg:col-span-4 p-5 rounded-3xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
              <h2 className="font-display font-bold text-sm tracking-tight text-[#1F1916]">Sales Events & Stalls</h2>
              <button onClick={() => setActiveModule('events')} className="text-[11px] font-bold text-[#D97706] hover:underline">
                View Stalls
              </button>
            </div>
            
            <div className="mt-4 space-y-4">
              {events.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#786C65]">
                  No sales events or stalls scheduled yet.
                </div>
              ) : (
                events.slice(0, 4).map((evt, idx) => (
                  <div key={evt.id || idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-[#E8E2D9] bg-amber-50 flex items-center justify-center font-bold text-[#D97706]">
                        🛕
                      </div>
                      <div>
                        <p className="font-bold text-[#1F1916] leading-tight line-clamp-1">{evt.name}</p>
                        <p className="text-[10px] text-[#786C65] font-semibold mt-0.5">
                          {evt.stallLocation || 'Temple Ground'} • Sales: {settings.currencySymbol}{(evt.currentRevenue || 0).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wide uppercase shrink-0 border ${
                      evt?.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : evt?.status === 'upcoming'
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-slate-50 text-slate-500 border border-slate-200'
                    }`}>
                      {evt?.status || 'SCHEDULED'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="lg:col-span-3 p-5 rounded-3xl bg-white border border-[#E8E2D9] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D9]">
              <h2 className="font-display font-bold text-sm tracking-tight text-[#1F1916]">Quick Actions</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setActiveModule('pos')}
                className="p-3 rounded-xl border border-[#E8E2D9] hover:border-[#D97706] hover:bg-[#FAF8F5] transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShoppingCart className="w-4.5 h-4.5 text-[#D97706]" />
                <span className="text-[10px] font-bold text-[#1F1916] leading-tight">New Sale (POS)</span>
              </button>
              
              <button
                onClick={() => setActiveModule('products')}
                className="p-3 rounded-xl border border-[#E8E2D9] hover:border-[#D97706] hover:bg-[#FAF8F5] transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-4.5 h-4.5 text-[#D97706]" />
                <span className="text-[10px] font-bold text-[#1F1916] leading-tight">Add Book</span>
              </button>

              <button
                onClick={() => setActiveModule('products')}
                className="p-3 rounded-xl border border-[#E8E2D9] hover:border-[#D97706] hover:bg-[#FAF8F5] transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <Gift className="w-4.5 h-4.5 text-[#D97706]" />
                <span className="text-[10px] font-bold text-[#1F1916] leading-tight">Add Gift Item</span>
              </button>

              <button
                onClick={() => setActiveModule('reports')}
                className="p-3 rounded-xl border border-[#E8E2D9] hover:border-[#D97706] hover:bg-[#FAF8F5] transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-4.5 h-4.5 text-[#D97706]" />
                <span className="text-[10px] font-bold text-[#1F1916] leading-tight">Create Invoice</span>
              </button>

              <button
                onClick={() => setActiveModule('inventory')}
                className="p-3 rounded-xl border border-[#E8E2D9] hover:border-[#D97706] hover:bg-[#FAF8F5] transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowLeftRight className="w-4.5 h-4.5 text-[#D97706]" />
                <span className="text-[10px] font-bold text-[#1F1916] leading-tight">Stock Transfer</span>
              </button>

              <button
                onClick={() => setActiveModule('inward')}
                className="p-3 rounded-xl border border-[#E8E2D9] hover:border-[#D97706] hover:bg-[#FAF8F5] transition-all text-center flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4.5 h-4.5 text-[#D97706]" />
                <span className="text-[10px] font-bold text-[#1F1916] leading-tight">New GRN</span>
              </button>
            </div>
          </div>
        </div>

      </div>
      
    </div>
  );
};
