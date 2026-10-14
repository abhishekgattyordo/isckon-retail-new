import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import { MemoryDb } from './src/lib/dbStore.ts';
import { getProducts, createProduct, updateProductService, softDeleteProductService, permanentDeleteProductService, restoreProductService } from './src/lib/services/productService.ts';
import { getBranches, createBranch, updateBranch, deleteBranch } from './src/lib/services/branchService.ts';
import { getUsers, createUser, updateUserService, softDeleteUserService, permanentDeleteUserService, restoreUserService } from './src/lib/services/userService.ts';
import { getInwardNotes, createInwardNote, softDeleteInwardNoteService, permanentDeleteInwardNoteService, restoreInwardNoteService } from './src/lib/services/inwardService.ts';
import { getOrders, createOrder } from './src/lib/services/orderService.ts';
import {
  getEvents,
  createEvent,
  updateEventService,
  softDeleteEventService,
  permanentDeleteEventService,
  restoreEventService,
  getEventAllocations,
  saveEventAllocation,
  deleteEventAllocation,
  getEventTransactions,
  createEventTransaction
} from './src/lib/services/eventService.ts';
import { getSettings, updateSettings, DEFAULT_SETTINGS } from './src/lib/services/settingsService.ts';
import { getAuditLogs, createAuditLog, getStockMovements, createStockMovement } from './src/lib/services/auditService.ts';
import {
  getAllRecycleBinItems,
  restoreRecycleItemService,
  permanentDeleteRecycleItemService,
  emptyRecycleBinService
} from './src/lib/services/recycleBinService.ts';
import { getWarehouseZones, createWarehouseZone } from './src/lib/services/zoneService.ts';
import { getReportsSummary } from './src/lib/services/reportService.ts';
import { RecycleItemType } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Database Status
app.get('/api/db-status', (_req: Request, res: Response) => {
  res.json({
    connected: false,
    status: 'In-Memory / Local Storage Active',
    engine: 'In-Memory Store',
    orm: 'Embedded High-Performance Cache',
    database: 'iskcon-local',
    host: 'Local Memory Cache',
    latencyMs: 1,
    serverTime: new Date().toISOString(),
    counts: {
      users: MemoryDb.users.length,
      products: MemoryDb.products.length,
      branches: MemoryDb.branches.length,
      orders: MemoryDb.orders.length,
      inwards: MemoryDb.inwardNotes.length,
    },
    timestamp: new Date().toISOString()
  });
});

// Sync from Client (Local Storage Hydration)
app.post('/api/sync', (req: Request, res: Response) => {
  try {
    const { products, inwardNotes, orders, events, salesTags } = req.body || {};
    if (Array.isArray(products) && products.length > 0) {
      MemoryDb.products = [...products];
    }
    if (Array.isArray(inwardNotes) && inwardNotes.length > 0) {
      MemoryDb.inwardNotes = [...inwardNotes];
    }
    if (Array.isArray(orders) && orders.length > 0) {
      MemoryDb.orders = [...orders];
    }
    if (Array.isArray(events) && events.length > 0) {
      MemoryDb.events = [...events];
    }
    if (Array.isArray(salesTags) && salesTags.length > 0) {
      MemoryDb.salesTags = [...salesTags];
    }
    res.json({ success: true, dbConnected: false });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Products
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const branchId = (req.query.branchId as string) || (req.headers['x-branch-id'] as string) || undefined;
    const products = await getProducts(includeDeleted, branchId).catch(() => []);
    res.json({ success: true, products: products || [], dbConnected: !!process.env.DATABASE_URL });
  } catch (error: any) {
    res.json({ success: true, products: [], dbConnected: false, error: error?.message });
  }
});

app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (body.action === 'restore' && body.id) {
      const success = await restoreProductService(body.id);
      return res.json({ success });
    }
    const product = await createProduct(body).catch(() => null);
    res.status(201).json({ success: true, product });
  } catch (error: any) {
    res.json({ success: true, error: error?.message });
  }
});

app.put('/api/products', async (req: Request, res: Response) => {
  try {
    const { id, updates } = req.body || {};
    if (!id) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    const product = await updateProductService(id, updates || req.body);
    res.json({ success: true, product });
  } catch (error: any) {
    res.json({ success: false, error: error?.message });
  }
});

app.delete('/api/products', async (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    const permanent = req.query.permanent === 'true';
    const deletedBy = (req.query.deletedBy as string) || 'Staff User';
    if (!id) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }
    const success = permanent
      ? await permanentDeleteProductService(id)
      : await softDeleteProductService(id, deletedBy);
    res.json({ success, isPermanent: permanent });
  } catch (error: any) {
    res.json({ success: false, error: error?.message });
  }
});

// Product Barcode / SKU Lookup
app.get('/api/products/lookup', async (req: Request, res: Response) => {
  const code = (req.query.code as string) || '';
  const typeParam = req.query.type as string;
  const cleanInput = code.trim();

  if (!cleanInput) {
    return res.status(400).json({ success: false, error: 'Code is required' });
  }

  // 1. Search product in MemoryDb
  const memoryProduct = MemoryDb.products.find(
    p => p.barcode === cleanInput || p.sku.toLowerCase() === cleanInput.toLowerCase()
  );
  if (memoryProduct) {
    return res.json({ success: true, type: 'product', product: memoryProduct, dbConnected: false });
  }

  // 2. Search order in MemoryDb
  if (typeParam !== 'product') {
    const memoryOrder = MemoryDb.orders.find(
      o => o.orderNumber.toLowerCase() === cleanInput.toLowerCase() || o.id.toLowerCase() === cleanInput.toLowerCase()
    );
    if (memoryOrder) {
      return res.json({ success: true, type: 'order', order: memoryOrder, dbConnected: false });
    }
  }

  return res.json({ success: false, error: 'Product or invoice not found', dbConnected: false });
});

// Branches
app.get('/api/branches', async (_req: Request, res: Response) => {
  try {
    const branches = await getBranches();
    res.json({ success: true, branches });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/branches', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.name || !data.code || !data.city) {
      return res.status(400).json({ success: false, error: 'Branch Name, Code, and City are required' });
    }
    const branch = await createBranch(data);
    res.json({ success: true, branch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/branches', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.id) {
      return res.status(400).json({ success: false, error: 'Branch ID is required' });
    }
    const branch = await updateBranch(data.id, data);
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }
    res.json({ success: true, branch });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/branches', async (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Branch ID is required' });
    }
    const success = await deleteBranch(id);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Users
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const branchId = (req.query.branchId as string) || (req.headers['x-branch-id'] as string) || undefined;
    const users = await getUsers(includeDeleted, branchId);
    res.json({ success: true, users, dbConnected: false });
  } catch (error: any) {
    res.json({ success: true, users: [], error: error?.message });
  }
});

app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (body.action === 'restore' && body.id) {
      const success = await restoreUserService(body.id);
      return res.json({ success });
    }
    if (!body.name || !body.email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }
    const newUser = await createUser(body);
    res.status(201).json({ success: true, user: newUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

app.put('/api/users', async (req: Request, res: Response) => {
  try {
    const { id, ...updates } = req.body || {};
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    const updated = await updateUserService(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

app.delete('/api/users', async (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    const permanent = req.query.permanent === 'true';
    const deletedBy = (req.query.deletedBy as string) || 'Staff User';
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    const success = permanent
      ? await permanentDeleteUserService(id)
      : await softDeleteUserService(id, deletedBy);
    res.json({ success, isPermanent: permanent });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Material Inward Notes
app.get('/api/inward', async (req: Request, res: Response) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const branchId = (req.query.branchId as string) || (req.headers['x-branch-id'] as string) || undefined;
    const inwardNotes = await getInwardNotes(includeDeleted, branchId).catch(() => []);
    res.json({ success: true, inwardNotes: inwardNotes || [], dbConnected: false });
  } catch (error: any) {
    res.json({ success: true, inwardNotes: [], error: error?.message });
  }
});

app.post('/api/inward', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (body.action === 'restore' && body.id) {
      const success = await restoreInwardNoteService(body.id);
      return res.json({ success });
    }

    // Strict Backend Validation
    if (!body.vendorName || typeof body.vendorName !== 'string' || !body.vendorName.trim()) {
      return res.status(400).json({ success: false, error: 'Validation Error: Supplier / Vendor Name is mandatory.' });
    }
    if (!body.poNumber || typeof body.poNumber !== 'string' || !body.poNumber.trim()) {
      return res.status(400).json({ success: false, error: 'Validation Error: Purchase Order (PO) Number is mandatory.' });
    }
    if (!body.warehouse || typeof body.warehouse !== 'string' || !body.warehouse.trim()) {
      return res.status(400).json({ success: false, error: 'Validation Error: Destination Warehouse Zone is mandatory.' });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ success: false, error: 'Validation Error: At least one product item row is mandatory.' });
    }
    for (let i = 0; i < body.items.length; i++) {
      const it = body.items[i];
      const rowNum = i + 1;
      if (!it.sku || typeof it.sku !== 'string' || !it.sku.trim() || it.sku === 'SKU-UNASSIGNED') {
        return res.status(400).json({ success: false, error: `Validation Error on Item #${rowNum}: Product SKU selection is mandatory.` });
      }
      if (!it.name || typeof it.name !== 'string' || !it.name.trim() || it.name === 'General Merchandise Item') {
        return res.status(400).json({ success: false, error: `Validation Error on Item #${rowNum}: Product Name is mandatory.` });
      }
      const q = Number(it.quantity);
      if (isNaN(q) || q <= 0) {
        return res.status(400).json({ success: false, error: `Validation Error on Item #${rowNum} (${it.sku}): Quantity must be a valid number greater than 0.` });
      }
      const c = Number(it.unitCost);
      if (isNaN(c) || c < 0) {
        return res.status(400).json({ success: false, error: `Validation Error on Item #${rowNum} (${it.sku}): Unit Cost cannot be negative.` });
      }
    }

    const inwardNote = await createInwardNote(body);
    res.status(201).json({ success: true, inwardNote });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error?.message || 'Failed to create inward note' });
  }
});

app.delete('/api/inward', async (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    const permanent = req.query.permanent === 'true';
    const deletedBy = (req.query.deletedBy as string) || 'Staff User';
    if (!id) {
      return res.status(400).json({ success: false, error: 'Inward Note ID is required' });
    }
    const success = permanent
      ? await permanentDeleteInwardNoteService(id)
      : await softDeleteInwardNoteService(id, deletedBy);
    res.json({ success, isPermanent: permanent });
  } catch (error: any) {
    res.json({ success: false, error: error?.message });
  }
});

// Orders (POS)
app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const branchId = (req.query.branchId as string) || (req.headers['x-branch-id'] as string) || undefined;
    const orders = await getOrders(branchId).catch(() => []);
    res.json({ success: true, orders: orders || [], dbConnected: false });
  } catch (error: any) {
    res.json({ success: true, orders: [], error: error?.message });
  }
});

app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const order = await createOrder(body).catch(() => null);
    res.status(201).json({ success: true, order });
  } catch (error: any) {
    res.json({ success: true, error: error?.message });
  }
});

// Events
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string;
    const eventId = (req.query.eventId as string) || undefined;
    if (type === 'allocations') {
      const allocations = await getEventAllocations(eventId).catch(() => []);
      return res.json({ success: true, allocations });
    }
    if (type === 'transactions') {
      const transactions = await getEventTransactions(eventId).catch(() => []);
      return res.json({ success: true, transactions });
    }
    const includeDeleted = req.query.includeDeleted === 'true';
    const branchId = (req.query.branchId as string) || (req.headers['x-branch-id'] as string) || undefined;
    const events = await getEvents(includeDeleted, branchId).catch(() => []);
    res.json({ success: true, events: events || [], dbConnected: false });
  } catch (error: any) {
    res.json({ success: true, events: [], error: error?.message });
  }
});

app.post('/api/events', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (body.action === 'restore' && body.id) {
      const success = await restoreEventService(body.id);
      return res.json({ success });
    }
    if (body.type === 'allocation') {
      const allocation = await saveEventAllocation(body.data || body);
      return res.status(201).json({ success: true, allocation });
    }
    if (body.type === 'transaction') {
      const transaction = await createEventTransaction(body.data || body);
      return res.status(201).json({ success: true, transaction });
    }
    const event = await createEvent(body).catch(() => null);
    res.status(201).json({ success: true, event });
  } catch (error: any) {
    res.json({ success: false, error: error?.message });
  }
});

app.put('/api/events', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const id = body.id;
    const updates = body.updates || body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Event ID is required for update' });
    }
    const event = await updateEventService(id, updates);
    res.json({ success: true, event });
  } catch (error: any) {
    res.json({ success: false, error: error?.message });
  }
});

app.delete('/api/events', async (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    const permanent = req.query.permanent === 'true';
    const deletedBy = (req.query.deletedBy as string) || 'Staff User';
    if (!id) {
      return res.status(400).json({ success: false, error: 'Event ID is required' });
    }
    const success = permanent
      ? await permanentDeleteEventService(id)
      : await softDeleteEventService(id, deletedBy);
    res.json({ success, isPermanent: permanent });
  } catch (error: any) {
    res.json({ success: false, error: error?.message });
  }
});

// Event Allocations
app.get('/api/events/allocations', async (req: Request, res: Response) => {
  try {
    const eventId = (req.query.eventId as string) || undefined;
    const allocations = await getEventAllocations(eventId).catch(() => []);
    res.json({ success: true, allocations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message, allocations: [] });
  }
});

app.post('/api/events/allocations', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || !body.eventId || !body.sku) {
      return res.status(400).json({ success: false, error: 'eventId and sku are required' });
    }
    const allocation = await saveEventAllocation(body);
    res.status(201).json({ success: true, allocation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

app.delete('/api/events/allocations', async (req: Request, res: Response) => {
  try {
    const id = req.query.id as string;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Allocation ID is required' });
    }
    const success = await deleteEventAllocation(id);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Event Transactions
app.get('/api/events/transactions', async (req: Request, res: Response) => {
  try {
    const eventId = (req.query.eventId as string) || undefined;
    const transactions = await getEventTransactions(eventId).catch(() => []);
    res.json({ success: true, transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message, transactions: [] });
  }
});

app.post('/api/events/transactions', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || !body.eventId || !body.orderNumber) {
      return res.status(400).json({ success: false, error: 'eventId and orderNumber are required' });
    }
    const transaction = await createEventTransaction(body);
    res.status(201).json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Settings
app.get('/api/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getSettings().catch(() => DEFAULT_SETTINGS);
    res.json({ success: true, settings: settings || DEFAULT_SETTINGS });
  } catch (error: any) {
    res.json({ success: true, settings: DEFAULT_SETTINGS, error: error?.message });
  }
});

app.post('/api/settings', async (req: Request, res: Response) => {
  try {
    const settings = await updateSettings(req.body || {}).catch(() => DEFAULT_SETTINGS);
    res.json({ success: true, settings: settings || DEFAULT_SETTINGS });
  } catch (error: any) {
    res.json({ success: true, settings: DEFAULT_SETTINGS, error: error?.message });
  }
});

// Audit and Stock Movement
app.get('/api/audit', async (req: Request, res: Response) => {
  try {
    const branchId = (req.query.branchId as string) || (req.headers['x-branch-id'] as string) || undefined;
    const logs = await getAuditLogs(branchId).catch(() => []);
    const movements = await getStockMovements(branchId).catch(() => []);
    res.json({ success: true, logs: logs || [], movements: movements || [] });
  } catch (error: any) {
    res.json({ success: true, logs: [], movements: [], error: error?.message });
  }
});

app.post('/api/audit', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    if (body.isMovement || body.type === 'movement') {
      const { isMovement, movementType, type, ...data } = body;
      const finalType = movementType || (type && type !== 'movement' ? type : 'stock_adjustment');
      const movement = await createStockMovement({ ...data, type: finalType }).catch(() => null);
      return res.status(201).json({ success: true, movement });
    } else {
      const { type, ...data } = body;
      const log = await createAuditLog(data).catch(() => null);
      return res.status(201).json({ success: true, log });
    }
  } catch (error: any) {
    res.json({ success: true, error: error?.message });
  }
});

// Recycle Bin
app.get('/api/recycle-bin', async (req: Request, res: Response) => {
  try {
    const filterType = req.query.type as RecycleItemType | undefined;
    let items = await getAllRecycleBinItems();
    if (filterType) {
      items = items.filter(i => i.type === filterType);
    }
    res.json({ success: true, items, count: items.length });
  } catch (error: any) {
    res.json({ success: true, items: [], count: 0, error: error?.message });
  }
});

app.post('/api/recycle-bin', async (req: Request, res: Response) => {
  try {
    const { action, type, id } = req.body || {};
    if (action === 'restore') {
      if (!type || !id) {
        return res.status(400).json({ success: false, error: 'type and id are required to restore' });
      }
      const success = await restoreRecycleItemService(type, id);
      return res.json({ success, message: 'Item restored successfully' });
    }
    if (action === 'empty') {
      const result = await emptyRecycleBinService(type);
      return res.json({ success: true, deletedCount: result.count });
    }
    res.status(400).json({ success: false, error: 'Invalid action' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

app.delete('/api/recycle-bin', async (req: Request, res: Response) => {
  try {
    let type = req.query.type as RecycleItemType | undefined;
    let id = req.query.id as string | undefined;
    if (!id || !type) {
      type = type || req.body?.type;
      id = id || req.body?.id;
    }
    if (!id || !type) {
      return res.status(400).json({ success: false, error: 'type and id are required' });
    }
    const success = await permanentDeleteRecycleItemService(type, id);
    res.json({ success, message: 'Item permanently deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message });
  }
});

// Zones
app.get('/api/zones', async (req: Request, res: Response) => {
  try {
    const branchId = (req.query.branchId as string) || undefined;
    const zones = await getWarehouseZones(branchId);
    res.json({ success: true, zones });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/zones', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    if (!data.name || !data.code) {
      return res.status(400).json({ success: false, error: 'Zone Name and Code are required' });
    }
    const zone = await createWarehouseZone(data);
    res.status(201).json({ success: true, zone });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reports Summary
app.get('/api/reports/summary', async (req: Request, res: Response) => {
  try {
    const branchId = (req.query.branchId as string) || (req.headers['x-branch-id'] as string) || undefined;
    const reportData = await getReportsSummary(branchId);
    res.json(reportData);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gemini Barcode OCR
app.post('/api/gemini/scan-number', async (req: Request, res: Response) => {
  try {
    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'Missing image data' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured.' });
    }

    let cleanBase64 = image;
    let mimeType = 'image/jpeg';
    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = match[2];
      }
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const imagePart = {
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: 'This is an image of a barcode, but the camera was unable to scan the barcode lines successfully.\n' +
        'Your task is to locate the printed numeric digits (usually EAN-13, EAN-8, UPC, Code 128, etc. digits printed below or around the barcode lines) in this image.\n' +
        'Please read and extract ONLY the numerical sequence of digits.\n' +
        'Do not include spaces, hyphens, brackets, letters, or any other characters in your output.\n' +
        'Response format: Return ONLY the pure numeric string (e.g. 9780892132683) and absolutely nothing else. If no barcode digits can be found or read, reply NOT_FOUND.',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [imagePart, textPart],
      },
    });

    const resultText = response.text ? response.text.trim() : '';
    let finalCode = '';
    if (resultText && resultText !== 'NOT_FOUND') {
      const numberMatch = resultText.match(/\d{5,}/);
      if (numberMatch) {
        finalCode = numberMatch[0];
      } else {
        const digitsOnly = resultText.replace(/\D/g, '');
        if (digitsOnly.length >= 5) {
          finalCode = digitsOnly;
        }
      }
    }

    res.json({
      barcode: finalCode || null,
      rawText: resultText
    });
  } catch (error: any) {
    console.error('Gemini OCR error:', error);
    res.status(500).json({ error: error?.message || 'An error occurred during scanning' });
  }
});

// Setup Vite or Static Serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Only listen in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening at http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

// Export for Vercel
export default app;
