'use client';

import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { POSOrder, SalesTag, Product } from '../../types';
import { BarcodeView } from '../barcode/BarcodeView';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Terminal,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  Tag,
  ShoppingBag,
  ShoppingCart,
  BookOpen,
  ArrowRight,
  Receipt,
  User,
  ShieldCheck,
  QrCode,
  Camera,
  X,
  Sparkles,
  Barcode,
  Percent,
  Printer,
  FileText,
  AlertCircle,
  Monitor,
  Zap,
  Edit2,
  Check,
  LayoutGrid,
  List,
  Package,
  ChevronDown
} from 'lucide-react';

// Dynamic sales tags are loaded from ERPContext

// Helper functions for validating barcodes to prevent OCR/plain text misdetection
const isValidEanChecksum = (code: string): boolean => {
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(code)) {
    return false;
  }
  const digits = code.split('').map(Number);
  const checkDigit = digits[digits.length - 1];
  const payload = digits.slice(0, digits.length - 1);
  
  let sum = 0;
  const reversedPayload = [...payload].reverse();
  for (let i = 0; i < reversedPayload.length; i++) {
    const weight = (i % 2 === 0) ? 3 : 1;
    sum += reversedPayload[i] * weight;
  }
  const calculatedCheck = (10 - (sum % 10)) % 10;
  return calculatedCheck === checkDigit;
};

const isValidIsbn10Checksum = (code: string): boolean => {
  if (!/^\d{9}[\dX]$/i.test(code)) return false;
  const chars = code.toUpperCase().split('');
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += (10 - i) * parseInt(chars[i], 10);
  }
  const lastChar = chars[9];
  sum += lastChar === 'X' ? 10 : parseInt(lastChar, 10);
  return sum % 11 === 0;
};

const isValidBarcodeValue = (text: string): boolean => {
  if (!text) return false;
  const trimmed = text.trim();
  
  // Standard barcodes are usually between 3 and 48 characters
  if (trimmed.length < 3 || trimmed.length > 48) return false;
  
  // Barcodes shouldn't contain spaces or newlines
  if (/\s/.test(trimmed)) return false;

  // Characters allowed in standard barcodes (EAN, UPC, Code 128, Code 39, ISBN, ITF, Codabar, QR Codes)
  const barcodeRegex = /^[A-Z0-9\-_./:+*$]+$/i;
  return barcodeRegex.test(trimmed);
};

export const POSTerminal: React.FC = () => {
  const { products, orders, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, addOrder, user, quickNotification, salesTags, addSalesTag, updateSalesTag, deleteSalesTag, settings, currentBranch, barcodes, getActiveProductPrice } = useERP();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('iskcon_pos_view_mode');
      if (saved === 'grid' || saved === 'list') return saved;
    }
    return 'grid';
  });

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('iskcon_pos_view_mode', mode);
    }
  };
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'upi'>('upi');
  const [customerName, setCustomerName] = useState('Bhakta John');
  
  // Set default active tag from context salesTags
  const [activeTag, setActiveTag] = useState<SalesTag | null>(null);
  useEffect(() => {
    if (salesTags && salesTags.length > 0) {
      const exists = salesTags.find(t => t.id === activeTag?.id);
      if (!exists) {
        setActiveTag(salesTags[0]);
      } else {
        setActiveTag(exists);
      }
    }
  }, [salesTags]);

  // Modals & Scanners
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scannerTab, setScannerTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [isCapturingFrame, setIsCapturingFrame] = useState(false);
  const [manualScannerInput, setManualScannerInput] = useState('');
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagDiscount, setNewTagDiscount] = useState<number>(0);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagDiscount, setEditTagDiscount] = useState<number>(0);
  const [cameraScanningText, setCameraScanningText] = useState('Align barcode within laser crosshairs...');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  // States for confirming product details before adding to cart
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [scannedQuantity, setScannedQuantity] = useState<number>(1);
  const [productNotFoundBarcode, setProductNotFoundBarcode] = useState<string | null>(null);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (p.barcode || '').includes(searchQuery);
    const matchesCat = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCat && p.stock > 0;
  });

  // Calculations
  const getProductTaxRate = (productOrCategory: Product | string): number => {
    if (typeof productOrCategory === 'object' && productOrCategory !== null) {
      if (typeof productOrCategory.taxRate === 'number') return productOrCategory.taxRate;
      return getProductTaxRate(productOrCategory.category);
    }
    const category = productOrCategory;
    if (category === 'Books') return 5; // 5% GST for spiritual books
    if (category === 'Organic Products') return 12; // 12% GST for A2 Ghee etc.
    if (category === 'Devotional Apparel') return 12; // 12% GST for Silk Dhoti etc.
    if (category === 'Deity Worship') return 18; // 18% GST for fine brass deities
    return 5; // Default 5% GST
  };

  const getProductEdition = (product: Product): string => {
    // Search for a 4-digit year like 2022, 2025 in the name or description
    const nameMatch = product.name.match(/\b(20\d{2}|19\d{2})\b/);
    if (nameMatch) {
      return nameMatch[0];
    }
    if (product.description) {
      const descMatch = product.description.match(/\b(20\d{2}|19\d{2})\b/);
      if (descMatch) return descMatch[0];
    }
    if (product.tags) {
      if (product.tags.includes('Classic')) return 'Classic Edition';
      if (product.tags.includes('Collector')) return "Collector's Edition";
    }
    return 'Standard Edition';
  };

  const cartRawSubtotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const cartTotalItems = cart.length;
  const cartTotalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);
  const discountPercent = activeTag?.discount || 0;
  const discountAmount = (cartRawSubtotal * discountPercent) / 100;
  const cartSubtotalAfterDiscount = Math.max(0, cartRawSubtotal - discountAmount);

  // Dynamic, item-specific GST calculation
  const cartTax = cart.reduce((acc, item) => {
    const effectivePrice = item.product.price * (1 - discountPercent / 100);
    const taxRate = getProductTaxRate(item.product);
    return acc + (effectivePrice * item.quantity * (taxRate / 100));
  }, 0);

  const cartTotal = cartSubtotalAfterDiscount + cartTax;

  const handleGenericBarcodeOrInvoiceScan = async (scannedText: string, onDone?: () => void, isProductOnly: boolean = false) => {
    const rawInput = scannedText.trim();
    if (!rawInput) return;

    // Clean asterisks if present
    let cleanInput = rawInput;
    if (cleanInput.startsWith('*') && cleanInput.endsWith('*') && cleanInput.length > 2) {
      cleanInput = cleanInput.slice(1, -1).trim();
    }

    console.log(`[FRONTEND SCANNER] Starting lookup for code: "${cleanInput}" (Product Only: ${isProductOnly})`);

    // Helpers to clean strings for relaxed comparisons
    const toDigits = (s: string) => s.replace(/[^0-9]/g, '');
    const toAlphaNum = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

    const cleanInputAlphaNum = toAlphaNum(cleanInput);
    const cleanInputDigits = toDigits(cleanInput);

    // 0. CHECK BARCODES TABLE/COLLECTION FIRST (Batch-level barcode matching):
    const matchedBarcodeRecord = barcodes.find(b => 
      b.barcodeValue.toLowerCase() === cleanInput.toLowerCase() ||
      b.barcodeValue === cleanInput
    );

    if (matchedBarcodeRecord) {
      const targetProduct = products.find(p => p.sku === matchedBarcodeRecord.sku);
      if (targetProduct) {
        console.log(`[FRONTEND SCANNER] Batch barcode match found:`, matchedBarcodeRecord.barcodeValue, 'Batch:', matchedBarcodeRecord.batchNo);
        playBeep();
        addToCart(targetProduct, 1, {
          batchId: matchedBarcodeRecord.batchId,
          batchNo: matchedBarcodeRecord.batchNo,
          unitPrice: matchedBarcodeRecord.sellingPrice || matchedBarcodeRecord.price,
          purchaseCost: matchedBarcodeRecord.purchaseCost
        });
        setScannedProduct(null);
        setProductNotFoundBarcode(null);
        quickNotification(
          'Batch Item Added',
          `Added 1x ${targetProduct.name} [Batch: ${matchedBarcodeRecord.batchNo}] (₹${matchedBarcodeRecord.sellingPrice || matchedBarcodeRecord.price || targetProduct.price}) to cart.`,
          'success'
        );
        if (onDone) onDone();
        return;
      }
    }

    // 1. FAST LOCAL SYNC MATCH: Exact match by SKU or Barcode first (Product scan priority)
    const foundProduct = products.find(p => 
      p.barcode === cleanInput || 
      p.sku.toLowerCase() === cleanInput.toLowerCase()
    );

    if (foundProduct) {
      console.log(`[FRONTEND SCANNER] Instant local product match found:`, foundProduct.sku);
      playBeep();
      addToCart(foundProduct, 1);
      setScannedProduct(null);
      setProductNotFoundBarcode(null);
      quickNotification(
        'Added to Cart',
        `Added 1x ${foundProduct.name} (₹${foundProduct.price}) directly to cart.`,
        'success'
      );
      if (onDone) onDone();
      return;
    }

    // 2. FAST LOCAL SYNC MATCH: See if it matches an invoice/order number in active records (skip if product-only)
    if (!isProductOnly) {
      const matchedOrder = orders.find(o => {
        const orderNoLower = o.orderNumber.toLowerCase();
        const orderIdLower = o.id.toLowerCase();
        const inputLower = cleanInput.toLowerCase();

        // Simple exact match
        if (orderNoLower === inputLower || orderIdLower === inputLower) return true;

        // Alphanumeric match (ignores dashes, spaces, slashes)
        if (cleanInputAlphaNum && (toAlphaNum(o.orderNumber) === cleanInputAlphaNum || toAlphaNum(o.id) === cleanInputAlphaNum)) return true;

        // Digits-only match (requires at least 6 digits in input to avoid matching short random SKU numbers)
        if (cleanInputDigits.length >= 6 && toDigits(o.orderNumber) === cleanInputDigits) return true;

        // Ends-with digits match (useful if scanner only reads the trailing timestamp number portion, e.g. "989092")
        if (cleanInputDigits.length >= 6 && toDigits(o.orderNumber).endsWith(cleanInputDigits)) return true;

        return false;
      });

      if (matchedOrder) {
        console.log(`[FRONTEND SCANNER] Instant local invoice match found:`, matchedOrder.orderNumber);
        playBeep();
        setLastOrder(matchedOrder);
        setShowReceiptPreview(true);
        setProductNotFoundBarcode(null);
        quickNotification(
          'Invoice Scanned',
          `Successfully loaded invoice details for #${matchedOrder.orderNumber}.`,
          'success'
        );
        if (onDone) onDone();
        return;
      }
    }

    // 3. BACKEND ROBUST DATABASE LOOKUP: Fetch from backend API
    console.log(`[FRONTEND SCANNER] No local match found. Querying backend database via lookup API...`);
    try {
      const res = await fetch(`/api/products/lookup?code=${encodeURIComponent(cleanInput)}${isProductOnly ? '&type=product' : ''}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.type === 'product' && data.product) {
            console.log(`[FRONTEND SCANNER] Backend lookup success: Found product:`, data.product.sku);
            playBeep();
            addToCart(data.product, 1);
            setScannedProduct(null);
            setProductNotFoundBarcode(null);
            quickNotification(
              'Added to Cart',
              `Added 1x ${data.product.name} (₹${data.product.price}) directly to cart.`,
              'success'
            );
            if (onDone) onDone();
            return;
          } else if (data.type === 'order' && data.order && !isProductOnly) {
            console.log(`[FRONTEND SCANNER] Backend lookup success: Found invoice:`, data.order.orderNumber);
            playBeep();
            setLastOrder(data.order);
            setShowReceiptPreview(true);
            setProductNotFoundBarcode(null);
            quickNotification(
              'Invoice Scanned',
              `Successfully loaded invoice details for #${data.order.orderNumber} from database.`,
              'success'
            );
            if (onDone) onDone();
            return;
          }
        }
      }
    } catch (err) {
      console.error(`[FRONTEND SCANNER] Backend database lookup failed:`, err);
    }

    // 4. Otherwise treat as unrecognized code
    console.warn(`[FRONTEND SCANNER] Failed to find any match for code "${cleanInput}" on both frontend and backend.`);
    setProductNotFoundBarcode(cleanInput);
    setScannedProduct(null);
    quickNotification(
      'Scan Unrecognized',
      `No product ${isProductOnly ? '' : 'or order '}matches the code "${cleanInput}".`,
      'alert'
    );
    if (onDone) onDone();
  };

  // Barcode quick scan handler (handles both manual input and handheld barcode scanner inputs)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleGenericBarcodeOrInvoiceScan(barcodeInput, () => {
      setBarcodeInput('');
    });
  };

  // Real camera scanner states & handlers
  const [activeScanner, setActiveScanner] = useState<any>(null);
  const [isTorchAvailable, setIsTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(1);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [cameraRetryCount, setCameraRetryCount] = useState<number>(0);

  // Sound beep utility
  const playBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 1100; // Bright high-pitch beep tone
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime); // Low clear volume
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18); // smooth decay

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.18);
    } catch (err) {
      console.warn("Dynamic beep reproduction failed:", err);
    }
  };

  const closeCameraScanner = async () => {
    if (activeScanner) {
      try {
        if (activeScanner.isScanning) {
          await activeScanner.stop();
        }
      } catch (err) {
        console.warn("Error stopping active scanner:", err);
      }
      setActiveScanner(null);
    }
    setIsTorchAvailable(false);
    setIsTorchOn(false);
    setZoomCapabilities(null);
    setCurrentZoom(1);
    setIsCameraOpen(false);
  };

  const handleRealScanSuccess = (decodedText: string): boolean => {
    if (!isValidBarcodeValue(decodedText)) {
      console.log(`[FRONTEND SCANNER] Ignored invalid barcode scan: "${decodedText}"`);
      return false;
    }
    handleGenericBarcodeOrInvoiceScan(decodedText, () => {
      closeCameraScanner();
    }, true);
    return true;
  };

  const scanWithGeminiAI = async (file: File | Blob): Promise<boolean> => {
    // Disabled to avoid general OCR / printed text recognition and enforce genuine barcode scanning
    return false;
  };

  const scanWithBarcodeDetector = async (imageSource: any): Promise<string | null> => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const formats = [
          'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'data_matrix', 'aztec', 'pdf417'
        ];
        const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
        const activeFormats = formats.filter(f => supportedFormats.includes(f));
        
        const detector = new (window as any).BarcodeDetector({ 
          formats: activeFormats.length > 0 ? activeFormats : ['ean_13', 'code_128', 'qr_code'] 
        });
        
        const barcodes = await detector.detect(imageSource);
        if (barcodes && barcodes.length > 0) {
          console.log("[BarcodeDetector] Detected barcodes natively:", barcodes);
          return barcodes[0].rawValue;
        }
      } catch (err) {
        console.warn("[BarcodeDetector] detection failed:", err);
      }
    }
    return null;
  };

  const handleUploadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileScanning(true);
    setCameraScanningText("Parsing uploaded file for barcode...");
    try {
      // 1. Try native BarcodeDetector API if supported
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const img = new Image();
          const objectUrl = URL.createObjectURL(file);
          img.src = objectUrl;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          
          const decodedText = await scanWithBarcodeDetector(img);
          URL.revokeObjectURL(objectUrl);

          if (decodedText) {
            playBeep();
            handleRealScanSuccess(decodedText);
            quickNotification("Scan Succeeded!", "Barcode decoded natively via BarcodeDetector.", "success");
            setIsFileScanning(false);
            return;
          }
        } catch (detectorErr) {
          console.warn("BarcodeDetector upload scan failed, falling back to html5-qrcode:", detectorErr);
        }
      }

      // Use Html5Qrcode on the hidden reader element
      const fileScanner = new Html5Qrcode("hidden-file-reader");
      try {
        const decodedText = await fileScanner.scanFile(file, true);
        
        // Found barcode!
        playBeep();
        handleRealScanSuccess(decodedText);
        quickNotification("Scan Succeeded!", "Barcode decoded successfully.", "success");
      } catch (err: any) {
        console.warn("Failed to scan barcode from uploaded file:", err);
        quickNotification(
          "No Barcode Detected",
          "We couldn't detect any valid barcode symbol in this image. Please make sure the barcode is clear, flat, and well-lit.",
          "warning"
        );
      } finally {
        try {
          fileScanner.clear();
        } catch (e) {
          console.warn("fileScanner clear failed:", e);
        }
      }
    } catch (err: any) {
      console.error("File scanning wrapper error:", err);
    } finally {
      setIsFileScanning(false);
    }
  };

  const captureAndScanFrame = async () => {
    const video = document.querySelector('#reader video') as HTMLVideoElement;
    if (!video) {
      quickNotification("Scanner Not Ready", "The video stream is not active yet.", "warning");
      return;
    }

    setIsCapturingFrame(true);
    setCameraScanningText("Capturing and processing frame...");

    try {
      // 1. Try native BarcodeDetector API directly on video element if supported
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const decodedText = await scanWithBarcodeDetector(video);
          if (decodedText) {
            playBeep();
            handleRealScanSuccess(decodedText);
            quickNotification("Scan Succeeded!", "Barcode decoded natively via BarcodeDetector.", "success");
            setIsCapturingFrame(false);
            return;
          }
        } catch (detectorErr) {
          console.warn("BarcodeDetector video element scan failed, trying canvas...", detectorErr);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || video.clientWidth || 640;
      canvas.height = video.videoHeight || video.clientHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");
      
      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 2. Try native BarcodeDetector API on the captured canvas
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const decodedText = await scanWithBarcodeDetector(canvas);
          if (decodedText) {
            playBeep();
            handleRealScanSuccess(decodedText);
            quickNotification("Scan Succeeded!", "Barcode decoded natively via BarcodeDetector on canvas frame.", "success");
            setIsCapturingFrame(false);
            return;
          }
        } catch (detectorErr) {
          console.warn("BarcodeDetector canvas scan failed, falling back to html5-qrcode:", detectorErr);
        }
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) throw new Error("Failed to create image blob");
      
      const file = new File([blob], "captured_frame.jpg", { type: "image/jpeg" });
      
      // Scan the captured file using a file scanner instance
      const fileScanner = new Html5Qrcode("hidden-file-reader");
      try {
        const decodedText = await fileScanner.scanFile(file, true);
        playBeep();
        handleRealScanSuccess(decodedText);
        quickNotification("Scan Succeeded!", "Barcode decoded successfully.", "success");
      } catch (scanErr) {
        console.warn("Standard manual frame scan failed:", scanErr);
        quickNotification(
          "Scan Failed", 
          "We couldn't detect a valid barcode pattern in the captured frame. Make sure the barcode is aligned inside the guide.", 
          "warning"
        );
      } finally {
        try {
          fileScanner.clear();
        } catch (e) {
          console.warn("fileScanner clear failed:", e);
        }
      }
    } catch (err: any) {
      console.error("Failed to capture and scan frame:", err);
      quickNotification("Error", "Failed to capture frame from webcam stream.", "alert");
    } finally {
      setIsCapturingFrame(false);
      setCameraScanningText("Align barcode inside the laser area. Keep steady and well-lit.");
    }
  };

  const toggleTorch = async () => {
    if (!activeScanner) return;
    try {
      const nextTorch = !isTorchOn;
      await activeScanner.applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setIsTorchOn(nextTorch);
    } catch (e) {
      console.warn("Failed to toggle torch:", e);
      quickNotification("Torch Error", "Flashlight toggle is not supported on this device/camera.", "warning");
    }
  };

  const handleZoomChange = async (val: number) => {
    if (!activeScanner) return;
    try {
      await activeScanner.applyVideoConstraints({
        advanced: [{ zoom: val }]
      });
      setCurrentZoom(val);
    } catch (e) {
      console.warn("Failed to apply zoom:", e);
    }
  };

  useEffect(() => {
    if (!isCameraOpen || scannerTab !== 'camera') {
      if (activeScanner) {
        try {
          if (activeScanner.isScanning) {
            activeScanner.stop().catch((err: any) => console.warn("Stop scanner err:", err));
          }
        } catch (e) {
          console.warn("Error checking isScanning on stop:", e);
        }
        setActiveScanner(null);
        setIsTorchAvailable(false);
        setIsTorchOn(false);
        setZoomCapabilities(null);
        setCurrentZoom(1);
      }
      return;
    }

    let isMounted = true;
    let scannerInstance: any = null;
    setScannerError(null);
    setIsTorchAvailable(false);
    setIsTorchOn(false);
    setZoomCapabilities(null);
    setCurrentZoom(1);

    const timer = setTimeout(async () => {
      const readerElement = document.getElementById("reader");
      if (!readerElement) return;

      setCameraScanningText("Connecting to camera...");

      const attempts = [
        { facingMode: "environment", useConstraints: true },
        { facingMode: "environment", useConstraints: false },
        { facingMode: "user", useConstraints: true },
        { facingMode: "user", useConstraints: false }
      ];

      let successfulScanner: any = null;
      let lastError: any = null;

      for (const attempt of attempts) {
        if (!isMounted) break;

        try {
          console.log(`Scanner attempt: facingMode=${attempt.facingMode}, useConstraints=${attempt.useConstraints}`);
          const scanner = new Html5Qrcode("reader", {
            verbose: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODABAR,
            ]
          });

          const config = attempt.useConstraints ? {
            facingMode: attempt.facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            aspectRatio: { ideal: 1.7777777778 }
          } : {
            facingMode: attempt.facingMode
          };

          await scanner.start(
            config,
            {
              fps: 25,
              disableFlip: attempt.facingMode === 'environment',
              qrbox: (width: number, height: number) => {
                const w = width > 0 ? width : 400;
                const h = height > 0 ? height : 300;
                // Horizontal scan box optimized for 1D barcodes and QR codes
                const boxWidth = Math.min(w * 0.85, 360);
                const boxHeight = Math.min(h * 0.45, 150);
                return { 
                  width: Math.max(boxWidth, 240), 
                  height: Math.max(boxHeight, 100) 
                };
              }
            },
            (decodedText: string) => {
              if (!isMounted) return;
              handleRealScanSuccess(decodedText);
            },
            () => {
              // Unhandled scan frame error is silent to prevent log flood
            }
          );

          if (isMounted) {
            successfulScanner = scanner;
            break;
          } else {
            // Already unmounted, stop it immediately
            scanner.stop().catch((err: any) => console.warn("Stop scanner abort failed:", err));
          }
        } catch (err: any) {
          console.warn(`Scanner attempt failed (facingMode=${attempt.facingMode}, useConstraints=${attempt.useConstraints}):`, err);
          lastError = err;
        }
      }

      if (!isMounted) {
        if (successfulScanner) {
          successfulScanner.stop().catch((err: any) => console.warn("Unmounted cleanup stop failed:", err));
        }
        return;
      }

      if (successfulScanner) {
        scannerInstance = successfulScanner;
        setActiveScanner(successfulScanner);
        setCameraScanningText("Align barcode inside the laser area. Keep steady and well-lit.");

        // Query track capabilities for torch and zoom
        try {
          const capabilities = successfulScanner.getRunningTrackCapabilities() as any;
          if (capabilities) {
            if (capabilities.torch) {
              setIsTorchAvailable(true);
            }
            if (capabilities.zoom) {
              setZoomCapabilities({
                min: capabilities.zoom.min || 1,
                max: capabilities.zoom.max || 5,
                step: capabilities.zoom.step || 0.1
              });
              setCurrentZoom(capabilities.zoom.min || 1);
            }
          }
        } catch (e) {
          console.warn("Failed to read track capabilities:", e);
        }
      } else {
        console.error("All scanner attempts failed. Last error:", lastError);
        const errMsg = lastError?.message || String(lastError || "Could not access any camera.");
        if (errMsg.includes("NotAllowedError") || errMsg.includes("Permission denied") || errMsg.includes("PermissionDismissedError") || errMsg.includes("not allowed")) {
          setScannerError(
            "Camera access denied (NotAllowedError). Browsers block camera access inside nested iframe previews unless opened in a new tab, or if permission was previously blocked."
          );
        } else {
          setScannerError(
            errMsg + ". Please check your camera connection and browser settings."
          );
        }
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerInstance) {
        try {
          if (scannerInstance.isScanning) {
            scannerInstance.stop().catch((err: any) => console.warn("Cleanup stop failed:", err));
          }
        } catch (err) {
          console.warn("Cleanup stop check failed:", err);
        }
      }
      setIsTorchAvailable(false);
      setIsTorchOn(false);
      setZoomCapabilities(null);
      setCurrentZoom(1);
    };
  }, [isCameraOpen, scannerTab, cameraRetryCount]);

  // Continuous native BarcodeDetector loop for near-instant native barcode scanning
  useEffect(() => {
    if (!isCameraOpen || !activeScanner || typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      return;
    }

    let isLoopMounted = true;
    let detectorInstance: any = null;
    let frameId: number;

    const startNativeLoop = async () => {
      try {
        const formats = [
          'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf', 'data_matrix', 'aztec', 'pdf417'
        ];
        const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
        const activeFormats = formats.filter(f => supportedFormats.includes(f));
        
        detectorInstance = new (window as any).BarcodeDetector({ 
          formats: activeFormats.length > 0 ? activeFormats : ['ean_13', 'code_128', 'qr_code'] 
        });
      } catch (err) {
        console.warn("[BarcodeDetector] Continuous loop initialization failed:", err);
        return;
      }

      const scanFrame = async () => {
        if (!isLoopMounted) return;

        const video = document.querySelector('#reader video') as HTMLVideoElement;
        if (video && video.readyState >= 2 && !video.paused) {
          try {
            const barcodes = await detectorInstance.detect(video);
            if (barcodes && barcodes.length > 0 && isLoopMounted) {
              const decodedText = barcodes[0].rawValue;
              if (decodedText) {
                console.log("[BarcodeDetector] Continuous loop detected barcode natively:", decodedText);
                const accepted = handleRealScanSuccess(decodedText);
                if (accepted) {
                  playBeep();
                  quickNotification("Scan Succeeded!", `Barcode decoded natively via BarcodeDetector: ${decodedText}`, "success");
                  return; // Stop loop once detected and accepted
                }
              }
            }
          } catch (err) {
            // Suppress continuous detection errors to avoid spam
          }
        }

        if (isLoopMounted) {
          setTimeout(() => {
            frameId = requestAnimationFrame(scanFrame);
          }, 150);
        }
      };

      frameId = requestAnimationFrame(scanFrame);
    };

    startNativeLoop();

    return () => {
      isLoopMounted = false;
      cancelAnimationFrame(frameId);
    };
  }, [isCameraOpen, activeScanner]);

  // Simulate barcode scans (e.g. for desktop browser testing)
  const simulateCameraScanProduct = (sku: string) => {
    const found = products.find(p => p.sku === sku);
    if (found) {
      playBeep();
      addToCart(found, 1);
      setScannedProduct(null);
      setProductNotFoundBarcode(null);
      quickNotification(
        'Item Added to Cart',
        `Scanned & added 1x ${found.name} (₹${found.price}) to cart.`,
        'success'
      );
      closeCameraScanner();
    } else {
      quickNotification('Scan Error', `Could not match simulated object.`, 'alert');
    }
  };

  const simulateCameraScan = () => {
    const randomProd = products[Math.floor(Math.random() * products.length)];
    if (randomProd) {
      playBeep();
      addToCart(randomProd, 1);
      setScannedProduct(null);
      setProductNotFoundBarcode(null);
      quickNotification(
        'Item Added to Cart',
        `Scanned & added 1x ${randomProd.name} (₹${randomProd.price}) to cart.`,
        'success'
      );
      closeCameraScanner();
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const orderNo = `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const newOrderPayload: POSOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      orderNumber: orderNo,
      items: [...cart],
      subtotal: cartRawSubtotal,
      discountAmount,
      taxAmount: cartTax,
      total: cartTotal,
      paymentMethod,
      timestamp: new Date().toISOString(),
      cashierName: user?.name || 'Radha Govinda Das',
      customerName: customerName || 'Walk-in Devotee',
      salesTag: activeTag?.name || 'Standard Retail',
      branchId: currentBranch?.id || 'branch-mayapur-hq',
      branchName: currentBranch?.name || 'Mayapur HQ Central'
    };
    addOrder(newOrderPayload);
    setLastOrder(newOrderPayload);
    setCheckoutSuccess(true);
    setShowReceiptPreview(true);
    clearCart();
    quickNotification('POS Checkout Completed', `Invoice ${orderNo} generated for branch "${currentBranch?.name}" via ${paymentMethod.toUpperCase()}.`, 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Barcode & Terminal Status Header */}
      <div className="p-6 rounded-2xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight text-[#111827] dark:text-white">
                  POS Express Checkout
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] font-mono text-[11px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" /> TERMINAL 01
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {currentBranch?.name} ({currentBranch?.code})
                </span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-slate-400 mt-0.5">
                Operating strictly in <span className="font-semibold text-slate-800 dark:text-slate-200">{currentBranch?.name}</span> • High-speed barcode scanner • GST compliance
              </p>
            </div>
          </div>
        </div>

        {/* Large Barcode Scanner Input */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleBarcodeSubmit} className="relative flex-1 md:w-80">
            <Barcode className="w-4 h-4 text-[#D97706] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              placeholder="Scan or type barcode SKU (e.g. BOOK-001)..."
              className="w-full pl-10 pr-20 py-2.5 rounded-xl bg-amber-50/50 dark:bg-slate-800 border border-[#E8E2D9] dark:border-slate-700 text-xs font-mono text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D97706] shadow-2xs"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white text-[11px] font-medium transition-colors"
            >
              ADD
            </button>
          </form>

          <button
            onClick={() => setIsCameraOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#D97706] dark:text-amber-400 border border-[#F59E0B]/30 font-medium text-xs flex items-center gap-2 shrink-0 transition-all shadow-2xs"
          >
            <Camera className="w-4 h-4" />
            <span>Camera Scan</span>
          </button>
        </div>
       </div>

      {/* Main Terminal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Area: Catalog & Filters (8 Columns on Desktop) */}
        <motion.div
          layout="position"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`${
            cart.length > 0 ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12 col-span-full'
          } space-y-4`}
        >
          {/* Sales Tag Selector Dropdown Bar */}
          <div className="p-4 rounded-2xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#D97706] dark:text-amber-400 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#111827] dark:text-white">Active Sales Tag</span>
                  {activeTag && activeTag.discount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-[10px] border border-emerald-200/80 dark:border-emerald-800/80">
                      {activeTag.discount}% OFF APPLIED
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
                  Select promotional tag or price category for automatic discount application
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:w-auto w-full">
              <div className="relative flex-1 sm:w-64">
                <select
                  value={activeTag?.id || ''}
                  onChange={(e) => {
                    const found = salesTags.find(t => t.id === e.target.value);
                    if (found) {
                      setActiveTag(found);
                      quickNotification('Promotion Tag Applied', `Switched to ${found.name} (${found.discount}% discount)`, 'info');
                    }
                  }}
                  className="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-amber-50/40 dark:bg-slate-800 border border-[#E8E2D9] dark:border-slate-700 text-xs font-semibold text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D97706] appearance-none cursor-pointer shadow-2xs transition-all hover:bg-amber-50/80"
                >
                  {salesTags.map(tag => (
                    <option key={tag.id} value={tag.id}>
                      🏷️ {tag.name} {tag.discount > 0 ? `(-${tag.discount}% Discount)` : '(0% Regular Retail)'}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#786C65] dark:text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>

              <button
                type="button"
                onClick={() => setIsTagsModalOpen(true)}
                title="Configure and manage sales tags"
                className="px-3 py-2.5 rounded-xl text-xs font-bold bg-[#FAF7F2] dark:bg-slate-800 text-[#786C65] dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-slate-700 hover:text-[#D97706] border border-[#E8E2D9] dark:border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#D97706]" />
                <span className="hidden sm:inline">Configure</span>
              </button>
            </div>
          </div>

          {/* Search, Category Filter & View Toggle */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#786C65] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by product name, SKU, or barcode..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 text-xs sm:text-sm text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#D97706] shadow-2xs"
                />
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleSetViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-slate-900 text-[#D97706] dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-900 text-[#D97706] dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="List View"
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List</span>
                </button>
              </div>
            </div>

            {/* Categories and count */}
            <div className="flex items-center justify-between gap-3 overflow-hidden">
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[#D97706] text-white shadow-xs'
                        : 'bg-[#FFFFFF] dark:bg-slate-900 text-[#786C65] dark:text-slate-400 border border-[#E8E2D9] dark:border-slate-800 hover:bg-[#FAF8F5] dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-mono text-slate-400 shrink-0 hidden md:inline">
                {filteredProducts.length} item{filteredProducts.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {/* Products Container: Grid vs List */}
          {viewMode === 'grid' ? (
            /* Product Cards Grid with Thumbnails */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-h-[620px] overflow-y-auto pr-1">
              {filteredProducts.map(product => {
                const activePrice = getActiveProductPrice(product);
                return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product, 1)}
                  className="p-3 rounded-[18px] bg-[#FFFFFF] dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 hover:border-[#D97706] hover:shadow-md transition-all text-left flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="relative w-full h-28 rounded-xl overflow-hidden bg-amber-50/50 dark:bg-slate-800 border border-[#E8E2D9] dark:border-slate-700">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold backdrop-blur-xs ${
                        product.stock <= 5 ? 'bg-rose-600/80 text-white' : 'bg-black/60 text-white'
                      }`}>
                        {product.stock} left
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#786C65] mt-0.5">
                        <span className="truncate">{product.sku}</span>
                        <span className="text-amber-800 bg-amber-50 dark:bg-amber-950/30 px-1 rounded truncate max-w-[80px] font-bold">
                          {product.batchNo}
                        </span>
                      </div>
                      <h3 className="font-semibold text-xs text-[#1F1916] dark:text-white line-clamp-2 leading-snug group-hover:text-[#D97706] transition-colors mt-0.5">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-1 text-[10px] font-mono text-slate-500">
                        <Barcode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-semibold">{product.barcode}</span>
                      </div>
                    </div>
                    <div className="pt-2.5 mt-2 border-t border-[#E8E2D9] dark:border-slate-800 flex items-center justify-between">
                      <div>
                        {activeTag && activeTag.discount > 0 ? (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-[#786C65] line-through font-mono">{settings.currencySymbol}{activePrice.toFixed(2)}</span>
                            <span className="font-bold font-mono text-xs text-[#15803D]">
                              {settings.currencySymbol}{(activePrice * (1 - activeTag.discount / 100)).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold font-mono text-xs text-[#1F1916] dark:text-white">
                            {settings.currencySymbol}{activePrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <button className="w-7 h-7 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center group-hover:bg-[#D97706] group-hover:text-white transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );})}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-[#6B7280] text-sm">
                  No items found matching criteria. Scan barcode or adjust filters.
                </div>
              )}
            </div>
          ) : (
            /* Product List View */
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredProducts.map(product => {
                const activePrice = getActiveProductPrice(product);
                const discountedPrice = activeTag && activeTag.discount > 0
                  ? activePrice * (1 - activeTag.discount / 100)
                  : activePrice;
                const inCart = cart.find(item => item.product.id === product.id);

                return (
                  <div
                    key={product.id}
                    className="p-3 rounded-2xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 hover:border-[#D97706] hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
                  >
                    {/* Left: Thumbnail & Meta */}
                    <div
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                      onClick={() => addToCart(product, 1)}
                    >
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-amber-50/50 dark:bg-slate-800 border border-[#E8E2D9] dark:border-slate-700 shrink-0">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {product.stock <= 5 && (
                          <span className="absolute bottom-0 inset-x-0 bg-rose-600/90 text-white text-[8px] font-bold text-center py-0.5">
                            Low Stock
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-xs sm:text-sm text-[#1F1916] dark:text-white group-hover:text-[#D97706] transition-colors truncate">
                            {product.name}
                          </h3>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 font-medium shrink-0">
                            {product.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-[#786C65] dark:text-slate-400 font-mono flex-wrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">SKU: {product.sku}</span>
                          <span className="flex items-center gap-1">
                            <Barcode className="w-3.5 h-3.5 text-slate-400" />
                            {product.barcode}
                          </span>
                          <span className="text-amber-800 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded text-[10px] font-bold">
                            Batch: {product.batchNo}
                          </span>
                          <span className={`font-semibold ${product.stock <= 5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {product.stock} in stock
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Pricing & Cart controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="text-left sm:text-right">
                        {activeTag && activeTag.discount > 0 ? (
                          <div className="flex flex-col sm:items-end">
                            <span className="text-[10px] text-[#786C65] line-through font-mono">
                              {settings.currencySymbol}{activePrice.toFixed(2)}
                            </span>
                            <span className="font-bold font-mono text-sm text-[#15803D]">
                              {settings.currencySymbol}{discountedPrice.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-bold font-mono text-sm text-[#1F1916] dark:text-white">
                            {settings.currencySymbol}{activePrice.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {inCart ? (
                          <div className="flex items-center bg-amber-50 dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-xl p-1 gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateCartQuantity(product.id, inCart.quantity - 1);
                              }}
                              className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-xs text-amber-900 dark:text-amber-200">
                              {inCart.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product, 1);
                              }}
                              className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center hover:bg-amber-700 transition-colors shadow-2xs cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(product, 1)}
                            className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 hover:bg-[#D97706] hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 border border-amber-200 dark:border-slate-700 group-hover:border-[#D97706] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="py-16 text-center text-[#6B7280] text-sm bg-white dark:bg-slate-900 rounded-2xl border border-[#E8E2D9] dark:border-slate-800">
                  No items found matching criteria. Scan barcode or adjust filters.
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Right Area: Running Cart & Checkout Counter (4 Columns on Desktop) */}
        <AnimatePresence mode="popLayout">
          {cart.length > 0 && (
            <motion.div
              key="pos-running-cart"
              initial={{ opacity: 0, x: 50, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="lg:col-span-5 xl:col-span-4 rounded-2xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 shadow-xs p-5 flex flex-col justify-between h-[730px] sticky top-20"
            >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-base text-[#111827] dark:text-white">
                <ShoppingBag className="w-5 h-5 text-[#2563EB]" />
                <span>Running Cart</span>
                <div className="flex items-center gap-1.5 ml-1">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-mono font-medium border border-blue-200/80 dark:border-blue-800/80">
                    {cartTotalItems} {cartTotalItems === 1 ? 'item' : 'items'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold border border-emerald-200/80 dark:border-emerald-800/80">
                    {cartTotalUnits} {cartTotalUnits === 1 ? 'unit' : 'units'}
                  </span>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-[#EF4444] hover:underline cursor-pointer transition-colors"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Customer & Devotee Entry and Sales Tag Dropdown */}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#6B7280] font-medium block mb-1">Customer / Devotee Account</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Enter devotee name or mobile..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAFAFA] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-xs text-[#111827] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-[#6B7280] font-medium flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-[#D97706] dark:text-amber-400" />
                    <span>Applied Sales Tag</span>
                  </label>
                  {activeTag && activeTag.discount > 0 && (
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                      {activeTag.discount}% OFF
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={activeTag?.id || ''}
                    onChange={(e) => {
                      const found = salesTags.find(t => t.id === e.target.value);
                      if (found) {
                        setActiveTag(found);
                        quickNotification('Promotion Tag Applied', `Switched to ${found.name} (${found.discount}% discount)`, 'info');
                      }
                    }}
                    className="w-full pl-3 pr-8 py-2 rounded-xl bg-[#FAFAFA] dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 text-xs font-medium text-[#111827] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#2563EB] appearance-none cursor-pointer"
                  >
                    {salesTags.map(tag => (
                      <option key={tag.id} value={tag.id}>
                        🏷️ {tag.name} {tag.discount > 0 ? `(-${tag.discount}% Discount)` : '(0% Regular Retail)'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#6B7280] pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Active Cart Items List */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {cart.map(item => {
                const effectivePrice = item.product.price * (1 - (activeTag?.discount || 0) / 100);
                const itemTaxRate = getProductTaxRate(item.product);
                return (
                  <div
                    key={item.product.id}
                    className="p-3 rounded-xl bg-[#FAFAFA] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-700/80 flex items-center justify-between gap-3"
                  >
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-10 h-10 rounded-lg object-cover border border-[#E5E7EB] dark:border-slate-700 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs text-[#111827] dark:text-white truncate">{item.product.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                        <span className="text-xs font-mono font-bold text-[#10B981]">₹{effectivePrice.toFixed(2)}</span>
                        {activeTag && activeTag.discount > 0 && (
                          <span className="text-[10px] text-[#6B7280] line-through font-mono">₹{item.product.price.toFixed(2)}</span>
                        )}
                        <span className="text-[9px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded-sm font-mono whitespace-nowrap">
                          {item.product.batchNo}
                        </span>
                        <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded-sm font-mono whitespace-nowrap">
                          GST: {itemTaxRate}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateCartQuantity(item.product.id, Math.max(0, item.quantity - 1))}
                        className="w-7 h-7 rounded-lg bg-[#FFFFFF] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-white flex items-center justify-center font-bold text-xs hover:bg-slate-100"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center font-mono font-semibold text-xs">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-[#FFFFFF] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-white flex items-center justify-center font-bold text-xs hover:bg-slate-100"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="w-7 h-7 rounded-lg text-[#EF4444] hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center ml-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {cart.length === 0 && (
                <div className="py-16 text-center text-[#6B7280] text-xs space-y-2 border-2 border-dashed border-[#E5E7EB] dark:border-slate-800 rounded-2xl">
                  <ShoppingBag className="w-8 h-8 text-[#6B7280] mx-auto opacity-40" />
                  <p>Running cart is currently empty.</p>
                  <p className="text-[11px] text-[#6B7280]">Scan barcodes or click items from the left catalog.</p>
                </div>
              )}
            </div>
          </div>

          {/* Totals & Payment Execution */}
          <div className="space-y-3.5 pt-4 border-t border-[#E5E7EB] dark:border-slate-800">
            <div className="space-y-1.5 text-xs text-[#6B7280]">
              <div className="flex justify-between items-center py-1.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 mb-2">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#D97706] dark:text-amber-400" />
                  <span>Total Items & Units</span>
                </span>
                <div className="flex items-center gap-2 font-mono font-bold text-xs">
                  <span className="text-blue-600 dark:text-blue-400">{cartTotalItems} {cartTotalItems === 1 ? 'Item' : 'Items'}</span>
                  <span className="text-slate-300 dark:text-slate-600 font-normal">|</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{cartTotalUnits} {cartTotalUnits === 1 ? 'Unit' : 'Units'}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Raw Subtotal</span>
                <span className="font-mono text-[#111827] dark:text-white">₹{cartRawSubtotal.toFixed(2)}</span>
              </div>
              {activeTag && activeTag.discount > 0 && (
                <div className="flex justify-between text-[#10B981] font-medium">
                  <span>Discount ({activeTag.name})</span>
                  <span className="font-mono">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Total GST / Sales Tax</span>
                <span className="font-mono text-[#111827] dark:text-white">₹{cartTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-[#1F1916] dark:text-white pt-2 border-t border-[#E8E2D9] dark:border-slate-800">
                <span>Total Payable</span>
                <span className="text-[#D97706] dark:text-amber-400 font-mono text-lg">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Toggles */}
            <div>
              <label className="text-xs text-[#786C65] font-medium block mb-1.5">Select Payment Method</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                  { id: 'card', label: 'Card / POS', icon: CreditCard },
                  { id: 'cash', label: 'Cash', icon: Banknote },
                ].map(mode => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setPaymentMethod(mode.id as any)}
                      className={`py-2.5 px-2 rounded-xl font-medium text-xs flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                        paymentMethod === mode.id
                          ? 'bg-[#D97706] text-white border-transparent shadow-xs'
                          : 'bg-[#FAF7F2] dark:bg-slate-800 text-[#786C65] dark:text-slate-300 border-[#E8E2D9] dark:border-slate-700 hover:bg-amber-50/60'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkout Trigger */}
            <button
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className="w-full py-4 rounded-xl bg-[#D97706] hover:bg-[#B45309] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md shadow-[#D97706]/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
            >
              <span>COMPLETE BILL ({cartTotalItems} {cartTotalItems === 1 ? 'item' : 'items'}, {cartTotalUnits} {cartTotalUnits === 1 ? 'unit' : 'units'} • ₹{cartTotal.toFixed(2)})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Camera Barcode Scanner Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            
            {/* Hidden HTML element for file-based barcode decoding work */}
            <div id="hidden-file-reader" className="hidden" style={{ display: 'none' }} />

            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-base text-slate-900 dark:text-white">
                <Camera className="w-5 h-5 text-amber-500 animate-pulse" />
                <span>POS Multi-Scanner</span>
              </div>
              <div className="flex items-center gap-2">
                {scannerTab === 'camera' && isTorchAvailable && (
                  <button
                    onClick={toggleTorch}
                    title="Toggle Flashlight"
                    className={`p-2 rounded-lg border transition-all flex items-center justify-center ${
                      isTorchOn
                        ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Zap className={`w-4 h-4 ${isTorchOn ? 'fill-amber-500' : ''}`} />
                  </button>
                )}
                <button
                  onClick={closeCameraScanner}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Tab Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setScannerTab('camera')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all ${
                  scannerTab === 'camera'
                    ? 'bg-white dark:bg-slate-700 text-[#D97706] dark:text-white shadow-xs'
                    : 'text-[#786C65] dark:text-slate-400 hover:text-slate-750'
                }`}
              >
                Live Camera
              </button>
              <button
                type="button"
                onClick={() => setScannerTab('upload')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all ${
                  scannerTab === 'upload'
                    ? 'bg-white dark:bg-slate-700 text-[#D97706] dark:text-white shadow-xs'
                    : 'text-[#786C65] dark:text-slate-400 hover:text-slate-750'
                }`}
              >
                Upload Photo
              </button>
              <button
                type="button"
                onClick={() => setScannerTab('manual')}
                className={`py-2 px-1 text-center rounded-lg text-xs font-semibold transition-all ${
                  scannerTab === 'manual'
                    ? 'bg-white dark:bg-slate-700 text-[#D97706] dark:text-white shadow-xs'
                    : 'text-[#786C65] dark:text-slate-400 hover:text-slate-750'
                }`}
              >
                Manual SKU
              </button>
            </div>

            {/* Dynamic Content based on tab */}
            {scannerTab === 'camera' && (
              <div className="space-y-4">
                {/* Live Video Canvas Container */}
                <div className="relative aspect-[4/3] rounded-xl bg-slate-950 overflow-hidden flex flex-col items-center justify-center border-2 border-dashed border-amber-500/30">
                  {scannerError ? (
                    <div className="p-5 text-center space-y-4 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center mx-auto text-rose-600">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Camera Access Blocked / Failed</p>
                        <p className="text-[11px] text-rose-500 dark:text-rose-400 font-mono leading-relaxed bg-rose-50/50 dark:bg-rose-950/20 p-2 rounded-lg border border-rose-100/30 max-h-[80px] overflow-y-auto">
                          {scannerError}
                        </p>
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-850 dark:text-amber-200 rounded-xl text-[11px] leading-relaxed border border-amber-200/40 text-left">
                          💡 <strong>How to resolve:</strong>
                          <ul className="list-disc pl-4 mt-1 space-y-1">
                            <li>Click <strong>"Open in New Tab"</strong> in the top-right of your screen to bypass the nested preview frame constraints.</li>
                            <li>Or click the lock/camera icon in your address bar to Reset/Allow permissions.</li>
                          </ul>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setScannerError(null);
                            setCameraRetryCount(prev => prev + 1);
                          }}
                          className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
                        >
                          🔄 Retry Camera
                        </button>
                        <button
                          type="button"
                          onClick={() => setScannerTab('manual')}
                          className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          ⌨️ Enter SKU
                        </button>
                        <button
                          type="button"
                          onClick={() => setScannerTab('upload')}
                          className="py-1.5 px-3 bg-[#FFFBEB] hover:bg-[#FEF3C7] dark:bg-amber-950/40 dark:hover:bg-amber-950/60 text-[#D97706] dark:text-amber-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          📁 Upload Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Real reader element inside DOM */}
                      <div id="reader" className="w-full h-full object-cover" />
                      
                      {/* Laser Scanning Line Animation */}
                      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse pointer-events-none z-10" />
                      
                      {/* Corner Targets */}
                      <div className="absolute inset-8 border border-white/25 rounded-lg pointer-events-none flex items-center justify-center z-10">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500" />
                        <span className="text-[10px] font-mono tracking-widest text-white/50 bg-black/60 px-2 py-0.5 rounded uppercase">
                          ALIGN BARCODE
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Zoom Slider if Available */}
                {zoomCapabilities && (
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 select-none">
                      Zoom
                    </span>
                    <input
                      type="range"
                      min={zoomCapabilities.min}
                      max={zoomCapabilities.max}
                      step={zoomCapabilities.step}
                      value={currentZoom}
                      onChange={(e) => handleZoomChange(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 w-8 text-right font-bold shrink-0">
                      {currentZoom.toFixed(1)}x
                    </span>
                  </div>
                )}

                {!scannerError && (
                  <button
                    type="button"
                    onClick={captureAndScanFrame}
                    disabled={isCapturingFrame}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {isCapturingFrame ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing Frame...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>📸 Click to Scan / Capture Frame</span>
                      </>
                    )}
                  </button>
                )}

                <div className="bg-amber-50/50 dark:bg-amber-950/10 p-2.5 rounded-xl border border-amber-200/20 text-center text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                  ✨ <strong>AI-Powered Scanning Fallback</strong>: If the camera cannot scan the barcode lines automatically (due to focal limits or low resolution), click the button above! Gemini AI will capture the frame and automatically read the printed barcode numbers underneath the lines.
                </div>
              </div>
            )}

            {scannerTab === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 rounded-xl p-6 text-center transition-all bg-slate-50 dark:bg-slate-950/40 flex flex-col items-center justify-center min-h-[180px] relative cursor-pointer group">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFileChange}
                    disabled={isFileScanning}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/20 text-[#D97706] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    {isFileScanning ? (
                      <span className="w-5 h-5 border-2 border-[#D97706] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {isFileScanning ? 'Decoding Photo...' : 'Upload or Take Barcode Photo'}
                    </p>
                    <p className="text-[10px] text-slate-500 max-w-[240px] leading-relaxed mx-auto">
                      {isFileScanning ? 'Please wait a moment...' : 'Click to select an image, or snap a photo of a barcode directly from your phone camera.'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] leading-relaxed text-[#786C65] dark:text-slate-400">
                  💡 <strong>Smart AI OCR Supported:</strong> If the uploaded image does not contain clear barcode lines, Gemini AI will automatically extract the printed barcode digits below the lines and add the product!
                </div>
              </div>
            )}

            {scannerTab === 'manual' && (
              <div className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!manualScannerInput.trim()) return;
                    handleGenericBarcodeOrInvoiceScan(manualScannerInput, () => {
                      setManualScannerInput('');
                      closeCameraScanner();
                    }, true);
                  }}
                  className="space-y-3"
                >
                  <div className="relative">
                    <Barcode className="w-4 h-4 text-[#D97706] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={manualScannerInput}
                      onChange={(e) => setManualScannerInput(e.target.value)}
                      placeholder="Type SKU or Barcode..."
                      className="w-full pl-10 pr-24 py-3 bg-slate-50 dark:bg-slate-950 border border-[#E8E2D9] dark:border-slate-800 text-xs font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D97706] text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-semibold rounded-lg transition-colors"
                    >
                      ADD SKU
                    </button>
                  </div>
                </form>

                <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-[#E8E2D9] dark:border-slate-800 text-[11px] leading-relaxed text-[#786C65] dark:text-slate-400">
                  💡 <strong>Quick SKU Tip:</strong> Enter barcode number <strong>9629755769266</strong>, <strong>9780892132683</strong> (Paperback Gita) or <strong>8901030737083</strong> (Pure Gir Cow Ghee A2) and click ADD SKU.
                </div>
              </div>
            )}

            {/* Simulated Shortcuts + quick simulation trigger for testing */}
            <div className="space-y-2 border-t border-[#E8E2D9] dark:border-slate-800 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#786C65] dark:text-slate-500 uppercase tracking-wider">
                  Test Scanners (No Webcam Required)
                </span>
                <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  5 Active Editions
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1 text-left">
                {[
                  { sku: 'BK-BG-2022', label: 'BG 2022 (Paperback)', bar: '9780892132683' },
                  { sku: 'BK-BG-2025', label: 'BG 2025 (Hardcover)', bar: '9780892131341' },
                  { sku: 'BK-BG-DELUXE', label: 'BG Deluxe Leather', bar: '9780892133338' },
                  { sku: 'OG-GHEE-PURE', label: 'Gir Cow Ghee A2', bar: '8901030737083' },
                  { sku: 'DV-SILK-DHOTI', label: 'Mayapur Silk Dhoti', bar: '8901234567890' }
                ].map(p => (
                  <button
                    key={p.sku}
                    onClick={() => simulateCameraScanProduct(p.sku)}
                    className="w-full text-left p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-600 hover:bg-amber-50/10 text-[11px] flex justify-between items-center group transition-all"
                  >
                    <div className="truncate">
                      <div className="font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-amber-600 dark:group-hover:text-amber-500">
                        {p.label}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                        Bar: {p.bar}
                      </div>
                    </div>
                    <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 shrink-0 ml-1" />
                  </button>
                ))}
              </div>
            </div>

            {/* Cancel and Quick Scan Option */}
            <div className="flex gap-3 pt-2 border-t border-[#E8E2D9] dark:border-slate-800">
              <button
                onClick={closeCameraScanner}
                className="flex-1 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-[#786C65] dark:text-white hover:bg-slate-100 transition-colors"
              >
                Close Scanner
              </button>
              <button
                onClick={simulateCameraScan}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Simulate Random Scan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && lastOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-base text-[#10B981]">
                <CheckCircle2 className="w-5 h-5" />
                <span>Transaction Approved</span>
              </div>
              <button onClick={() => setShowReceiptPreview(false)} className="text-[#6B7280] hover:text-[#111827] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Authentic Invoice Body */}
            <div id="pos-receipt-print-section" className="p-5 rounded-xl bg-[#FAFAFA] dark:bg-slate-950 border border-[#E5E7EB] dark:border-slate-800 space-y-4 font-mono text-xs">
              <div className="text-center border-b border-dashed border-[#E5E7EB] dark:border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-[#111827] dark:text-white font-sans uppercase">
                  {settings.appTitle}
                </h3>
                <p className="text-[10px] text-[#6B7280] font-semibold">{settings.orgName}</p>
                <p className="text-[10px] text-[#6B7280] mt-1 font-mono">INVOICE #{lastOrder.orderNumber}</p>
              </div>

               <div className="space-y-1 text-[11px] text-[#6B7280] border-b border-dashed border-[#E5E7EB] dark:border-slate-800 pb-3">
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span className="text-[#111827] dark:text-white">
                    {(() => {
                      try {
                        const d = new Date(lastOrder.timestamp);
                        return !isNaN(d.getTime()) ? d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : lastOrder.timestamp;
                      } catch (e) {
                        return lastOrder.timestamp;
                      }
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="text-[#111827] dark:text-white">{lastOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cashier:</span>
                  <span className="text-[#111827] dark:text-white">{lastOrder.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Mode:</span>
                  <span className="text-[#2563EB] font-bold uppercase">{lastOrder.paymentMethod}</span>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-1.5 border-b border-dashed border-[#E5E7EB] dark:border-slate-800 pb-3">
                <div className="text-[10px] uppercase font-bold text-[#6B7280] pb-1 flex justify-between">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                {lastOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-[#111827] dark:text-slate-200">
                    <span className="truncate max-w-[200px]">{it.quantity}x {it.product.name}</span>
                    <span>₹{(it.quantity * it.product.price * (1 - (it.discountPercent || 0) / 100)).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="space-y-1 text-[#6B7280]">
                <div className="flex justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  <span>Total Items & Units:</span>
                  <span>
                    {lastOrder.items.length} {lastOrder.items.length === 1 ? 'item' : 'items'} ({lastOrder.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)} {lastOrder.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) === 1 ? 'unit' : 'units'})
                  </span>
                </div>
                {lastOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-[#10B981]">
                    <span>Promo Discount:</span>
                    <span>-₹{lastOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>GST (5% Devotional):</span>
                  <span>₹{lastOrder.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#111827] dark:text-white pt-2 border-t border-[#E5E7EB] dark:border-slate-800">
                  <span>TOTAL PAID:</span>
                  <span className="text-[#10B981]">₹{lastOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-3 border-t border-dashed border-[#E5E7EB] dark:border-slate-800">
                {/* Real Barcode View */}
                <div className="py-2.5 flex flex-col items-center justify-center bg-white dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800">
                  <BarcodeView value={lastOrder.orderNumber || 'ORD-2026-001'} width={1.2} height={36} fontSize={10} />
                </div>
                <span className="text-[9px] text-[#6B7280] mt-2 block font-sans">THANK YOU FOR YOUR DEVOTION & SUPPORT</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  const receiptSection = document.getElementById('pos-receipt-print-section');
                  if (receiptSection) {
                    const receiptClone = receiptSection.cloneNode(true) as HTMLElement;
                    receiptClone.id = 'receipt-section-active';
                    receiptClone.classList.add('active-print-element');
                    document.body.appendChild(receiptClone);
                    
                    document.body.classList.add('print-receipt-only');
                    
                    const pageStyle = document.createElement('style');
                    pageStyle.id = 'dynamic-print-page-style';
                    pageStyle.innerHTML = `@page { size: 80mm auto; margin: 0; }`;
                    document.head.appendChild(pageStyle);
                    
                    window.print();
                    
                    setTimeout(() => {
                      receiptClone.remove();
                      document.body.classList.remove('print-receipt-only');
                      const pStyle = document.getElementById('dynamic-print-page-style');
                      if (pStyle) pStyle.remove();
                    }, 500);
                  } else {
                    window.print();
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-[#FFFFFF] dark:bg-slate-800 hover:bg-slate-50 border border-[#E5E7EB] dark:border-slate-700 text-[#111827] dark:text-white font-semibold text-xs flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-[#2563EB]" />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={() => setShowReceiptPreview(false)}
                className="flex-1 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold text-xs flex items-center justify-center gap-2"
              >
                <span>New Transaction</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Tags Dynamic Configuration Modal */}
      {isTagsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#FFFFFF] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
              <div className="flex items-center gap-2 font-semibold text-base text-[#111827] dark:text-white">
                <Tag className="w-5 h-5 text-amber-600" />
                <span>Configure Sales Tags & Discounts</span>
              </div>
              <button onClick={() => setIsTagsModalOpen(false)} className="text-[#6B7280] hover:text-[#111827] dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List existing tags */}
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Active Promotional / Donation Tags</p>
              {salesTags.map(tag => (
                <div key={tag.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750 space-y-2">
                  {editingTagId === tag.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editTagName}
                          onChange={(e) => setEditTagName(e.target.value)}
                          placeholder="Tag Name"
                          className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#111827] dark:text-white"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editTagDiscount}
                            onChange={(e) => setEditTagDiscount(Number(e.target.value))}
                            placeholder="Discount %"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-[#111827] dark:text-white"
                          />
                          <span className="text-xs text-slate-500 font-medium">%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingTagId(null)}
                          className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editTagName.trim()) return;
                            updateSalesTag({
                              ...tag,
                              name: editTagName.trim(),
                              discount: Number(editTagDiscount)
                            });
                            setEditingTagId(null);
                          }}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${tag.discount === 100 ? 'bg-rose-500' : tag.discount > 0 ? 'bg-amber-500' : 'bg-slate-400'}`} />
                        <div>
                          <p className="text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5">
                            <span>{tag.name}</span>
                            {activeTag?.id === tag.id && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 rounded">Current</span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-500">Discount: {tag.discount}% {tag.discount === 100 ? '(Free on checkout / Donation)' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {tag.name !== 'Standard Retail' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTagId(tag.id);
                                setEditTagName(tag.name);
                                setEditTagDiscount(tag.discount);
                              }}
                              className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded transition-colors"
                              title="Edit Tag"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                deleteSalesTag(tag.id);
                              }}
                              className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-medium px-1.5 py-1 rounded"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400">System Required</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Form to add tag */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTagName.trim()) return;
                addSalesTag({
                  name: newTagName.trim(),
                  discount: Number(newTagDiscount)
                });
                setNewTagName('');
                setNewTagDiscount(0);
              }}
              className="p-4 rounded-xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 space-y-3"
            >
              <p className="text-xs font-bold text-[#D97706]">Create Custom Sales / Donation Tag</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Tag Name</label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. Ashram donation, Festival"
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 text-xs text-[#111827] dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Discount Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newTagDiscount}
                    onChange={(e) => setNewTagDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 text-xs text-[#111827] dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Sales Tag</span>
              </button>
            </form>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsTagsModalOpen(false)}
                className="px-4 py-2 bg-[#111827] text-white hover:bg-black dark:bg-white dark:text-slate-900 text-xs font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Details Review Modal */}
      {scannedProduct && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-base text-slate-900 dark:text-white uppercase tracking-tight">Review Product Details</span>
              </div>
              <button onClick={() => setScannedProduct(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Product Image Column */}
              <div className="md:col-span-4 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 h-full min-h-[160px]">
                {scannedProduct.imageUrl ? (
                  <img
                    src={scannedProduct.imageUrl}
                    alt={scannedProduct.name}
                    referrerPolicy="no-referrer"
                    className="max-h-[180px] object-contain rounded-lg shadow-xs"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 space-y-2">
                    <BookOpen className="w-12 h-12 stroke-1" />
                    <span className="text-[10px] uppercase font-mono">No Image</span>
                  </div>
                )}
              </div>

              {/* Product Metadata Column */}
              <div className="md:col-span-8 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {scannedProduct.name}
                  </h3>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                    {scannedProduct.category}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">SKU</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{scannedProduct.sku}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Edition / Year</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{getProductEdition(scannedProduct)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Batch Number</span>
                    <p className="font-mono font-semibold text-slate-800 dark:text-slate-200">{scannedProduct.batchNo || 'N/A'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Barcode</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{scannedProduct.barcode}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Cost Price</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">₹{scannedProduct.cost.toFixed(2)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Selling Price</span>
                    <p className="font-bold text-amber-600 dark:text-amber-400">₹{scannedProduct.price.toFixed(2)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">GST (Tax Rate)</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{getProductTaxRate(scannedProduct)}%</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Available Stock</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${scannedProduct.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <p className={`font-bold ${scannedProduct.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {scannedProduct.stock} units
                      </p>
                    </div>
                  </div>
                </div>

                {scannedProduct.description && (
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                    {scannedProduct.description}
                  </p>
                )}
              </div>
            </div>

            {/* Quantity selection and adding triggers */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Quantity to Add:</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                  <button
                    disabled={scannedQuantity <= 1 || scannedProduct.stock <= 0}
                    onClick={() => setScannedQuantity(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="w-10 text-center text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                    {scannedProduct.stock <= 0 ? 0 : scannedQuantity}
                  </span>
                  <button
                    disabled={scannedQuantity >= scannedProduct.stock || scannedProduct.stock <= 0}
                    onClick={() => setScannedQuantity(prev => Math.min(scannedProduct.stock, prev + 1))}
                    className="w-8 h-8 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex gap-2.5 sm:w-auto w-full">
                <button
                  type="button"
                  onClick={() => setScannedProduct(null)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-200 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={scannedProduct.stock <= 0}
                  onClick={() => {
                    addToCart(scannedProduct, scannedQuantity);
                    const taxRate = getProductTaxRate(scannedProduct);
                    quickNotification(
                      'Added to Cart',
                      `Successfully added ${scannedQuantity}x ${scannedProduct.name} to checkout list.`,
                      'success'
                    );
                    setScannedProduct(null);
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-slate-850 disabled:text-slate-400 dark:disabled:text-slate-600 text-white text-xs font-bold shadow-md shadow-amber-600/10 flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>Add to Checkout Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Not Found Modal */}
      {productNotFoundBarcode && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Product Not Found</h3>
                <p className="text-xs text-rose-500 font-semibold mt-0.5">Scanned Code: {productNotFoundBarcode}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We couldn't locate any active product matching the barcode or SKU <strong>"{productNotFoundBarcode}"</strong> in our active catalog. 
              Please ensure the barcode lines are scanned clearly, or double check your manual SKU typing.
            </p>

            <div className="bg-slate-50 dark:bg-slate-950/45 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] leading-relaxed text-[#786C65] dark:text-slate-400">
              💡 <strong>Alternative solutions:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Create a new product with this barcode in the Products module.</li>
                <li>Verify if the barcode is associated with a different batch.</li>
                <li>Enter the barcode again manually or search using keywords.</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setProductNotFoundBarcode(null)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
