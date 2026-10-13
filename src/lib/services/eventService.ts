import { prisma } from '../prisma';
import { MemoryDb } from '../dbStore';
import { SalesEvent, EventAllocation, EventTransaction } from '../../types';
import { INITIAL_EVENTS } from '../../data/initialData';

if (!MemoryDb.events || MemoryDb.events.length === 0) {
  MemoryDb.events = [...INITIAL_EVENTS];
}

export async function getEvents(includeDeleted = false, branchId?: string): Promise<SalesEvent[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbEvents = await prisma.salesEvent.findMany({
        where: includeDeleted ? (branchId && branchId !== '*' ? { branchId } : undefined) : { isDeleted: false, ...(branchId && branchId !== '*' ? { branchId } : {}) },
        orderBy: { startDate: 'desc' },
      });
      if (dbEvents && dbEvents.length > 0) {
        let mapped = dbEvents.map(e => ({
          ...e,
          type: (e.type || 'stall_booth') as any,
          status: (e.status || 'upcoming') as any,
          branchId: (e as any).branchId || undefined,
          branchName: (e as any).branchName || undefined,
          isDeleted: e.isDeleted || false,
          deletedAt: e.deletedAt ? e.deletedAt.toISOString() : undefined,
          deletedBy: e.deletedBy || undefined,
        } as unknown as SalesEvent));
        if (branchId && branchId !== '*') {
          mapped = mapped.filter(e => {
            if (e.branchId === branchId) return true;
            if (branchId === 'branch-bangalore' && (e.branchName?.toLowerCase().includes('bangalore') || e.stallLocation?.toLowerCase().includes('bangalore'))) return true;
            if (branchId === 'branch-mangalore' && (e.branchName?.toLowerCase().includes('mangalore') || e.stallLocation?.toLowerCase().includes('mangalore'))) return true;
            return false;
          });
        }
        return mapped;
      }
    }
  } catch (error) {
    console.warn('Prisma getEvents failed, falling back to MemoryDb:', error);
  }
  const list = MemoryDb.events && MemoryDb.events.length > 0 ? MemoryDb.events : INITIAL_EVENTS;
  let result = includeDeleted ? list : list.filter(e => !e.isDeleted);
  if (branchId && branchId !== '*') {
    result = result.filter(e => {
      if (e.branchId === branchId) return true;
      if (branchId === 'branch-bangalore' && (e.branchName?.toLowerCase().includes('bangalore') || e.stallLocation?.toLowerCase().includes('bangalore'))) return true;
      if (branchId === 'branch-mangalore' && (e.branchName?.toLowerCase().includes('mangalore') || e.stallLocation?.toLowerCase().includes('mangalore'))) return true;
      return false;
    });
  }
  return result;
}

export async function getDeletedEvents(): Promise<SalesEvent[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbEvents = await prisma.salesEvent.findMany({
        where: { isDeleted: true },
        orderBy: { deletedAt: 'desc' },
      });
      return dbEvents.map(e => ({
        ...e,
        type: e.type as any,
        status: e.status as any,
        isDeleted: true,
        deletedAt: e.deletedAt ? e.deletedAt.toISOString() : new Date().toISOString(),
        deletedBy: e.deletedBy || undefined,
      } as unknown as SalesEvent));
    }
  } catch (error) {
    console.warn('Prisma getDeletedEvents failed:', error);
  }
  const list = MemoryDb.events || [];
  return list.filter(e => e.isDeleted);
}

export async function createEvent(evtData: Omit<SalesEvent, 'id' | 'currentRevenue'> & { id?: string; currentRevenue?: number }): Promise<SalesEvent> {
  const newEvent: SalesEvent = {
    ...evtData,
    id: evtData.id || `evt-${Date.now()}`,
    type: (evtData.type || 'stall_booth') as any,
    status: (evtData.status || 'upcoming') as any,
    currentRevenue: Number(evtData.currentRevenue || 0),
    isDeleted: false,
  };

  try {
    if (process.env.DATABASE_URL) {
      const dbEvent = await prisma.salesEvent.create({
        data: {
          id: newEvent.id,
          name: newEvent.name,
          type: newEvent.type || 'stall_booth',
          startDate: newEvent.startDate,
          endDate: newEvent.endDate,
          status: newEvent.status || 'upcoming',
          targetRevenue: Number(newEvent.targetRevenue || 0),
          currentRevenue: Number(newEvent.currentRevenue || 0),
          allocatedSKUs: Number(newEvent.allocatedSKUs || 0),
          discountRule: newEvent.discountRule,
          description: newEvent.description,
          bannerColor: newEvent.bannerColor,
          stallLocation: newEvent.stallLocation,
          managerName: newEvent.managerName,
          branchId: newEvent.branchId,
          branchName: newEvent.branchName,
          booksSoldQty: newEvent.booksSoldQty,
          booksSoldRevenue: newEvent.booksSoldRevenue,
          giftsSoldQty: newEvent.giftsSoldQty,
          giftsSoldRevenue: newEvent.giftsSoldRevenue,
          isDeleted: false,
        },
      });
      return {
        ...dbEvent,
        type: dbEvent.type as any,
        status: dbEvent.status as any,
        isDeleted: false,
      } as unknown as SalesEvent;
    }
  } catch (error) {
    console.warn('Prisma createEvent failed, saving to MemoryDb:', error);
  }

  MemoryDb.events.push(newEvent);
  return newEvent;
}

export async function softDeleteEventService(id: string, deletedBy = 'System User'): Promise<boolean> {
  const now = new Date();
  try {
    if (process.env.DATABASE_URL) {
      await prisma.salesEvent.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedBy,
        },
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma softDeleteEvent failed:', error);
  }

  const idx = MemoryDb.events.findIndex(e => e.id === id);
  if (idx !== -1) {
    MemoryDb.events[idx] = {
      ...MemoryDb.events[idx],
      isDeleted: true,
      deletedAt: now.toISOString(),
      deletedBy,
    };
    return true;
  }
  return false;
}

export async function restoreEventService(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.salesEvent.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        },
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma restoreEvent failed:', error);
  }

  const idx = MemoryDb.events.findIndex(e => e.id === id);
  if (idx !== -1) {
    MemoryDb.events[idx] = {
      ...MemoryDb.events[idx],
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
    };
    return true;
  }
  return false;
}

export async function permanentDeleteEventService(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.salesEvent.delete({
        where: { id },
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma permanentDeleteEvent failed:', error);
  }

  const idx = MemoryDb.events.findIndex(e => e.id === id);
  if (idx !== -1) {
    MemoryDb.events.splice(idx, 1);
    return true;
  }
  return false;
}

export async function updateEventService(id: string, updates: Partial<SalesEvent>): Promise<SalesEvent | null> {
  try {
    if (process.env.DATABASE_URL) {
      const dataToUpdate: any = {};
      if (updates.name !== undefined) dataToUpdate.name = updates.name;
      if (updates.type !== undefined) dataToUpdate.type = updates.type;
      if (updates.startDate !== undefined) dataToUpdate.startDate = updates.startDate;
      if (updates.endDate !== undefined) dataToUpdate.endDate = updates.endDate;
      if (updates.status !== undefined) dataToUpdate.status = updates.status;
      if (updates.targetRevenue !== undefined) dataToUpdate.targetRevenue = Number(updates.targetRevenue);
      if (updates.currentRevenue !== undefined) dataToUpdate.currentRevenue = Number(updates.currentRevenue);
      if (updates.allocatedSKUs !== undefined) dataToUpdate.allocatedSKUs = Number(updates.allocatedSKUs);
      if (updates.discountRule !== undefined) dataToUpdate.discountRule = updates.discountRule;
      if (updates.description !== undefined) dataToUpdate.description = updates.description;
      if (updates.bannerColor !== undefined) dataToUpdate.bannerColor = updates.bannerColor;
      if (updates.stallLocation !== undefined) dataToUpdate.stallLocation = updates.stallLocation;
      if (updates.managerName !== undefined) dataToUpdate.managerName = updates.managerName;
      if (updates.branchId !== undefined) dataToUpdate.branchId = updates.branchId;
      if (updates.branchName !== undefined) dataToUpdate.branchName = updates.branchName;
      if (updates.booksSoldQty !== undefined) dataToUpdate.booksSoldQty = Number(updates.booksSoldQty);
      if (updates.booksSoldRevenue !== undefined) dataToUpdate.booksSoldRevenue = Number(updates.booksSoldRevenue);
      if (updates.giftsSoldQty !== undefined) dataToUpdate.giftsSoldQty = Number(updates.giftsSoldQty);
      if (updates.giftsSoldRevenue !== undefined) dataToUpdate.giftsSoldRevenue = Number(updates.giftsSoldRevenue);

      const updated = await prisma.salesEvent.update({
        where: { id },
        data: dataToUpdate,
      });

      return {
        ...updated,
        type: updated.type as any,
        status: updated.status as any,
        isDeleted: updated.isDeleted || false,
      } as unknown as SalesEvent;
    }
  } catch (error) {
    console.warn('Prisma updateEventService failed:', error);
  }

  const idx = MemoryDb.events.findIndex(e => e.id === id);
  if (idx !== -1) {
    MemoryDb.events[idx] = { ...MemoryDb.events[idx], ...updates };
    return MemoryDb.events[idx];
  }
  return null;
}

export async function getEventAllocations(eventId?: string): Promise<EventAllocation[]> {
  try {
    if (process.env.DATABASE_URL) {
      const records = await prisma.eventAllocation.findMany({
        where: eventId ? { eventId } : undefined,
        orderBy: { createdAt: 'desc' }
      });
      return records.map(r => ({
        id: r.id,
        eventId: r.eventId,
        sku: r.sku,
        productName: r.productName,
        category: r.category,
        allocatedQty: Number(r.allocatedQty),
        soldQty: Number(r.soldQty),
        damagedQty: Number(r.damagedQty),
        returnedQty: Number(r.returnedQty),
        price: Number(r.price),
      }));
    }
  } catch (error) {
    console.warn('Prisma getEventAllocations failed:', error);
  }

  const list = MemoryDb.eventAllocations || [];
  return eventId ? list.filter(a => a.eventId === eventId) : list;
}

export async function saveEventAllocation(data: EventAllocation): Promise<EventAllocation> {
  const allocId = data.id || `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const allocData: EventAllocation = { ...data, id: allocId };
  try {
    if (process.env.DATABASE_URL) {
      const saved = await prisma.eventAllocation.upsert({
        where: { id: allocData.id },
        update: {
          allocatedQty: Number(allocData.allocatedQty),
          soldQty: Number(allocData.soldQty || 0),
          damagedQty: Number(allocData.damagedQty || 0),
          returnedQty: Number(allocData.returnedQty || 0),
          price: Number(allocData.price),
          productName: allocData.productName,
          category: allocData.category,
        },
        create: {
          id: allocData.id,
          eventId: allocData.eventId,
          sku: allocData.sku,
          productName: allocData.productName,
          category: allocData.category,
          allocatedQty: Number(allocData.allocatedQty),
          soldQty: Number(allocData.soldQty || 0),
          damagedQty: Number(allocData.damagedQty || 0),
          returnedQty: Number(allocData.returnedQty || 0),
          price: Number(allocData.price),
        }
      });
      return {
        id: saved.id,
        eventId: saved.eventId,
        sku: saved.sku,
        productName: saved.productName,
        category: saved.category,
        allocatedQty: Number(saved.allocatedQty),
        soldQty: Number(saved.soldQty),
        damagedQty: Number(saved.damagedQty),
        returnedQty: Number(saved.returnedQty),
        price: Number(saved.price),
      };
    }
  } catch (error: any) {
    console.error('Prisma saveEventAllocation failed:', error);
    throw new Error(`Prisma saveEventAllocation failed: ${error?.message || String(error)}`);
  }

  const idx = MemoryDb.eventAllocations.findIndex(a => a.id === allocData.id);
  if (idx !== -1) {
    MemoryDb.eventAllocations[idx] = { ...allocData };
  } else {
    MemoryDb.eventAllocations.push(allocData);
  }
  return allocData;
}

export async function deleteEventAllocation(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.eventAllocation.delete({
        where: { id }
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma deleteEventAllocation failed:', error);
  }

  const idx = MemoryDb.eventAllocations.findIndex(a => a.id === id);
  if (idx !== -1) {
    MemoryDb.eventAllocations.splice(idx, 1);
    return true;
  }
  return false;
}

export async function getEventTransactions(eventId?: string): Promise<EventTransaction[]> {
  try {
    if (process.env.DATABASE_URL) {
      const records = await prisma.eventTransaction.findMany({
        where: eventId ? { eventId } : undefined,
        orderBy: { timestamp: 'desc' }
      });
      return records.map(r => ({
        id: r.id,
        eventId: r.eventId,
        orderNumber: r.orderNumber,
        items: r.items as any,
        subtotal: Number(r.subtotal),
        taxAmount: Number(r.taxAmount),
        discountAmount: Number(r.discountAmount),
        total: Number(r.total),
        paymentMethod: r.paymentMethod as any,
        timestamp: r.timestamp ? r.timestamp.toISOString() : new Date().toISOString(),
        cashierName: r.cashierName || 'Store Manager',
      }));
    }
  } catch (error) {
    console.warn('Prisma getEventTransactions failed:', error);
  }

  const list = MemoryDb.eventTransactions || [];
  return eventId ? list.filter(t => t.eventId === eventId) : list;
}

export async function createEventTransaction(data: EventTransaction): Promise<EventTransaction> {
  const txId = data.id || `etx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const txData: EventTransaction = { ...data, id: txId };
  try {
    if (process.env.DATABASE_URL) {
      const saved = await prisma.eventTransaction.create({
        data: {
          id: txData.id,
          eventId: txData.eventId,
          orderNumber: txData.orderNumber,
          items: txData.items as any,
          subtotal: Number(txData.subtotal),
          taxAmount: Number(txData.taxAmount || 0),
          discountAmount: Number(txData.discountAmount || 0),
          total: Number(txData.total),
          paymentMethod: txData.paymentMethod,
          timestamp: txData.timestamp ? new Date(txData.timestamp) : new Date(),
          cashierName: txData.cashierName || 'Store Manager',
        }
      });
      return {
        id: saved.id,
        eventId: saved.eventId,
        orderNumber: saved.orderNumber,
        items: saved.items as any,
        subtotal: Number(saved.subtotal),
        taxAmount: Number(saved.taxAmount),
        discountAmount: Number(saved.discountAmount),
        total: Number(saved.total),
        paymentMethod: saved.paymentMethod as any,
        timestamp: saved.timestamp ? (saved.timestamp instanceof Date ? saved.timestamp.toISOString() : new Date(saved.timestamp).toISOString()) : new Date().toISOString(),
        cashierName: saved.cashierName || 'Store Manager',
      };
    }
  } catch (error: any) {
    console.error('Prisma createEventTransaction failed:', error);
    throw new Error(`Prisma createEventTransaction failed: ${error?.message || String(error)}`);
  }

  MemoryDb.eventTransactions.unshift(txData);
  return txData;
}

export const deleteEventService = softDeleteEventService;

