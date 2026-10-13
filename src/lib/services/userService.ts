import { prisma } from '../prisma';
import { MemoryDb } from '../dbStore';
import { UserProfile } from '../../types';
import { INITIAL_USERS } from '../../data/initialData';

let userSchemaChecked = false;

export async function getUsers(includeDeleted = false, branchId?: string): Promise<UserProfile[]> {
  try {
    if (process.env.DATABASE_URL) {
      if (!userSchemaChecked) {
        try {
          await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS users (
              id VARCHAR(64) PRIMARY KEY,
              name VARCHAR(255) NOT NULL,
              email VARCHAR(255) UNIQUE NOT NULL,
              role VARCHAR(64) NOT NULL,
              avatar TEXT,
              branch VARCHAR(255),
              branch_id VARCHAR(255),
              accessible_branch_ids TEXT[] DEFAULT '{}',
              shift VARCHAR(64),
              is_active BOOLEAN DEFAULT TRUE,
              permissions TEXT[] DEFAULT '{}',
              password VARCHAR(255) NOT NULL,
              is_deleted BOOLEAN DEFAULT FALSE,
              deleted_at TIMESTAMP WITH TIME ZONE,
              deleted_by VARCHAR(255),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
          `).catch(() => {});
          await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255)').catch(() => {});
          await prisma.$executeRawUnsafe("ALTER TABLE users ADD COLUMN IF NOT EXISTS accessible_branch_ids TEXT[] DEFAULT '{}'").catch(() => {});
          userSchemaChecked = true;
        } catch {
          userSchemaChecked = true;
        }
      }

      const dbUsers = await prisma.user.findMany({
        where: includeDeleted ? undefined : { isDeleted: false },
        orderBy: { createdAt: 'asc' },
      });

      if (dbUsers.length === 0) {
        for (const u of INITIAL_USERS) {
          try {
            await prisma.user.upsert({
              where: { id: u.id },
              update: {},
              create: {
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                avatar: u.avatar,
                branch: u.branch,
                branchId: u.branchId,
                accessibleBranchIds: u.accessibleBranchIds || [],
                shift: u.shift,
                isActive: u.isActive,
                permissions: u.permissions || [],
                password: u.password || 'password108',
                isDeleted: false
              }
            });
          } catch (e) {}
        }
        MemoryDb.users = [...INITIAL_USERS];
        let initialList = [...INITIAL_USERS];
        if (branchId && branchId !== '*' && branchId !== 'all-branches') {
          initialList = initialList.filter(u =>
            u.branchId === branchId ||
            (u.accessibleBranchIds && u.accessibleBranchIds.includes(branchId)) ||
            (branchId === 'branch-bangalore' && (u.branch?.toLowerCase().includes('bangalore') || u.branch?.toLowerCase().includes('blr'))) ||
            (branchId === 'branch-mangalore' && (u.branch?.toLowerCase().includes('mangalore') || u.branch?.toLowerCase().includes('mgl')))
          );
        }
        return initialList;
      }

      let mappedUsers = dbUsers.map(u => {
        const branchIdVal = (u as any).branchId || (
          u.branch?.toLowerCase().includes('bangalore') || u.branch?.toLowerCase().includes('blr') ? 'branch-bangalore' :
          u.branch?.toLowerCase().includes('mangalore') || u.branch?.toLowerCase().includes('mgl') ? 'branch-mangalore' :
          u.branch?.toLowerCase().includes('vrindavan') ? 'branch-vrindavan-store' :
          u.branch?.toLowerCase().includes('juhu') || u.branch?.toLowerCase().includes('mumbai') ? 'branch-mumbai-juhu' :
          u.branch?.toLowerCase().includes('delhi') ? 'branch-delhi-glory' :
          'branch-mayapur-hq'
        );
        const accessibleBranchIds = (u as any).accessibleBranchIds?.length
          ? (u as any).accessibleBranchIds
          : (u.role === 'Super Admin' || u.role === 'Administrator' || u.role === 'System Admin'
              ? ['*']
              : [branchIdVal]);

        const rawPerms = (u.permissions || []) as any[];
        const permissions = rawPerms;

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as UserProfile['role'],
          avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          branch: u.branch || 'Mayapur HQ Central',
          branchId: branchIdVal,
          accessibleBranchIds,
          shift: u.shift || '08:00 – 17:00 IST',
          isActive: u.isActive,
          permissions,
          password: u.password,
          isDeleted: u.isDeleted || false,
          deletedAt: u.deletedAt ? u.deletedAt.toISOString() : undefined,
          deletedBy: u.deletedBy || undefined,
        };
      });

      MemoryDb.users = mappedUsers;
      if (branchId && branchId !== '*' && branchId !== 'all-branches') {
        mappedUsers = mappedUsers.filter(u =>
          u.branchId === branchId ||
          (u.accessibleBranchIds && u.accessibleBranchIds.includes(branchId)) ||
          (branchId === 'branch-bangalore' && (u.branch?.toLowerCase().includes('bangalore') || u.branch?.toLowerCase().includes('blr'))) ||
          (branchId === 'branch-mangalore' && (u.branch?.toLowerCase().includes('mangalore') || u.branch?.toLowerCase().includes('mgl')))
        );
      }
      return mappedUsers;
    }
  } catch (error) {
    // If DB is offline, fallback to MemoryDb
  }

  if (!MemoryDb.users || MemoryDb.users.length === 0) {
    MemoryDb.users = [...INITIAL_USERS];
  }
  let list = MemoryDb.users || [];
  let res = includeDeleted ? list : list.filter(u => !u.isDeleted);
  if (branchId && branchId !== '*' && branchId !== 'all-branches') {
    res = res.filter(u =>
      u.branchId === branchId ||
      (u.accessibleBranchIds && u.accessibleBranchIds.includes(branchId)) ||
      (branchId === 'branch-bangalore' && (u.branch?.toLowerCase().includes('bangalore') || u.branch?.toLowerCase().includes('blr'))) ||
      (branchId === 'branch-mangalore' && (u.branch?.toLowerCase().includes('mangalore') || u.branch?.toLowerCase().includes('mgl')))
    );
  }
  return res;
}

export async function getDeletedUsers(): Promise<UserProfile[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbUsers = await prisma.user.findMany({
        where: { isDeleted: true },
        orderBy: { deletedAt: 'desc' },
      });

      return dbUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserProfile['role'],
        avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        branch: u.branch || 'Main Temple Store — Mayapur HQ',
        shift: u.shift || '08:00 – 17:00 IST',
        isActive: u.isActive,
        permissions: (u.permissions || []) as any[],
        password: u.password,
        isDeleted: true,
        deletedAt: u.deletedAt ? u.deletedAt.toISOString() : new Date().toISOString(),
        deletedBy: u.deletedBy || undefined,
      }));
    }
  } catch (error) {
    console.warn('Prisma getDeletedUsers failed:', error);
  }

  const list = MemoryDb.users || [];
  return list.filter(u => u.isDeleted);
}

export async function createUser(userData: Omit<UserProfile, 'id'>): Promise<UserProfile> {
  const newUser: UserProfile = {
    ...userData,
    avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    branch: userData.branch || 'Main Temple Store — Mayapur HQ',
    shift: userData.shift || '08:00 – 17:00 IST',
    id: `user-${Date.now()}`,
    isDeleted: false,
  };

  let resultUser = newUser;

  try {
    if (process.env.DATABASE_URL) {
      const dbUser = await prisma.user.create({
        data: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar,
          branch: newUser.branch,
          branchId: newUser.branchId,
          accessibleBranchIds: newUser.accessibleBranchIds || [],
          shift: newUser.shift,
          isActive: newUser.isActive,
          permissions: (newUser.permissions || []) as string[],
          password: newUser.password || 'password108',
          isDeleted: false,
        },
      });

      resultUser = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role as UserProfile['role'],
        avatar: dbUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        branch: dbUser.branch || 'Main Temple Store — Mayapur HQ',
        branchId: (dbUser as any).branchId || newUser.branchId,
        accessibleBranchIds: (dbUser as any).accessibleBranchIds || newUser.accessibleBranchIds,
        shift: dbUser.shift || '08:00 – 17:00 IST',
        isActive: dbUser.isActive,
        permissions: (dbUser.permissions || []) as any[],
        password: dbUser.password,
        isDeleted: false,
      };
    }
  } catch (error) {
    console.warn('Prisma createUser failed, saving to MemoryDb:', error);
  }

  MemoryDb.users = MemoryDb.users || [];
  const existingIdx = MemoryDb.users.findIndex(u => u.email.toLowerCase() === resultUser.email.toLowerCase() || u.id === resultUser.id);
  if (existingIdx >= 0) {
    MemoryDb.users[existingIdx] = resultUser;
  } else {
    MemoryDb.users.push(resultUser);
  }
  return resultUser;
}

export async function updateUserService(id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  try {
    if (process.env.DATABASE_URL) {
      const dbUser = await prisma.user.update({
        where: { id },
        data: {
          name: updates.name,
          email: updates.email,
          role: updates.role,
          avatar: updates.avatar,
          branch: updates.branch,
          branchId: updates.branchId,
          accessibleBranchIds: updates.accessibleBranchIds,
          shift: updates.shift,
          isActive: updates.isActive,
          permissions: updates.permissions ? (updates.permissions as string[]) : undefined,
          password: updates.password,
          isDeleted: updates.isDeleted,
          deletedAt: updates.deletedAt ? new Date(updates.deletedAt) : updates.deletedAt === null ? null : undefined,
          deletedBy: updates.deletedBy,
        },
      });

      const updatedProfile: UserProfile = {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role as UserProfile['role'],
        avatar: dbUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        branch: dbUser.branch || 'Main Temple Store — Mayapur HQ',
        branchId: (dbUser as any).branchId,
        accessibleBranchIds: (dbUser as any).accessibleBranchIds,
        shift: dbUser.shift || '08:00 – 17:00 IST',
        isActive: dbUser.isActive,
        permissions: (dbUser.permissions || []) as any[],
        password: dbUser.password,
        isDeleted: dbUser.isDeleted || false,
        deletedAt: dbUser.deletedAt ? dbUser.deletedAt.toISOString() : undefined,
        deletedBy: dbUser.deletedBy || undefined,
      };

      if (MemoryDb.users) {
        const idx = MemoryDb.users.findIndex(u => u.id === id);
        if (idx >= 0) {
          MemoryDb.users[idx] = { ...MemoryDb.users[idx], ...updatedProfile };
        }
      }

      return updatedProfile;
    }
  } catch (error) {
    console.warn('Prisma updateUserService failed, updating MemoryDb:', error);
  }

  MemoryDb.users = MemoryDb.users || [];
  const idx = MemoryDb.users.findIndex(u => u.id === id);
  if (idx >= 0) {
    MemoryDb.users[idx] = { ...MemoryDb.users[idx], ...updates };
    return MemoryDb.users[idx];
  }
  return null;
}

export async function softDeleteUserService(id: string, deletedBy = 'System User'): Promise<boolean> {
  const now = new Date();
  try {
    if (process.env.DATABASE_URL) {
      await prisma.user.update({
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
    console.warn('Prisma softDeleteUserService failed:', error);
  }

  MemoryDb.users = MemoryDb.users || [];
  const idx = MemoryDb.users.findIndex(u => u.id === id);
  if (idx !== -1) {
    MemoryDb.users[idx] = {
      ...MemoryDb.users[idx],
      isDeleted: true,
      deletedAt: now.toISOString(),
      deletedBy,
    };
    return true;
  }
  return false;
}

export async function restoreUserService(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.user.update({
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
    console.warn('Prisma restoreUserService failed:', error);
  }

  MemoryDb.users = MemoryDb.users || [];
  const idx = MemoryDb.users.findIndex(u => u.id === id);
  if (idx !== -1) {
    MemoryDb.users[idx] = {
      ...MemoryDb.users[idx],
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
    };
    return true;
  }
  return false;
}

export async function permanentDeleteUserService(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma permanentDeleteUserService failed, removing from MemoryDb:', error);
  }

  MemoryDb.users = MemoryDb.users || [];
  const idx = MemoryDb.users.findIndex(u => u.id === id);
  if (idx !== -1) {
    MemoryDb.users.splice(idx, 1);
    return true;
  }
  return false;
}

export const deleteUserService = softDeleteUserService;
