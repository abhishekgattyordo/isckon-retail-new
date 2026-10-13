import { Product, WarehouseZone, InventoryBatch } from '../types';

/**
 * Extracts base zone identifier before any dash, colon, or slash.
 * Supports em-dash (—), en-dash (–), hyphen (-), colon (:), slash (/).
 */
export function getZoneBaseTitle(zoneNameOrCode?: string | null): string {
  if (!zoneNameOrCode) return '';
  const clean = zoneNameOrCode.trim();
  const parts = clean.split(/[—–\-\:\/]/);
  return (parts[0] || '').trim().toLowerCase();
}

/**
 * Determines whether a product or inventory item belongs to a specific WarehouseZone.
 * Handles:
 *  1. Exact ID, Code, or Name matches
 *  2. Case-insensitive matches
 *  3. Base name matches (e.g. "Zone A — General Literature" matches "Zone A" or "Zone A — Main Floor")
 *  4. Code pattern matching (e.g. zone.code "ZA-01" / "ZA" matches product "Zone A")
 *  5. Single-zone facility automatic mapping: if a facility/branch has only 1 zone,
 *     all products present in that facility naturally belong to this zone.
 *  6. Safe fallback for unassigned items when there's a primary/first zone in the facility.
 */
export function isProductInZone(
  product: { warehouseZone?: string | null; branchId?: string | null; sku?: string | null },
  zone: WarehouseZone,
  branchZones: WarehouseZone[] = []
): boolean {
  if (!product || !zone) return false;

  const pZoneRaw = (product.warehouseZone || '').trim();

  // If product has no zone explicitly specified:
  if (!pZoneRaw) {
    if (branchZones.length === 1 && branchZones[0].id === zone.id) return true;
    return branchZones.length > 0 && branchZones[0].id === zone.id;
  }

  const pLower = pZoneRaw.toLowerCase();
  const zIdLower = (zone.id || '').toLowerCase();
  const zCodeLower = (zone.code || '').toLowerCase();
  const zNameLower = (zone.name || '').toLowerCase();

  // 1. Direct equality with id, code, or name
  if (pLower === zIdLower || pLower === zCodeLower || pLower === zNameLower) {
    return true;
  }

  // 2. Base name extraction (handles em-dash, en-dash, hyphen, colon)
  const pBase = getZoneBaseTitle(pZoneRaw);
  const zBase = getZoneBaseTitle(zone.name);

  if (pBase && zBase && (pBase === zBase || pBase === zCodeLower || zBase === pLower)) {
    return true;
  }

  // 3. Substring matching
  if (zCodeLower && pLower.includes(zCodeLower)) return true;
  if (pBase && (zNameLower.includes(pBase) || zCodeLower.includes(pBase))) return true;
  if (zBase && (pLower.includes(zBase) || pLower.includes(zCodeLower))) return true;

  // 4. Code letters matching (e.g. zone.code "ZA-01" matches "Zone A" or "ZA")
  const codeMatch = (zone.code || '').match(/Z([A-Z])/i);
  if (codeMatch) {
    const letter = codeMatch[1].toLowerCase();
    if (
      pLower === `zone ${letter}` ||
      pLower.startsWith(`zone ${letter} `) ||
      pLower.startsWith(`zone ${letter}-`) ||
      pLower.startsWith(`zone ${letter}—`) ||
      pLower.startsWith(`zone ${letter}–`)
    ) {
      return true;
    }
  }

  // 5. If this facility has only 1 zone configured, all products stored in this facility belong to this zone
  if (branchZones.length === 1 && branchZones[0].id === zone.id) {
    return true;
  }

  // 6. If the product does not match any other zone in the facility, map to default/first zone
  const matchesOtherZone = branchZones.some(other => {
    if (other.id === zone.id) return false;
    const oId = (other.id || '').toLowerCase();
    const oCode = (other.code || '').toLowerCase();
    const oName = (other.name || '').toLowerCase();
    const oBase = getZoneBaseTitle(other.name);
    return (
      pLower === oId ||
      pLower === oCode ||
      pLower === oName ||
      (pBase && oBase && pBase === oBase) ||
      (oBase && pLower.includes(oBase)) ||
      (oCode && pLower.includes(oCode))
    );
  });

  if (!matchesOtherZone && branchZones.length > 0 && branchZones[0].id === zone.id) {
    return true;
  }

  return false;
}

/**
 * Calculates occupied slots, active SKU count, and capacity percentage for a zone.
 * Formula: Capacity Percentage = Math.round((Total Occupied Slots / Zone Capacity Limit) * 100)
 */
export function calculateZoneStats(
  zone: WarehouseZone,
  products: Product[],
  branchZones: WarehouseZone[] = []
) {
  const assignedProducts = products.filter(p => isProductInZone(p, zone, branchZones));
  const occupiedSlots = assignedProducts.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
  const skuCount = assignedProducts.length;
  const capacityLimit = Math.max(1, Number(zone.capacity) || 1000);
  const capacityPercent = Math.min(100, Math.round((occupiedSlots / capacityLimit) * 100));

  return {
    assignedProducts,
    occupiedSlots,
    skuCount,
    capacityLimit,
    capacityPercent,
  };
}
