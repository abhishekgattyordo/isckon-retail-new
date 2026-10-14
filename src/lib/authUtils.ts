import { UserProfile, ModuleType, Branch } from '../types';

export const GLOBAL_ALL_BRANCHES: Branch = {
  id: 'all-branches',
  code: 'GLOBAL',
  name: 'All Branches (Combined Global View)',
  location: 'Pan-India Operations',
  city: 'All Branches',
  state: 'Consolidated View',
  isMain: true,
  isActive: true,
};

export const ALL_SYSTEM_MODULES: { id: ModuleType | 'audit'; label: string; description: string; category: string }[] = [
  { id: 'dashboard', label: 'Executive Dashboard', description: 'Real-time sales, insights, performance graphs and critical low-stock alerts.', category: 'Overview' },
  { id: 'pos', label: 'POS Checkout Stalls', description: 'Register sales transactions, scan barcodes, select sales tags, apply discounts, and print customer receipts.', category: 'Core Operations' },
  { id: 'inward', label: 'Material Inward GRN', description: 'Log incoming material shipments, verify supplier parameters, and record custom batch parameters.', category: 'Core Operations' },
  { id: 'suppliers', label: 'Suppliers & Vendors', description: 'Manage vendor directory, payment terms, and supplier ledger history.', category: 'Core Operations' },
  { id: 'products', label: 'Product Catalog & Master Items', description: 'Browse and manage products, book catalog, categories, pricing, and master item specs.', category: 'Inventory & Catalog' },
  { id: 'inventory', label: 'Stock & Inventory', description: 'Monitor warehouse zones, track granular batch ages, execute stock transfers, and log shrinkage adjustments.', category: 'Inventory & Catalog' },
  { id: 'barcode', label: 'Barcode & Labels', description: 'Design custom print labels, generate standard EAN barcodes, and trigger queue prints.', category: 'Inventory & Catalog' },
  { id: 'events', label: 'Sales Events & Stalls', description: 'Manage transient temple festival stalls, distribute offline stocks, and consolidate stall summaries.', category: 'Promotions & Events' },
  { id: 'reports', label: 'Reports & Analytics', description: 'Review comprehensive profit margins, track sales trends, and download tax compliance invoices.', category: 'Reports' },
  { id: 'audit', label: 'Audit Trail & Compliance Logs', description: 'Trace tamper-evident activity history, login logs, stock adjustments, and administrative overrides.', category: 'Security' },
  { id: 'settings', label: 'Settings & Staff Config', description: 'Update temple identity details, configure dynamic branding palettes, and manage user accounts and RBAC.', category: 'Administration' },
  { id: 'recycle_bin', label: 'Recycle Bin & Recovery', description: 'Safely recover or permanently purge soft-deleted products, items, and records.', category: 'Administration' }
];

export function isSuperAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase().trim();
  return role === 'super admin' || role === 'administrator' || role === 'system admin';
}

export function isBranchAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase().trim();
  return isSuperAdmin(user) || role === 'branch admin' || role === 'store manager';
}

export function isStoreExecutive(user?: UserProfile | null): boolean {
  if (!user) return false;
  const role = (user.role || '').toLowerCase().trim();
  return role === 'store executive' || role === 'staff' || role === 'lead cashier' || role === 'cashier';
}

export function getDefaultPermissionsForRole(role: UserProfile['role']): (ModuleType | 'audit')[] {
  switch (role) {
    case 'Super Admin':
    case 'Administrator':
    case 'System Admin':
      return ['dashboard', 'products', 'pos', 'inward', 'suppliers', 'inventory', 'barcode', 'events', 'reports', 'settings', 'audit', 'recycle_bin'];
    case 'Branch Admin':
    case 'Store Manager':
      return ['dashboard', 'products', 'pos', 'inward', 'suppliers', 'inventory', 'barcode', 'events', 'reports', 'settings', 'audit', 'recycle_bin'];
    case 'Warehouse Manager':
      return ['dashboard', 'products', 'inward', 'suppliers', 'inventory', 'barcode', 'reports'];
    case 'Store Executive':
      return ['dashboard', 'pos', 'products', 'suppliers', 'events'];
    case 'Lead Cashier':
    case 'Cashier':
      return ['dashboard', 'pos', 'products', 'suppliers'];
    default:
      return ['dashboard', 'pos', 'products', 'suppliers'];
  }
}

export function canAccessModule(user: UserProfile | null | undefined, module: ModuleType | 'audit'): boolean {
  if (!user) return false;
  if (!user.isActive) return false;

  // Super Admin has full global access to all modules
  if (isSuperAdmin(user)) {
    return true;
  }

  // Check explicit assigned permissions array
  if (user.permissions && Array.isArray(user.permissions)) {
    if (module === ('users' as any)) {
      return (
        isSuperAdmin(user) ||
        user.permissions.includes('settings') ||
        (user.permissions as any[]).includes('users')
      );
    }
    if (module === 'audit') {
      return (
        (user.permissions as any[]).includes('audit') ||
        user.permissions.includes('settings') ||
        user.permissions.includes('reports')
      );
    }
    if (module === ('suppliers' as any) || module === 'suppliers') {
      return true;
    }
    return user.permissions.includes(module as ModuleType);
  }

  // Fallback to role defaults
  const defaults = getDefaultPermissionsForRole(user.role);
  if (module === ('users' as any)) {
    return isSuperAdmin(user) || defaults.includes('settings');
  }
  return defaults.includes(module);
}

export function getModuleLabel(mod: ModuleType | 'audit'): string {
  const found = ALL_SYSTEM_MODULES.find(m => m.id === mod);
  if (found) return found.label;
  switch (mod) {
    case 'dashboard': return 'Executive Dashboard';
    case 'pos': return 'POS Checkout Stalls';
    case 'inward': return 'Material Inward (GRN)';
    case 'suppliers': return 'Suppliers & Vendors';
    case 'products': return 'Product Catalog';
    case 'inventory': return 'Stock & Inventory';
    case 'barcode': return 'Barcodes & Labels';
    case 'events': return 'Sales Events & Stalls';
    case 'reports': return 'Reports & Analytics';
    case 'audit': return 'Audit Trail & Logs';
    case 'settings': return 'Settings & Staff Config';
    case 'users': return 'Staff & Roles (RBAC)';
    case 'recycle_bin': return 'Recycle Bin';
    default: return String(mod);
  }
}
