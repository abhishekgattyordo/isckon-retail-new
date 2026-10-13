import { RecycleBinItem, RecycleItemType, Product, UserProfile, MaterialInwardNote, SalesEvent } from '../../types';
import { getDeletedProducts, restoreProductService, permanentDeleteProductService } from './productService';
import { getDeletedUsers, restoreUserService, permanentDeleteUserService } from './userService';
import { getDeletedInwardNotes, restoreInwardNoteService, permanentDeleteInwardNoteService } from './inwardService';
import { getDeletedEvents, restoreEventService, permanentDeleteEventService } from './eventService';

export async function getAllRecycleBinItems(): Promise<RecycleBinItem[]> {
  const [products, users, inwardNotes, events] = await Promise.all([
    getDeletedProducts().catch(() => [] as Product[]),
    getDeletedUsers().catch(() => [] as UserProfile[]),
    getDeletedInwardNotes().catch(() => [] as MaterialInwardNote[]),
    getDeletedEvents().catch(() => [] as SalesEvent[]),
  ]);

  const items: RecycleBinItem[] = [];

  products.forEach(p => {
    items.push({
      id: p.id,
      type: 'product',
      name: p.name,
      codeOrSku: p.sku,
      categoryOrRole: p.category,
      deletedAt: p.deletedAt || new Date().toISOString(),
      deletedBy: p.deletedBy || 'Staff Member',
      details: `Stock: ${p.stock} units | Price: ₹${p.price.toFixed(2)} | Zone: ${p.warehouseZone}`,
      originalData: p,
    });
  });

  users.forEach(u => {
    items.push({
      id: u.id,
      type: 'user',
      name: u.name,
      codeOrSku: u.email,
      categoryOrRole: u.role,
      deletedAt: u.deletedAt || new Date().toISOString(),
      deletedBy: u.deletedBy || 'Administrator',
      details: `Branch: ${u.branch || 'Mayapur HQ'} | Shift: ${u.shift || 'General'}`,
      originalData: u,
    });
  });

  inwardNotes.forEach(n => {
    items.push({
      id: n.id,
      type: 'inward',
      name: `GRN Note ${n.grnNumber}`,
      codeOrSku: n.grnNumber,
      categoryOrRole: n.vendorName,
      deletedAt: n.deletedAt || new Date().toISOString(),
      deletedBy: n.deletedBy || n.receivedBy || 'Warehouse Staff',
      details: `Vendor: ${n.vendorName} | Total Value: ₹${n.totalValue.toLocaleString()} | Items: ${n.items?.length || 0}`,
      originalData: n,
    });
  });

  events.forEach(e => {
    items.push({
      id: e.id,
      type: 'event',
      name: e.name || 'Untitled Event',
      codeOrSku: (e.type || 'EVENT').toUpperCase(),
      categoryOrRole: (e.status || 'ACTIVE').toUpperCase(),
      deletedAt: e.deletedAt || new Date().toISOString(),
      deletedBy: e.deletedBy || e.managerName || 'Festival Admin',
      details: `Location: ${e.stallLocation || 'Temple Stall'} | Target: ₹${(e.targetRevenue || 0).toLocaleString()}`,
      originalData: e,
    });
  });

  return items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

export async function restoreRecycleItemService(type: RecycleItemType, id: string): Promise<boolean> {
  switch (type) {
    case 'product':
      return restoreProductService(id);
    case 'user':
      return restoreUserService(id);
    case 'inward':
      return restoreInwardNoteService(id);
    case 'event':
      return restoreEventService(id);
    default:
      return false;
  }
}

export async function permanentDeleteRecycleItemService(type: RecycleItemType, id: string): Promise<boolean> {
  switch (type) {
    case 'product':
      return permanentDeleteProductService(id);
    case 'user':
      return permanentDeleteUserService(id);
    case 'inward':
      return permanentDeleteInwardNoteService(id);
    case 'event':
      return permanentDeleteEventService(id);
    default:
      return false;
  }
}

export async function emptyRecycleBinService(type?: RecycleItemType): Promise<{ success: boolean; count: number }> {
  const allItems = await getAllRecycleBinItems();
  const targetItems = type ? allItems.filter(i => i.type === type) : allItems;

  let count = 0;
  for (const item of targetItems) {
    const deleted = await permanentDeleteRecycleItemService(item.type, item.id);
    if (deleted) count++;
  }

  return { success: true, count };
}
