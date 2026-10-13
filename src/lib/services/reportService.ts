import { getOrders } from './orderService';
import { getEvents } from './eventService';
import { getProducts } from './productService';

export async function getReportsSummary(branchId?: string) {
  const orders = await getOrders(branchId);
  const events = await getEvents(false, branchId);
  const products = await getProducts(false, branchId);

  let totalBookRevenue = 0;
  let totalGiftRevenue = 0;
  let totalOrdersRevenue = 0;
  let totalGstCollected = 0;
  const bookSalesMap: Record<string, { title: string; count: number; rev: number }> = {};

  orders.forEach(ord => {
    totalOrdersRevenue += Number(ord.total || 0);
    totalGstCollected += Number(ord.taxAmount || 0);

    ord.items?.forEach((item: any) => {
      const cat = (item.product?.category || '').toLowerCase();
      const itemPrice = Number(item.product?.price || 0);
      const qty = Number(item.quantity || 1);
      const discount = Number(item.discountPercent || 0);
      const itemNet = (itemPrice * qty) * (1 - discount / 100);

      if (cat.includes('book') || cat.includes('scripture')) {
        totalBookRevenue += itemNet;
        const name = item.product?.name || 'Authorized Scripture';
        if (!bookSalesMap[name]) {
          bookSalesMap[name] = { title: name, count: 0, rev: 0 };
        }
        bookSalesMap[name].count += qty;
        bookSalesMap[name].rev += itemNet;
      } else {
        totalGiftRevenue += itemNet;
      }
    });
  });

  // Calculate top-selling book
  const sortedBooks = Object.values(bookSalesMap).sort((a, b) => b.count - a.count);
  const topSellingBook = sortedBooks[0]?.title || (products.find(p => p.category?.toLowerCase().includes('book'))?.name || 'Bhagavad-gita As It Is');

  const activeStallsCount = events.filter(e => e.status === 'active').length;
  const totalInventoryValue = products.reduce((acc, p) => acc + (Number(p.stock || 0) * Number(p.cost || 0)), 0);

  return {
    success: true,
    branchId: branchId || 'all',
    summary: {
      totalRevenue: Math.round(totalOrdersRevenue),
      totalOrdersCount: orders.length,
      booksRevenue: Math.round(totalBookRevenue),
      giftsRevenue: Math.round(totalGiftRevenue),
      activeStallsCount,
      topSellingBook,
      gstCollectedTotal: Math.round(totalGstCollected),
      inventoryValue: Math.round(totalInventoryValue),
      productCount: products.length,
      currency: '₹ (INR)'
    }
  };
}
