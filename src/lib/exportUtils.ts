import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import JsBarcode from 'jsbarcode';

export interface EventExportData {
  event: {
    id: string;
    name: string;
    code?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string;
    stallLocation?: string;
    stallManager?: string;
    targetSales?: number;
    discountPercent?: number;
    status: string;
  };
  allocations: {
    sku: string;
    productName: string;
    category: string;
    allocatedQty: number;
    soldQty: number;
    damagedQty: number;
    returnedQty: number;
    price: number;
  }[];
  transactions: {
    orderNumber: string;
    timestamp: string;
    cashierName: string;
    paymentMethod: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    items: { sku: string; name: string; quantity: number; price: number; total: number }[];
  }[];
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    cashCollection: number;
    upiCollection: number;
    avgTicketValue: number;
    totalAllocated: number;
    totalSold: number;
    totalDamaged: number;
    totalRemaining: number;
  };
}

/**
 * Export complete event reconciliation & financial data to Excel (.xlsx)
 */
export function exportEventToExcel(data: EventExportData) {
  const wb = XLSX.utils.book_new();

  // 1. Inventory Reconciliation Sheet
  const reconData: (string | number)[][] = [
    ['ISKCON RETAIL ERP - EVENT INVENTORY RECONCILIATION REPORT'],
    [`Event: ${data.event.name} (${data.event.code || data.event.id})`],
    [`Location: ${data.event.stallLocation || 'Main Stall'} | Manager: ${data.event.stallManager || 'Unassigned'}`],
    [`Period: ${data.event.startDate} to ${data.event.endDate} | Status: ${(data?.event?.status || 'upcoming').toUpperCase()}`],
    [],
    ['SKU', 'Product Name', 'Category', 'Unit Price (₹)', 'Allocated Qty', 'Sold Qty', 'Damaged Qty', 'Unsold/Returned Qty', 'Gross Revenue (₹)'],
    ...data.allocations.map(a => [
      a.sku,
      a.productName,
      a.category,
      a.price,
      a.allocatedQty,
      a.soldQty,
      a.damagedQty,
      Math.max(0, a.allocatedQty - a.soldQty - a.damagedQty),
      a.soldQty * a.price
    ]),
    [],
    [
      'TOTALS',
      '',
      '',
      '',
      data.summary.totalAllocated,
      data.summary.totalSold,
      data.summary.totalDamaged,
      data.summary.totalRemaining,
      data.summary.totalRevenue
    ]
  ];
  const wsRecon = XLSX.utils.aoa_to_sheet(reconData);
  wsRecon['!cols'] = [
    { wch: 18 },
    { wch: 45 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 }
  ];
  XLSX.utils.book_append_sheet(wb, wsRecon, 'Inventory Reconciliation');

  // 2. Financial Summary Sheet
  const finData: (string | number)[][] = [
    ['ISKCON RETAIL ERP - STALL FINANCIAL RECONCILIATION SUMMARY'],
    [`Event: ${data.event.name}`],
    [],
    ['Financial Metric', 'Value'],
    ['Total Event Gross Revenue', `₹ ${data.summary.totalRevenue.toLocaleString('en-IN')}`],
    ['Total Completed Orders', data.summary.totalTransactions],
    ['Average Ticket Value', `₹ ${data.summary.avgTicketValue.toFixed(2)}`],
    ['UPI Payments Collection', `₹ ${data.summary.upiCollection.toLocaleString('en-IN')}`],
    ['Cash Payments Collection', `₹ ${data.summary.cashCollection.toLocaleString('en-IN')}`],
    ['Target Revenue Goal', `₹ ${(data.event.targetSales || 0).toLocaleString('en-IN')}`],
    ['Achievement Rate', data.event.targetSales ? `${((data.summary.totalRevenue / data.event.targetSales) * 100).toFixed(1)}%` : 'N/A'],
    ['Total Stock Allocated (Units)', data.summary.totalAllocated],
    ['Total Stock Sold (Units)', data.summary.totalSold],
    ['Total Shrinkage / Damaged (Units)', data.summary.totalDamaged],
    ['Remaining / Returned (Units)', data.summary.totalRemaining]
  ];
  const wsFin = XLSX.utils.aoa_to_sheet(finData);
  wsFin['!cols'] = [{ wch: 35 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsFin, 'Financial Summary');

  // 3. Transactions Sheet
  if (data.transactions.length > 0) {
    const txData: (string | number)[][] = [
      ['Order Number', 'Date & Time', 'Cashier', 'Payment Mode', 'Items Count', 'Subtotal (₹)', 'Discount (₹)', 'Tax/GST (₹)', 'Net Total (₹)'],
      ...data.transactions.map(t => [
        t.orderNumber,
        new Date(t.timestamp).toLocaleString('en-IN'),
        t.cashierName,
        t.paymentMethod.toUpperCase(),
        t.items?.length || 1,
        t.subtotal,
        t.discountAmount,
        t.taxAmount,
        t.total
      ])
    ];
    const wsTx = XLSX.utils.aoa_to_sheet(txData);
    wsTx['!cols'] = [
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 15 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions Ledger');
  }

  const cleanFilename = `${(data.event.name || 'Event').replace(/[^a-zA-Z0-9_-]/g, '_')}_Reconciliation.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Export styled printable PDF document of event reconciliation report
 */
export function exportEventToPdf(data: EventExportData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const darkSlate = [15, 23, 42]; // #0F172A
  const lightGrey = [241, 245, 249];

  // Top Header Banner
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('ISKCON RETAIL ERP — STALL EVENT WORKSPACE', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 158, 11);
  doc.text('INVENTORY RECONCILIATION & FINANCIAL SETTLEMENT AUDIT REPORT', 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 220, 18);

  // Event Meta Box
  doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
  doc.roundedRect(14, 28, 269, 20, 2, 2, 'F');

  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.event.name} [${data.event.code || data.event.id}]`, 18, 35);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Stall Spot: ${data.event.stallLocation || 'Main Stall'}  |  Manager: ${data.event.stallManager || 'Unassigned'}  |  Dates: ${data.event.startDate} to ${data.event.endDate}  |  Status: ${(data?.event?.status || 'upcoming').toUpperCase()}`,
    18,
    43
  );

  // KPI Summary Boxes (4 columns)
  const boxWidth = 63.5;
  const kpis = [
    { label: 'TOTAL EVENT REVENUE', value: `₹ ${data.summary.totalRevenue.toLocaleString('en-IN')}`, color: [16, 185, 129] },
    { label: 'UPI COLLECTIONS', value: `₹ ${data.summary.upiCollection.toLocaleString('en-IN')}`, color: [99, 102, 241] },
    { label: 'CASH COLLECTIONS', value: `₹ ${data.summary.cashCollection.toLocaleString('en-IN')}`, color: [217, 119, 6] },
    { label: 'ITEMS SOLD / ALLOCATED', value: `${data.summary.totalSold} / ${data.summary.totalAllocated} Units`, color: [139, 92, 246] }
  ];

  kpis.forEach((kpi, idx) => {
    const startX = 14 + idx * (boxWidth + 5);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(startX, 52, boxWidth, 16, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, startX + 4, 58);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, startX + 4, 64);
  });

  // Table Data
  const tableRows = data.allocations.map(a => [
    a.sku,
    a.productName,
    a.category,
    `₹ ${a.price.toLocaleString('en-IN')}`,
    a.allocatedQty.toString(),
    a.soldQty.toString(),
    a.damagedQty.toString(),
    Math.max(0, a.allocatedQty - a.soldQty - a.damagedQty).toString(),
    `₹ ${(a.soldQty * a.price).toLocaleString('en-IN')}`
  ]);

  // Totals Row
  tableRows.push([
    'TOTALS',
    '',
    '',
    '',
    data.summary.totalAllocated.toString(),
    data.summary.totalSold.toString(),
    data.summary.totalDamaged.toString(),
    data.summary.totalRemaining.toString(),
    `₹ ${data.summary.totalRevenue.toLocaleString('en-IN')}`
  ]);

  autoTable(doc, {
    startY: 72,
    head: [['SKU', 'Product Name', 'Category', 'Unit Price', 'Allocated', 'Sold', 'Damaged', 'Unsold/Return', 'Gross Revenue']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 30 },
      3: { cellWidth: 24, halign: 'right' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 22, halign: 'center' },
      8: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 180;
  if (finalY < 190) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Prepared By (Stall Cashier): ____________________', 14, finalY);
    doc.text('Verified By (Event Coordinator): ____________________', 110, finalY);
    doc.text('Audited By (Accounts Dept): ____________________', 200, finalY);
  }

  const cleanFilename = `${(data.event.name || 'Event').replace(/[^a-zA-Z0-9_-]/g, '_')}_Reconciliation.pdf`;
  doc.save(cleanFilename);
}

/**
 * Export CSV format with UTF-8 BOM
 */
export function exportEventToCsv(data: EventExportData) {
  const rows = [
    ['Product Name', 'SKU', 'Category', 'Allocated Qty', 'Sold Qty', 'Damaged Qty', 'Returned/Remaining Qty', 'Unit Price', 'Gross Revenue'],
    ...data.allocations.map(a => [
      `"${a.productName.replace(/"/g, '""')}"`,
      a.sku,
      `"${a.category.replace(/"/g, '""')}"`,
      a.allocatedQty,
      a.soldQty,
      a.damagedQty,
      Math.max(0, a.allocatedQty - a.soldQty - a.damagedQty),
      a.price,
      a.soldQty * a.price
    ]),
    [],
    [
      'TOTALS',
      '',
      '',
      data.summary.totalAllocated,
      data.summary.totalSold,
      data.summary.totalDamaged,
      data.summary.totalRemaining,
      '',
      data.summary.totalRevenue
    ]
  ];

  const csvContent = '\uFEFF' + rows.map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${(data.event.name || 'Event').replace(/[^a-zA-Z0-9_-]/g, '_')}_Reconciliation.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface BIAnalyticsExportData {
  dateRangeLabel: string;
  startDate: string;
  endDate: string;
  summary: {
    totalSalesRevenue: number;
    totalSalesBills: number;
    booksRevenue: number;
    giftsRevenue: number;
    totalQuantitySold: number;
    avgTicketValue: number;
    totalInboundCost: number;
    totalInboundNotes: number;
    totalQuantityInbound: number;
    gstCollected: number;
  };
  orders: {
    orderNumber: string;
    timestamp: string;
    customerName: string;
    paymentMethod: string;
    salesTag: string;
    itemsCount: number;
    total: number;
  }[];
  inwardNotes: {
    grnNumber: string;
    invoiceDate: string;
    vendorName: string;
    warehouse: string;
    itemsCount: number;
    totalValue: number;
  }[];
}

/**
 * Export BI Analytics to Excel (.xlsx) with date range metadata
 */
export function exportBIAnalyticsToExcel(data: BIAnalyticsExportData) {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const summaryRows: (string | number)[][] = [
    ['ISKCON RETAIL ERP — BUSINESS INTELLIGENCE & AUDIT REPORT'],
    [`Period: ${data.dateRangeLabel} (${data.startDate} to ${data.endDate})`],
    [`Export Date: ${new Date().toLocaleString('en-IN')}`],
    [],
    ['Key Performance Metric', 'Value'],
    ['POS Gross Sales Revenue', `₹ ${data.summary.totalSalesRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Literature / Books Revenue', `₹ ${data.summary.booksRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Devotional Gifts & Souvenirs Revenue', `₹ ${data.summary.giftsRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Total Finalized Sales Orders', data.summary.totalSalesBills],
    ['Total Items/Units Disbursed', data.summary.totalQuantitySold],
    ['Average Order Ticket Value', `₹ ${data.summary.avgTicketValue.toFixed(2)}`],
    ['GST 5% Tax Collection', `₹ ${data.summary.gstCollected.toFixed(2)}`],
    ['Material Inbound Cost Basis', `₹ ${data.summary.totalInboundCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ['Total GRN Shipment Batches', data.summary.totalInboundNotes],
    ['Total Inbound Units Stocked', data.summary.totalQuantityInbound]
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 40 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // 2. POS Sales Orders Sheet
  if (data.orders.length > 0) {
    const orderRows: (string | number)[][] = [
      ['Order Number', 'Date & Time', 'Customer Name', 'Payment Mode', 'Sales Tag / Discount', 'Items Count', 'Total Paid (₹)'],
      ...data.orders.map(o => [
        o.orderNumber,
        o.timestamp,
        o.customerName,
        o.paymentMethod.toUpperCase(),
        o.salesTag,
        o.itemsCount,
        o.total
      ]),
      [],
      ['TOTALS', '', '', '', '', data.summary.totalQuantitySold, data.summary.totalSalesRevenue]
    ];
    const wsOrders = XLSX.utils.aoa_to_sheet(orderRows);
    wsOrders['!cols'] = [
      { wch: 20 },
      { wch: 24 },
      { wch: 22 },
      { wch: 16 },
      { wch: 24 },
      { wch: 14 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsOrders, 'POS Sales Orders');
  }

  // 3. Material Inward Notes Sheet
  if (data.inwardNotes.length > 0) {
    const inwardRows: (string | number)[][] = [
      ['GRN Number', 'Invoice Date', 'Vendor / Supplier', 'Warehouse Zone', 'Items Received (pcs)', 'Valuation (₹)'],
      ...data.inwardNotes.map(n => [
        n.grnNumber,
        n.invoiceDate,
        n.vendorName,
        n.warehouse,
        n.itemsCount,
        n.totalValue
      ]),
      [],
      ['TOTALS', '', '', '', data.summary.totalQuantityInbound, data.summary.totalInboundCost]
    ];
    const wsInward = XLSX.utils.aoa_to_sheet(inwardRows);
    wsInward['!cols'] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 32 },
      { wch: 24 },
      { wch: 22 },
      { wch: 20 }
    ];
    XLSX.utils.book_append_sheet(wb, wsInward, 'Material Inward GRNs');
  }

  const cleanFilename = `ISKCON_BI_Analytics_${data.startDate}_to_${data.endDate}.xlsx`;
  XLSX.writeFile(wb, cleanFilename);
}

/**
 * Export BI Analytics to styled PDF document
 */
export function exportBIAnalyticsToPdf(data: BIAnalyticsExportData) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const darkSlate = [15, 23, 42];

  // Header Banner
  doc.setFillColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('ISKCON RETAIL ERP — BUSINESS INTELLIGENCE & AUDIT REPORT', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 158, 11);
  doc.text(`DATE RANGE: ${data.dateRangeLabel.toUpperCase()} (${data.startDate} to ${data.endDate})`, 14, 18);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 220, 18);

  // Summary Metrics Banner (4 boxes)
  const boxWidth = 63.5;
  const kpis = [
    { label: 'POS SALES REVENUE', value: `₹ ${data.summary.totalSalesRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: [16, 185, 129] },
    { label: 'ORDERS / UNITS SOLD', value: `${data.summary.totalSalesBills} bills / ${data.summary.totalQuantitySold} pcs`, color: [217, 119, 6] },
    { label: 'MATERIAL INWARD COST', value: `₹ ${data.summary.totalInboundCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: [99, 102, 241] },
    { label: 'GST (5%) TAX COLLECTED', value: `₹ ${data.summary.gstCollected.toFixed(2)}`, color: [139, 92, 246] }
  ];

  kpis.forEach((kpi, idx) => {
    const startX = 14 + idx * (boxWidth + 5);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(startX, 30, boxWidth, 16, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, startX + 4, 36);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, startX + 4, 42);
  });

  // Sales Orders Table
  const orderRows = data.orders.slice(0, 20).map(o => [
    o.orderNumber,
    o.timestamp,
    o.customerName,
    o.paymentMethod.toUpperCase(),
    o.salesTag,
    `${o.itemsCount} pcs`,
    `₹ ${o.total.toFixed(2)}`
  ]);

  if (data.orders.length > 20) {
    orderRows.push(['...', `+ ${data.orders.length - 20} more orders in range`, '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: 50,
    head: [['Order #', 'Date & Time', 'Customer', 'Mode', 'Sales Tag', 'Items', 'Total Amount']],
    body: orderRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    }
  });

  const cleanFilename = `ISKCON_BI_Analytics_${data.startDate}_to_${data.endDate}.pdf`;
  doc.save(cleanFilename);
}

/**
 * Export BI Analytics to CSV format
 */
export function exportBIAnalyticsToCsv(data: BIAnalyticsExportData) {
  const rows: (string | number)[][] = [
    ['--- ISKCON RETAIL ERP - BUSINESS INTELLIGENCE REPORT ---'],
    [`Date Range: ${data.dateRangeLabel} (${data.startDate} to ${data.endDate})`],
    [`Export Timestamp: ${new Date().toLocaleString('en-IN')}`],
    [],
    ['--- EXECUTIVE KPI SUMMARY ---'],
    ['Metric', 'Value'],
    ['Total Sales Revenue (INR)', data.summary.totalSalesRevenue.toFixed(2)],
    ['Books Revenue (INR)', data.summary.booksRevenue.toFixed(2)],
    ['Gifts Revenue (INR)', data.summary.giftsRevenue.toFixed(2)],
    ['Total Completed Orders', data.summary.totalSalesBills],
    ['Total Units Sold', data.summary.totalQuantitySold],
    ['Average Ticket Value (INR)', data.summary.avgTicketValue.toFixed(2)],
    ['GST 5% Tax (INR)', data.summary.gstCollected.toFixed(2)],
    ['Material Inward Valuation (INR)', data.summary.totalInboundCost.toFixed(2)],
    ['Total GRN Notes', data.summary.totalInboundNotes],
    ['Total Inbound Units Stocked', data.summary.totalQuantityInbound],
    [],
    ['--- POS SALES TRANSACTIONS ---'],
    ['Order Number', 'Date & Time', 'Customer Name', 'Payment Mode', 'Sales Tag', 'Items Count', 'Total Paid (INR)'],
    ...data.orders.map(o => [
      o.orderNumber,
      `"${o.timestamp}"`,
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.paymentMethod.toUpperCase(),
      `"${o.salesTag}"`,
      o.itemsCount,
      o.total.toFixed(2)
    ]),
    [],
    ['--- MATERIAL INWARD SHIPMENTS (GRN) ---'],
    ['GRN Number', 'Invoice Date', 'Vendor / Supplier', 'Warehouse Zone', 'Items Received (pcs)', 'Valuation (INR)'],
    ...data.inwardNotes.map(n => [
      n.grnNumber,
      `"${n.invoiceDate}"`,
      `"${n.vendorName.replace(/"/g, '""')}"`,
      `"${n.warehouse}"`,
      n.itemsCount,
      n.totalValue.toFixed(2)
    ])
  ];

  const csvContent = '\uFEFF' + rows.map(e => e.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ISKCON_BI_Analytics_${data.startDate}_to_${data.endDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate a base64 PNG data URL for any barcode value using JsBarcode
 */
export function generateBarcodeDataUrl(value: string, format: string = 'CODE128'): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  const cleanVal = String(value || '').trim() || '1234567890123';
  try {
    let detectedFormat = format;
    if (format === 'auto' || !format) {
      if (/^\d{13}$/.test(cleanVal)) detectedFormat = 'EAN13';
      else if (/^\d{8}$/.test(cleanVal)) detectedFormat = 'EAN8';
      else if (/^\d{12}$/.test(cleanVal)) detectedFormat = 'UPC';
      else detectedFormat = 'CODE128';
    }
    JsBarcode(canvas, cleanVal, {
      format: detectedFormat as any,
      width: 2,
      height: 44,
      displayValue: true,
      fontSize: 11,
      font: 'monospace',
      margin: 3,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch {
    try {
      JsBarcode(canvas, cleanVal, {
        format: 'CODE128',
        width: 2,
        height: 44,
        displayValue: true,
        fontSize: 11,
        font: 'monospace',
        margin: 3,
      });
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }
}

export interface GrnExportData {
  grnNumber: string;
  poNumber?: string;
  vendorName: string;
  invoiceDate: string;
  warehouse: string;
  branchName?: string;
  receivedBy?: string;
  totalValue: number;
  notes?: string;
  items: Array<{
    id?: string;
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
    sellingPrice?: number;
    batchNo: string;
    expiryDate?: string;
    taxRate?: number;
    total: number;
    barcode?: string;
  }>;
  settings?: {
    orgName?: string;
    appTitle?: string;
    currencySymbol?: string;
  };
}

/**
 * Export complete GRN Voucher (Page 1) and all Batch Barcode Stickers (Page 2+) into a unified PDF
 */
export function exportGrnBarcodesToPdf(data: GrnExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const orgName = data.settings?.orgName || 'ISKCON Foundation';
  const appTitle = data.settings?.appTitle || 'ISKCON Retail ERP';
  const currencySymbol = data.settings?.currencySymbol || '₹';

  // ---------------- PAGE 1: OFFICIAL GRN VOUCHER ----------------
  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Accent Saffron Stripe
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 28, pageWidth, 2.5, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`${orgName.toUpperCase()} — GOODS RECEIVED NOTE`, 14, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 158, 11);
  doc.text('OFFICIAL INWARD RECEIPT & SERIALIZED BARCODE VOUCHER', 14, 19);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`DATE GENERATED: ${new Date().toLocaleString('en-IN')}`, 14, 25);

  // GRN Barcode at top right
  const grnBarcodeImg = generateBarcodeDataUrl(data.grnNumber, 'CODE128');
  if (grnBarcodeImg) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(pageWidth - 62, 5, 50, 18, 1.5, 1.5, 'F');
      doc.addImage(grnBarcodeImg, 'PNG', pageWidth - 60, 6, 46, 16);
    } catch {
      // fallback
    }
  }

  // GRN Metadata Bento Boxes
  const startY = 36;
  const boxWidth = (pageWidth - 28 - 6) / 2; // 85mm each

  // Box 1: Document & Vendor Details
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, boxWidth, 30, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DOCUMENT & SUPPLIER IDENTIFICATION', 18, startY + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`GRN Document Number:`, 18, startY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.grnNumber, 62, startY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`PO Reference Number:`, 18, startY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.poNumber || 'N/A', 62, startY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Vendor / Supplier Name:`, 18, startY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.vendorName || 'General Supplier', 62, startY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Supplier Invoice Date:`, 18, startY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.invoiceDate || new Date().toISOString().slice(0, 10), 62, startY + 27);

  // Box 2: Branch & Receiving Logistics
  const box2X = 14 + boxWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(box2X, startY, boxWidth, 30, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('BRANCH & LOGISTICS WAREHOUSE', box2X + 4, startY + 6);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Receiving Temple Branch:`, box2X + 4, startY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.branchName || 'Central Branch', box2X + 44, startY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Warehouse Zone:`, box2X + 4, startY + 17);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text((data.warehouse || 'Zone A').split('—')[0].trim(), box2X + 44, startY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Received By Officer:`, box2X + 4, startY + 22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(data.receivedBy || 'Store In-Charge', box2X + 44, startY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Total GRN Valuation:`, box2X + 4, startY + 27);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(`${currencySymbol} ${data.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, box2X + 44, startY + 27);

  // Table of Items
  const tableRows = data.items.map((item, idx) => [
    (idx + 1).toString(),
    item.sku,
    item.name,
    item.batchNo || 'N/A',
    item.quantity.toString(),
    `${currencySymbol}${item.unitCost.toFixed(2)}`,
    `${currencySymbol}${(item.sellingPrice || item.unitCost * 1.5).toFixed(2)}`,
    `${item.taxRate || 0}%`,
    `${currencySymbol}${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ]);

  const totalQty = data.items.reduce((sum, i) => sum + Number(i.quantity || 0), 0);

  tableRows.push([
    '',
    'TOTALS',
    `Total Products: ${data.items.length} items`,
    '',
    `${totalQty} Units`,
    '',
    '',
    '',
    `${currencySymbol}${data.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ]);

  autoTable(doc, {
    startY: startY + 34,
    head: [['#', 'SKU', 'Product Title', 'Batch No', 'Qty', 'Unit Cost', 'Sell Price', 'GST', 'Total Valuation']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59]
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 50 },
      3: { cellWidth: 24, fontStyle: 'italic' },
      4: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 10, halign: 'center' },
      8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (hookData) => {
      // Bold and color the totals row
      if (hookData.row.index === tableRows.length - 1) {
        hookData.cell.styles.fillColor = [241, 245, 249];
        hookData.cell.styles.fontStyle = 'bold';
      }
    }
  });

  // Get final Y after table
  const finalTableY = (doc as any).lastAutoTable?.finalY || 160;

  // Notes section if present
  let currentY = finalTableY + 6;
  if (data.notes) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(14, currentY, pageWidth - 28, 12, 1, 1, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    doc.text('INTAKE REMARKS / SHIPMENT NOTES:', 18, currentY + 4.5);
    doc.setFont('helvetica', 'normal');
    doc.text(data.notes.slice(0, 140), 18, currentY + 8.5);
    currentY += 16;
  } else {
    currentY += 4;
  }

  // Official Signature & Verification Blocks
  if (currentY + 28 <= pageHeight - 12) {
    const sigY = pageHeight - 34;
    const sigWidth = (pageWidth - 28 - 12) / 3;

    ['Received & Handled By', 'Store Manager Verification', 'Temple Admin Stamp & Approval'].forEach((title, idx) => {
      const sigX = 14 + idx * (sigWidth + 6);
      doc.setDrawColor(203, 213, 225);
      doc.line(sigX, sigY + 16, sigX + sigWidth, sigY + 16);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(title.toUpperCase(), sigX, sigY + 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(idx === 0 ? (data.receivedBy || 'Staff') : 'Authorized Signatory', sigX, sigY + 24);
    });
  }

  // ---------------- PAGE 2+: SERIALIZED BARCODE LABELS SHEET ----------------
  doc.addPage();

  // Labels Sheet Header
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 0, pageWidth, 20, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`GRN ${data.grnNumber} — SERIALIZED BARCODE STICKER SHEET`, 14, 9);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(254, 243, 199);
  doc.text(`BATCH LABELS GENERATED FOR ${data.items.length} SKUs (${totalQty} TOTAL STOCK UNITS) • READY FOR THERMAL & LASER PRINTING`, 14, 15);

  // Sticker Grid: 2 columns per row
  const stickerW = 86;
  const stickerH = 38;
  const marginX = 14;
  const gutterX = 10;
  let stickerY = 26;
  let currentCol = 0;

  // Flatten items for printing (we print 1 representative sticker per batch/SKU, or all items)
  data.items.forEach((item) => {
    // Generate barcode data URL
    const barcodeVal = item.barcode || `49000${Math.abs(item.sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 1234567).toString().padStart(8, '0').slice(0, 8)}`;
    const barcodeDataUrl = generateBarcodeDataUrl(barcodeVal, 'CODE128');

    // Check page overflow
    if (stickerY + stickerH > pageHeight - 16) {
      doc.addPage();
      // Mini Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`GRN ${data.grnNumber} — BARCODE STICKER SHEET (CONTINUED)`, 14, 8);
      stickerY = 18;
      currentCol = 0;
    }

    const curX = marginX + currentCol * (stickerW + gutterX);

    // Sticker Outer Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.roundedRect(curX, stickerY, stickerW, stickerH, 1.5, 1.5, 'FD');

    // Header line inside sticker
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(orgName.slice(0, 26).toUpperCase(), curX + 3, stickerY + 5);

    // Selling Price badge (black box with white text)
    const sellPriceText = `${currencySymbol}${(item.sellingPrice || item.unitCost * 1.5).toFixed(2)}`;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(curX + stickerW - 24, stickerY + 2, 21, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(sellPriceText, curX + stickerW - 22, stickerY + 5.5);

    // Product Title (truncated to 34 chars)
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const prodNameClean = item.name.length > 36 ? item.name.slice(0, 34) + '...' : item.name;
    doc.text(prodNameClean, curX + 3, stickerY + 10);

    // Barcode Image
    if (barcodeDataUrl) {
      try {
        doc.addImage(barcodeDataUrl, 'PNG', curX + 3, stickerY + 11.5, stickerW - 6, 17);
      } catch {
        // fallback text
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(barcodeVal, curX + 10, stickerY + 20);
      }
    }

    // Sticker Bottom metadata
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`SKU: ${item.sku}`, curX + 3, stickerY + 32.5);

    doc.setFont('helvetica', 'normal');
    doc.text(`BATCH: ${item.batchNo}`, curX + 3, stickerY + 36);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6);
    doc.text(`QTY: ${item.quantity} | ${data.grnNumber}`, curX + stickerW - 36, stickerY + 36);

    // Advance column/row
    if (currentCol === 0) {
      currentCol = 1;
    } else {
      currentCol = 0;
      stickerY += stickerH + 6;
    }
  });

  const filename = `GRN_Voucher_${data.grnNumber}.pdf`;
  doc.save(filename);
}

export interface BulkBarcodeExportData {
  title?: string;
  subtitle?: string;
  repeatByQuantity?: boolean;
  items: Array<{
    sku: string;
    productName: string;
    barcodeValue: string;
    batchNo: string;
    price?: number;
    grnNumber?: string;
    printCount?: number;
  }>;
  settings?: {
    orgName?: string;
    appTitle?: string;
    currencySymbol?: string;
  };
}

/**
 * Bulk export filtered barcodes (by GRN or Batch) into an A4 print-ready PDF sticker sheet
 */
export function exportBarcodesToPdf(data: BulkBarcodeExportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const orgName = data.settings?.orgName || 'ISKCON Foundation';
  const currencySymbol = data.settings?.currencySymbol || '₹';

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 22, 'F');

  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 22, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title || `${orgName.toUpperCase()} — BATCH BARCODE LABELS`, 14, 11);

  // Flatten items if repeatByQuantity is enabled
  const itemsToRender: Array<{
    sku: string;
    productName: string;
    barcodeValue: string;
    batchNo: string;
    price?: number;
    grnNumber?: string;
    printCount?: number;
    unitIndex?: number;
    totalUnits?: number;
  }> = [];

  data.items.forEach(item => {
    if (data.repeatByQuantity && item.printCount && item.printCount > 1) {
      const count = Math.min(item.printCount, 50); // safety cap
      for (let i = 1; i <= count; i++) {
        itemsToRender.push({
          ...item,
          unitIndex: i,
          totalUnits: item.printCount
        });
      }
    } else {
      itemsToRender.push({
        ...item,
        unitIndex: 1,
        totalUnits: item.printCount || 1
      });
    }
  });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(245, 158, 11);
  doc.text(
    data.subtitle || `BULK EXPORT OF ${itemsToRender.length} SERIALIZED MERCHANDISE BARCODES • ${new Date().toLocaleString('en-IN')}`,
    14,
    18
  );

  const stickerW = 86;
  const stickerH = 38;
  const marginX = 14;
  const gutterX = 10;
  let stickerY = 30;
  let currentCol = 0;

  itemsToRender.forEach((item) => {
    const barcodeDataUrl = generateBarcodeDataUrl(item.barcodeValue, 'CODE128');

    if (stickerY + stickerH > pageHeight - 14) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${(data.title || 'BARCODE LABELS').toUpperCase()} (CONTINUED)`, 14, 8);
      stickerY = 18;
      currentCol = 0;
    }

    const curX = marginX + currentCol * (stickerW + gutterX);

    // Sticker Outer Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.roundedRect(curX, stickerY, stickerW, stickerH, 1.5, 1.5, 'FD');

    // Header row
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(orgName.slice(0, 28).toUpperCase(), curX + 3, stickerY + 5);

    // Price badge if provided
    if (item.price !== undefined && item.price > 0) {
      const priceText = `${currencySymbol}${item.price.toFixed(2)}`;
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(curX + stickerW - 24, stickerY + 2, 21, 5, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(priceText, curX + stickerW - 22, stickerY + 5.5);
    }

    // Product Title
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const prodNameClean = item.productName.length > 36 ? item.productName.slice(0, 34) + '...' : item.productName;
    doc.text(prodNameClean, curX + 3, stickerY + 10);

    // Barcode Image
    if (barcodeDataUrl) {
      try {
        doc.addImage(barcodeDataUrl, 'PNG', curX + 3, stickerY + 11.5, stickerW - 6, 17);
      } catch {
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(item.barcodeValue, curX + 10, stickerY + 20);
      }
    }

    // Metadata footer
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(`SKU: ${item.sku}`, curX + 3, stickerY + 32.5);

    doc.setFont('helvetica', 'normal');
    doc.text(`BATCH: ${item.batchNo || 'N/A'}`, curX + 3, stickerY + 36);

    if (item.grnNumber) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(`GRN: ${item.grnNumber}`, curX + stickerW - 32, stickerY + 36);
    } else if (item.printCount) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text(`QTY: ${item.unitIndex || 1}/${item.totalUnits || item.printCount}`, curX + stickerW - 28, stickerY + 36);
    }

    // Move next column / row
    if (currentCol === 0) {
      currentCol = 1;
    } else {
      currentCol = 0;
      stickerY += stickerH + 6;
    }
  });

  const cleanTitle = (data.title || 'Barcodes').replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`${cleanTitle}_Export.pdf`);
}

/**
 * Export only the serialized barcode sticker sheet for a specific GRN
 */
export function exportGrnBarcodesOnlyToPdf(data: GrnExportData, repeatByQuantity: boolean = false) {
  exportBarcodesToPdf({
    title: `GRN ${data.grnNumber} — Barcode Stickers`,
    subtitle: `Batch stickers for ${data.items.length} SKUs (${data.items.reduce((sum, i) => sum + (i.quantity || 0), 0)} units) • ${data.warehouse}`,
    repeatByQuantity,
    items: data.items.map(item => ({
      sku: item.sku,
      productName: item.name,
      barcodeValue: item.barcode || `49000${Math.abs(item.sku.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 1234567).toString().padStart(8, '0').slice(0, 8)}`,
      batchNo: item.batchNo,
      price: item.sellingPrice || item.unitCost * 1.5,
      grnNumber: data.grnNumber,
      printCount: item.quantity
    })),
    settings: data.settings
  });
}


