import React from 'react';
import { useERP } from '../../context/ERPContext';
import { ModuleType } from '../../types';
import { canAccessModule, isSuperAdmin } from '../../lib/authUtils';
import {
  LayoutDashboard,
  Package,
  FileSpreadsheet,
  Warehouse,
  QrCode,
  Terminal,
  Megaphone,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Search,
  ShoppingCart,
  Receipt,
  RotateCcw,
  BookOpen,
  Gift,
  Tags,
  Boxes,
  ArrowLeftRight,
  Sliders,
  Users,
  Settings,
  Flame,
  Trash2,
  Building2
} from 'lucide-react';

interface NavItem {
  id: ModuleType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
  badge?: string;
  badgeColor?: string;
  customFilter?: string; // custom info if we want
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: '', // No title for top element
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' }
    ]
  },
  {
    title: 'Core Operations',
    items: [
      { id: 'pos', label: 'POS Checkout', icon: ShoppingCart, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50', badge: 'Live', badgeColor: 'bg-emerald-50 text-[#15803D]' },
      { id: 'inward', label: 'Material Inward (GRN)', icon: FileSpreadsheet, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' },
      { id: 'suppliers' as any, label: 'Suppliers & Vendors', icon: Building2, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' }
    ]
  },
  {
    title: 'Inventory & Barcodes',
    items: [
      { id: 'products', label: 'Product Catalog', icon: BookOpen, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' },
      { id: 'barcode', label: 'Barcodes & Labels', icon: QrCode, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' },
      { id: 'inventory', label: 'Stock & Inventory', icon: Warehouse, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' }
    ]
  },
  {
    title: 'Promotions & Analytics',
    items: [
      { id: 'events', label: 'Sales Events & Stalls', icon: Flame, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' },
      { id: 'audit' as any, label: 'Audit Trail & Logs', icon: ShieldCheck, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' }
    ]
  },
  {
    title: 'System settings',
    items: [
      { id: 'settings', label: 'Settings & Branding', icon: Settings, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' },
      { id: 'users' as any, label: 'Staff & Roles (RBAC)', icon: Users, iconColor: 'text-[#D97706]', iconBg: 'bg-amber-50' },
      { id: 'recycle_bin', label: 'Recycle Bin', icon: Trash2, iconColor: 'text-rose-500', iconBg: 'bg-rose-50' }
    ]
  }
];

export const Sidebar: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    sidebarCollapsed,
    toggleSidebar,
    mobileMenuOpen,
    setMobileMenuOpen,
    products,
    setIsSearchModalOpen,
    user,
    settings,
    recycleBinItems
  } = useERP();

  const lowStockCount = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock').length;
  const isCollapsed = sidebarCollapsed && !mobileMenuOpen;
  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'IR';

  // Helper to determine if a sidebar label maps to active state
  const isLabelActive = (item: NavItem) => {
    return activeModule === item.id;
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 h-screen flex flex-col transition-all duration-300 z-50 lg:z-30 border-r border-[#E8E2D9] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900 ${
          mobileMenuOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Header */}
        <div className="p-6 flex items-center justify-between border-b border-[#E8E2D9] dark:border-slate-800">
          <div
            onClick={isCollapsed ? toggleSidebar : undefined}
            className={`flex items-center gap-2.5 overflow-hidden transition-all min-w-0 ${
              isCollapsed
                ? 'justify-center w-full cursor-pointer hover:bg-[#FAF8F5] dark:hover:bg-slate-800 p-1.5 rounded-xl transition-all duration-200'
                : ''
            }`}
            title={isCollapsed ? "Expand Sidebar" : undefined}
          >
            {/* Elegant Lotus Logo or Custom Logo */}
            <div className="w-10 h-10 flex items-center justify-center shrink-0 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 shadow-xs">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Organization Logo"
                  className="max-w-full max-h-full object-contain p-1"
                />
              ) : (
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-[#D97706]" style={{ color: settings.brandingColor }} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C12 2 9 7 12 15C15 7 12 2 12 2Z" fill="#FFFBEB" />
                  <path d="M12 7C9.5 8.5 6 11 9 16C12 16 12 12 12 7Z" />
                  <path d="M12 7C14.5 8.5 18 11 15 16C12 16 12 12 12 7Z" />
                  <path d="M12 11C8 11 4 14 8 18C12 18 12 14 12 11Z" />
                  <path d="M12 11C16 11 20 14 16 18C12 18 12 14 12 11Z" />
                  <path d="M9 19C10.5 20.5 13.5 20.5 15 19" />
                </svg>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-display font-black tracking-wider text-[#1F1916] dark:text-white text-xs leading-none uppercase truncate">
                  {settings.appTitle}
                </span>
                <span className="text-[9px] text-[#D97706] dark:text-amber-400 font-bold tracking-wide mt-1.5 truncate" style={{ color: settings.brandingColor }}>
                  {settings.orgName}
                </span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-lg text-[#786C65] hover:text-[#1F1916] dark:hover:text-slate-200 hover:bg-[#FAF8F5] dark:hover:bg-slate-800 transition-colors"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin scrollbar-thumb-slate-200">
          {NAV_GROUPS.map((group, groupIdx) => {
            const allowedItems = group.items.filter(item => {
              return canAccessModule(user, item.id);
            });
            if (allowedItems.length === 0) return null;

            return (
              <div key={groupIdx} className={groupIdx > 0 ? (isCollapsed ? 'mt-8' : '') : ''}>
                {!isCollapsed && group.title && (
                  <div className="text-[11px] font-semibold text-[#8B8B8B] dark:text-slate-400 uppercase tracking-[0.14em] px-2.5 mt-[28px] mb-[14px]">
                    {group.title}
                  </div>
                )}
                {isCollapsed && group.title && (
                  <div className="h-px bg-[#E8E2D9] dark:bg-slate-800 mx-2 mb-4" />
                )}
                <div className="space-y-2">
                  {allowedItems.map((item, itemIdx) => {
                    const Icon = item.icon;
                    const isActive = isLabelActive(item);

                  // Override badge for inventory or recycle bin if items exist
                  let displayBadge = item.badge;
                  let displayBadgeColor = item.badgeColor;
                  if (item.id === 'recycle_bin' && recycleBinItems.length > 0) {
                    displayBadge = `${recycleBinItems.length}`;
                    displayBadgeColor = 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300 font-bold px-1.5 py-0.2 rounded-full font-mono text-[10px] border border-rose-200 dark:border-rose-800';
                  } else if (item.label === 'Stock Overview' && lowStockCount > 0) {
                    displayBadge = `${lowStockCount}`;
                    displayBadgeColor = 'bg-red-50 text-[#B91C1C] dark:bg-red-950/60 dark:text-red-300 font-bold px-1.5 py-0.2 rounded-full font-mono text-[10px]';
                  } else if (displayBadge && !displayBadgeColor) {
                    displayBadgeColor = 'bg-[#FAF8F5] text-[#786C65] font-semibold';
                  }

                  return (
                    <button
                      key={`${item.label}-${itemIdx}`}
                      onClick={() => setActiveModule(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all group relative ${
                        isActive
                          ? 'bg-[#FEF3C7]/90 dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300 font-bold shadow-2xs border border-[#FDE68A]/60 dark:border-amber-800/50'
                          : 'text-[#786C65] dark:text-slate-400 hover:bg-[#FAF8F5] dark:hover:bg-slate-800/50 hover:text-[#1F1916] dark:hover:text-white border border-transparent font-semibold'
                      } ${isCollapsed ? 'justify-center px-0 py-2' : ''}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D97706]' : 'text-[#786C65] dark:text-slate-300 group-hover:text-[#D97706] transition-colors'}`} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!isCollapsed && displayBadge && (
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] shrink-0 font-bold ${displayBadgeColor}`}>
                          {displayBadge}
                        </span>
                      )}

                      {/* Active left bar accent */}
                      {isActive && !isCollapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-[#D97706]" style={{ backgroundColor: settings.brandingColor }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        </div>

        {/* Elegant Lotus Watermark */}
        {!isCollapsed && (
          <div className="absolute bottom-16 left-0 right-0 p-4 pointer-events-none opacity-[0.09] flex justify-center">
            <svg viewBox="0 0 120 120" className="w-24 h-24 text-[#D97706]" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M60,110 C60,110 20,80 20,50 C20,25 45,30 60,10 C75,30 100,25 100,50 C100,80 60,110 60,110 Z" />
              <path d="M60,110 C60,110 35,80 35,55 C35,35 52.5,38 60,20 C67.5,38 85,35 85,55 C85,80 60,110 60,110 Z" />
              <path d="M60,110 C60,110 48,90 48,65 C48,50 56,52 60,40 C64,50 72,50 72,65 C72,90 60,110 60,110 Z" />
              <circle cx="60" cy="50" r="2" fill="currentColor" />
            </svg>
          </div>
        )}

        {/* Footer Store Info */}
        <div className="p-4 border-t border-[#E8E2D9] dark:border-slate-800 bg-[#FFFFFF] dark:bg-slate-900">
          {isCollapsed ? (
            <button
              onClick={toggleSidebar}
              className="w-full py-1 flex justify-center text-[#786C65] hover:text-[#1F1916] dark:hover:text-slate-200 transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-3 px-1.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-[#E8E2D9] dark:border-slate-700 bg-amber-50 flex items-center justify-center shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150&auto=format&fit=crop&q=80"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-[#1F1916] dark:text-white truncate">{user?.name || 'Radha Govinda Das'}</p>
                <p className="text-[10px] text-[#786C65] dark:text-slate-400 truncate">{user?.role || 'Store Manager'}</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
