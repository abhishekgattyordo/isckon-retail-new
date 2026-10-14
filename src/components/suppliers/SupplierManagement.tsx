'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Supplier } from '../../types';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  FileText,
  Star,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  ArrowLeft,
  DollarSign,
  Package,
  X,
  ShieldCheck,
  Calendar
} from 'lucide-react';

export const SupplierManagement: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, inwardNotes, quickNotification } = useERP();

  // View mode: 'list' (Table view) vs 'form' (Separate dedicated Add/Edit page view)
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<Supplier | null>(null);

  // Form State for Dedicated Page
  const [formData, setFormData] = useState({
    supplierName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
    paymentTerms: 'Net 30',
    performanceRating: 5,
    status: 'active' as 'active' | 'inactive',
    category: 'General Goods',
    notes: ''
  });

  const handleOpenAddForm = () => {
    setEditingSupplierId(null);
    setFormData({
      supplierName: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      gstin: '',
      paymentTerms: 'Net 30',
      performanceRating: 5,
      status: 'active',
      category: 'General Goods',
      notes: ''
    });
    setViewMode('form');
  };

  const handleOpenEditForm = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id);
    setFormData({
      supplierName: supplier.supplierName,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      gstin: supplier.gstin || '',
      paymentTerms: supplier.paymentTerms || 'Net 30',
      performanceRating: supplier.performanceRating || 5,
      status: supplier.status || 'active',
      category: supplier.category || 'General Goods',
      notes: supplier.notes || ''
    });
    setViewMode('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierName.trim()) {
      quickNotification('Supplier Name is required.', 'error');
      return;
    }

    if (editingSupplierId) {
      const existing = suppliers.find(s => s.id === editingSupplierId);
      if (existing) {
        updateSupplier({
          ...existing,
          ...formData
        });
        quickNotification(`Supplier "${formData.supplierName}" updated successfully.`, 'success');
      }
    } else {
      const newSup: Supplier = {
        id: `sup-${Date.now()}`,
        code: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
        ...formData,
        createdAt: new Date().toISOString()
      };
      addSupplier(newSup);
      quickNotification(`Supplier "${formData.supplierName}" added successfully.`, 'success');
    }

    setViewMode('list');
  };

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(sup => {
      if (statusFilter !== 'all' && sup.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = sup.supplierName.toLowerCase().includes(q);
        const matchCode = sup.code.toLowerCase().includes(q);
        const matchContact = sup.contactPerson?.toLowerCase().includes(q) || false;
        const matchEmail = sup.email?.toLowerCase().includes(q) || false;
        const matchPhone = sup.phone?.includes(q) || false;
        if (!matchName && !matchCode && !matchContact && !matchEmail && !matchPhone) return false;
      }
      return true;
    });
  }, [suppliers, searchQuery, statusFilter]);

  // Compute stats for each supplier from inwardNotes
  const getSupplierStats = (supplierName: string) => {
    const notes = inwardNotes.filter(n => n.vendorName?.toLowerCase() === supplierName.toLowerCase());
    const totalOrders = notes.length;
    const totalValue = notes.reduce((sum, n) => sum + (n.totalValue || 0), 0);
    return { totalOrders, totalValue, notes };
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/20 text-white font-mono text-xs font-semibold backdrop-blur-md">
              Vendor Management & Directory
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/30 text-amber-100 font-mono text-xs font-semibold backdrop-blur-md">
              {suppliers.length} Total Suppliers
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {viewMode === 'form' ? (editingSupplierId ? 'Edit Supplier Details' : 'Add New Supplier') : 'Supplier Directory & Ledger'}
          </h1>
          <p className="text-amber-100/90 text-xs sm:text-sm max-w-2xl leading-relaxed">
            {viewMode === 'form'
              ? 'Complete supplier particulars, tax details, and payment terms for GRN inward processing.'
              : 'Manage your multi-supplier network, track purchase terms, vendor ratings, contact info, and view complete GRN inward history per supplier.'}
          </p>
        </div>

        {viewMode === 'list' ? (
          <button
            onClick={handleOpenAddForm}
            className="relative z-10 px-5 py-3 rounded-2xl bg-white text-amber-950 hover:bg-amber-50 font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-amber-700" />
            <span>Add New Supplier</span>
          </button>
        ) : (
          <button
            onClick={() => setViewMode('list')}
            className="relative z-10 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition-all cursor-pointer shrink-0 border border-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Supplier List</span>
          </button>
        )}
      </div>

      {viewMode === 'form' ? (
        /* ================= SEPARATE ADD / EDIT SUPPLIER PAGE ================= */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {editingSupplierId ? 'Update Supplier Information' : 'New Supplier Registration'}
                </h3>
                <p className="text-xs text-slate-500">Provide official company name, contact info, and commercial terms.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-mono text-xs font-bold">
                {editingSupplierId ? 'Edit Mode' : 'Creation Mode'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Supplier / Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.supplierName}
                  onChange={e => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="e.g. Bhaktivedanta Book Trust"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Contact Person Name</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                  placeholder="e.g. Madhavananda Das"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. supplier@domain.org"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Office / Warehouse Full Address</label>
                <textarea
                  rows={3}
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address, city, state, pincode..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">GSTIN / Tax Registration ID</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={e => setFormData({ ...formData, gstin: e.target.value })}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Terms</label>
                <select
                  value={formData.paymentTerms}
                  onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="Net 15">Net 15 Days</option>
                  <option value="Net 30">Net 30 Days</option>
                  <option value="Net 45">Net 45 Days</option>
                  <option value="Net 60">Net 60 Days</option>
                  <option value="Advance">Advance Payment</option>
                  <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category / Specialization</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Books & Literature, Brass Artifacts"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Performance Rating</label>
                <select
                  value={formData.performanceRating}
                  onChange={e => setFormData({ ...formData, performanceRating: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ 5 Stars (Excellent Supplier)</option>
                  <option value={4}>⭐⭐⭐⭐ 4 Stars (Very Good)</option>
                  <option value={3}>⭐⭐⭐ 3 Stars (Average)</option>
                  <option value={2}>⭐⭐ 2 Stars (Below Average)</option>
                  <option value={1}>⭐ 1 Star (Poor)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Account Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="active">Active (Available for GRN Inwards)</option>
                  <option value="inactive">Inactive (Suspended / Discontinued)</option>
                </select>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-8 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              >
                {editingSupplierId ? 'Save Changes' : 'Register Supplier'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* ================= SUPPLIER TABLE COLUMN STRUCTURE ================= */
        <div className="space-y-6">
          {/* Filter & Search Toolbar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search suppliers by name, code, contact person, email, or phone..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-medium text-xs sm:text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({suppliers.length})
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === 'active'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === 'inactive'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>

          {/* Supplier Table Structure */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                    <th className="py-4 px-4 sm:px-6">Supplier Details</th>
                    <th className="py-4 px-4">Contact Person</th>
                    <th className="py-4 px-4">Contact Info</th>
                    <th className="py-4 px-4">GSTIN & Terms</th>
                    <th className="py-4 px-4 text-center">Rating</th>
                    <th className="py-4 px-4 text-right">Inward Summary</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSuppliers.map(supplier => {
                    const stats = getSupplierStats(supplier.supplierName);
                    return (
                      <tr key={supplier.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-4 px-4 sm:px-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-mono text-[10px] font-bold">
                                {supplier.code}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                supplier.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {supplier.status}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{supplier.supplierName}</p>
                            <p className="text-[11px] text-slate-500">{supplier.category || 'General Goods'}</p>
                          </div>
                        </td>

                        <td className="py-4 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {supplier.contactPerson || 'N/A'}
                        </td>

                        <td className="py-4 px-4 space-y-1 text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{supplier.phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">{supplier.email || 'N/A'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 space-y-1">
                          <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300">GSTIN: {supplier.gstin || 'N/A'}</p>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300 text-[10px]">
                            Terms: {supplier.paymentTerms || 'Net 30'}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/55 text-amber-700 dark:text-amber-400 font-bold text-xs">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{supplier.performanceRating || 5}.0</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <p className="font-bold text-slate-900 dark:text-white">{stats.totalOrders} GRNs</p>
                          <p className="text-amber-600 font-semibold text-[11px]">₹{stats.totalValue.toLocaleString('en-IN')}</p>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedSupplierForLedger(supplier)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                              title="View Ledger & GRN History"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Ledger</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditForm(supplier)}
                              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                              title="Edit Supplier"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete supplier "${supplier.supplierName}"?`)) {
                                  deleteSupplier(supplier.id);
                                  quickNotification(`Supplier "${supplier.supplierName}" deleted.`, 'success');
                                }
                              }}
                              className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                              title="Delete Supplier"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredSuppliers.length === 0 && (
              <div className="text-center py-16 space-y-3">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No suppliers found</h3>
                <p className="text-xs text-slate-500">Try adjusting your search query or register a new supplier.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Supplier Ledger / Purchase History Modal */}
      {selectedSupplierForLedger && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700 font-mono text-[10px] font-bold">
                  {selectedSupplierForLedger.code}
                </span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Ledger & GRN History: {selectedSupplierForLedger.supplierName}
                </h2>
                <p className="text-xs text-slate-500">All Material Inward (GRN) shipments received from this supplier.</p>
              </div>
              <button
                onClick={() => setSelectedSupplierForLedger(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-400 text-[10px] font-medium">Payment Terms</p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedSupplierForLedger.paymentTerms}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-400 text-[10px] font-medium">GSTIN / Tax ID</p>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedSupplierForLedger.gstin || 'N/A'}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <p className="text-slate-400 text-[10px] font-medium">Total Inward Value</p>
                  <p className="font-bold text-amber-600 mt-0.5">₹{getSupplierStats(selectedSupplierForLedger.supplierName).totalValue.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Inward Shipments ({getSupplierStats(selectedSupplierForLedger.supplierName).notes.length})
                </h4>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {getSupplierStats(selectedSupplierForLedger.supplierName).notes.map(note => (
                    <div
                      key={note.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{note.grnNumber}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600 dark:text-slate-300">PO: {note.poNumber}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Date: {note.invoiceDate} • Warehouse: {note.warehouse}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-900 dark:text-white">₹{(note.totalValue || 0).toLocaleString('en-IN')}</p>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          {note.items?.length || 0} items
                        </span>
                      </div>
                    </div>
                  ))}

                  {getSupplierStats(selectedSupplierForLedger.supplierName).notes.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      No Material Inward (GRN) shipments recorded for this supplier yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSupplierForLedger(null)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
