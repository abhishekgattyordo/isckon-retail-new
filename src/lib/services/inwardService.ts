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
  // Strict Backend Validations
  if (!noteData.vendorName || !noteData.vendorName.trim()) {
    throw new Error('Validation Error: Supplier / Vendor Name is mandatory.');
  }
  if (!noteData.poNumber || !noteData.poNumber.trim()) {
    throw new Error('Validation Error: Purchase Order (PO) Number is mandatory.');
  }
  if (!noteData.warehouse || !noteData.warehouse.trim()) {
    throw new Error('Validation Error: Destination Warehouse Zone is mandatory.');
  }
  if (!noteData.items || !Array.isArray(noteData.items) || noteData.items.length === 0) {
    throw new Error('Validation Error: At least one product item row is mandatory for a Goods Received Note.');
  }

  // Validate each item row
  for (let i = 0; i < noteData.items.length; i++) {
    const item = noteData.items[i];
    const rowNum = i + 1;
    if (!item.sku || !item.sku.trim() || item.sku === 'SKU-UNASSIGNED') {
      throw new Error(`Validation Error on Row #${rowNum}: Product SKU selection is mandatory.`);
    }
    if (!item.name || !item.name.trim() || item.name === 'General Merchandise Item') {
      throw new Error(`Validation Error on Row #${rowNum}: Product Name is mandatory.`);
    }
    const qty = Number(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Validation Error on Row #${rowNum} (${item.sku}): Quantity is mandatory and must be greater than 0.`);
    }
    const cost = Number(item.unitCost);
    if (isNaN(cost) || cost < 0) {
      throw new Error(`Validation Error on Row #${rowNum} (${item.sku}): Unit Cost cannot be negative.`);
    }
  }

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

      // Create batch records and update product stocks, costs, and selling prices
      if (newNote.items && Array.isArray(newNote.items)) {
        for (const item of newNote.items) {
          const bNo = item.batchNo || `B-${Math.floor(1000 + Math.random() * 9000)}`;
          const barcodeVal = `BC-${item.sku}-${bNo}`;
          
          await prisma.batch.create({
            data: {
              batchNumber: bNo,
              sku: item.sku,
              productName: item.name,
              purchaseCost: Number(item.unitCost),
              sellingPrice: item.sellingPrice ? Number(item.sellingPrice) : null,
              quantityReceived: Number(item.quantity),
              currentStockBalance: Number(item.quantity),
              inwardDate: newNote.invoiceDate || new Date().toISOString().slice(0, 10),
              grnNumber: newNote.grnNumber,
              barcodeValue: barcodeVal,
              branchId: newNote.branchId,
              branchName: newNote.branchName,
            }
          }).catch(err => console.warn('Prisma batch create warning:', err));

          const prod = await prisma.product.findUnique({ where: { sku: item.sku } });
          if (prod) {
            await prisma.product.update({
              where: { sku: item.sku },
              data: {
                stock: prod.stock + Number(item.quantity),
                cost: item.unitCost ? Number(item.unitCost) : prod.cost,
                price: item.sellingPrice ? Number(item.sellingPrice) : prod.price,
                batchNo: bNo,
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

  // Automatically update product stock, cost, selling price and create batches in MemoryDb
  if (!MemoryDb.batches) MemoryDb.batches = [];
  if (newNote.items && Array.isArray(newNote.items)) {
    newNote.items.forEach((item: any) => {
      const bNo = item.batchNo || `B-${Math.floor(1000 + Math.random() * 9000)}`;
      const barcodeVal = `BC-${item.sku}-${bNo}`;

      MemoryDb.batches.unshift({
        id: `batch-${Date.now()}-${Math.random()}`,
        batchNumber: bNo,
        sku: item.sku,
        productName: item.name,
        purchaseCost: Number(item.unitCost),
        sellingPrice: item.sellingPrice ? Number(item.sellingPrice) : null,
        quantityReceived: Number(item.quantity),
        currentStockBalance: Number(item.quantity),
        inwardDate: newNote.invoiceDate || new Date().toISOString().slice(0, 10),
        grnNumber: newNote.grnNumber,
        barcodeValue: barcodeVal,
        branchId: newNote.branchId,
        branchName: newNote.branchName,
        createdAt: new Date().toISOString()
      });

      const prod = MemoryDb.products.find(p => p.sku === item.sku);
      if (prod) {
        prod.stock += Number(item.quantity);
        if (item.unitCost) prod.cost = Number(item.unitCost);
        if (item.sellingPrice) prod.price = Number(item.sellingPrice);
        prod.batchNo = bNo;
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
