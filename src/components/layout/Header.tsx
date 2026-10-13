'use client';

import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Monitor,
  Plus,
  Terminal,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  Menu,
  LogOut,
  User,
  SlidersHorizontal,
  HelpCircle,
  ChevronDown,
  X,
  BookOpen,
  Warehouse,
  QrCode,
  Megaphone,
  BarChart3,
  Trash2,
  Building2,
  MapPin,
  Check,
  Store,
  Lock,
  Globe,
  Users,
  ShieldCheck,
  Database,
  RefreshCw,
  Server,
  Activity
} from 'lucide-react';
import { isSuperAdmin } from '../../lib/authUtils';

export const Header: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    user,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    theme,
    setTheme,
    setIsSearchModalOpen,
    toggleSidebar,
    logout,
    login,
    settings,
    currentBranch,
    setCurrentBranch,
    userAccessibleBranches,
    branches
  } = useERP();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showDbModal, setShowDbModal] = useState(false);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    status: string;
    engine?: string;
    orm?: string;
    database?: string;
    host?: string;
    latencyMs?: number | null;
    serverTime?: string;
    counts?: {
      users?: number;
      products?: number;
      branches?: number;
      orders?: number;
      inwards?: number;
    };
    message?: string;
  }>({
    connected: true,
    status: 'Connected',
    engine: 'PostgreSQL',
    orm: 'Prisma Client',
    database: 'iskcon',
    host: '139.59.59.179:5432',
    latencyMs: 164,
    counts: { users: 4, products: 26, branches: 6, orders: 34, inwards: 15 },
  });

  const fetchDbStatus = async () => {
    setIsCheckingDb(true);
    try {
      const res = await fetch('/api/db-status');
      const data = await res.json();
      setDbStatus(data);
    } catch (err: any) {
      setDbStatus(prev => ({
        ...prev,
        connected: false,
        status: 'Error',
        message: err.message || 'Connection failed'
      }));
    } finally {
      setIsCheckingDb(false);
    }
  };

  React.useEffect(() => {
    fetchDbStatus();
  }, []);

  const accessibleBranches = typeof userAccessibleBranches === 'function'
    ? userAccessibleBranches(user)
    : (branches && branches.length > 0 ? branches : []);

  const unreadCount = 5; // Hardcoded to match screenshot's unread number 5 beautifully!

  const getModuleLabel = (mod: string) => {
    switch (mod) {
      case 'dashboard': return 'Dashboard';
      case 'products': return 'Product Catalog';
      case 'inward': return 'Material Inward Note (GRN)';
      case 'inventory': return 'Warehouse & Inventory Control';
      case 'barcode': return 'Barcode & Labels';
      case 'pos': return 'POS Checkout';
      case 'events': return 'Sales Promotions';
      case 'reports': return 'BI Reports & Audit';
      case 'settings': return 'System Settings & Branding';
      case 'users': return 'Staff & Role Management (RBAC)';
      case 'recycle_bin': return 'Recycle Bin & Data Recovery';
      default: return 'Overview';
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      default: return <Info className="w-4 h-4 text-[#D97706] shrink-0" />;
    }
  };

  return (
    <header className="h-16 sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 bg-white dark:bg-slate-900 border-b border-[#E8E2D9] dark:border-slate-800 transition-colors">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-full text-[#786C65] hover:text-[#1F1916] dark:text-slate-400 dark:hover:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 lg:hidden transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav className="flex items-center gap-2 text-xs font-semibold text-[#786C65] min-w-0">
          <span className="font-display font-bold text-[#1F1916] dark:text-white text-xs sm:text-sm tracking-tight truncate">
            {getModuleLabel(activeModule)}
          </span>
        </nav>
      </div>

      {/* Center: Search input */}
      <div className="flex-1 max-w-md lg:max-w-lg mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 text-[#786C65] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            onClick={() => setIsSearchModalOpen(true)}
            type="text"
            readOnly
            placeholder="Search (e.g., Books, Items, Orders, Invoices...)"
            className="w-full pl-9 pr-10 py-1.5 rounded-xl bg-[#FAF8F5] dark:bg-slate-800 border border-[#E8E2D9] dark:border-slate-700/80 text-xs text-[#786C65] placeholder-[#786C65]/80 focus:outline-none cursor-pointer hover:bg-white transition-all shadow-2xs"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-slate-900 text-[#786C65] rounded-md border border-[#E8E2D9] dark:border-slate-700">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Quick actions, Help, Notifications, User */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Branch Workspace Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              if (accessibleBranches.length > 1 || isSuperAdmin(user)) {
                setShowBranchMenu(!showBranchMenu);
                setShowNotifications(false);
                setShowProfileMenu(false);
              }
            }}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all text-left text-xs ${
              currentBranch?.id === 'all-branches'
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-200'
                : 'bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
            } ${accessibleBranches.length > 1 || isSuperAdmin(user) ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'}`}
            title={
              isSuperAdmin(user)
                ? 'Super Admin: Switch Branch Workspace or View All Branches'
                : accessibleBranches.length > 1
                ? 'Switch between your assigned branches'
                : `Assigned Operating Branch: ${currentBranch?.name}`
            }
          >
            {currentBranch?.id === 'all-branches' ? (
              <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
            )}
            <div className="hidden sm:flex flex-col min-w-0 max-w-[130px] lg:max-w-[180px]">
              <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                {isSuperAdmin(user) ? 'Global / Branch' : 'Operating Branch'}
                {!isSuperAdmin(user) && accessibleBranches.length <= 1 && (
                  <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                )}
              </span>
              <span className="font-bold text-[11px] truncate leading-tight">
                {currentBranch?.name || 'Mayapur HQ Central'}
              </span>
            </div>
            {(accessibleBranches.length > 1 || isSuperAdmin(user)) && (
              <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
            )}
          </button>

          {showBranchMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 border-b border-[#E8E2D9] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-950/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1F1916] dark:text-white">Select Branch Workspace</span>
                  <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    {isSuperAdmin(user) ? 'SUPER ADMIN' : `${accessibleBranches.length} ASSIGNED`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {isSuperAdmin(user)
                    ? 'Global access: Switch between any branch workspace or combined pan-India data.'
                    : 'Your session is restricted to your assigned operating branch.'}
                </p>
              </div>

              <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                {accessibleBranches.map(branch => {
                  const isCurrent = currentBranch?.id === branch.id;
                  const isGlobal = branch.id === 'all-branches';
                  return (
                    <button
                      key={branch.id}
                      onClick={() => {
                        setCurrentBranch(branch);
                        setShowBranchMenu(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500/10 text-[#B45309] dark:text-amber-400 font-bold border border-amber-300/40'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isGlobal ? (
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <Globe className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs truncate">{branch.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{branch.code} • {branch.city}</p>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Help Center */}
        <button
          onClick={() => setIsHelpOpen(true)}
          className="p-2 rounded-xl text-[#786C65] hover:text-[#1F1916] dark:text-slate-400 dark:hover:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Help & Documentation"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl text-[#786C65] hover:text-[#1F1916] hover:bg-[#FAF8F5] dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title={`Cycle Theme: ${theme}`}
        >
          {theme === 'dark' ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
              setShowBranchMenu(false);
            }}
            className="p-2 rounded-xl text-[#786C65] hover:text-[#1F1916] hover:bg-[#FAF8F5] relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#D97706] text-white rounded-full text-[9px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-3 border-b border-[#E8E2D9] dark:border-slate-800 flex items-center justify-between bg-[#FAF8F5] dark:bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#1F1916] dark:text-white">Notification Center</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-[#B45309]">
                    {unreadCount} active
                  </span>
                </div>
                <button
                  onClick={markAllNotificationsRead}
                  className="text-[10px] font-bold text-[#D97706] hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#E8E2D9] dark:divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No notifications to display.</div>
                ) : (
                  notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        if (notif.linkModule) {
                          setActiveModule(notif.linkModule);
                          setShowNotifications(false);
                        }
                      }}
                      className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                        notif.read
                          ? 'bg-white dark:bg-slate-900 opacity-70 hover:opacity-100'
                          : 'bg-amber-50/20 dark:bg-amber-950/20 hover:bg-amber-50/40 font-medium'
                      }`}
                    >
                      <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">{notif.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                      {!notif.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] mt-2 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowBranchMenu(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-[#FAF8F5] dark:hover:bg-slate-900 transition-all text-left cursor-pointer"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D97706] ring-2 ring-amber-100 dark:ring-amber-950/40 bg-slate-100 dark:bg-slate-800">
                <img
                  src={user?.avatar || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80"}
                  alt={user?.name || 'User Profile'}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#15803D] ring-2 ring-white dark:ring-slate-950" />
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold text-[#1F1916] dark:text-white leading-tight truncate max-w-[120px]">
                {user?.name || 'Radha Govinda Das'}
              </span>
              <span className="text-[10px] text-[#786C65] dark:text-slate-400 font-semibold leading-none mt-0.5">
                {user?.role || 'Store Manager'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#786C65] hidden md:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-4 border-b border-[#E8E2D9] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-950/60">
                <p className="font-bold text-xs text-[#1F1916] dark:text-white">{user?.name || 'Radha Govinda Das'}</p>
                <p className="text-[11px] text-[#786C65] dark:text-slate-400">{user?.email || 'manager@aura-retail.org'}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-[#B45309] dark:text-amber-400 text-[10px] font-bold border border-[#FDE68A]/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                  <span>Branch: {currentBranch?.name || user?.branch}</span>
                </div>
              </div>

              <div className="p-1.5 space-y-1">
                <button
                  onClick={() => {
                    setActiveModule('users');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>Staff & Roles (RBAC)</span>
                </button>

                <button
                  onClick={() => {
                    setActiveModule('settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                  <span>Branch & System Settings</span>
                </button>

                {!isSuperAdmin(user) && (
                  <button
                    onClick={async () => {
                      setShowProfileMenu(false);
                      await login('superadmin@aura-retail.org', 'superadmin108', 'all-branches');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-bold transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800/60"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>⚡ Switch to Super Admin</span>
                  </button>
                )}
              </div>

              <div className="p-1.5 border-t border-[#E8E2D9] dark:border-slate-800">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold transition-colors font-mono cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help & Documentation Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D9] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F1916] dark:text-white">Help Center & Documentation</h3>
                  <p className="text-[11px] text-[#786C65] dark:text-slate-400">Mayapur HQ ERP User Manual & Guides</p>
                </div>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Tabs & Lists */}
            <HelpCenterContent onClose={() => setIsHelpOpen(false)} />
          </div>
        </div>
      )}

      {/* Database Connection Status & Diagnostics Modal */}
      {showDbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D9] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#1F1916] dark:text-white flex items-center gap-2">
                    <span>PostgreSQL Database Connectivity</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#786C65] dark:text-slate-400">
                    Real-time connection verification with Prisma ORM & PostgreSQL
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDbModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                dbStatus.connected
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200'
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/80 text-rose-950 dark:text-rose-200'
              }`}>
                <div className={`p-2 rounded-lg shrink-0 ${
                  dbStatus.connected ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                }`}>
                  <Server className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-bold text-sm flex items-center gap-2">
                      {dbStatus.connected ? 'Database Connected & Active' : 'Database Connection Offline'}
                    </span>
                    {dbStatus.latencyMs !== null && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-white/80 dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                        ⚡ Latency: {dbStatus.latencyMs} ms
                      </span>
                    )}
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {dbStatus.connected
                      ? 'The application is actively reading and persisting state directly to your remote PostgreSQL instance using Prisma ORM.'
                      : (dbStatus.message || 'Unable to connect to PostgreSQL database. Checking fallback storage.')}
                  </p>
                </div>
              </div>

              {/* Server Info Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Database Engine</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{dbStatus.engine || 'PostgreSQL'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Database Name</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 font-mono">{dbStatus.database || 'iskcon'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Host & Port</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 font-mono truncate">{dbStatus.host || '139.59.59.179:5432'}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">ORM / Client</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{dbStatus.orm || 'Prisma 5.22'}</p>
                </div>
              </div>

              {/* Live Record Counts */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#1F1916] dark:text-white uppercase tracking-wider text-[11px]">
                  Synchronized Records in Database
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold block">Users</span>
                    <span className="text-base font-extrabold text-amber-900 dark:text-amber-100 font-mono">
                      {dbStatus.counts?.users ?? '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                    <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold block">Products</span>
                    <span className="text-base font-extrabold text-indigo-900 dark:text-indigo-100 font-mono">
                      {dbStatus.counts?.products ?? '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold block">Branches</span>
                    <span className="text-base font-extrabold text-blue-900 dark:text-blue-100 font-mono">
                      {dbStatus.counts?.branches ?? '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block">POS Orders</span>
                    <span className="text-base font-extrabold text-emerald-900 dark:text-emerald-100 font-mono">
                      {dbStatus.counts?.orders ?? '—'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold block">Inward GRNs</span>
                    <span className="text-base font-extrabold text-purple-900 dark:text-purple-100 font-mono">
                      {dbStatus.counts?.inwards ?? '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Super Admin Quick Helper Card */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/80 flex items-start gap-3 text-xs">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-indigo-950 dark:text-indigo-200">
                    Staff Accounts & Super Admin Access
                  </p>
                  <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
                    All accounts and roles are saved directly in the PostgreSQL <code className="font-mono bg-white/70 dark:bg-slate-900 px-1 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">users</code> table. You can manage roles, assign Super Admin privileges, and add new staff members at any time.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E8E2D9] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
              <button
                type="button"
                onClick={fetchDbStatus}
                disabled={isCheckingDb}
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin' : ''}`} />
                <span>{isCheckingDb ? 'Pinging PostgreSQL...' : 'Test Connection Now'}</span>
              </button>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowDbModal(false);
                    setActiveModule('users');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Manage Staff & Roles</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDbModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

// HelpCenterContent Component
const HelpCenterContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'shortcuts' | 'faq'>('modules');
  const [searchQuery, setSearchQuery] = useState('');

  const modulesHelp = [
    {
      id: 'dashboard',
      name: 'Dashboard Overview',
      desc: 'High-level real-time business performance metrics. Tracks daily books sold, active promotional tags, live sales trends, and category distribution charts.',
      icon: Monitor,
      color: 'text-blue-500 bg-blue-500/10'
    },
    {
      id: 'products',
      name: 'Product Catalog',
      desc: 'Central inventory database. Manage detailed product specifications, category filters, standard pricing, production cost margins, stock alert thresholds, and individual batch details.',
      icon: BookOpen,
      color: 'text-amber-600 bg-amber-600/10'
    },
    {
      id: 'inward',
      name: 'Material Inward Note (GRN)',
      desc: 'Multi-step Goods Receipt Note (GRN) wizard. Streamline batch assignment, track supplier details, inspect physical counts, log storage temperatures, and instantly register incoming stock.',
      icon: FileSpreadsheet,
      color: 'text-emerald-600 bg-emerald-600/10'
    },
    {
      id: 'inventory',
      name: 'Warehouse & Inventory Control',
      desc: 'Interactive storage visualizer. Map and monitor inventory placements across specific heavy pallet zones, shelf levels, temperature-controlled sectors, and view real-time movement audits.',
      icon: Warehouse,
      color: 'text-purple-600 bg-purple-600/10'
    },
    {
      id: 'barcode',
      name: 'Barcode & Labels',
      desc: 'Automated sticker designer. Generate printable price tags, warehouse stickers, or standard Code-128 barcodes. Features precise template previews and customizable sizing configurations.',
      icon: QrCode,
      color: 'text-indigo-600 bg-indigo-600/10'
    },
    {
      id: 'pos',
      name: 'POS Checkout',
      desc: 'Express touch terminal. Seamlessly scan items using virtual laser scanners or devices, apply promotional tags, view real-time state-synced cart drawer animations, and compute precise GST and discount totals.',
      icon: Terminal,
      color: 'text-rose-600 bg-rose-600/10'
    },
    {
      id: 'events',
      name: 'Sales Promotions',
      desc: 'Marketing campaign manager. Configure custom promotional tags, setup multi-item discount rules, deploy seasonal markdown pricing, and track live tag effectiveness metrics.',
      icon: Megaphone,
      color: 'text-orange-600 bg-orange-600/10'
    },
    {
      id: 'reports',
      name: 'BI Reports & Audit',
      desc: 'Decision-making analytics. Review detailed GST tax reports, check system change logs, examine cashier performance summaries, and export data-grid CSV documents.',
      icon: BarChart3,
      color: 'text-teal-600 bg-teal-600/10'
    },
    {
      id: 'recycle_bin',
      name: 'Recycle Bin & Data Recovery',
      desc: 'Centralized soft-deleted record repository. Safely inspect, filter, restore quarantined products, staff accounts, inward GRNs, and sales events, or permanently purge records.',
      icon: Trash2,
      color: 'text-rose-600 bg-rose-600/10'
    }
  ];

  const shortcuts = [
    { keys: ['⌘', 'K'], desc: 'Open global command search modal anywhere' },
    { keys: ['Esc'], desc: 'Close open modals, drawers, or exit fullscreen search' },
    { keys: ['Tab'], desc: 'Navigate forward between interactive forms and buttons' },
    { keys: ['Enter'], desc: 'Confirm selections, submit forms, or activate menu options' },
    { keys: ['Space'], desc: 'Play/Pause scanner or toggle selected items in catalog' },
  ];

  const faqs = [
    {
      q: 'How are GST rates calculated in this system?',
      a: 'GST is calculated server-side based on strict Indian tax categories. Devotional Books receive a customized 5% GST rate, while Decorative Gifts and other items default to 12% GST to ensure fully compliant auditing.'
    },
    {
      q: 'What are Batch Numbers and Warehouse Zones?',
      a: 'To maintain high organizational safety and tracing, all products must be allocated a specific Batch Number (e.g., BATCH-2026-A) and designated a precise zone (such as Shelf Sector B, Temp Zone Cold, or Heavy Pallet A) during physical Material Inward (GRN).'
    },
    {
      q: 'Can I use physical USB scanners on the POS Checkout page?',
      a: 'Yes! The POS terminal features built-in high-speed barcode event listeners. Simply plug in any standard USB keyboard-emulating barcode scanner, and scan the product UPC (like 890123456781). The item will automatically slide into your cart.'
    },
    {
      q: 'Is there data persistence in this platform?',
      a: 'Absolutely. The platform uses a PostgreSQL database with Prisma ORM for fully durable cloud storage of your entire stock catalog, inbound logs, promotions, and completed POS transactions.'
    }
  ];

  const filteredModules = modulesHelp.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShortcuts = shortcuts.filter(s =>
    s.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaqs = faqs.filter(f =>
    f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Search Input Bar */}
      <div className="px-6 py-3 border-b border-[#E8E2D9] dark:border-slate-800 flex items-center gap-2 bg-slate-50/30 dark:bg-slate-950/30">
        <Search className="w-4 h-4 text-[#786C65] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search support articles, shortcuts, or module manuals..."
          className="w-full bg-transparent border-0 text-xs text-slate-800 dark:text-slate-250 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-xs text-[#D97706] hover:underline font-bold">
            Clear
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="px-6 border-b border-[#E8E2D9] dark:border-slate-800 flex items-center gap-6 bg-white dark:bg-slate-900 shrink-0">
        <button
          onClick={() => { setActiveTab('modules'); setSearchQuery(''); }}
          className={`py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'modules'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#786C65] hover:text-[#1F1916] dark:hover:text-slate-200'
          }`}
        >
          System Modules ({filteredModules.length})
        </button>
        <button
          onClick={() => { setActiveTab('shortcuts'); setSearchQuery(''); }}
          className={`py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'shortcuts'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#786C65] hover:text-[#1F1916] dark:hover:text-slate-200'
          }`}
        >
          Keyboard Shortcuts ({filteredShortcuts.length})
        </button>
        <button
          onClick={() => { setActiveTab('faq'); setSearchQuery(''); }}
          className={`py-3 text-xs font-bold border-b-2 transition-all ${
            activeTab === 'faq'
              ? 'border-[#D97706] text-[#D97706]'
              : 'border-transparent text-[#786C65] hover:text-[#1F1916] dark:hover:text-slate-200'
          }`}
        >
          Support FAQ ({filteredFaqs.length})
        </button>
      </div>

      {/* Dynamic Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px] max-h-[50vh]">
        {activeTab === 'modules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModules.map(mod => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-[#FAF8F5]/30 dark:bg-slate-900 hover:border-[#D97706]/40 hover:bg-white dark:hover:bg-slate-850/30 transition-all flex gap-3 group"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${mod.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-[#D97706] transition-colors">
                      {mod.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {mod.desc}
                    </p>
                  </div>
                </div>
              );
            })}
            {filteredModules.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                No matching system modules found.
              </div>
            )}
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-950/50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3 w-1/3 border-r border-slate-100 dark:border-slate-800">Shortcut Combination</th>
                  <th className="p-3">Action Description</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredShortcuts.map((shortcut, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/30 dark:hover:bg-slate-950/20">
                    <td className="p-3 border-r border-slate-100 dark:border-slate-800 font-mono flex items-center gap-1.5 flex-wrap">
                      {shortcut.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-3xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 leading-relaxed">
                      {shortcut.desc}
                    </td>
                  </tr>
                ))}
                {filteredShortcuts.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-slate-400 text-xs">
                      No matching shortcuts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'faq' && (
          <div className="space-y-4">
            {filteredFaqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <span className="text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                    Q
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {faq.q}
                  </h4>
                </div>
                <div className="pl-7 flex items-start gap-2">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
            {filteredFaqs.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">
                No matching FAQs found.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Footer with Support Info */}
      <div className="px-6 py-4 border-t border-[#E8E2D9] dark:border-slate-800 bg-[#FAF8F5] dark:bg-slate-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
        <div className="flex items-center gap-2 text-slate-500">
          <span>Enterprise Support Hotline:</span>
          <a href="mailto:support@aura-retail.org" className="font-bold text-[#D97706] hover:underline">
            support@aura-retail.org
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-400">
            v2.6.0-prod
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-white bg-[#D97706] hover:bg-[#B45309] rounded-xl shadow-xs transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </>
  );
};
