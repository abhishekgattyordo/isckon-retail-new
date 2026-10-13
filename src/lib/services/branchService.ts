import { Branch } from '../../types';
import { prisma } from '../prisma';
import { MemoryDb } from '../dbStore';
import { INITIAL_BRANCHES } from '../../data/initialData';

// Initialize in-memory branches
if (MemoryDb.branches.length === 0) {
  MemoryDb.branches = [...INITIAL_BRANCHES];
}

export async function getBranches(): Promise<Branch[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbBranches = await (prisma as any).branch.findMany({
        orderBy: { code: 'asc' }
      });
      if (dbBranches && dbBranches.length > 0) {
        return dbBranches.map((b: any) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          location: b.location,
          city: b.city,
          state: b.state,
          phone: b.phone || undefined,
          email: b.email || undefined,
          isMain: Boolean(b.isMain),
          isActive: b.status !== 'inactive' && b.isActive !== false,
          status: b.status || 'active',
          managerName: b.managerName || undefined
        }));
      }

      // Auto-seed if empty
      for (const b of INITIAL_BRANCHES) {
        try {
          await (prisma as any).branch.upsert({
            where: { id: b.id },
            update: {},
            create: {
              id: b.id,
              code: b.code,
              name: b.name,
              location: b.location,
              city: b.city,
              state: b.state,
              phone: b.phone || null,
              email: b.email || null,
              isMain: Boolean(b.isMain),
              status: b.status || (b.isActive !== false ? 'active' : 'inactive')
            }
          });
        } catch (e) {}
      }
      return [...INITIAL_BRANCHES];
    }
  } catch (error) {
    console.warn('Prisma getBranches failed, falling back to memory store:', error);
  }

  return [...MemoryDb.branches];
}

export async function getBranchById(id: string): Promise<Branch | null> {
  try {
    if (process.env.DATABASE_URL) {
      const b = await (prisma as any).branch.findUnique({
        where: { id }
      });
      if (b) {
        return {
          id: b.id,
          code: b.code,
          name: b.name,
          location: b.location,
          city: b.city,
          state: b.state,
          phone: b.phone || undefined,
          email: b.email || undefined,
          isMain: Boolean(b.isMain),
          isActive: b.isActive !== false
        };
      }
    }
  } catch (error) {
    console.warn('Prisma getBranchById failed:', error);
  }

  const found = MemoryDb.branches.find(b => b.id === id);
  return found ? { ...found } : null;
}

export async function createBranch(branchData: Omit<Branch, 'id'> & { id?: string }): Promise<Branch> {
  const newBranch: Branch = {
    ...branchData,
    id: branchData.id || `branch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    isActive: branchData.isActive !== false,
    isMain: Boolean(branchData.isMain)
  };

  try {
    if (process.env.DATABASE_URL) {
      const created = await (prisma as any).branch.create({
        data: {
          id: newBranch.id,
          code: newBranch.code,
          name: newBranch.name,
          location: newBranch.location,
          city: newBranch.city,
          state: newBranch.state,
          phone: newBranch.phone || null,
          email: newBranch.email || null,
          isMain: newBranch.isMain,
          isActive: newBranch.isActive
        }
      });
      return {
        id: created.id,
        code: created.code,
        name: created.name,
        location: created.location,
        city: created.city,
        state: created.state,
        phone: created.phone || undefined,
        email: created.email || undefined,
        isMain: Boolean(created.isMain),
        isActive: created.isActive !== false
      };
    }
  } catch (error) {
    console.warn('Prisma createBranch failed, falling back to memory store:', error);
  }

  MemoryDb.branches.unshift(newBranch);
  return newBranch;
}

export async function updateBranch(id: string, updates: Partial<Branch>): Promise<Branch | null> {
  try {
    if (process.env.DATABASE_URL) {
      const updated = await (prisma as any).branch.update({
        where: { id },
        data: {
          ...(updates.code && { code: updates.code }),
          ...(updates.name && { name: updates.name }),
          ...(updates.location && { location: updates.location }),
          ...(updates.city && { city: updates.city }),
          ...(updates.state && { state: updates.state }),
          ...(updates.phone !== undefined && { phone: updates.phone }),
          ...(updates.email !== undefined && { email: updates.email }),
          ...(updates.isMain !== undefined && { isMain: updates.isMain }),
          ...(updates.isActive !== undefined && { isActive: updates.isActive })
        }
      });
      return {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        location: updated.location,
        city: updated.city,
        state: updated.state,
        phone: updated.phone || undefined,
        email: updated.email || undefined,
        isMain: Boolean(updated.isMain),
        isActive: updated.isActive !== false
      };
    }
  } catch (error) {
    console.warn('Prisma updateBranch failed, updating in memory store:', error);
  }

  const idx = MemoryDb.branches.findIndex(b => b.id === id);
  if (idx !== -1) {
    MemoryDb.branches[idx] = { ...MemoryDb.branches[idx], ...updates };
    return MemoryDb.branches[idx];
  }
  return null;
}

export async function deleteBranch(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await (prisma as any).branch.delete({
        where: { id }
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma deleteBranch failed:', error);
  }

  const initialLen = MemoryDb.branches.length;
  MemoryDb.branches = MemoryDb.branches.filter(b => b.id !== id);
  return MemoryDb.branches.length < initialLen;
}
