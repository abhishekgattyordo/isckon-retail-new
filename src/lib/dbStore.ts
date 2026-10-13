import { Branch, Product, MaterialInwardNote, POSOrder, SalesEvent, SystemSettings, AuditLog, StockMovement, SalesTag, UserProfile, WarehouseZone, EventAllocation, EventTransaction } from '../types';

// Central in-memory DB store for Next.js API Routes fallback
export class MemoryDb {
  static branches: Branch[] = [];
  static products: Product[] = [];
  static inwardNotes: MaterialInwardNote[] = [];
  static orders: POSOrder[] = [];
  static events: SalesEvent[] = [];
  static settings: SystemSettings | null = null;
  static auditLogs: AuditLog[] = [];
  static stockMovements: StockMovement[] = [];
  static salesTags: SalesTag[] = [];
  static users: UserProfile[] = [];
  static zones: WarehouseZone[] = [];
  static eventAllocations: EventAllocation[] = [];
  static eventTransactions: EventTransaction[] = [];
}
