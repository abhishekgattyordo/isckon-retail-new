'use client';

import React from 'react';
import { ModuleType } from '@/types';
import { useERP } from '@/context/ERPContext';
import { canAccessModule, getModuleLabel, getDefaultPermissionsForRole } from '@/lib/authUtils';
import { ShieldAlert, ArrowLeft, Lock, UserCheck } from 'lucide-react';

// Import all main module components statically to avoid dynamic chunk loading failures
import { ExecutiveDashboard } from '@/components/dashboard/ExecutiveDashboard';
import { POSTerminal } from '@/components/pos/POSTerminal';
import { MaterialInwardWizard } from '@/components/inward/MaterialInwardWizard';
import { ProductManagement } from '@/components/products/ProductManagement';
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { BarcodeManager } from '@/components/barcode/BarcodeManager';
import { SalesPromotions } from '@/components/events/SalesPromotions';
import { BIAnalytics } from '@/components/reports/BIAnalytics';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { AuditLogPage } from '@/components/reports/AuditLogPage';
import { RecycleBinPage } from '@/components/recycle/RecycleBinPage';

export default function CatchAllPageClient({ initialModule }: { initialModule?: ModuleType | 'audit' } = {}) {
  const { activeModule, setActiveModule, user, currentBranch } = useERP();

  React.useEffect(() => {
    if (initialModule && activeModule !== initialModule) {
      setActiveModule(initialModule);
    }
  }, [initialModule, setActiveModule, activeModule]);

  const currentMod = initialModule || activeModule;

  // Route Guard / Middleware enforcement
  const isAllowed = canAccessModule(user, currentMod);

  if (!isAllowed) {
    // Determine the user's first allowed module to safely redirect
    const userPerms = user?.permissions && user.permissions.length > 0
      ? user.permissions
      : getDefaultPermissionsForRole(user?.role || 'Store Executive');
    const firstAllowed = userPerms[0] || 'dashboard';

    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 rounded-3xl p-8 shadow-xl space-y-5">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300">
              RBAC Route Guard • Access Restricted
            </span>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Unauthorized Module Access
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your profile <strong className="text-slate-900 dark:text-white">{user?.name || 'Staff User'}</strong> (<span className="text-amber-700 dark:text-amber-400 font-semibold">{user?.role}</span>) does not have permission to access the <strong className="text-red-600 dark:text-red-400 font-bold">{getModuleLabel(activeModule)}</strong> module.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 text-left text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" /> Active Branch:
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{currentBranch?.name || 'Assigned Branch'}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-slate-400" /> Access Policy:
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-400">Strict Branch & Role Scoped</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setActiveModule(firstAllowed)}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to {getModuleLabel(firstAllowed)}</span>
            </button>
            <p className="text-[10px] text-slate-400">
              Need access? Contact your Super Admin to update your module permissions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  switch (currentMod) {
    case 'pos':
      return <POSTerminal />;
    case 'inward':
      return <MaterialInwardWizard />;
    case 'products':
      return <ProductManagement />;
    case 'inventory':
      return <InventoryDashboard />;
    case 'barcode':
      return <BarcodeManager />;
    case 'events':
      return <SalesPromotions />;
    case 'reports':
      return <BIAnalytics />;
    case 'users':
      return <SettingsPage initialTab="users" />;
    case 'settings':
      return <SettingsPage />;
    case 'audit':
      return <AuditLogPage />;
    case 'recycle_bin':
      return <RecycleBinPage />;
    case 'dashboard':
    default:
      return <ExecutiveDashboard />;
  }
}
