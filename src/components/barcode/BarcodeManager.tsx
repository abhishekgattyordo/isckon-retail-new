'use client';

import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { BarcodeView } from './BarcodeView';
import {
  QrCode,
  Printer,
  Barcode as BarcodeIcon,
  Tag,
  Search,
  CheckCircle2,
  Copy,
  Layers,
  Sparkles,
  Download
} from 'lucide-react';

export const BarcodeManager: React.FC = () => {
  const { products, barcodes, addBarcodeRecord, quickNotification, settings } = useERP();
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [stickerType, setStickerType] = useState<'standard' | 'shelf' | 'jewel'>('standard');
  const [printCount, setPrintCount] = useState(24);
  const [customSerial, setCustomSerial] = useState('ISK-2026-8849');
  const [isPrinting, setIsPrinting] = useState(false);

  const selectedProd = products.find(p => p.id === selectedProductId) || products[0];

  // Keep custom serial/batch aligned with product default batch
  React.useEffect(() => {
    if (selectedProd) {
      setCustomSerial(selectedProd.batchNo);
    }
  }, [selectedProductId, selectedProd]);

  const handlePrint = () => {
    setIsPrinting(true);
    addBarcodeRecord({
      sku: selectedProd?.sku || 'SKU-001',
      barcodeValue: selectedProd?.barcode || '1234567890123',
      productName: selectedProd?.name || 'Devotional Book Item',
      format: 'code128',
      template: (stickerType === 'standard' ? 'retail_tag_1x2' : stickerType === 'shelf' ? 'shelf_label_2x3' : 'jewelry_hangtag'),
      generatedAt: new Date().toISOString(),
      batchNo: customSerial,
      printCount: printCount
    });

    setTimeout(() => {
      setIsPrinting(false);
      quickNotification('Stickers Dispatched', `Sent ${printCount} barcode tags (${stickerType.toUpperCase()}) to thermal printer.`, 'success');
      
      const printSection = document.getElementById('print-section');
      if (printSection) {
        // Clone the print section
        const printClone = printSection.cloneNode(true) as HTMLElement;
        printClone.id = 'print-section-active';
        printClone.classList.remove('hidden');
        printClone.classList.add('active-print-element');
        document.body.appendChild(printClone);
        
        // Add printing class to body
        document.body.classList.add('print-labels-only');
        
        // Add dynamic page styling
        const pageStyle = document.createElement('style');
        pageStyle.id = 'dynamic-print-page-style';
        pageStyle.innerHTML = `@page { size: auto; margin: 3mm; }`;
        document.head.appendChild(pageStyle);
        
        window.print();
        
        // Cleanup after a short delay
        setTimeout(() => {
          printClone.remove();
          document.body.classList.remove('print-labels-only');
          const pStyle = document.getElementById('dynamic-print-page-style');
          if (pStyle) pStyle.remove();
        }, 500);
      } else {
        window.print();
      }
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <QrCode className="w-6 h-6 text-rose-500 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Barcode & Label Sticker Generator
            </h1>
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold border border-rose-500/20">
              CODE-128 & QR READY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            THERMAL STICKER EXPORT • SHELF LABELS • TEMPLE BOOKSTORE PRICE TAGS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <h2 className="font-bold text-base text-slate-900 dark:text-white font-display flex items-center gap-2">
              <Tag className="w-4 h-4 text-rose-500" />
              <span>1. Select Merchandise SKU</span>
            </h2>

            <div className="space-y-2">
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Product Catalog Target</label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name} (₹{p.price.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Barcode Value</label>
                <input
                  type="text"
                  readOnly
                  value={selectedProd?.barcode || '88491029384'}
                  className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-600 dark:text-slate-300 border border-transparent"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">Custom Prefix / Batch</label>
                <input
                  type="text"
                  value={customSerial}
                  onChange={e => setCustomSerial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xs font-mono text-slate-400 uppercase">2. Sticker Dimensions & Format</h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'standard', name: '1" x 2" Standard Tag', desc: 'Books & Apparel' },
                  { id: 'shelf', name: '2" x 4" Shelf Label', desc: 'Aisle Headers' },
                  { id: 'jewel', name: '0.5" x 1.5" Mini Tag', desc: 'Japa Mala & Beads' },
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setStickerType(type.id as any)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      stickerType === type.id
                        ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">{type.name}</span>
                    <span className="text-[10px] text-slate-400 mt-1">{type.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-mono font-bold text-slate-400 uppercase">3. Quantity to Print</label>
                <span className="font-mono font-bold text-rose-500 text-sm">{printCount} stickers</span>
              </div>
              <input
                type="range"
                min="4"
                max="100"
                step="4"
                value={printCount}
                onChange={e => setPrintCount(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>4 (1 row)</span>
                <span>24 (1 sheet)</span>
                <span>100 (bulk roll)</span>
              </div>
            </div>

            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="w-full py-3.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold font-mono text-xs sm:text-sm shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'DISPATCHING TO THERMAL PRINTER...' : `PRINT ${printCount} LABELS NOW`}</span>
            </button>
          </div>
        </div>

        {/* Right Live Sticker Preview (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold font-mono uppercase text-slate-400">LIVE PRINT SHEET PREVIEW (4x MATRIX)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                DPI: 300 THERMAL
              </span>
            </div>

            {/* Sticker Grid Preview */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 max-h-[480px] overflow-y-auto">
              {Array.from({ length: Math.min(printCount, 8) }).map((_, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-white text-black shadow-md border border-slate-300 flex flex-col justify-between space-y-2 relative"
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[9px] font-bold font-mono tracking-tighter text-slate-600 uppercase truncate max-w-[70%]">{settings.orgName || settings.appTitle}</span>
                    <span className="text-[9px] font-bold font-mono bg-black text-white px-1 rounded shrink-0">{settings.currencySymbol}{selectedProd?.price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs font-bold leading-tight line-clamp-1 text-black">{selectedProd?.name}</p>
                  
                  {/* Real Barcode View */}
                  <div className="py-1 flex flex-col items-center justify-center border-y border-dashed border-slate-300">
                    <BarcodeView value={selectedProd?.barcode || '88491029384'} width={1.2} height={34} fontSize={10} />
                  </div>
                  
                  <div className="flex justify-between items-center text-[8px] font-mono text-slate-500">
                    <span>SKU: {selectedProd?.sku}</span>
                    <span>{customSerial}</span>
                  </div>
                </div>
              ))}
            </div>
            {printCount > 8 && (
              <p className="text-center text-[11px] font-mono text-slate-400">
                + {printCount - 8} additional identical stickers ready on sheet...
              </p>
            )}
          </div>
        </div>
      </div>

      {/* HIDDEN HIGH-CONTRAST PRINT-ONLY SECTION */}
      <div id="print-section" className="hidden">
        <div className={stickerType === 'standard' ? 'grid grid-cols-3 gap-3 p-2' : stickerType === 'shelf' ? 'grid grid-cols-2 gap-4 p-2' : 'grid grid-cols-4 gap-2 p-1'}>
          {Array.from({ length: printCount }).map((_, i) => (
            <div
              key={i}
              className={`print-sticker p-4 bg-white text-black border-2 border-black flex flex-col justify-between space-y-2 relative rounded-md ${
                stickerType === 'standard'
                  ? 'w-[2.25in] h-[1.25in]'
                  : stickerType === 'shelf'
                  ? 'w-[4in] h-[2in]'
                  : 'w-[1.75in] h-[0.75in] !p-2 !space-y-1'
              }`}
              style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
            >
              {stickerType === 'jewel' ? (
                // Tiny label layout (0.5" x 1.5")
                <>
                  <div className="flex justify-between items-center text-[7px] font-bold font-mono text-black leading-none uppercase gap-1">
                    <span className="truncate max-w-[70%]">{settings.orgName || settings.appTitle}</span>
                    <span className="shrink-0">{settings.currencySymbol}{selectedProd?.price.toFixed(0)}</span>
                  </div>
                  <p className="text-[8px] font-bold leading-tight line-clamp-1 text-black font-sans">
                    {selectedProd?.name}
                  </p>
                  <div className="py-0.5 flex flex-col items-center justify-center border-y border-dashed border-black">
                    <BarcodeView value={selectedProd?.barcode || '88491029384'} width={0.9} height={20} fontSize={7} />
                  </div>
                  <div className="flex justify-between items-center text-[6px] font-bold font-mono text-black leading-none">
                    <span className="truncate">SKU: {selectedProd?.sku}</span>
                    <span>{customSerial}</span>
                  </div>
                </>
              ) : stickerType === 'shelf' ? (
                // Larger Shelf label layout (2" x 4")
                <>
                  <div className="flex justify-between items-start border-b border-black pb-1 gap-2">
                    <div className="text-left min-w-0">
                      <span className="text-[9px] font-bold font-mono tracking-wider text-black block uppercase truncate">
                        {settings.orgName}
                      </span>
                      <span className="text-[10px] font-mono text-black font-semibold uppercase truncate block">
                        {settings.appTitle}
                      </span>
                    </div>
                    <div className="bg-black text-white px-2.5 py-1 rounded font-bold font-mono text-base text-center leading-none shrink-0">
                      {settings.currencySymbol}{selectedProd?.price.toFixed(2)}
                    </div>
                  </div>

                  <p className="text-sm font-black leading-snug line-clamp-2 text-black my-1 font-sans">
                    {selectedProd?.name}
                  </p>

                  <div className="py-1.5 flex flex-col items-center justify-center border-y-2 border-dashed border-black bg-white">
                    <BarcodeView value={selectedProd?.barcode || '88491029384'} width={1.5} height={48} fontSize={11} />
                  </div>

                  <div className="flex justify-between items-center text-[9px] font-mono font-bold text-black pt-1">
                    <span>SKU ID: {selectedProd?.sku}</span>
                    <span>BATCH: {customSerial}</span>
                  </div>
                </>
              ) : (
                // Standard label layout (1" x 2")
                <>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[8px] font-bold font-mono tracking-tighter text-black uppercase truncate max-w-[70%]">
                      {settings.orgName || settings.appTitle}
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-black text-white px-1.5 rounded shrink-0">
                      {settings.currencySymbol}{selectedProd?.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold leading-tight line-clamp-1 text-black font-sans">
                    {selectedProd?.name}
                  </p>

                  <div className="py-1 flex flex-col items-center justify-center border-y border-dashed border-black">
                    <BarcodeView value={selectedProd?.barcode || '88491029384'} width={1.2} height={30} fontSize={9} />
                  </div>

                  <div className="flex justify-between items-center text-[7px] font-mono text-black font-bold">
                    <span>SKU: {selectedProd?.sku}</span>
                    <span>BATCH: {customSerial}</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
