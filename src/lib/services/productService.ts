import { prisma } from '../prisma';
import { MemoryDb } from '../dbStore';
import { Product } from '../../types';
import { INITIAL_PRODUCTS } from '../../data/initialData';

if (MemoryDb.products.length === 0) {
  MemoryDb.products = [...INITIAL_PRODUCTS];
}

export async function getProducts(includeDeleted = false, branchId?: string): Promise<Product[]> {
  try {
    if (process.env.DATABASE_URL) {
      try {
        const statements = [
          'ALTER TABLE products ADD COLUMN IF NOT EXISTS branch_id VARCHAR(255)',
          'ALTER TABLE products ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255)',
          "UPDATE products SET branch_id = 'branch-mangalore', branch_name = 'Mangalore ISKCON Jagannath Mandir' WHERE (branch_id IS NULL OR branch_id = '') AND (sku LIKE 'MGL-%' OR warehouse_zone LIKE '%Mangalore%')",
          "UPDATE products SET branch_id = 'branch-bangalore', branch_name = 'Bangalore ISKCON Sri Radha Krishna Temple' WHERE (branch_id IS NULL OR branch_id = '') AND (sku LIKE 'BLR-%' OR warehouse_zone LIKE '%Bangalore%')",
          "UPDATE products SET branch_id = 'branch-vrindavan-store', branch_name = 'Vrindavan Krishna Balaram Mandir' WHERE (branch_id IS NULL OR branch_id = '') AND (sku LIKE 'VRN-%' OR warehouse_zone LIKE '%Vrindavan%')",
          "UPDATE products SET branch_id = 'branch-mumbai-juhu', branch_name = 'Mumbai Juhu Hare Krishna Land' WHERE (branch_id IS NULL OR branch_id = '') AND (sku LIKE 'BOM-%' OR warehouse_zone LIKE '%Mumbai%' OR warehouse_zone LIKE '%Juhu%')",
          "UPDATE products SET branch_id = 'branch-delhi-glory', branch_name = 'Delhi Glory of India Centre' WHERE (branch_id IS NULL OR branch_id = '') AND (sku LIKE 'DEL-%' OR warehouse_zone LIKE '%Delhi%')",
          "UPDATE products SET branch_id = 'branch-mayapur-hq', branch_name = 'Mayapur HQ Central' WHERE branch_id IS NULL OR branch_id = ''"
        ];
        for (const stmt of statements) {
          await prisma.$executeRawUnsafe(stmt).catch(() => {});
        }
      } catch (e) {}

      const whereClause: any = includeDeleted ? {} : { isDeleted: false };
      if (branchId && branchId !== '*') {
        whereClause.branchId = branchId;
      }
      const dbProducts = await prisma.product.findMany({
        where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        orderBy: { lastUpdated: 'desc' },
      });

      if (dbProducts && dbProducts.length > 0) {
        const mapped = dbProducts.map(p => {
          const bId = (p as any).branchId || (
            p.sku?.startsWith('MGL-') || p.warehouseZone?.includes('Mangalore') ? 'branch-mangalore' :
            p.sku?.startsWith('BLR-') || p.warehouseZone?.includes('Bangalore') ? 'branch-bangalore' :
            p.sku?.startsWith('VRN-') || p.warehouseZone?.includes('Vrindavan') ? 'branch-vrindavan-store' :
            p.sku?.startsWith('BOM-') || p.warehouseZone?.includes('Mumbai') ? 'branch-mumbai-juhu' :
            p.sku?.startsWith('DEL-') || p.warehouseZone?.includes('Delhi') ? 'branch-delhi-glory' :
            'branch-mayapur-hq'
          );
          const bName = (p as any).branchName || (
            bId === 'branch-mangalore' ? 'Mangalore ISKCON Jagannath Mandir' :
            bId === 'branch-bangalore' ? 'Bangalore ISKCON Sri Radha Krishna Temple' :
            bId === 'branch-vrindavan-store' ? 'Vrindavan Krishna Balaram Mandir' :
            bId === 'branch-mumbai-juhu' ? 'Mumbai Juhu Hare Krishna Land' :
            bId === 'branch-delhi-glory' ? 'Delhi Glory of India Centre' :
            'Mayapur HQ Central'
          );

          return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            price: Number(p.price),
            cost: Number(p.cost),
            stock: p.stock,
            minStock: p.minStock,
            warehouseZone: p.warehouseZone,
            batchNo: p.batchNo || '',
            barcode: p.barcode || '',
            imageUrl: p.imageUrl || '',
            status: p.status as any,
            lastUpdated: p.lastUpdated ? p.lastUpdated.toISOString() : new Date().toISOString(),
            supplier: p.supplier || '',
            rating: Number(p.rating || 5),
            description: p.description || undefined,
            tags: p.tags || [],
            branchId: bId,
            branchName: bName,
            isDeleted: p.isDeleted || false,
            deletedAt: p.deletedAt ? p.deletedAt.toISOString() : undefined,
            deletedBy: p.deletedBy || undefined,
          };
        });

        if (branchId && branchId !== '*') {
          return mapped.filter(p => {
            if (p.branchId === branchId) return true;
            if (branchId === 'branch-bangalore' && (p.sku?.startsWith('BLR-') || p.branchName?.toLowerCase().includes('bangalore') || p.warehouseZone?.toLowerCase().includes('bangalore'))) return true;
            if (branchId === 'branch-mangalore' && (p.sku?.startsWith('MGL-') || p.branchName?.toLowerCase().includes('mangalore') || p.warehouseZone?.toLowerCase().includes('mangalore'))) return true;
            return false;
          });
        }
        return mapped;
      }

      // Auto-seed initial catalog into database if database products table is empty
      if (!includeDeleted) {
        for (const p of INITIAL_PRODUCTS) {
          try {
            await prisma.product.upsert({
              where: { id: p.id },
              update: {},
              create: {
                id: p.id,
                sku: p.sku,
                name: p.name,
                category: p.category,
                price: p.price,
                cost: p.cost,
                stock: p.stock,
                minStock: p.minStock,
                warehouseZone: p.warehouseZone,
                batchNo: p.batchNo || '',
                barcode: p.barcode || '',
                imageUrl: p.imageUrl || '',
                status: p.status,
                supplier: p.supplier || '',
                rating: p.rating || 5,
                description: p.description || '',
                tags: p.tags || [],
                branchId: p.branchId || 'branch-mayapur-hq',
                branchName: p.branchName || 'Mayapur HQ Central',
                isDeleted: false
              }
            });
          } catch (e) {}
        }
        let seeded = [...INITIAL_PRODUCTS];
        if (branchId && branchId !== '*') {
          seeded = seeded.filter(p => p.branchId === branchId);
        }
        return seeded;
      }
    }
  } catch (error) {
    console.warn('Prisma getProducts failed:', error);
  }

  const list = MemoryDb.products.length > 0 ? MemoryDb.products : INITIAL_PRODUCTS;
  let res = includeDeleted ? list : list.filter(p => !p.isDeleted);
  if (branchId && branchId !== '*') {
    res = res.filter(p => {
      if (p.branchId === branchId) return true;
      if (branchId === 'branch-bangalore' && (p.sku?.startsWith('BLR-') || p.branchName?.toLowerCase().includes('bangalore') || p.warehouseZone?.toLowerCase().includes('bangalore'))) return true;
      if (branchId === 'branch-mangalore' && (p.sku?.startsWith('MGL-') || p.branchName?.toLowerCase().includes('mangalore') || p.warehouseZone?.toLowerCase().includes('mangalore'))) return true;
      return false;
    });
  }
  return res;
}

export async function getDeletedProducts(): Promise<Product[]> {
  try {
    if (process.env.DATABASE_URL) {
      const dbProducts = await prisma.product.findMany({
        where: { isDeleted: true },
        orderBy: { deletedAt: 'desc' },
      });

      return dbProducts.map(p => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        price: Number(p.price),
        cost: Number(p.cost),
        stock: p.stock,
        minStock: p.minStock,
        warehouseZone: p.warehouseZone,
        batchNo: p.batchNo || '',
        barcode: p.barcode || '',
        imageUrl: p.imageUrl || '',
        status: p.status as any,
        lastUpdated: p.lastUpdated ? p.lastUpdated.toISOString() : new Date().toISOString(),
        supplier: p.supplier || '',
        rating: Number(p.rating || 5),
        description: p.description || undefined,
        tags: p.tags || [],
        isDeleted: true,
        deletedAt: p.deletedAt ? p.deletedAt.toISOString() : new Date().toISOString(),
        deletedBy: p.deletedBy || undefined,
      }));
    }
  } catch (error) {
    console.warn('Prisma getDeletedProducts failed:', error);
  }

  const list = MemoryDb.products || [];
  return list.filter(p => p.isDeleted);
}

export async function createProduct(prodData: Omit<Product, 'id' | 'lastUpdated'>): Promise<Product> {
  const newProduct: Product = {
    ...prodData,
    id: `prod-${Date.now()}`,
    branchId: prodData.branchId || 'branch-mayapur-hq',
    branchName: prodData.branchName || 'Mayapur HQ Central',
    lastUpdated: new Date().toISOString(),
    isDeleted: false,
  };

  try {
    if (process.env.DATABASE_URL) {
      const dbProd = await prisma.product.create({
        data: {
          id: newProduct.id,
          sku: newProduct.sku,
          name: newProduct.name,
          category: newProduct.category,
          price: Number(newProduct.price),
          cost: Number(newProduct.cost),
          stock: Number(newProduct.stock),
          minStock: Number(newProduct.minStock),
          warehouseZone: newProduct.warehouseZone,
          batchNo: newProduct.batchNo,
          barcode: newProduct.barcode,
          imageUrl: newProduct.imageUrl,
          status: newProduct.status,
          supplier: newProduct.supplier,
          rating: Number(newProduct.rating),
          description: newProduct.description,
          tags: newProduct.tags || [],
          branchId: newProduct.branchId,
          branchName: newProduct.branchName,
          isDeleted: false,
        },
      });
      return {
        id: dbProd.id,
        sku: dbProd.sku,
        name: dbProd.name,
        category: dbProd.category,
        price: Number(dbProd.price),
        cost: Number(dbProd.cost),
        stock: dbProd.stock,
        minStock: dbProd.minStock,
        warehouseZone: dbProd.warehouseZone,
        batchNo: dbProd.batchNo || '',
        barcode: dbProd.barcode || '',
        imageUrl: dbProd.imageUrl || '',
        status: dbProd.status as any,
        lastUpdated: dbProd.lastUpdated ? dbProd.lastUpdated.toISOString() : new Date().toISOString(),
        supplier: dbProd.supplier || '',
        rating: Number(dbProd.rating || 5),
        description: dbProd.description || undefined,
        tags: dbProd.tags || [],
        branchId: (dbProd as any).branchId || newProduct.branchId,
        branchName: (dbProd as any).branchName || newProduct.branchName,
        isDeleted: false,
      };
    }
  } catch (error) {
    console.warn('Prisma createProduct failed, saving to MemoryDb:', error);
  }

  MemoryDb.products.unshift(newProduct);
  return newProduct;
}

export async function updateProductService(id: string, updates: Partial<Product>): Promise<Product | null> {
  try {
    if (process.env.DATABASE_URL) {
      const updated = await prisma.product.update({
        where: { id },
        data: {
          sku: updates.sku,
          name: updates.name,
          category: updates.category,
          price: updates.price !== undefined ? Number(updates.price) : undefined,
          cost: updates.cost !== undefined ? Number(updates.cost) : undefined,
          stock: updates.stock !== undefined ? Number(updates.stock) : undefined,
          minStock: updates.minStock !== undefined ? Number(updates.minStock) : undefined,
          warehouseZone: updates.warehouseZone,
          batchNo: updates.batchNo,
          barcode: updates.barcode,
          imageUrl: updates.imageUrl,
          status: updates.status,
          supplier: updates.supplier,
          rating: updates.rating !== undefined ? Number(updates.rating) : undefined,
          description: updates.description,
          tags: updates.tags,
          branchId: updates.branchId,
          branchName: updates.branchName,
          isDeleted: updates.isDeleted,
          deletedAt: updates.deletedAt ? new Date(updates.deletedAt) : updates.deletedAt === null ? null : undefined,
          deletedBy: updates.deletedBy,
          lastUpdated: new Date(),
        },
      });
      return {
        id: updated.id,
        sku: updated.sku,
        name: updated.name,
        category: updated.category,
        price: Number(updated.price),
        cost: Number(updated.cost),
        stock: updated.stock,
        minStock: updated.minStock,
        warehouseZone: updated.warehouseZone,
        batchNo: updated.batchNo || '',
        barcode: updated.barcode || '',
        imageUrl: updated.imageUrl || '',
        status: updated.status as any,
        lastUpdated: updated.lastUpdated ? updated.lastUpdated.toISOString() : new Date().toISOString(),
        supplier: updated.supplier || '',
        rating: Number(updated.rating || 5),
        description: updated.description || undefined,
        tags: updated.tags || [],
        branchId: (updated as any).branchId || updates.branchId,
        branchName: (updated as any).branchName || updates.branchName,
        isDeleted: updated.isDeleted,
        deletedAt: updated.deletedAt ? updated.deletedAt.toISOString() : undefined,
        deletedBy: updated.deletedBy || undefined,
      };
    }
  } catch (error) {
    console.warn('Prisma updateProduct failed, updating in MemoryDb:', error);
  }

  const idx = MemoryDb.products.findIndex(p => p.id === id);
  if (idx !== -1) {
    const updated = { ...MemoryDb.products[idx], ...updates, lastUpdated: new Date().toISOString() };
    MemoryDb.products[idx] = updated;
    return updated;
  }
  return null;
}

export async function softDeleteProductService(id: string, deletedBy = 'System User'): Promise<boolean> {
  const now = new Date();
  try {
    if (process.env.DATABASE_URL) {
      await prisma.product.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: now,
          deletedBy,
          lastUpdated: now,
        },
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma softDeleteProduct failed:', error);
  }

  const idx = MemoryDb.products.findIndex(p => p.id === id);
  if (idx !== -1) {
    MemoryDb.products[idx] = {
      ...MemoryDb.products[idx],
      isDeleted: true,
      deletedAt: now.toISOString(),
      deletedBy,
    };
    return true;
  }
  return false;
}

export async function restoreProductService(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.product.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          lastUpdated: new Date(),
        },
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma restoreProduct failed:', error);
  }

  const idx = MemoryDb.products.findIndex(p => p.id === id);
  if (idx !== -1) {
    MemoryDb.products[idx] = {
      ...MemoryDb.products[idx],
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      lastUpdated: new Date().toISOString(),
    };
    return true;
  }
  return false;
}

export async function permanentDeleteProductService(id: string): Promise<boolean> {
  try {
    if (process.env.DATABASE_URL) {
      await prisma.product.delete({
        where: { id },
      });
      return true;
    }
  } catch (error) {
    console.warn('Prisma permanentDeleteProduct failed:', error);
  }

  const idx = MemoryDb.products.findIndex(p => p.id === id);
  if (idx !== -1) {
    MemoryDb.products.splice(idx, 1);
    return true;
  }
  return false;
}

export const deleteProductService = softDeleteProductService;
