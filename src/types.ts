export type ModuleType =
  | 'dashboard'
  | 'products'
  | 'inward'
  | 'inventory'
  | 'barcode'
  | 'pos'
  | 'events'
  | 'reports'
  | 'settings'
  | 'users'
  | 'audit'
  | 'recycle_bin';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';

export interface Branch {
  id: string;
  code: string;
  name: string;
  location: string;
  city: string;
  state: string;
  phone?: string;
  email?: string;
  managerName?: string;
  status?: 'active' | 'inactive';
  isMain?: boolean;
  isActive?: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  warehouseZone: string;
  batchNo: string;
  barcode: string;
  imageUrl: string;
  status: StockStatus;
  lastUpdated: string;
  supplier: string;
  rating: number;
  description?: string;
  tags?: string[];
  taxRate?: number; // GST percentage e.g. 0, 5, 12, 18, 28
  branchId?: string;
  branchName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface InventoryBatch {
  id: string;
  sku: string;
  batchNo: string;
  receivedDate: string;
  edition?: string;
  costPrice: number;
  sellingPrice: number;
  totalQuantity: number;
  remainingQuantity: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  grnNumber?: string;
}

export interface InwardItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  sellingPrice?: number; // Retail sales price entered during inward
  batchNo: string;
  expiryDate: string;
  taxRate: number; // GST percentage e.g., 5 or 12 or 18
  total: number;
}

export interface MaterialInwardNote {
  id: string;
  grnNumber: string;
  poNumber: string;
  vendorName: string;
  invoiceDate: string;
  warehouse: string;
  items: InwardItem[];
  status: 'completed' | 'draft' | 'pending_qc';
  totalValue: number;
  receivedBy: string;
  timestamp: string;
  notes?: string;
  branchId?: string;
  branchName?: string;
  createdBy?: string;
  createdDateTime?: string;
  lastUpdatedBy?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface WarehouseZone {
  id: string;
  name: string;
  code: string;
  warehouseName?: string;
  capacity: number; // in pallet slots or units
  currentOccupancy: number;
  tempType: 'ambient' | 'cold' | 'secure_cage' | 'quarantine';
  manager: string;
  activeSKUs: number;
  description: string;
  aislesCount?: number;
  shelvesPerAisle?: number;
  location?: string;
  branchId?: string;
  branchName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type BarcodeFormat = 'code128' | 'ean13' | 'qr';
export type BarcodeLabelTemplate = 'retail_tag_1x2' | 'shelf_label_2x3' | 'jewelry_hangtag' | 'box_shipping_4x6';

export interface BarcodeRecord {
  id: string;
  sku: string;
  productName: string;
  barcodeValue: string;
  format: BarcodeFormat;
  template: BarcodeLabelTemplate;
  generatedAt: string;
  batchNo: string;
  printCount: number;
  branchId?: string;
  branchName?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number;
  customNote?: string;
}

export interface SalesTag {
  id: string;
  name: string;
  discount: number; // percentage (0 to 100)
  badgeColor?: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split' | 'apple_pay';

export interface POSOrder {
  id: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  timestamp: string;
  cashierName: string;
  customerPhone?: string;
  customerName?: string;
  salesTag?: string;
  upiId?: string;
  terminal?: string;
  branchId?: string;
  branchName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface SalesEvent {
  id: string;
  name: string;
  type: 'clearance' | 'flash_sale' | 'seasonal' | 'vip_exclusive' | 'stall_booth' | 'book_fair';
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'ended';
  targetRevenue: number;
  currentRevenue: number;
  allocatedSKUs: number;
  discountRule: string;
  description: string;
  bannerColor: string;
  stallLocation?: string;
  managerName?: string;
  booksSoldQty?: number;
  booksSoldRevenue?: number;
  giftsSoldQty?: number;
  giftsSoldRevenue?: number;
  branchId?: string;
  branchName?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface StockMovement {
  id: string;
  type: 'inward_grn' | 'pos_sale' | 'zone_transfer' | 'shrinkage_adjustment';
  sku: string;
  productName: string;
  qtyDelta: number;
  fromZone?: string;
  toZone?: string;
  timestamp: string;
  operator: string;
  referenceNo: string;
  batchNo?: string;
  branchId?: string;
  branchName?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'alert' | 'success' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
  linkModule?: ModuleType;
}

export type UserRole =
  | 'Super Admin'
  | 'Branch Admin'
  | 'Store Manager'
  | 'Store Executive'
  | 'Warehouse Manager'
  | 'Lead Cashier'
  | 'Cashier'
  | 'Administrator'
  | 'System Admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  branch: string;
  branchId?: string;
  accessibleBranchIds?: string[];
  shift: string;
  isActive: boolean;
  permissions: ModuleType[];
  password?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type RecycleItemType = 'product' | 'user' | 'event' | 'inward' | 'order';

export interface RecycleBinItem {
  id: string;
  type: RecycleItemType;
  name: string;
  codeOrSku: string;
  categoryOrRole: string;
  deletedAt: string;
  deletedBy: string;
  details?: string;
  originalData: any;
}

export interface SystemSettings {
  logoUrl?: string;
  orgName: string;
  appTitle: string;
  brandingColor: string;
  currencySymbol: string;
  taxId?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  staffName: string;
  role: string;
  branch?: string;
  branchId?: string;
  action: string;
  module: string;
  referenceNo?: string;
  details?: string;
  timestamp: string; // ISO string or local date-time
}

export interface EventAllocation {
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

export interface EventTransaction {
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

