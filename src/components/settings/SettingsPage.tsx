'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import {
  Building2,
  Globe,
  Palette,
  UploadCloud,
  Check,
  RotateCcw,
  FileText,
  Mail,
  PhoneCall,
  MapPin,
  Sparkles,
  Trash2,
  Users,
  Tag,
  Edit2,
  Plus,
  Warehouse
} from 'lucide-react';
import { UserManagement } from './UserManagement';
import { RecycleBinPage } from '../recycle/RecycleBinPage';
import { WarehouseZoneManagement } from './WarehouseZoneManagement';
import { BranchManagement } from './BranchManagement';
import { isSuperAdmin } from '../../lib/authUtils';

interface SettingsPageProps {
  initialTab?: 'branding' | 'branches' | 'warehouses' | 'users' | 'sales_tags' | 'recycle_bin';
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ initialTab }) => {
  const {
    settings,
    updateSettings,
    quickNotification,
    salesTags,
    addSalesTag,
    updateSalesTag,
    deleteSalesTag,
    recycleBinItems,
    zones,
    branches,
    users,
    user
  } = useERP();
  const isSuper = isSuperAdmin(user);
  const [activeTab, setActiveTab] = useState<'branding' | 'branches' | 'warehouses' | 'users' | 'sales_tags' | 'recycle_bin'>(() => {
    if (initialTab) return initialTab;
    return isSuperAdmin(user) ? 'branding' : 'warehouses';
  });

  // Sales tag form states
  const [newTagName, setNewTagName] = useState('');
  const [newTagDiscount, setNewTagDiscount] = useState<number>(0);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagDiscount, setEditTagDiscount] = useState<number>(0);

  // Local state initialized with context settings
  const [orgName, setOrgName] = useState(settings.orgName);
  const [appTitle, setAppTitle] = useState(settings.appTitle);
  const [brandingColor, setBrandingColor] = useState(settings.brandingColor);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [taxId, setTaxId] = useState(settings.taxId || '');
  const [address, setAddress] = useState(settings.address || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [email, setEmail] = useState(settings.email || '');
  const [logoBase64, setLogoBase64] = useState(settings.logoUrl || '');

  // Track if saving to database
  const [isSaving, setIsSaving] = useState(false);
  // Drag and drop upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if context changes (e.g. initial fetch loads)
  useEffect(() => {
    setOrgName(settings.orgName);
    setAppTitle(settings.appTitle);
    setBrandingColor(settings.brandingColor);
    setCurrencySymbol(settings.currencySymbol);
    setTaxId(settings.taxId || '');
    setAddress(settings.address || '');
    setPhone(settings.phone || '');
    setEmail(settings.email || '');
    setLogoBase64(settings.logoUrl || '');
  }, [settings]);

  // Handle logo file conversion to Base64
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      quickNotification('Invalid File Type', 'Please upload an image file (PNG, JPG, or SVG).', 'alert');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      quickNotification('File Too Large', 'Please upload a logo image smaller than 2MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result as string);
      quickNotification('Logo Loaded', 'Your custom branding logo has been loaded. Remember to click save.', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const removeLogo = () => {
    setLogoBase64('');
    quickNotification('Logo Removed', 'Branding logo cleared. Remember to save changes.', 'info');
  };

  // Reset to system defaults
  const handleResetDefaults = () => {
    if (window.confirm('Are you sure you want to revert to the default ISKCON ERP branding? This will clear custom logos and colors.')) {
      setOrgName('ISKCON Foundation');
      setAppTitle('ISKCON Retail ERP');
      setBrandingColor('#D97706');
      setCurrencySymbol('₹');
      setTaxId('27AAAAA1111A1Z1');
      setAddress('Hare Krishna Land, Juhu, Mumbai, 400049');
      setPhone('+91 22 2620 6860');
      setEmail('contact@iskconmumbai.com');
      setLogoBase64('');
      quickNotification('Defaults Loaded', 'Reverted form values to defaults. Click save to apply.', 'info');
    }
  };

  // Submit and save configuration
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      quickNotification('Validation Error', 'Organization Name cannot be empty.', 'alert');
      return;
    }
    if (!appTitle.trim()) {
      quickNotification('Validation Error', 'Application Title cannot be empty.', 'alert');
      return;
    }

    setIsSaving(true);
    try {
      await updateSettings({
        orgName: orgName.trim(),
        appTitle: appTitle.trim(),
        brandingColor,
        currencySymbol: currencySymbol.trim(),
        taxId: taxId.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        logoUrl: logoBase64
      });
    } catch (error) {
      console.error(error);
      quickNotification('Error Saving', 'Failed to save settings to the database.', 'alert');
    } finally {
      setIsSaving(false);
    }
  };

  // Preset palette list for rapid custom branding
  const PRESET_COLORS = [
    { name: 'Warm Amber (ISKCON Default)', value: '#D97706' },
    { name: 'Krishna Saffron', value: '#EA580C' },
    { name: 'Lotus Rose Pink', value: '#EC4899' },
    { name: 'Vrindavan Tulasi Green', value: '#15803D' },
    { name: 'Peacock Feather Blue', value: '#0284C7' },
    { name: 'Temple Gold Royal', value: '#CA8A04' },
    { name: 'Transcendental Violet', value: '#7C3AED' },
    { name: 'Corporate Charcoal', value: '#475569' }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto" id="settings_container">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-black text-[#1F1916] dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#D97706]" style={{ color: brandingColor }} />
            System Branding & Settings
          </h1>
          <p className="text-xs text-[#786C65] dark:text-slate-400 mt-1">
            Configure dynamic temple identity, enterprise labels, receipt layouts, and local store parameters stored securely.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
              activeTab === 'users'
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Manage Staff & RBAC</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2 border border-[#E8E2D9] dark:border-slate-800 rounded-xl text-xs font-semibold text-[#786C65] dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* Dynamic Tab Selector */}
      <div className="flex items-center gap-1.5 border-b border-[#E8E2D9] dark:border-slate-800 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'branding'
              ? 'text-[#D97706] dark:text-amber-400 font-extrabold border-b-2 border-[#D97706]'
              : 'text-[#786C65] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          style={activeTab === 'branding' ? { color: brandingColor, borderColor: brandingColor } : {}}
        >
          <Building2 className="w-4 h-4" />
          Temple Identity & Branding
          {!isSuper && <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-500 rounded font-mono">Super Admin</span>}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('branches')}
          className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'branches'
              ? 'text-[#D97706] dark:text-amber-400 font-extrabold border-b-2 border-[#D97706]'
              : 'text-[#786C65] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          style={activeTab === 'branches' ? { color: brandingColor, borderColor: brandingColor } : {}}
        >
          <Building2 className="w-4 h-4" />
          Branches & Multi-Location
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            {branches.length}
          </span>
          {!isSuper && <span className="text-[9px] px-1 py-0.2 bg-slate-100 text-slate-500 rounded font-mono">Super Admin</span>}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('warehouses')}
          className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'warehouses'
              ? 'text-[#D97706] dark:text-amber-400 font-extrabold border-b-2 border-[#D97706]'
              : 'text-[#786C65] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          style={activeTab === 'warehouses' ? { color: brandingColor, borderColor: brandingColor } : {}}
        >
          <Warehouse className="w-4 h-4" />
          Warehouses & Storage Zones
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            {zones.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'users'
              ? 'text-[#D97706] dark:text-amber-400 font-extrabold border-b-2 border-[#D97706]'
              : 'text-[#786C65] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          style={activeTab === 'users' ? { color: brandingColor, borderColor: brandingColor } : {}}
        >
          <Users className="w-4 h-4" />
          User Accounts & RBAC
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            {users.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sales_tags')}
          className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'sales_tags'
              ? 'text-[#D97706] dark:text-amber-400 font-extrabold border-b-2 border-[#D97706]'
              : 'text-[#786C65] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          style={activeTab === 'sales_tags' ? { color: brandingColor, borderColor: brandingColor } : {}}
        >
          <Tag className="w-4 h-4" />
          Sales Tags & Discounts
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('recycle_bin')}
          className={`px-5 py-2.5 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'recycle_bin'
              ? 'text-rose-600 dark:text-rose-400 font-extrabold border-b-2 border-rose-500'
              : 'text-[#786C65] dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          <Trash2 className="w-4 h-4 text-rose-500" />
          Recycle Bin
          {recycleBinItems.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {recycleBinItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Branding */}
      {activeTab === 'branding' && (
        !isSuper ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 flex items-center justify-center shadow-xs">
              <Building2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Super Admin Access Required
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Global temple identity, organization names, tax identifiers, and system-wide branding colors can only be configured by a Super Administrator.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('warehouses')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Go to Warehouses & Storage Zones
              </button>
            </div>
          </div>
        ) : (
        /* Main Settings Form */
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Information Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Basic Identity */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-[#1F1916] dark:text-white">Organization Identity</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="settings_org_name" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Organization / Temple Name
                </label>
                <input
                  id="settings_org_name"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. ISKCON Temple Mayapur HQ"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1F1916] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="settings_app_title" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  ERP Application Title
                </label>
                <input
                  id="settings_app_title"
                  type="text"
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  placeholder="e.g. ISKCON Retail ERP"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1F1916] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label htmlFor="settings_currency" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Currency Symbol
                </label>
                <input
                  id="settings_currency"
                  type="text"
                  maxLength={3}
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="e.g. ₹"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1F1916] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="settings_tax_id" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tax / GST Identification Number (Tax ID)
                </label>
                <input
                  id="settings_tax_id"
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1F1916] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Address (Print layouts) */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <MapPin className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-[#1F1916] dark:text-white">Store Address & Metadata (For Receipts & Invoices)</h2>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="settings_address" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Physical Invoice Address
              </label>
              <textarea
                id="settings_address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete store physical address for POS receipt footers..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1F1916] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all resize-none font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="settings_phone" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Contact Phone Number
                </label>
                <div className="relative">
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="settings_phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 22 2620 6860"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1F1916] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="settings_email" className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Support / Office Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="settings_email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. accounts@iskcon.org"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#1F1916] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Preset Palettes */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Palette className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-bold text-[#1F1916] dark:text-white">Active Branding Color Theme</h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-800 shrink-0 shadow-xs"
                    style={{ backgroundColor: brandingColor }}
                  />
                  <div>
                    <p className="text-xs font-bold text-[#1F1916] dark:text-white">Selected HEX Color Code</p>
                    <p className="text-[10px] font-mono text-slate-400 uppercase">{brandingColor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="color_picker_input"
                    value={brandingColor}
                    onChange={(e) => setBrbrandingColorSafe(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent p-0 overflow-hidden"
                  />
                  <input
                    type="text"
                    maxLength={7}
                    value={brandingColor}
                    onChange={(e) => setBrbrandingColorSafe(e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono w-20 text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                  Select a Dynamic Preset Palette
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setBrbrandingColorSafe(preset.value)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                        brandingColor.toLowerCase() === preset.value.toLowerCase()
                          ? 'border-[#D97706] bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-800 ring-1 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                      style={brandingColor.toLowerCase() === preset.value.toLowerCase() ? { borderColor: brandingColor, backgroundColor: `${brandingColor}0a` } : {}}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: preset.value }}
                      />
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">
                        {preset.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Logo Upload, Live Preview & Action Buttons */}
        <div className="space-y-6">
          {/* Logo Upload Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-bold text-[#1F1916] dark:text-white font-display">Organization Logo</h2>
              </div>
              {logoBase64 && (
                <button
                  type="button"
                  onClick={removeLogo}
                  className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40"
                  title="Remove Logo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[160px] ${
                isDragOver
                  ? 'border-amber-500 bg-amber-50/30 dark:bg-amber-950/10'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
              }`}
              style={isDragOver ? { borderColor: brandingColor, backgroundColor: `${brandingColor}08` } : {}}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {logoBase64 ? (
                <div className="space-y-3 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white p-2 flex items-center justify-center shadow-xs">
                    <img
                      src={logoBase64}
                      alt="Logo Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Custom Logo Active</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-200/50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Drag & Drop Image Here</p>
                    <p className="text-[10px] text-slate-400">or click to browse local files</p>
                  </div>
                  <p className="text-[9px] text-slate-400 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-0.5 inline-block bg-white dark:bg-slate-900">
                    PNG, JPG, SVG up to 2MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Branding Preview Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-[#D97706]" style={{ color: brandingColor }} />
              <h2 className="text-sm font-bold text-[#1F1916] dark:text-white font-display">Live Sidebar Preview</h2>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              This preview mimics the layout rendered at the top of your ERP left sidebar:
            </p>

            {/* Sidebar mock block */}
            <div className="border border-[#E8E2D9] dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-950 flex items-center gap-3">
              {/* Logo block */}
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                {logoBase64 ? (
                  <img
                    src={logoBase64}
                    alt="Logo Mock"
                    className="max-w-full max-h-full object-contain p-1.5"
                  />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#D97706]" style={{ color: brandingColor }} fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2C12 2 9 7 12 15C15 7 12 2 12 2Z" fill="#FFFBEB" />
                    <path d="M12 7C9.5 8.5 6 11 9 16C12 16 12 12 12 7Z" />
                    <path d="M12 7C14.5 8.5 18 11 15 16C12 16 12 12 12 7Z" />
                    <path d="M12 11C8 11 4 14 8 18C12 18 12 14 12 11Z" />
                    <path d="M12 11C16 11 20 14 16 18C12 18 12 14 12 11Z" />
                    <path d="M9 19C10.5 20.5 13.5 20.5 15 19" />
                  </svg>
                )}
              </div>

              {/* Title & Organization block */}
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-black tracking-wider uppercase text-slate-800 dark:text-white truncate">
                  {appTitle || 'ISKCON RETAIL ERP'}
                </p>
                <p className="text-[9px] text-[#D97706] dark:text-amber-400 font-semibold tracking-wide truncate" style={{ color: brandingColor }}>
                  {orgName || 'ISKCON Foundation'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button Container */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-[#D97706] hover:opacity-90 active:scale-[0.98] text-white py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold text-xs flex items-center justify-center gap-2 select-none border border-[#D97706]/10 cursor-pointer"
              style={{ backgroundColor: brandingColor, borderColor: `${brandingColor}1a` }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Configuration...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Branding & Settings
                </>
              )}
            </button>
          </div>
        </div>
      </form>
      )
      )}

      {/* Tab: Branches & Multi-Location */}
      {activeTab === 'branches' && (
        <BranchManagement />
      )}

      {/* Tab: Warehouses & Storage Zones */}
      {activeTab === 'warehouses' && (
        <WarehouseZoneManagement />
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <UserManagement />
      )}

      {/* Tab 3: Sales Tags */}
      {activeTab === 'sales_tags' && (
        /* Sales Tags Management View */
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E8E2D9] dark:border-slate-800 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E8E2D9] dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-[#1F1916] dark:text-white flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-600" />
                  Promotional & Donation Sales Tags
                </h2>
                <p className="text-xs text-[#786C65] dark:text-slate-400 mt-0.5">
                  Configure custom discount tags available during checkout at POS terminals. Changes are saved automatically.
                </p>
              </div>
            </div>

            {/* Create Tag Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTagName.trim()) {
                  quickNotification('Validation Error', 'Tag name cannot be empty', 'alert');
                  return;
                }
                addSalesTag({
                  name: newTagName.trim(),
                  discount: Number(newTagDiscount)
                });
                setNewTagName('');
                setNewTagDiscount(0);
              }}
              className="p-5 rounded-2xl bg-amber-50/60 dark:bg-slate-800/60 border border-amber-200 dark:border-slate-700 space-y-4"
            >
              <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add New Sales Tag
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tag Name</label>
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. VIP Patron, Janmashtami Festival, Free Prasadam"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Discount Rate (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={newTagDiscount}
                      onChange={(e) => setNewTagDiscount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* List of active sales tags */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configured Sales Tags ({salesTags.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {salesTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-all hover:border-amber-300"
                  >
                    {editingTagId === tag.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Tag Name</label>
                            <input
                              type="text"
                              value={editTagName}
                              onChange={(e) => setEditTagName(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-1">Discount %</label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={editTagDiscount}
                              onChange={(e) => setEditTagDiscount(Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingTagId(null)}
                            className="px-3 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 font-medium"
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
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-3 h-3 rounded-full shrink-0 ${
                              tag.discount === 100
                                ? 'bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-900/30'
                                : tag.discount > 0
                                ? 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-900/30'
                                : 'bg-slate-400 ring-4 ring-slate-100 dark:ring-slate-700'
                            }`}
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">{tag.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Discount: <span className="font-semibold text-amber-600 dark:text-amber-400">{tag.discount}%</span>{' '}
                              {tag.discount === 100 && <span className="text-rose-600 font-medium">(100% Free / Donation)</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {tag.name !== 'Standard Retail' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTagId(tag.id);
                                  setEditTagName(tag.name);
                                  setEditTagDiscount(tag.discount);
                                }}
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit Tag"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteSalesTag(tag.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Delete Tag"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded-md">Default Required</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recycle_bin' && (
        <div className="pt-2">
          <RecycleBinPage />
        </div>
      )}
    </div>
  );

  // Helper to ensure branding color starts with # and is clean hex
  function setBrbrandingColorSafe(val: string) {
    let clean = val.trim();
    if (clean && !clean.startsWith('#')) {
      clean = '#' + clean;
    }
    setBrandingColor(clean);
  }
};
