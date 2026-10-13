import { prisma } from '../prisma';
import { MemoryDb } from '../dbStore';
import { MaterialInwardNote } from '../../types';
import { INITIAL_INWARD_NOTES } from '../../data/initialData';

if (!MemoryDb.inwardNotes || MemoryDb.inwardNotes.length === 0) {
  MemoryDb.inwardNotes = [...INITIAL_INWARD_NOTES];
}

export async function getInwardNotes(includeDeleted = false, branchId?: string): Promise<MaterialInwardNote[]> {
  try {
    if (process.env.DATABASE_URL) {
      const whereClause: any = includeDeleted ? {} : { isDeleted: false };
      if (branchId && branchId !== '*') {
        whereClause.branchId = branchId;
      }
      const dbNotes = await prisma.materialInwardNote.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        include: { items: true },
        orderBy: { grnNumber: 'desc' },
      });
      if (dbNotes && dbNotes.length > 0) {
        return dbNotes.map(n => ({
          ...n,
          status: n.status as any,
          branchId: (n as any).branchId || undefined,
          branchName: (n as any).branchName || undefined,
          isDeleted: n.isDeleted || false,
          deletedAt: n.deletedAt ? n.deletedAt.toISOString() : undefined,
          deletedBy: n.deletedBy || undefined,
        } as unknown as MaterialInwardNote));
      }
    }
  } catch (error) {
    console.warn('Prisma getInwardNotes failed, falling back to MemoryDb:', error);
  }
  const list = MemoryDb.inwardNotes && MemoryDb.inwardNotes.length > 0 ? MemoryDb.inwardNotes : INITIAL_INWARD_NOTES;
  let res = includeDeleted ? list : list.filter(n => !n.isDeleted);
  if (branchId && branchId !== '*') {
    res = res.filter(n => {
      if (n.branchId === branchId) return true;
      if (branchId === 'branch-bangalore' && (n.branchName?.toLowerCase().includes('bangalore') || n.warehouse?.toLowerCase().includes('bangalore') || n.items?.some(i => i.sku.startsWith('BLR-')))) return true;
      if (branchId === 'branch-mangalore' && (n.branchName?.toLowerCase().includes('mangalore') || n.warehouse?.toLowerCase().includes('mangalore') || n.items?.some(i => i.sku.startsWith('MGL-')))) return true;
      return false;
    });
  }
  return res;
}

export async function getDeletedInwardNotes(): Promise<MaterialInwardNote[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbNotes = await prisma.materialInwardNote.findMany({
        where: { isDeleted: true },
        include: { items: true },
        orderBy: { deletedAt: 'desc' },
      });
      return dbNotes.map(n => ({
        ...n,
        status: n.status as any,
        isDeleted: true,
        deletedAt: n.deletedAt ? n.deletedAt.toISOString() : new Date().toISOString(),
        deletedBy: n.deletedBy || undefined,
      } as unknown as MaterialInwardNote));
    }
  } catch (error) {
    console.warn('Prisma getDeletedInwardNotes failed:', error);
  }
  const list = MemoryDb.inwardNotes || [];
  return list.filter(n => n.isDeleted);
}

export async function createInwardNote(noteData: Omit<MaterialInwardNote, 'id'>): Promise<MaterialInwardNote> {
  const newNote: MaterialInwardNote = {
    ...noteData,
    id: `min-${Date.now()}`,
    isDeleted: false,
  };

  try {
    if (process.env.DATABASE_URL) {
      const dbNote = await prisma.materialInwardNote.create({
        data: {
          id: newNote.id,
          grnNumber: newNote.grnNumber,
          poNumber: newNote.poNumber,
          vendorName: newNote.vendorName,
          invoiceDate: newNote.invoiceDate,
          warehouse: newNote.warehouse,
          status: newNote.status,
          totalValue: Number(newNote.totalValue),
          receivedBy: newNote.receivedBy,
          timestamp: newNote.timestamp,
          notes: newNote.notes,
          isDeleted: false,
          items: {
            create: newNote.items.map(item => ({
              sku: item.sku,
              name: item.name,
              quantity: Number(item.quantity),
              unitCost: Number(item.unitCost),
              sellingPrice: item.sellingPrice ? Number(item.sellingPrice) : null,
              batchNo: item.batchNo,
              expiryDate: item.expiryDate,
              taxRate: Number(item.taxRate),
              total: Number(item.total),
            })),
          },
        },
        include: { items: true },
      });

      // Update product stocks, costs, and selling prices
      if (newNote.items && Array.isArray(newNote.items)) {
        for (const item of newNote.items) {
          const prod = await prisma.product.findUnique({ where: { sku: item.sku } });
          if (prod) {
            await prisma.product.update({
              where: { sku: item.sku },
              data: {
                stock: prod.stock + Number(item.quantity),
                cost: item.unitCost ? Number(item.unitCost) : prod.cost,
                price: item.sellingPrice ? Number(item.sellingPrice) : prod.price,
                batchNo: item.batchNo || prod.batchNo,
                lastUpdated: new Date(),
              },
            });
          }
        }
      }

      return {
        ...dbNote,
        status: dbNote.status as any,
        isDeleted: false,
      } as unknown as MaterialInwardNote;
    }
  } catch (error) {
    console.warn('Prisma createInwardNote failed, saving to MemoryDb:', error);
  }

  // Fallback to MemoryDb
  MemoryDb.inwardNotes.unshift(newNote);

  // Automatically update product stock, cost, and selling price in MemoryDb
  if (newNote.items && Array.isArray(newNote.items)) {
    newNote.items.forEach((item: any) => {
      const prod = MemoryDb.products.find(p => p.sku === item.sku);
      if (prod) {
        prod.stock += Number(item.quantity);
        if (item.unitCost) prod.cost = Number(item.unitCost);
        if (item.sellingPrice) prod.price = Number(item.sellingPrice);
        if (item.batchNo) prod.batchNo = item.batchNo;
      }
    });
  }

  return newNote;
}

export async function softDeleteInwardNoteService(id: string, deletedBy = 'System User'): Promise<boolean> {
  const now = new Date();
  try {
    if (process.env.DATABASE_URL) {
      await prisma.materialInwardNote.update({
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
    console.warn('Prisma softDeleteInwardNote failed:', error);
  }

  const idx = MemoryDb.inwardNotes.findIndex(n => n.id === id);
  if (idx !== -1) {
    MemoryDb.inwardNotes[idx] = {
      ...MemoryDb.inwardNotes[idx],
      isDeleted: true,
      deletedAt: now.toISOString(),
      deletedBy,
    };
    return true;
  }
  return false;
}

export async function restoreInwardNoteService(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.materialInwardNote.update({
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
    console.warn('Prisma restoreInwardNote failed:', error);
  }

  const idx = MemoryDb.inwardNotes.findIndex(n => n.id === id);
  if (idx !== -1) {
    MemoryDb.inwardNotes[idx] = {
      ...MemoryDb.inwardNotes[idx],
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
    };
    return true;
  }
  return false;
}

export async function permanentDeleteInwardNoteService(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.materialInwardNote.delete({
        where: { id },
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma permanentDeleteInwardNote failed:', error);
  }

  const idx = MemoryDb.inwardNotes.findIndex(n => n.id === id);
  if (idx !== -1) {
    MemoryDb.inwardNotes.splice(idx, 1);
    return true;
  }
  return false;
}

export const deleteInwardNoteService = softDeleteInwardNoteService;
