import {
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
  InventoryBatch,
  SalesTag,
  Supplier
} from '../types';

export const GLOBAL_BRANCH: Branch | null = null;

export const INITIAL_BRANCHES: Branch[] = [];

export const INITIAL_USER: UserProfile | null = null;

export const INITIAL_USERS: UserProfile[] = [];

export const INITIAL_ZONES: WarehouseZone[] = [];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_INWARD_NOTES: MaterialInwardNote[] = [];

export const INITIAL_ORDERS: POSOrder[] = [];

export const INITIAL_EVENTS: SalesEvent[] = [];

export const INITIAL_MOVEMENTS: StockMovement[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_BARCODES: BarcodeRecord[] = [];

export const INITIAL_BATCHES: InventoryBatch[] = [];

export const INITIAL_AUDIT_LOGS: any[] = [];

export const INITIAL_SALES_TAGS: SalesTag[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];