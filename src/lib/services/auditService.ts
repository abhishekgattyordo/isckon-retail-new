import { prisma } from '../prisma';
import { MemoryDb } from '../dbStore';
import { AuditLog, StockMovement } from '../../types';
import { INITIAL_MOVEMENTS } from '../../data/initialData';

if (!MemoryDb.stockMovements || MemoryDb.stockMovements.length === 0) {
  MemoryDb.stockMovements = [...INITIAL_MOVEMENTS];
}

function formatTimestamp(ts: any, fallback?: string): string {
  if (!ts) return fallback || new Date().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toISOString();
  }
  if (typeof ts === 'number') return new Date(ts).toISOString();
  if (typeof ts?.toISOString === 'function') return ts.toISOString();
  return fallback || new Date().toISOString();
}

export async function getAuditLogs(branchId?: string): Promise<AuditLog[]> {
  try {
    if (process.env.DATABASE_URL) {
      const whereClause: any = {};
      if (branchId && branchId !== '*') {
        whereClause.branchId = branchId;
      }
      const logs = await prisma.auditLog.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        orderBy: { timestamp: 'desc' },
      });
      return logs.map(l => ({
        id: l.id,
        userId: l.userId || undefined,
        staffName: l.staffName,
        role: l.role,
        branch: l.branch || undefined,
        action: l.action,
        module: l.module,
        referenceNo: l.referenceNo || undefined,
        details: l.details || undefined,
        timestamp: formatTimestamp(l.timestamp),
      }));
    }
  } catch (error) {
    console.warn('Prisma getAuditLogs failed, falling back to MemoryDb:', error);
  }
  let list = MemoryDb.auditLogs || [];
  if (branchId && branchId !== '*') {
    list = list.filter(l => (l as any).branchId === branchId || l.branch?.toLowerCase().includes(branchId.replace('branch-', '')));
  }
  return list;
}

export async function createAuditLog(
  logData: Omit<AuditLog, 'id' | 'timestamp'>
): Promise<AuditLog> {
  const newLog: AuditLog = {
    ...logData,
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    if (process.env.DATABASE_URL) {
      const dbLog = await prisma.auditLog.create({
        data: {
          id: newLog.id,
          userId: newLog.userId,
          staffName: newLog.staffName,
          role: newLog.role,
          branch: newLog.branch,
          action: newLog.action,
          module: newLog.module,
          referenceNo: newLog.referenceNo,
          details: newLog.details,
          timestamp: new Date(newLog.timestamp),
        },
      });
      return {
        id: dbLog.id,
        userId: dbLog.userId || undefined,
        staffName: dbLog.staffName,
        role: dbLog.role,
        branch: dbLog.branch || undefined,
        action: dbLog.action,
        module: dbLog.module,
        referenceNo: dbLog.referenceNo || undefined,
        details: dbLog.details || undefined,
        timestamp: formatTimestamp(dbLog.timestamp, newLog.timestamp),
      };
    }
  } catch (error) {
    console.warn('Prisma createAuditLog failed, falling back to MemoryDb:', error);
  }

  MemoryDb.auditLogs = [newLog, ...MemoryDb.auditLogs];
  return newLog;
}

export async function getStockMovements(branchId?: string): Promise<StockMovement[]> {
  try {
    if (process.env.DATABASE_URL) {
      const whereClause: any = {};
      if (branchId && branchId !== '*') {
        whereClause.branchId = branchId;
      }
      const movements = await prisma.stockMovement.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        orderBy: { timestamp: 'desc' },
      });
      return movements.map(m => ({
        id: m.id,
        type: m.type as any,
        sku: m.sku,
        productName: m.productName,
        qtyDelta: m.qtyDelta,
        fromZone: m.fromZone || undefined,
        toZone: m.toZone || undefined,
        branchId: (m as any).branchId || undefined,
        branchName: (m as any).branchName || undefined,
        timestamp: formatTimestamp(m.timestamp),
        operator: m.operator || '',
        referenceNo: m.referenceNo || '',
        batchNo: m.batchNo || undefined,
      }));
    }
  } catch (error) {
    console.warn('Prisma getStockMovements failed, falling back to MemoryDb:', error);
  }
  let list = MemoryDb.stockMovements && MemoryDb.stockMovements.length > 0 ? MemoryDb.stockMovements : INITIAL_MOVEMENTS;
  if (branchId && branchId !== '*') {
    list = list.filter(m => {
      if (m.branchId === branchId) return true;
      if (branchId === 'branch-bangalore' && (m.branchName?.toLowerCase().includes('bangalore') || m.sku.startsWith('BLR-'))) return true;
      if (branchId === 'branch-mangalore' && (m.branchName?.toLowerCase().includes('mangalore') || m.sku.startsWith('MGL-'))) return true;
      return false;
    });
  }
  return list;
}

export async function createStockMovement(
  movData: Omit<StockMovement, 'id' | 'timestamp'>
): Promise<StockMovement> {
  const newMov: StockMovement = {
    ...movData,
    id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    if (process.env.DATABASE_URL) {
      const dbMov = await prisma.stockMovement.create({
        data: {
          id: newMov.id,
          type: newMov.type,
          sku: newMov.sku,
          productName: newMov.productName,
          qtyDelta: Number(newMov.qtyDelta),
          fromZone: newMov.fromZone,
          toZone: newMov.toZone,
          branchId: newMov.branchId,
          branchName: newMov.branchName,
          timestamp: new Date(newMov.timestamp),
          operator: newMov.operator,
          referenceNo: newMov.referenceNo,
          batchNo: newMov.batchNo,
        },
      });
      return {
        id: dbMov.id,
        type: dbMov.type as any,
        sku: dbMov.sku,
        productName: dbMov.productName,
        qtyDelta: dbMov.qtyDelta,
        fromZone: dbMov.fromZone || undefined,
        toZone: dbMov.toZone || undefined,
        branchId: (dbMov as any).branchId || undefined,
        branchName: (dbMov as any).branchName || undefined,
        timestamp: formatTimestamp(dbMov.timestamp, newMov.timestamp),
        operator: dbMov.operator || '',
        referenceNo: dbMov.referenceNo || '',
        batchNo: dbMov.batchNo || undefined,
      };
    }
  } catch (error) {
    console.warn('Prisma createStockMovement failed, falling back to MemoryDb:', error);
  }

  MemoryDb.stockMovements = [newMov, ...MemoryDb.stockMovements];
  return newMov;
}
