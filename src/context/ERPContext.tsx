'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ModuleType,
  Branch,
  Product,
  MaterialInwardNote,
  WarehouseZone,
  POSOrder,
  SalesEvent,
  StockMovement,
  NotificationItem,
  UserProfile,
  BarcodeRecord,
  CartItem,
  SalesTag,
  InventoryBatch,
  SystemSettings,
  AuditLog,
  RecycleBinItem,
  RecycleItemType
} from '../types';
import {
  INITIAL_BRANCHES,
  INITIAL_PRODUCTS,
  INITIAL_INWARD_NOTES,
  INITIAL_ZONES,
  INITIAL_ORDERS,
  INITIAL_EVENTS,
  INITIAL_MOVEMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_USER,
  INITIAL_USERS,
  INITIAL_BARCODES,
  INITIAL_BATCHES,
  INITIAL_AUDIT_LOGS,
  INITIAL_SALES_TAGS
} from '../data/initialData';
import { GLOBAL_ALL_BRANCHES, isSuperAdmin, isBranchAdmin, getDefaultPermissionsForRole } from '../lib/authUtils';
import { isProductInZone } from '../lib/warehouseUtils';

interface ERPContextType {
  activeModule: ModuleType | 'audit';
  setActiveModule: (mod: ModuleType | 'audit', updateUrl?: boolean) => void;
  branches: Branch[];
  currentBranch: Branch;
  setCurrentBranch: (branch: Branch) => void;
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<Branch>;
  updateBranch: (id: string, updates: Partial<Branch>) => Promise<Branch | null>;
  deleteBranch: (id: string) => Promise<boolean>;
  userAccessibleBranches: (targetUser?: UserProfile) => Branch[];
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  inwardNotes: MaterialInwardNote[];
  addInwardNote: (note: Omit<MaterialInwardNote, 'id'>) => void;
  batches: InventoryBatch[];
  setBatches: React.Dispatch<React.SetStateAction<InventoryBatch[]>>;
  zones: WarehouseZone[];
  addZone: (zone: Omit<WarehouseZone, 'id' | 'currentOccupancy' | 'activeSKUs'> & { id?: string }) => void;
  updateZone: (id: string, updates: Partial<WarehouseZone>) => void;
  deleteZone: (id: string) => void;
  orders: POSOrder[];
  addOrder: (order: Omit<POSOrder, 'id'>) => void;
  transferStock: (sku: string, fromZone: string, toZone: string, qty: number, batchNo: string, refNo: string) => void;
  adjustStock: (sku: string, zone: string, qtyDelta: number, batchNo: string, reason: string, refNo: string) => void;
  events: SalesEvent[];
  addEvent: (event: Omit<SalesEvent, 'id' | 'currentRevenue' | 'booksSoldQty' | 'booksSoldRevenue' | 'giftsSoldQty' | 'giftsSoldRevenue'>) => void | Promise<void>;
  updateEvent: (id: string, updates: Partial<SalesEvent>) => void | Promise<void>;
  deleteEvent: (id: string) => void | Promise<void>;
  setEvents: React.Dispatch<React.SetStateAction<SalesEvent[]>>;
  movements: StockMovement[];
  notifications: NotificationItem[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  barcodes: BarcodeRecord[];
  addBarcodeRecord: (record: Omit<BarcodeRecord, 'id'>) => void;
  salesTags: SalesTag[];
  addSalesTag: (tag: Omit<SalesTag, 'id'>) => void;
  updateSalesTag: (tag: SalesTag) => void;
  deleteSalesTag: (id: string) => void;
  user: UserProfile;
  users: UserProfile[];
  addUser: (newUser: Omit<UserProfile, 'id'>) => void;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartDiscount: (productId: string, discount: number) => void;
  clearCart: () => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  quickNotification: (title: string, message: string, type?: 'alert' | 'success' | 'warning' | 'info') => void;
  isAuthenticated: boolean;
  login: (email: string, pass: string, branchId?: string, overrideUser?: UserProfile) => boolean;
  logout: () => void;
  refreshUsers: (userList?: UserProfile[]) => Promise<UserProfile[]>;
  resetUserPassword: (email: string, newPass: string) => Promise<boolean>;
  settings: SystemSettings;
  updateSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  auditLogs: AuditLog[];
  logActivity: (action: string, module: string, referenceNo?: string, details?: string) => Promise<void>;
  recycleBinItems: RecycleBinItem[];
  fetchRecycleBin: () => Promise<void>;
  restoreItem: (type: RecycleItemType, id: string) => Promise<boolean>;
  permanentDeleteItem: (type: RecycleItemType, id: string) => Promise<boolean>;
  emptyRecycleBin: (type?: RecycleItemType) => Promise<boolean>;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModuleState] = useState<ModuleType | 'audit'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.replace(/^\//, '');
      const validModules: (ModuleType | 'audit')[] = ['dashboard', 'products', 'inward', 'inventory', 'pos', 'barcode', 'events', 'reports', 'settings', 'audit', 'recycle_bin'];
      if (validModules.includes(path as ModuleType | 'audit')) {
        return path as ModuleType | 'audit';
      }
    }
    return 'dashboard';
  });

  // Route-based URL history navigation sync
  const setActiveModule = (mod: ModuleType | 'audit', updateUrl: boolean = true) => {
    setActiveModuleState(mod);
    setMobileMenuOpen(false);
    if (updateUrl && typeof window !== 'undefined') {
      const targetPath = mod === 'dashboard' ? '/' : `/${mod}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ module: mod }, '', targetPath);
      }
    }
  };

  // Listen to browser Back/Forward navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname.replace(/^\//, '');
      const validModules: (ModuleType | 'audit')[] = ['dashboard', 'products', 'inward', 'inventory', 'pos', 'barcode', 'events', 'reports', 'settings', 'audit', 'recycle_bin'];
      if (validModules.includes(path as ModuleType | 'audit')) {
        setActiveModuleState(path as ModuleType | 'audit');
      } else {
        setActiveModuleState('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [settings, setSettings] = useState<SystemSettings>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iskcon_erp_settings');
      if (stored) {
        try { return JSON.parse(stored); } catch (e) { }
      }
    }
    return {
      orgName: 'ISKCON Foundation',
      appTitle: 'ISKCON Retail ERP',
      brandingColor: '#D97706',
      currencySymbol: '₹',
      taxId: '27AAAAA1111A1Z1',
      address: 'Hare Krishna Land, Juhu, Mumbai, 400049',
      phone: '+91 22 2620 6860',
      email: 'contact@iskconmumbai.com',
      logoUrl: '',
    };
  });

  useEffect(() => {
    let active = true;
    const fetchSettings = async (retries = 3, delay = 1500) => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (active && data.success && data.settings) {
          setSettings(data.settings);
          if (typeof window !== 'undefined') {
            localStorage.setItem('iskcon_erp_settings', JSON.stringify(data.settings));
          }
        }
      } catch (err) {
        if (active) {
          console.warn(`Error fetching settings (${retries} retries left):`, err);
          if (retries > 0) {
            setTimeout(() => {
              if (active) fetchSettings(retries - 1, delay * 1.5);
            }, delay);
          } else {
            console.error('Final error fetching settings:', err);
          }
        }
      }
    };
    fetchSettings();
    return () => {
      active = false;
    };
  }, []);

  const updateSettings = async (updates: Partial<SystemSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem('iskcon_erp_settings', JSON.stringify(newSettings));
    }
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        if (typeof window !== 'undefined') {
          localStorage.setItem('iskcon_erp_settings', JSON.stringify(data.settings));
        }
      }
    } catch (err) {
      console.error('Error updating settings:', err);
    }
    quickNotification('Branding Updated', 'Organization configuration has been updated and synchronized.', 'success');
  };

  const [isDbMode, setIsDbMode] = useState(false);

  // Branch management states
  const [branches, setBranches] = useState<Branch[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iskcon_erp_branches');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
    }
    return INITIAL_BRANCHES;
  });

  const [currentBranch, setCurrentBranchState] = useState<Branch>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iskcon_erp_current_branch');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.id) return parsed;
        } catch (e) {}
      }
    }
    return INITIAL_BRANCHES[0];
  });

  const setCurrentBranch = (branch: Branch) => {
    if (user && !isSuperAdmin(user)) {
      const allowed = userAccessibleBranches(user);
      const isAllowed = allowed.some(b => b.id === branch.id || (b.code && b.code === branch.code));
      if (!isAllowed) {
        quickNotification('Access Denied', `You do not have permission to switch to "${branch.name}". Your access is restricted to your assigned operating branch.`, 'alert');
        return;
      }
    }
    setCurrentBranchState(branch);
    if (typeof window !== 'undefined') {
      localStorage.setItem('iskcon_erp_current_branch', JSON.stringify(branch));
    }
    quickNotification('Branch Switched', `Active workspace switched to "${branch.name}" (${branch.code}).`, 'info');
  };

  const [allProducts, setAllProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [allInwardNotes, setAllInwardNotes] = useState<MaterialInwardNote[]>(INITIAL_INWARD_NOTES);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [allZones, setAllZones] = useState<WarehouseZone[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iskcon_erp_zones');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.error(e);
        }
      }
    }
    return INITIAL_ZONES;
  });
  const [allOrders, setAllOrders] = useState<POSOrder[]>(INITIAL_ORDERS);
  const [allEvents, setAllEvents] = useState<SalesEvent[]>(INITIAL_EVENTS);
  const [allMovements, setAllMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Strict & Robust Branch Matcher
  const isItemInActiveBranch = React.useCallback((item: any, branch: Branch): boolean => {
    if (!item || !branch) return false;
    // Super Admin combined global data view override
    if (branch.id === 'all-branches' || branch.id === 'all' || branch.code === 'GLOBAL') {
      return true;
    }
    if (item.branchId === branch.id || item.branchId === branch.code) return true;

    const sku = (item.sku || '').toUpperCase();
    const bName = (item.branchName || '').toLowerCase();
    const zone = (item.warehouseZone || item.warehouse || '').toLowerCase();

    if (branch.id === 'branch-bangalore' || branch.code === 'BLR-SK-05') {
      return sku.startsWith('BLR-') || bName.includes('bangalore') || zone.includes('bangalore');
    }
    if (branch.id === 'branch-mangalore' || branch.code === 'IXE-JM-06') {
      return sku.startsWith('MGL-') || bName.includes('mangalore') || zone.includes('mangalore');
    }
    if (branch.id === 'branch-vrindavan-store' || branch.code === 'VRN-KB-02') {
      return sku.startsWith('VRN-') || bName.includes('vrindavan') || zone.includes('vrindavan');
    }
    if (branch.id === 'branch-mumbai-juhu' || branch.code === 'BOM-JH-03') {
      return sku.startsWith('BOM-') || bName.includes('mumbai') || zone.includes('mumbai') || zone.includes('juhu');
    }
    if (branch.id === 'branch-delhi-glory' || branch.code === 'DEL-GI-04') {
      return sku.startsWith('DEL-') || bName.includes('delhi') || zone.includes('delhi');
    }
    if (branch.id === 'branch-mayapur-hq' || branch.isMain) {
      if (item.branchId && item.branchId !== 'branch-mayapur-hq' && item.branchId !== branch.code) return false;
      if (sku.startsWith('BLR-') || sku.startsWith('MGL-') || sku.startsWith('VRN-') || sku.startsWith('BOM-') || sku.startsWith('DEL-')) return false;
      return true;
    }
    return false;
  }, []);

  // Filtered collections strictly scoped to the active currentBranch
  const products = React.useMemo(() => {
    return allProducts.filter(p => isItemInActiveBranch(p, currentBranch));
  }, [allProducts, currentBranch, isItemInActiveBranch]);

  const inwardNotes = React.useMemo(() => {
    return allInwardNotes.filter(n => isItemInActiveBranch(n, currentBranch));
  }, [allInwardNotes, currentBranch, isItemInActiveBranch]);

  const orders = React.useMemo(() => {
    return allOrders.filter(o => isItemInActiveBranch(o, currentBranch));
  }, [allOrders, currentBranch, isItemInActiveBranch]);

  const events = React.useMemo(() => {
    return allEvents.filter(e => isItemInActiveBranch(e, currentBranch));
  }, [allEvents, currentBranch, isItemInActiveBranch]);

  const zones = React.useMemo(() => {
    return allZones.filter(z => isItemInActiveBranch(z, currentBranch));
  }, [allZones, currentBranch, isItemInActiveBranch]);

  const movements = React.useMemo(() => {
    return allMovements.filter(m => isItemInActiveBranch(m, currentBranch));
  }, [allMovements, currentBranch, isItemInActiveBranch]);

  // Backward compatibility setters that operate on master collections
  const setProducts = (action: React.SetStateAction<Product[]>) => {
    if (typeof action === 'function') {
      setAllProducts(prevAll => {
        const branchSubset = prevAll.filter(p => isItemInActiveBranch(p, currentBranch));
        const nonBranchSubset = prevAll.filter(p => !isItemInActiveBranch(p, currentBranch));
        const updatedBranchSubset = action(branchSubset);
        return [...updatedBranchSubset, ...nonBranchSubset];
      });
    } else {
      setAllProducts(prevAll => {
        const nonBranchSubset = prevAll.filter(p => !isItemInActiveBranch(p, currentBranch));
        return [...action, ...nonBranchSubset];
      });
    }
  };

  const setInwardNotes = (action: React.SetStateAction<MaterialInwardNote[]>) => {
    if (typeof action === 'function') {
      setAllInwardNotes(prevAll => {
        const branchSubset = prevAll.filter(n => isItemInActiveBranch(n, currentBranch));
        const nonBranchSubset = prevAll.filter(n => !isItemInActiveBranch(n, currentBranch));
        const updated = action(branchSubset);
        return [...updated, ...nonBranchSubset];
      });
    } else {
      setAllInwardNotes(prevAll => {
        const nonBranchSubset = prevAll.filter(n => !isItemInActiveBranch(n, currentBranch));
        return [...action, ...nonBranchSubset];
      });
    }
  };

  const setOrders = (action: React.SetStateAction<POSOrder[]>) => {
    if (typeof action === 'function') {
      setAllOrders(prevAll => {
        const branchSubset = prevAll.filter(o => isItemInActiveBranch(o, currentBranch));
        const nonBranchSubset = prevAll.filter(o => !isItemInActiveBranch(o, currentBranch));
        const updated = action(branchSubset);
        return [...updated, ...nonBranchSubset];
      });
    } else {
      setAllOrders(prevAll => {
        const nonBranchSubset = prevAll.filter(o => !isItemInActiveBranch(o, currentBranch));
        return [...action, ...nonBranchSubset];
      });
    }
  };

  const setEvents = (action: React.SetStateAction<SalesEvent[]>) => {
    if (typeof action === 'function') {
      setAllEvents(prevAll => {
        const branchSubset = prevAll.filter(e => isItemInActiveBranch(e, currentBranch));
        const nonBranchSubset = prevAll.filter(e => !isItemInActiveBranch(e, currentBranch));
        const updated = action(branchSubset);
        return [...updated, ...nonBranchSubset];
      });
    } else {
      setAllEvents(prevAll => {
        const nonBranchSubset = prevAll.filter(e => !isItemInActiveBranch(e, currentBranch));
        return [...action, ...nonBranchSubset];
      });
    }
  };

  const setZones = (action: React.SetStateAction<WarehouseZone[]>) => {
    if (typeof action === 'function') {
      setAllZones(prevAll => {
        const branchSubset = prevAll.filter(z => isItemInActiveBranch(z, currentBranch));
        const nonBranchSubset = prevAll.filter(z => !isItemInActiveBranch(z, currentBranch));
        const updated = action(branchSubset);
        return [...updated, ...nonBranchSubset];
      });
    } else {
      setAllZones(prevAll => {
        const nonBranchSubset = prevAll.filter(z => !isItemInActiveBranch(z, currentBranch));
        return [...action, ...nonBranchSubset];
      });
    }
  };

  const setMovements = (action: React.SetStateAction<StockMovement[]>) => {
    if (typeof action === 'function') {
      setAllMovements(prevAll => {
        const branchSubset = prevAll.filter(m => isItemInActiveBranch(m, currentBranch));
        const nonBranchSubset = prevAll.filter(m => !isItemInActiveBranch(m, currentBranch));
        const updated = action(branchSubset);
        return [...updated, ...nonBranchSubset];
      });
    } else {
      setAllMovements(prevAll => {
        const nonBranchSubset = prevAll.filter(m => !isItemInActiveBranch(m, currentBranch));
        return [...action, ...nonBranchSubset];
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && branches.length > 0) {
      localStorage.setItem('iskcon_erp_branches', JSON.stringify(branches));
    }
  }, [branches]);

  useEffect(() => {
    if (typeof window !== 'undefined' && allZones.length > 0) {
      localStorage.setItem('iskcon_erp_zones', JSON.stringify(allZones));
    }
  }, [allZones]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isDbMode && allProducts.length > 0) {
      localStorage.setItem('iskcon_erp_products', JSON.stringify(allProducts));
    }
  }, [allProducts, isDbMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isDbMode && allInwardNotes.length > 0) {
      localStorage.setItem('iskcon_erp_inward_notes', JSON.stringify(allInwardNotes));
    }
  }, [allInwardNotes, isDbMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isDbMode && allOrders.length > 0) {
      localStorage.setItem('iskcon_erp_orders', JSON.stringify(allOrders));
    }
  }, [allOrders, isDbMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isDbMode && allEvents.length > 0) {
      localStorage.setItem('iskcon_erp_events', JSON.stringify(allEvents));
    }
  }, [allEvents, isDbMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isDbMode && allMovements.length > 0) {
      localStorage.setItem('iskcon_erp_movements', JSON.stringify(allMovements));
    }
  }, [allMovements, isDbMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isDbMode && auditLogs.length > 0) {
      localStorage.setItem('iskcon_erp_audit_logs', JSON.stringify(auditLogs));
    }
  }, [auditLogs, isDbMode]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !isDbMode && batches.length > 0) {
      localStorage.setItem('iskcon_erp_batches', JSON.stringify(batches));
    }
  }, [batches, isDbMode]);

  const [recycleBinItems, setRecycleBinItems] = useState<RecycleBinItem[]>([]);

  const fetchRecycleBin = async () => {
    try {
      const res = await fetch('/api/recycle-bin').then(r => r.json());
      if (res.success && Array.isArray(res.items)) {
        setRecycleBinItems(res.items);
      }
    } catch (err) {
      console.warn('Failed to fetch recycle bin:', err);
    }
  };

  // Intelligent Branch Resolver with phonetic & fuzzy matching for typo tolerance (e.g. 'banglore', 'manglore', 'blr', 'mgl')
  const resolveBranchForUser = (u: Partial<UserProfile> | undefined, branchList: Branch[]): Branch => {
    const list = branchList && branchList.length > 0 ? branchList : INITIAL_BRANCHES;
    if (!u) return list[0];

    // 0. Super Admin global consolidated view
    if (isSuperAdmin(u as UserProfile) && (u.branchId === 'all-branches' || u.branch?.toLowerCase().includes('all') || u.branch?.toLowerCase().includes('global'))) {
      return GLOBAL_ALL_BRANCHES;
    }

    // 1. Match direct branchId
    if (u.branchId && u.branchId !== 'all-branches') {
      const found = list.find(b => b.id === u.branchId);
      if (found) return found;
    }

    // 2. Match branch name / city / code / phonetic variants
    if (u.branch) {
      const raw = u.branch.toLowerCase().trim();
      const clean = raw.replace(/[^a-z0-9]/g, '');

      if ((raw.includes('all branch') || raw.includes('global')) && isSuperAdmin(u as UserProfile)) {
        return GLOBAL_ALL_BRANCHES;
      }

      const isBlr = clean.includes('bang') || clean.includes('blr') || clean.includes('bengaluru');
      const isMgl = clean.includes('mang') || clean.includes('ixe') || clean.includes('mgl') || clean.includes('mangaluru');
      const isMayapur = clean.includes('mayapur') || clean.includes('hq') || clean.includes('nadia');
      const isVrn = clean.includes('vrin') || clean.includes('vrn') || clean.includes('mathura') || clean.includes('reti');
      const isMumbai = clean.includes('mumbai') || clean.includes('juhu') || clean.includes('bom') || clean.includes('bombay');
      const isDelhi = clean.includes('delhi') || clean.includes('del') || clean.includes('kailash');

      const found = list.find(b => {
        const bClean = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cClean = b.city.toLowerCase().replace(/[^a-z0-9]/g, '');
        const codeClean = b.code.toLowerCase().replace(/[^a-z0-9]/g, '');
        const idClean = b.id.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (isBlr && (idClean.includes('bangalore') || cClean.includes('bangalore') || codeClean.includes('blr'))) return true;
        if (isMgl && (idClean.includes('mangalore') || cClean.includes('mangalore') || codeClean.includes('ixe') || codeClean.includes('mgl'))) return true;
        if (isMayapur && (idClean.includes('mayapur') || cClean.includes('mayapur') || codeClean.includes('may'))) return true;
        if (isVrn && (idClean.includes('vrindavan') || cClean.includes('vrindavan') || codeClean.includes('vrn'))) return true;
        if (isMumbai && (idClean.includes('mumbai') || idClean.includes('juhu') || cClean.includes('mumbai') || codeClean.includes('bom'))) return true;
        if (isDelhi && (idClean.includes('delhi') || cClean.includes('delhi') || codeClean.includes('del'))) return true;

        return bClean.includes(clean) || clean.includes(bClean) || cClean.includes(clean) || clean.includes(cClean);
      });

      if (found) return found;

      // 3. Fallback: synthesize a dedicated branch so it never collides with Mayapur HQ
      return {
        id: `branch-${clean || 'store'}`,
        code: (u.branch.slice(0, 3) || 'LOC').toUpperCase() + '-01',
        name: u.branch.charAt(0).toUpperCase() + u.branch.slice(1) + ' Store',
        location: `${u.branch} Temple Center`,
        city: u.branch.charAt(0).toUpperCase() + u.branch.slice(1),
        state: 'Karnataka',
        isActive: true,
        status: 'active'
      };
    }

    return list[0];
  };

  // Branch CRUD & Access Helpers
  const userAccessibleBranches = (targetUser?: UserProfile): Branch[] => {
    const u = targetUser || user;
    if (!u) return branches;
    if (isSuperAdmin(u)) {
      return [GLOBAL_ALL_BRANCHES, ...branches];
    }
    if (u.accessibleBranchIds && u.accessibleBranchIds.length > 0 && !u.accessibleBranchIds.includes('*')) {
      const filtered = branches.filter(b => u.accessibleBranchIds?.includes(b.id));
      if (filtered.length > 0) return filtered;
    }
    const resolved = resolveBranchForUser(u, branches);
    return [resolved];
  };

  const addBranch = async (branchData: Omit<Branch, 'id'>): Promise<Branch> => {
    const newBranch: Branch = {
      ...branchData,
      id: `branch-${branchData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString(36)}`,
      isActive: branchData.isActive !== false
    };

    setBranches(prev => {
      const updated = [...prev, newBranch];
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_branches', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBranch)
      });
    } catch (e) {
      console.warn('Failed to save branch to server:', e);
    }

    quickNotification('Branch Created', `Branch "${newBranch.name}" (${newBranch.code}) registered successfully.`, 'success');
    return newBranch;
  };

  const updateBranch = async (id: string, updates: Partial<Branch>): Promise<Branch | null> => {
    let updatedBranch: Branch | null = null;
    setBranches(prev => {
      const updated = prev.map(b => {
        if (b.id === id) {
          updatedBranch = { ...b, ...updates };
          return updatedBranch;
        }
        return b;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_branches', JSON.stringify(updated));
      }
      return updated;
    });

    if (currentBranch.id === id && updatedBranch) {
      setCurrentBranchState(updatedBranch);
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_current_branch', JSON.stringify(updatedBranch));
      }
    }

    try {
      await fetch('/api/branches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
    } catch (e) {
      console.warn('Failed to update branch on server:', e);
    }

    quickNotification('Branch Updated', 'Branch configuration updated.', 'success');
    return updatedBranch;
  };

  const deleteBranch = async (id: string): Promise<boolean> => {
    if (branches.length <= 1) {
      quickNotification('Action Blocked', 'Cannot delete the only branch in the system.', 'alert');
      return false;
    }

    setBranches(prev => {
      const updated = prev.filter(b => b.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_branches', JSON.stringify(updated));
      }
      return updated;
    });

    if (currentBranch.id === id) {
      const remaining = branches.filter(b => b.id !== id);
      if (remaining.length > 0) {
        setCurrentBranch(remaining[0]);
      }
    }

    try {
      await fetch(`/api/branches?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.warn('Failed to delete branch on server:', e);
    }

    quickNotification('Branch Removed', 'The branch was deleted.', 'warning');
    return true;
  };

  useEffect(() => {
    // Fast initial load of users and branches for immediate login readiness
    fetch('/api/users')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
          if (typeof window !== 'undefined') {
            localStorage.setItem('iskcon_erp_users', JSON.stringify(data.users));
          }
          setUser(currentUser => {
            if (!currentUser || !currentUser.email) return currentUser;
            const fresh = data.users.find((u: UserProfile) => u.id === currentUser.id || u.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
            if (fresh) {
              const perms = Array.isArray(fresh.permissions) && fresh.permissions.length > 0
                ? fresh.permissions
                : getDefaultPermissionsForRole(fresh.role);
              const merged = { ...currentUser, ...fresh, permissions: perms };
              if (typeof window !== 'undefined') {
                localStorage.setItem('iskcon_erp_user', JSON.stringify(merged));
              }
              return merged;
            }
            return currentUser;
          });
        }
      })
      .catch(() => {});

    fetch('/api/branches')
      .then(r => r.json())
      .then(data => {
        if (data.success && Array.isArray(data.branches) && data.branches.length > 0) {
          setBranches(data.branches);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const bId = currentBranch?.id;
        const branchQuery = bId ? `?branchId=${encodeURIComponent(bId)}` : '';
        const branchHeaders: Record<string, string> = bId ? { 'x-branch-id': bId } : {};
        const isSuper = isSuperAdmin(user);
        const userFetchUrl = isSuper || !bId || bId === 'all-branches' ? '/api/users' : `/api/users${branchQuery}`;

        const [auditRes, productsRes, inwardRes, ordersRes, eventsRes, usersRes, recycleRes, branchesRes] = await Promise.all([
          fetch(`/api/audit${branchQuery}`, { headers: branchHeaders }).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`/api/products${branchQuery}`, { headers: branchHeaders }).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`/api/inward${branchQuery}`, { headers: branchHeaders }).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`/api/orders${branchQuery}`, { headers: branchHeaders }).then(r => r.json()).catch(() => ({ success: false })),
          fetch(`/api/events${branchQuery}`, { headers: branchHeaders }).then(r => r.json()).catch(() => ({ success: false })),
          fetch(userFetchUrl, { headers: branchHeaders }).then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/recycle-bin').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/branches').then(r => r.json()).catch(() => ({ success: false }))
        ]);

        if (usersRes.success && Array.isArray(usersRes.users)) {
          setUsers(usersRes.users);
        }

        if (branchesRes.success && Array.isArray(branchesRes.branches) && branchesRes.branches.length > 0) {
          setBranches(branchesRes.branches);
        }

        if (auditRes.success) {
          if (auditRes.logs && auditRes.logs.length > 0) {
            setAuditLogs(auditRes.logs);
          }
          if (auditRes.movements && auditRes.movements.length > 0) {
            setMovements(auditRes.movements);
          }
        }

        if (productsRes.success && Array.isArray(productsRes.products)) {
          setAllProducts(productsRes.products);
        }

        if (inwardRes.success && Array.isArray(inwardRes.inwardNotes)) {
          setAllInwardNotes(inwardRes.inwardNotes);
        }

        if (ordersRes.success && Array.isArray(ordersRes.orders)) {
          setAllOrders(ordersRes.orders);
        }

        if (eventsRes.success && Array.isArray(eventsRes.events)) {
          setAllEvents(eventsRes.events.map((e: any) => ({
            ...e,
            status: e?.status || 'upcoming',
            currentRevenue: Number(e?.currentRevenue || 0),
            targetRevenue: Number(e?.targetRevenue || 0),
            allocatedSKUs: Number(e?.allocatedSKUs || 0)
          })));
        }

        if (usersRes.success && Array.isArray(usersRes.users) && usersRes.users.length > 0) {
          setUsers(usersRes.users);
          if (typeof window !== 'undefined') {
            localStorage.setItem('iskcon_erp_users', JSON.stringify(usersRes.users));
          }
        }

        if (recycleRes.success && Array.isArray(recycleRes.items)) {
          setRecycleBinItems(recycleRes.items);
        }

        const dbConnected = productsRes.dbConnected || inwardRes.dbConnected || ordersRes.dbConnected || eventsRes.dbConnected;
        setIsDbMode(!!dbConnected);
      } catch (err) {
        console.error('Failed to fetch data records:', err);
      }
    };
    fetchAllData();
  }, [currentBranch?.id]);

  const logActivity = async (action: string, module: string, referenceNo?: string, details?: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: user?.id || 'unauthenticated',
      staffName: user?.name || 'Guest / System',
      role: user?.role || 'Guest',
      branch: user?.branch || 'Main Temple Store — Mayapur HQ',
      action,
      module,
      referenceNo,
      details,
      timestamp: new Date().toISOString()
    };

    setAuditLogs(prev => [newLog, ...prev]);

    try {
      await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLog),
      });
    } catch (e) {
      console.warn('Failed to persist audit log on server:', e);
    }
  };

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [barcodes, setBarcodes] = useState<BarcodeRecord[]>(INITIAL_BARCODES);
  const [salesTags, setSalesTags] = useState<SalesTag[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iskcon_erp_sales_tags');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error("Error loading sales tags from storage:", e);
        }
      }
    }
    return INITIAL_SALES_TAGS;
  });
  const [user, setUser] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iskcon_erp_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.name) {
            const perms = Array.isArray(parsed.permissions) ? [...parsed.permissions] : [];
            if (!perms.includes('products')) {
              perms.push('products');
            }
            return { ...parsed, permissions: perms };
          }
        } catch (e) {}
      }
    }
    return INITIAL_USER;
  });
  const [users, setUsers] = useState<UserProfile[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('iskcon_erp_users');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        } catch (e) {
          console.error("Error loading users from storage:", e);
        }
      }
    }
    return INITIAL_USERS;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('iskcon_erp_users', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    if (typeof window !== 'undefined' && salesTags && salesTags.length > 0) {
      localStorage.setItem('iskcon_erp_sales_tags', JSON.stringify(salesTags));
    }
  }, [salesTags]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('iskcon_erp_auth') === 'true';
      setIsAuthenticated(auth);
      const storedUser = localStorage.getItem('iskcon_erp_user');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser) {
            const perms = Array.isArray(parsedUser.permissions) && parsedUser.permissions.length > 0
              ? parsedUser.permissions
              : getDefaultPermissionsForRole(parsedUser.role);
            const updatedUser = { ...parsedUser, permissions: perms };
            setUser(updatedUser);
            localStorage.setItem('iskcon_erp_user', JSON.stringify(updatedUser));
            
            // Respect already stored active working branch if valid and permitted
            const savedBranchStr = localStorage.getItem('iskcon_erp_current_branch');
            let branchToSet: Branch | null = null;
            if (savedBranchStr) {
              try {
                const parsedBranch = JSON.parse(savedBranchStr);
                if (parsedBranch?.id === 'all-branches' && isSuperAdmin(updatedUser)) {
                  branchToSet = GLOBAL_ALL_BRANCHES;
                } else if (parsedBranch?.id && parsedBranch?.id !== 'all-branches') {
                  const allowed = userAccessibleBranches(updatedUser);
                  const found = allowed.find(b => b.id === parsedBranch?.id);
                  if (found) branchToSet = found;
                }
              } catch (e) {}
            }
            if (!branchToSet) {
              branchToSet = resolveBranchForUser(updatedUser, branches);
            }
            if (branchToSet) {
              setCurrentBranchState(branchToSet);
              localStorage.setItem('iskcon_erp_current_branch', JSON.stringify(branchToSet));
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [branches]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>('light');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle dark mode DOM classes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Handle keyboard shortcut for Cmd/Ctrl+K search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const setTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
  };

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileMenuOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  };

  const quickNotification = (
    title: string,
    message: string,
    type: 'alert' | 'success' | 'warning' | 'info' = 'info'
  ) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title,
      message,
      type,
      timestamp: 'Just now',
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prodData,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      branchId: prodData.branchId || currentBranch?.id || 'branch-mayapur-hq',
      branchName: prodData.branchName || currentBranch?.name || 'Mayapur HQ Central'
    };
    setAllProducts(prev => [newProd, ...prev]);

    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProd)
    }).catch(e => console.warn('Could not save product to database:', e));

    logActivity(
      'Created Product',
      'products',
      newProd.sku,
      `Created product "${newProd.name}" under category "${newProd.category}" at branch "${newProd.branchName}" with cost ₹${newProd.cost} and price ₹${newProd.price}.`
    );
    quickNotification('Product Catalog Updated', `Added SKU ${newProd.sku} (${newProd.name}) to branch ${newProd.branchName}.`, 'success');
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setAllProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...updates, lastUpdated: new Date().toISOString() };
          
          fetch('/api/products', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, updates })
          }).catch(e => console.warn('Could not update product on server:', e));

          logActivity(
            'Updated Product Catalog',
            'products',
            p.sku,
            `Updated properties for product "${p.name}". Fields modified: ${Object.keys(updates).join(', ')}.`
          );
          return updated;
        }
        return p;
      })
    );
  };

  const deleteProduct = async (id: string) => {
    const target = allProducts.find(p => p.id === id);
    setAllProducts(prev => prev.filter(p => p.id !== id));
    if (target) {
      try {
        await fetch(`/api/products?id=${id}&deletedBy=${encodeURIComponent(user.name || 'Store Staff')}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.warn('Could not soft-delete product on server:', e);
      }

      await fetchRecycleBin();

      logActivity(
        'Moved Product to Recycle Bin',
        'products',
        target.sku,
        `Moved product "${target.name}" (SKU: ${target.sku}) to Recycle Bin. Soft-deleted by ${user.name}.`
      );
      quickNotification('Product Moved to Recycle Bin', `SKU ${target.sku} moved to Recycle Bin. You can restore it anytime.`, 'warning');
    }
  };

  const addInwardNote = (noteData: Omit<MaterialInwardNote, 'id'>) => {
    const newNote: MaterialInwardNote = {
      ...noteData,
      id: `min-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      branchId: noteData.branchId || currentBranch?.id || 'branch-mayapur-hq',
      branchName: noteData.branchName || currentBranch?.name || 'Mayapur HQ Central',
      createdBy: user.name,
      createdDateTime: new Date().toISOString(),
      lastUpdatedBy: user.name
    };
    setInwardNotes(prev => [newNote, ...prev]);

    fetch('/api/inward', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNote)
    }).catch(e => console.warn('Could not post inward note:', e));

    // Automatically adjust inventory stock levels based on GRN items
    newNote.items.forEach(item => {
      setProducts(prev =>
        prev.map(p => {
          if (p.sku === item.sku) {
            const newStock = p.stock + item.quantity;
            return {
              ...p,
              stock: newStock,
              cost: item.unitCost > 0 ? item.unitCost : p.cost,
              price: item.sellingPrice && item.sellingPrice > 0 ? item.sellingPrice : p.price,
              batchNo: item.batchNo || p.batchNo,
              status: newStock <= p.minStock ? 'low_stock' : 'in_stock',
              lastUpdated: new Date().toISOString()
            };
          }
          return p;
        })
      );

      // Create a new inventory batch
      const newBatch: InventoryBatch = {
        id: `bat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        sku: item.sku,
        batchNo: item.batchNo || `BAT-${newNote.invoiceDate ? newNote.invoiceDate.slice(0, 4) : new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        receivedDate: newNote.invoiceDate || new Date().toISOString().slice(0, 10),
        edition: item.sku.includes('2022') ? '2022 Edition' : item.sku.includes('2025') ? '2025 Edition' : item.sku.includes('DELUXE') ? 'Deluxe Edition' : 'Standard Edition',
        costPrice: item.unitCost,
        sellingPrice: item.sellingPrice && item.sellingPrice > 0 ? item.sellingPrice : (item.unitCost * 1.5),
        totalQuantity: item.quantity,
        remainingQuantity: item.quantity,
        status: 'in_stock',
        grnNumber: newNote.grnNumber
      };
      setBatches(prev => [newBatch, ...prev]);

      // Add audit movement
      const mov: StockMovement = {
        id: `mov-${Date.now()}-${Math.random()}`,
        type: 'inward_grn',
        sku: item.sku,
        productName: item.name,
        qtyDelta: item.quantity,
        toZone: newNote.warehouse,
        branchId: newNote.branchId,
        branchName: newNote.branchName,
        timestamp: new Date().toISOString(),
        operator: user.name,
        referenceNo: newNote.grnNumber,
        batchNo: item.batchNo || undefined
      };
      setMovements(m => [mov, ...m]);

      // POST Stock movement to server
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mov, isMovement: true, movementType: mov.type, qtyDelta: Number(item.quantity) })
      }).catch(e => console.warn('Could not post stock movement:', e));
    });

    logActivity(
      'Processed Material Inward (GRN)',
      'inward',
      newNote.grnNumber,
      `GRN receipt processed by ${user.name} for vendor "${newNote.vendorName}" at branch "${newNote.branchName}". Total value: ₹${newNote.totalValue}. Items received: ${newNote.items.map(i => `${i.name} (${i.quantity} units, Batch: ${i.batchNo})`).join(', ')}.`
    );

    quickNotification('GRN Created Successfully', `Document ${newNote.grnNumber} processed for branch ${newNote.branchName}.`, 'success');
  };

  const addOrder = (orderData: Omit<POSOrder, 'id'>) => {
    const newOrder: POSOrder = {
      ...orderData,
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      terminal: 'Counter-1',
      branchId: orderData.branchId || currentBranch?.id || 'branch-mayapur-hq',
      branchName: orderData.branchName || currentBranch?.name || 'Mayapur HQ Central'
    };
    setOrders(prev => [newOrder, ...prev]);

    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    }).catch(e => console.warn('Could not post POS order:', e));

    // Deduct stock
    newOrder.items.forEach(cartItem => {
      // FIFO Batch-wise inventory tracking deduction
      setBatches(prevBatches => {
        const skuBatches = prevBatches
          .filter(b => b.sku === cartItem.product.sku && b.remainingQuantity > 0)
          .sort((a, b) => a.receivedDate.localeCompare(b.receivedDate));

        let qtyNeeded = cartItem.quantity;
        const deductions: Record<string, number> = {};

        for (const batch of skuBatches) {
          if (qtyNeeded <= 0) break;
          const toDeduct = Math.min(batch.remainingQuantity, qtyNeeded);
          deductions[batch.id] = batch.remainingQuantity - toDeduct;
          qtyNeeded -= toDeduct;
        }

        return prevBatches.map(b => {
          if (b.id in deductions) {
            const rem = deductions[b.id];
            return {
              ...b,
              remainingQuantity: rem,
              status: rem === 0 ? 'out_of_stock' : rem <= 5 ? 'low_stock' : 'in_stock' as 'in_stock' | 'low_stock' | 'out_of_stock'
            };
          }
          return b;
        });
      });

      setProducts(prev =>
        prev.map(p => {
          if (p.id === cartItem.product.id) {
            const newStock = Math.max(0, p.stock - cartItem.quantity);
            return {
              ...p,
              stock: newStock,
              status: newStock === 0 ? 'out_of_stock' : newStock <= p.minStock ? 'low_stock' : 'in_stock'
            };
          }
          return p;
        })
      );

      // Add movement
      const mov: StockMovement = {
        id: `mov-${Date.now()}-${Math.random()}`,
        type: 'pos_sale',
        sku: cartItem.product.sku,
        productName: cartItem.product.name,
        qtyDelta: -cartItem.quantity,
        fromZone: cartItem.product.warehouseZone,
        branchId: newOrder.branchId,
        branchName: newOrder.branchName,
        timestamp: new Date().toISOString(),
        operator: user.name,
        referenceNo: newOrder.orderNumber,
        batchNo: cartItem.product.batchNo || undefined
      };
      setMovements(m => [mov, ...m]);

      // POST Stock movement to server
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mov, isMovement: true, movementType: mov.type, qtyDelta: -Number(cartItem.quantity) })
      }).catch(e => console.warn('Could not post stock movement:', e));
    });

    logActivity(
      'Completed POS Checkout Sale',
      'pos',
      newOrder.orderNumber,
      `POS Checkout processed by Cashier: ${user.name} at branch "${newOrder.branchName}". Payment Method: ${newOrder.paymentMethod.toUpperCase()}. Sale Total: ₹${newOrder.total.toFixed(2)}. Items sold: ${newOrder.items.map(i => `${i.product.name} (x${i.quantity})`).join(', ')}.`
    );

    quickNotification('POS Order Completed', `Order ${newOrder.orderNumber} (₹${newOrder.total.toFixed(2)}) processed at ${newOrder.branchName}.`, 'success');
  };

  const addEvent = async (eventData: Omit<SalesEvent, 'id' | 'currentRevenue' | 'booksSoldQty' | 'booksSoldRevenue' | 'giftsSoldQty' | 'giftsSoldRevenue'>) => {
    const newEvent: SalesEvent = {
      ...eventData,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      branchId: eventData.branchId || currentBranch?.id || 'branch-mayapur-hq',
      branchName: eventData.branchName || currentBranch?.name || 'Mayapur HQ Central',
      currentRevenue: 0,
      booksSoldQty: 0,
      booksSoldRevenue: 0,
      giftsSoldQty: 0,
      giftsSoldRevenue: 0,
    };
    setEvents(prev => [newEvent, ...prev]);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      const data = await res.json();
      if (data.success && data.event) {
        setEvents(prev => prev.map(e => e.id === newEvent.id ? { ...e, ...data.event } : e));
      }
    } catch (e) {
      console.warn('Could not post sales event:', e);
    }

    quickNotification('Sales Event Created', `Event "${newEvent.name}" is now registered for ${newEvent.branchName}.`, 'success');
  };

  const updateEvent = async (id: string, updates: Partial<SalesEvent>) => {
    setEvents(prev => prev.map(evt => evt.id === id ? { ...evt, ...updates } : evt));
    try {
      await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, updates })
      });
    } catch (e) {
      console.warn('Could not update sales event on server:', e);
    }
  };

  const deleteEvent = async (id: string) => {
    const target = events.find(e => e.id === id);
    setEvents(prev => prev.filter(evt => evt.id !== id));
    if (target) {
      try {
        await fetch(`/api/events?id=${id}&deletedBy=${encodeURIComponent(user.name || 'Store Staff')}`, {
          method: 'DELETE'
        });
      } catch (e) {
        console.warn('Could not soft-delete event on server:', e);
      }

      await fetchRecycleBin();

      logActivity(
        'Moved Event to Recycle Bin',
        'events',
        id,
        `Moved sales event "${target.name}" to Recycle Bin. Soft-deleted by ${user.name}.`
      );
      quickNotification('Event Moved to Recycle Bin', `Event "${target.name}" moved to Recycle Bin.`, 'warning');
    }
  };

  const addToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity, discountPercent: 0 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const updateCartDiscount = (productId: string, discount: number) => {
    setCart(prev =>
      prev.map(item => (item.product.id === productId ? { ...item, discountPercent: discount } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const addBarcodeRecord = (recordData: Omit<BarcodeRecord, 'id'>) => {
    const newRec: BarcodeRecord = {
      ...recordData,
      id: `bar-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      branchId: recordData.branchId || currentBranch?.id || 'branch-mayapur-hq',
      branchName: recordData.branchName || currentBranch?.name || 'Mayapur HQ Central'
    };
    setBarcodes(prev => [newRec, ...prev]);
    quickNotification('Barcode Batch Generated', `Created ${newRec.printCount} labels for SKU ${newRec.sku} at ${newRec.branchName}.`, 'success');
  };

  const addSalesTag = (tagData: Omit<SalesTag, 'id'>) => {
    const newTag: SalesTag = {
      ...tagData,
      id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      badgeColor: tagData.badgeColor || (tagData.discount === 100 ? 'bg-red-50 text-red-700 border border-red-200' : tagData.discount > 0 ? 'bg-amber-50 text-[#D97706] border border-amber-200' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')
    };
    setSalesTags(prev => {
      const updated = [...prev, newTag];
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_sales_tags', JSON.stringify(updated));
      }
      return updated;
    });
    logActivity('Create Sales Tag', 'POS / Pricing', newTag.id, `Created sales tag "${newTag.name}" (${newTag.discount}% discount)`);
    quickNotification('Sales Tag Created', `Added tag "${newTag.name}" with ${newTag.discount}% discount.`, 'success');
  };

  const updateSalesTag = (tag: SalesTag) => {
    setSalesTags(prev => {
      const updated = prev.map(t => t.id === tag.id ? tag : t);
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_sales_tags', JSON.stringify(updated));
      }
      return updated;
    });
    logActivity('Update Sales Tag', 'POS / Pricing', tag.id, `Updated sales tag "${tag.name}" (${tag.discount}% discount)`);
    quickNotification('Sales Tag Updated', `Updated tag "${tag.name}".`, 'success');
  };

  const deleteSalesTag = (id: string) => {
    const target = salesTags.find(t => t.id === id);
    if (target?.name === 'Standard Retail') {
      quickNotification('Cannot Delete', 'Standard Retail tag is required by the system.', 'alert');
      return;
    }
    setSalesTags(prev => {
      const updated = prev.filter(t => t.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_sales_tags', JSON.stringify(updated));
      }
      return updated;
    });
    if (target) {
      logActivity('Delete Sales Tag', 'POS / Pricing', id, `Deleted sales tag "${target.name}"`);
      quickNotification('Sales Tag Removed', `Deleted tag "${target.name}".`, 'warning');
    }
  };

  const addZone = (newZone: Omit<WarehouseZone, 'id' | 'currentOccupancy' | 'activeSKUs'> & { id?: string }) => {
    const zoneId = newZone.id || `zone-${Date.now().toString(36)}`;
    const zoneToAdd: WarehouseZone = {
      ...newZone,
      id: zoneId,
      branchId: newZone.branchId || currentBranch?.id || 'branch-mayapur-hq',
      branchName: newZone.branchName || currentBranch?.name || 'Mayapur HQ Central',
      currentOccupancy: 0,
      activeSKUs: 0,
      warehouseName: newZone.warehouseName || `${currentBranch?.name || 'Mayapur HQ'} Storage`,
      tempType: newZone.tempType || 'ambient',
      description: newZone.description || '',
      capacity: Number(newZone.capacity) || 1000,
      manager: newZone.manager || user?.name || 'Store Manager'
    };
    setZones(prev => {
      const updated = [...prev, zoneToAdd];
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_zones', JSON.stringify(updated));
      }
      return updated;
    });

    logActivity('Create Zone', 'Warehouse / Zones', zoneToAdd.id, `Created warehouse storage zone "${zoneToAdd.name}" (${zoneToAdd.code}) under ${zoneToAdd.warehouseName}`);
    quickNotification('Zone Created', `Added warehouse storage zone "${zoneToAdd.name}" at ${zoneToAdd.branchName}.`, 'success');
  };

  const updateZone = (id: string, updates: Partial<WarehouseZone>) => {
    setZones(prev => {
      const updated = prev.map(z => z.id === id ? { ...z, ...updates } : z);
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_zones', JSON.stringify(updated));
      }
      return updated;
    });

    logActivity('Update Zone', 'Warehouse / Zones', id, `Updated warehouse storage zone configuration for "${updates.name || id}"`);
    quickNotification('Zone Updated', `Updated storage zone "${updates.name || id}".`, 'success');
  };

  const deleteZone = (id: string) => {
    const target = zones.find(z => z.id === id);
    if (!target) return;
    
    // Check if products are currently mapped to this zone
    const productsInZone = products.filter(p => isProductInZone(p, target, zones));
    if (productsInZone.length > 0) {
      quickNotification(
        'Cannot Delete Zone',
        `There are ${productsInZone.length} active products stored in "${target.name}". Reassign products before deleting.`,
        'alert'
      );
      return;
    }

    setZones(prev => {
      const updated = prev.filter(z => z.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_zones', JSON.stringify(updated));
      }
      return updated;
    });

    logActivity('Delete Zone', 'Warehouse / Zones', id, `Deleted warehouse storage zone "${target.name}" (${target.code})`);
    quickNotification('Zone Removed', `Deleted storage zone "${target.name}".`, 'warning');
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addUser = async (newUser: Omit<UserProfile, 'id'>) => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUsers(prev => {
          const filtered = prev.filter(u => u.email.toLowerCase().trim() !== data.user.email.toLowerCase().trim() && u.id !== data.user.id);
          const next = [...filtered, data.user];
          if (typeof window !== 'undefined') {
            localStorage.setItem('iskcon_erp_users', JSON.stringify(next));
          }
          return next;
        });
        logActivity(
          'Created Staff Account',
          'settings',
          data.user.id,
          `Successfully created new staff account: ${data.user.name} with role "${data.user.role}".`
        );
        quickNotification('User Created', `Successfully added user "${data.user.name}".`, 'success');
        return;
      }
    } catch (e) {
      console.error('Failed to create user in database:', e);
    }
    const fallbackUser: UserProfile = {
      ...newUser,
      id: `user-${Date.now()}`
    };
    setUsers(prev => {
      const filtered = prev.filter(u => u.email.toLowerCase().trim() !== fallbackUser.email.toLowerCase().trim());
      const next = [...filtered, fallbackUser];
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_users', JSON.stringify(next));
      }
      return next;
    });
    quickNotification('User Created', `Successfully added user "${newUser.name}".`, 'success');
  };

  const updateUser = async (id: string, updates: Partial<UserProfile>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    
    if (user.id === id) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_user', JSON.stringify(updatedUser));
      }
    }

    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
    } catch (e) {
      console.warn('Failed to update user in database:', e);
    }

    const targetU = users.find(u => u.id === id);
    logActivity(
      'Updated Staff Account',
      'settings',
      id,
      `Updated user profile details for "${targetU?.name || id}".`
    );
    quickNotification('User Updated', 'User profile and permissions saved successfully.', 'success');
  };

  const deleteUser = async (id: string) => {
    if (id === user.id) {
      quickNotification('Action Denied', 'You cannot delete your own active session.', 'alert');
      return;
    }
    const targetU = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));

    try {
      await fetch(`/api/users?id=${id}&deletedBy=${encodeURIComponent(user.name || 'Administrator')}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Failed to delete user in database:', e);
    }

    await fetchRecycleBin();

    if (targetU) {
      logActivity(
        'Moved Staff Account to Recycle Bin',
        'settings',
        id,
        `Moved staff account for "${targetU.name}" (${targetU.role}) to Recycle Bin.`
      );
    }
    quickNotification('User Moved to Recycle Bin', 'Staff account moved to Recycle Bin. You can restore it anytime.', 'warning');
  };

  const restoreItem = async (type: RecycleItemType, id: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/recycle-bin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', type, id }),
      }).then(r => r.json());

      if (res.success) {
        // Re-fetch affected active collections and recycle bin
        const [prodRes, usrRes, inwRes, evtRes] = await Promise.all([
          fetch('/api/products').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/users').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/inward').then(r => r.json()).catch(() => ({ success: false })),
          fetch('/api/events').then(r => r.json()).catch(() => ({ success: false })),
          fetchRecycleBin(),
        ]);

        if (prodRes.success && Array.isArray(prodRes.products)) setProducts(prodRes.products);
        if (usrRes.success && Array.isArray(usrRes.users)) setUsers(usrRes.users);
        if (inwRes.success && Array.isArray(inwRes.inwardNotes)) setInwardNotes(inwRes.inwardNotes);
        if (evtRes.success && Array.isArray(evtRes.events)) setEvents(evtRes.events);

        logActivity(
          'Restored Record from Recycle Bin',
          'recycle_bin',
          id,
          `Restored ${type} record (ID: ${id}) back into active system.`
        );
        quickNotification('Record Restored', `Successfully restored ${type} back to active catalog.`, 'success');
        return true;
      }
    } catch (error) {
      console.error('Failed to restore item:', error);
    }
    quickNotification('Restore Failed', 'Could not restore record. Please try again.', 'alert');
    return false;
  };

  const permanentDeleteItem = async (type: RecycleItemType, id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/recycle-bin?type=${type}&id=${id}`, {
        method: 'DELETE',
      }).then(r => r.json());

      if (res.success) {
        setRecycleBinItems(prev => prev.filter(i => !(i.type === type && i.id === id)));
        logActivity(
          'Permanently Deleted Record',
          'recycle_bin',
          id,
          `Permanently purged ${type} record (ID: ${id}) from the database.`
        );
        quickNotification('Permanently Deleted', `The record was permanently deleted forever.`, 'info');
        return true;
      }
    } catch (error) {
      console.error('Failed to permanently delete item:', error);
    }
    quickNotification('Action Failed', 'Could not permanently delete record.', 'alert');
    return false;
  };

  const emptyRecycleBin = async (type?: RecycleItemType): Promise<boolean> => {
    try {
      const res = await fetch('/api/recycle-bin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'empty', type }),
      }).then(r => r.json());

      if (res.success) {
        if (type) {
          setRecycleBinItems(prev => prev.filter(i => i.type !== type));
        } else {
          setRecycleBinItems([]);
        }
        logActivity(
          'Emptied Recycle Bin',
          'recycle_bin',
          type || 'ALL',
          `Purged all deleted records from the Recycle Bin (${res.deletedCount || 0} records).`
        );
        quickNotification('Recycle Bin Cleared', `Successfully purged ${res.deletedCount || 0} records.`, 'success');
        return true;
      }
    } catch (error) {
      console.error('Failed to empty recycle bin:', error);
    }
    quickNotification('Action Failed', 'Could not empty the recycle bin.', 'alert');
    return false;
  };

  const transferStock = (sku: string, fromZone: string, toZone: string, qty: number, batchNo: string, refNo: string) => {
    const prod = products.find(p => p.sku === sku);
    if (!prod) return;

    // Update product's warehouse zone (since simple product model has a single warehouseZone)
    setProducts(prev => prev.map(p => p.sku === sku ? { ...p, warehouseZone: toZone } : p));

    // Create detailed real-time chronological audit trail record
    const mov: StockMovement = {
      id: `mov-${Date.now()}-${Math.random()}`,
      type: 'zone_transfer',
      sku,
      productName: prod.name,
      qtyDelta: qty, // or 0 since it is a zone transfer, let's represent the qty moved
      fromZone,
      toZone,
      timestamp: new Date().toISOString(),
      operator: user.name,
      referenceNo: refNo || `TRSF-${Date.now().toString().slice(-4)}`,
      batchNo: batchNo || prod.batchNo
    };
    setMovements(m => [mov, ...m]);

    // POST Stock movement to server
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mov, isMovement: true, movementType: mov.type, qtyDelta: Number(qty) })
    }).catch(e => console.warn('Could not post stock movement:', e));

    logActivity(
      'Stock Transfer Between Zones',
      'inventory',
      mov.referenceNo,
      `Transferred ${qty} units of "${prod.name}" (SKU: ${sku}, Batch: ${mov.batchNo}) from zone ${fromZone} to zone ${toZone}. Action performed by: ${user.name}.`
    );

    quickNotification('Stock Transferred', `Moved ${qty} units of "${prod.name}" from ${fromZone} to ${toZone}.`, 'success');
  };

  const adjustStock = (sku: string, zone: string, qtyDelta: number, batchNo: string, reason: string, refNo: string) => {
    const prod = products.find(p => p.sku === sku);
    if (!prod) return;

    // Update product overall stock
    setProducts(prev => prev.map(p => {
      if (p.sku === sku) {
        const newStock = Math.max(0, p.stock + qtyDelta);
        return {
          ...p,
          stock: newStock,
          status: newStock === 0 ? 'out_of_stock' : newStock <= p.minStock ? 'low_stock' : 'in_stock'
        };
      }
      return p;
    }));

    // Update specific batch remaining quantity
    setBatches(prev => prev.map(b => {
      if (b.sku === sku && b.batchNo === batchNo) {
        const newQty = Math.max(0, b.remainingQuantity + qtyDelta);
        return {
          ...b,
          remainingQuantity: newQty,
          status: newQty === 0 ? 'out_of_stock' : newQty <= 5 ? 'low_stock' : 'in_stock'
        };
      }
      return b;
    }));

    // Create detailed real-time chronological audit trail record
    const mov: StockMovement = {
      id: `mov-${Date.now()}-${Math.random()}`,
      type: 'shrinkage_adjustment',
      sku,
      productName: prod.name,
      qtyDelta,
      fromZone: qtyDelta < 0 ? zone : undefined,
      toZone: qtyDelta > 0 ? zone : undefined,
      timestamp: new Date().toISOString(),
      operator: user.name,
      referenceNo: refNo || `ADJ-${reason.toUpperCase().replace(/\s+/g, '_')}-${Date.now().toString().slice(-4)}`,
      batchNo: batchNo
    };
    setMovements(m => [mov, ...m]);

    // POST Stock movement to server
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...mov, isMovement: true, movementType: mov.type, qtyDelta: Number(qtyDelta) })
    }).catch(e => console.warn('Could not post stock movement:', e));

    logActivity(
      'Stock Adjustment / Shrinkage',
      'inventory',
      mov.referenceNo,
      `Adjusted stock level of "${prod.name}" (SKU: ${sku}, Batch: ${batchNo}) in zone ${zone} by ${qtyDelta > 0 ? '+' : ''}${qtyDelta} units. Reason/Adjustment Cause: "${reason}". Performed by: ${user.name}.`
    );

    quickNotification('Stock Adjusted', `Adjusted stock of "${prod.name}" by ${qtyDelta > 0 ? '+' : ''}${qtyDelta} units (${reason}).`, 'success');
  };

  const refreshUsers = async (userList?: UserProfile[]): Promise<UserProfile[]> => {
    if (userList && Array.isArray(userList)) {
      setUsers(userList);
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_users', JSON.stringify(userList));
      }
      return userList;
    }
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsers(data.users);
        if (typeof window !== 'undefined') {
          localStorage.setItem('iskcon_erp_users', JSON.stringify(data.users));
        }
        return data.users;
      }
    } catch (e) {
      console.warn('Failed to refresh users:', e);
    }
    return users;
  };

  const login = (email: string, pass: string, selectedBranchId?: string, overrideUser?: UserProfile): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanNorm = cleanEmail.replace(/yy+/g, 'y');
    const foundUser = overrideUser || users.find(u => {
      const uEmail = u.email.trim().toLowerCase();
      const uNorm = uEmail.replace(/yy+/g, 'y');
      return (uEmail === cleanEmail || uNorm === cleanNorm) && u.password === pass;
    });

    if (foundUser) {
      if (!foundUser.isActive) {
        quickNotification('Access Denied', 'This user account is currently deactivated.', 'alert');
        return false;
      }

      // If user wasn't in users state, append them to users
      if (!users.some(u => u.id === foundUser.id || u.email.toLowerCase() === foundUser.email.toLowerCase())) {
        setUsers(prev => {
          const next = [...prev, foundUser];
          if (typeof window !== 'undefined') {
            localStorage.setItem('iskcon_erp_users', JSON.stringify(next));
          }
          return next;
        });
      }

      // Determine target branch
      let targetBranch: Branch;
      if (selectedBranchId === 'all-branches') {
        targetBranch = isSuperAdmin(foundUser) ? GLOBAL_ALL_BRANCHES : resolveBranchForUser(foundUser, branches);
      } else if (selectedBranchId) {
        const allowed = userAccessibleBranches(foundUser);
        const match = allowed.find(b => b.id === selectedBranchId);
        targetBranch = match || resolveBranchForUser(foundUser, branches);
      } else {
        targetBranch = resolveBranchForUser(foundUser, branches);
      }

      setIsAuthenticated(true);
      setUser(foundUser);
      setCurrentBranchState(targetBranch);

      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_auth', 'true');
        localStorage.setItem('iskcon_erp_user', JSON.stringify(foundUser));
        localStorage.setItem('iskcon_erp_current_branch', JSON.stringify(targetBranch));
      }
      quickNotification('Hare Krishna!', `Welcome back, ${foundUser.name}. Active Branch: ${targetBranch.name}.`, 'success');
      
      // Seed audit log for login immediately with localized state sync
      const logData: AuditLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: foundUser.id,
        staffName: foundUser.name,
        role: foundUser.role,
        branch: targetBranch.name,
        branchId: targetBranch.id,
        action: 'User Login',
        module: 'settings',
        referenceNo: foundUser.id,
        details: `Staff member "${foundUser.name}" (${foundUser.role}) logged in successfully to branch "${targetBranch.name}" (${targetBranch.code}).`,
        timestamp: new Date().toISOString()
      };
      setAuditLogs(prev => [logData, ...prev]);
      
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      }).catch(e => console.warn(e));

      // Auto-route on login if they don't have access to dashboard
      const allowed = foundUser.permissions || [];
      if (!allowed.includes('dashboard') && allowed.length > 0) {
        setActiveModule(allowed[0]);
      } else {
        setActiveModule('dashboard');
      }
      return true;
    }

    quickNotification('Authentication Failed', 'Invalid email or passcode. Please try again.', 'alert');
    return false;
  };

  const resetUserPassword = async (email: string, newPass: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanNorm = cleanEmail.replace(/yy+/g, 'y');
    let targetUser = users.find(u => {
      const uEmail = u.email.trim().toLowerCase();
      const uNorm = uEmail.replace(/yy+/g, 'y');
      return uEmail === cleanEmail || uNorm === cleanNorm;
    });

    if (!targetUser) {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setUsers(data.users);
          targetUser = data.users.find((u: UserProfile) => {
            const uEmail = u.email.trim().toLowerCase();
            const uNorm = uEmail.replace(/yy+/g, 'y');
            return uEmail === cleanEmail || uNorm === cleanNorm;
          });
        }
      } catch (e) {}
    }

    if (!targetUser) {
      quickNotification('Account Not Found', `No user account found matching "${email}".`, 'alert');
      return false;
    }

    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, password: newPass } : u));
    if (user && user.id === targetUser.id) {
      setUser(prev => ({ ...prev, password: newPass }));
      if (typeof window !== 'undefined') {
        localStorage.setItem('iskcon_erp_user', JSON.stringify({ ...user, password: newPass }));
      }
    }

    try {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetUser.id, password: newPass })
      });
    } catch (e) {
      console.warn('Could not persist reset password to server:', e);
    }

    const logData: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: targetUser.id,
      staffName: targetUser.name,
      role: targetUser.role,
      branch: targetUser.branch,
      action: 'Passcode Reset',
      module: 'settings',
      referenceNo: targetUser.id,
      details: `Passcode was successfully reset for staff account "${targetUser.name}" (${targetUser.email}).`,
      timestamp: new Date().toISOString()
    };
    setAuditLogs(prev => [logData, ...prev]);

    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    }).catch(e => console.warn(e));

    quickNotification('Passcode Reset Successful', `New passcode saved for ${targetUser.name}. You can now authenticate.`, 'success');
    return true;
  };

  const logout = () => {
    if (user) {
      const logData: AuditLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        staffName: user.name,
        role: user.role,
        branch: user.branch,
        action: 'User Logout',
        module: 'settings',
        referenceNo: user.id,
        details: `Staff member "${user.name}" signed out of the system safely.`,
        timestamp: new Date().toISOString()
      };
      setAuditLogs(prev => [logData, ...prev]);
      
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData),
      }).catch(e => console.warn(e));
    }

    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('iskcon_erp_auth');
      localStorage.removeItem('iskcon_erp_user');
    }
    quickNotification('Logged Out', 'You have been safely signed out of the ERP system.', 'info');
  };

  return (
    <ERPContext.Provider
      value={{
        activeModule,
        setActiveModule,
        branches,
        currentBranch,
        setCurrentBranch,
        addBranch,
        updateBranch,
        deleteBranch,
        userAccessibleBranches,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        inwardNotes,
        addInwardNote,
        batches,
        setBatches,
        zones,
        addZone,
        updateZone,
        deleteZone,
        orders,
        addOrder,
        transferStock,
        adjustStock,
        events,
        addEvent,
        updateEvent,
        deleteEvent,
        setEvents,
        movements,
        notifications,
        markNotificationRead,
        markAllNotificationsRead,
        barcodes,
        addBarcodeRecord,
        salesTags,
        addSalesTag,
        updateSalesTag,
        deleteSalesTag,
        user,
        users,
        addUser,
        updateUser,
        deleteUser,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        updateCartDiscount,
        clearCart,
        isSearchModalOpen,
        setIsSearchModalOpen,
        theme,
        setTheme,
        sidebarCollapsed,
        toggleSidebar,
        mobileMenuOpen,
        setMobileMenuOpen,
        quickNotification,
        isAuthenticated,
        login,
        logout,
        refreshUsers,
        resetUserPassword,
        settings,
        updateSettings,
        auditLogs,
        logActivity,
        recycleBinItems,
        fetchRecycleBin,
        restoreItem,
        permanentDeleteItem,
        emptyRecycleBin
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
