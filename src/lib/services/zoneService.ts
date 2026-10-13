import { WarehouseZone } from '../../types';
import { prisma } from '../prisma';
import { MemoryDb } from '../dbStore';
import { INITIAL_ZONES } from '../../data/initialData';
import { calculateZoneStats } from '../warehouseUtils';

// Initialize in-memory fallback
if (MemoryDb.zones.length === 0) {
  MemoryDb.zones = [...INITIAL_ZONES];
}

export async function getWarehouseZones(branchId?: string): Promise<WarehouseZone[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbZones = await prisma.warehouseZone.findMany({
        orderBy: { code: 'asc' }
      });

      if (dbZones && dbZones.length > 0) {
        let mapped: WarehouseZone[] = dbZones.map((z: any) => ({
          id: z.id,
          code: z.code,
          name: z.name,
          description: z.description || '',
          capacity: Number(z.capacityLimit) || 1000,
          currentOccupancy: Number(z.currentOccupancyPercent) || 0,
          tempType: 'ambient',
          manager: z.managerInCharge || 'Store Manager',
          activeSKUs: 0,
          branchId: z.branchId || undefined,
          branchName: z.branchName || undefined
        }));

        if (branchId && branchId !== '*') {
          mapped = mapped.filter(z => !z.branchId || z.branchId === branchId);
        }

        return mapped;
      }

      // Auto-seed initial zones if database table is empty
      for (const z of INITIAL_ZONES) {
        try {
          await prisma.warehouseZone.upsert({
            where: { id: z.id },
            update: {},
            create: {
              id: z.id,
              code: z.code,
              name: z.name,
              description: z.description || null,
              capacityLimit: Number(z.capacity) || 1000,
              currentOccupancyPercent: 0,
              managerInCharge: z.manager || 'Store Manager',
              securityLevel: 'Standard',
              branchId: z.branchId || 'branch-mayapur-hq',
              branchName: z.branchName || 'Mayapur HQ Central'
            }
          });
        } catch (e) {
          console.warn('Could not auto-seed zone:', z.code, e);
        }
      }

      const seeded = await prisma.warehouseZone.findMany({ orderBy: { code: 'asc' } });
      return seeded.map((z: any) => ({
        id: z.id,
        code: z.code,
        name: z.name,
        description: z.description || '',
        capacity: Number(z.capacityLimit) || 1000,
        currentOccupancy: 0,
        tempType: 'ambient',
        manager: z.managerInCharge || 'Store Manager',
        activeSKUs: 0,
        branchId: z.branchId || undefined,
        branchName: z.branchName || undefined
      }));
    }
  } catch (error) {
    console.warn('Prisma getWarehouseZones failed, using memory store fallback:', error);
  }

  return MemoryDb.zones.length > 0 ? MemoryDb.zones : INITIAL_ZONES;
}

export async function createWarehouseZone(data: Partial<WarehouseZone>): Promise<WarehouseZone> {
  const newZone: WarehouseZone = {
    id: data.id || `zone-${Date.now()}`,
    code: (data.code || `Z-${Math.floor(100 + Math.random() * 900)}`).toUpperCase(),
    name: data.name || 'New Storage Zone',
    description: data.description || '',
    capacity: Number(data.capacity) || 1000,
    currentOccupancy: 0,
    tempType: data.tempType || 'ambient',
    manager: data.manager || 'Store Manager',
    activeSKUs: 0,
    warehouseName: data.warehouseName,
    aislesCount: data.aislesCount || 4,
    shelvesPerAisle: data.shelvesPerAisle || 4,
    location: data.location || '',
    branchId: data.branchId,
    branchName: data.branchName
  };

  try {
    if (process.env.DATABASE_URL) {
      await prisma.warehouseZone.create({
        data: {
          id: newZone.id,
          code: newZone.code,
          name: newZone.name,
          description: newZone.description || null,
          capacityLimit: Number(newZone.capacity) || 1000,
          currentOccupancyPercent: 0,
          managerInCharge: newZone.manager,
          securityLevel: 'Standard',
          branchId: newZone.branchId || null,
          branchName: newZone.branchName || null
        }
      });
    }
  } catch (err) {
    console.warn('Could not persist zone to database:', err);
  }

  MemoryDb.zones.push(newZone);
  return newZone;
}
