'use client';

import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Branch } from '../../types';
import { isSuperAdmin } from '../../lib/authUtils';
import {
  Building2,
  Plus,
  Edit3,
  Trash2,
  MapPin,
  Phone,
  Mail,
  User,
  Check,
  X,
  Store,
  ShieldCheck,
  ExternalLink,
  Power,
  ShieldAlert,
  Lock
} from 'lucide-react';

export const BranchManagement: React.FC = () => {
  const {
    branches,
    currentBranch,
    setCurrentBranch,
    addBranch,
    updateBranch,
    deleteBranch,
    quickNotification,
    userAccessibleBranches,
    user
  } = useERP();

  const isSuper = isSuperAdmin(user);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isMain, setIsMain] = useState(false);
  const [managerName, setManagerName] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const openAddModal = () => {
    setEditingBranch(null);
    setName('');
    setCode('');
    setLocation('');
    setCity('');
    setState('');
    setPhone('');
    setEmail('');
    setIsMain(false);
    setManagerName(user.name || '');
    setStatus('active');
    setIsModalOpen(true);
  };

  const openEditModal = (b: Branch) => {
    setEditingBranch(b);
    setName(b.name);
    setCode(b.code);
    setLocation(b.location);
    setCity(b.city);
    setState(b.state);
    setPhone(b.phone || '');
    setEmail(b.email || '');
    setIsMain(b.isMain || false);
    setManagerName(b.managerName || '');
    setStatus(b.status || (b.isActive !== false ? 'active' : 'inactive'));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !code.trim() || !city.trim() || !location.trim()) {
      quickNotification('Validation Error', 'Branch Name, Code, City, and Location are required.', 'alert');
      return;
    }

    const branchData = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      location: location.trim(),
      city: city.trim(),
      state: state.trim() || city.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      isMain,
      managerName: managerName.trim() || undefined,
      status
    };

    if (!editingBranch && !isSuper) {
      quickNotification('Action Restricted', 'Only Super Administrators can register new branch locations.', 'alert');
      return;
    }

    if (editingBranch) {
      await updateBranch(editingBranch.id, branchData);
    } else {
      await addBranch(branchData);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (b: Branch) => {
    if (!isSuper) {
      quickNotification('Action Restricted', 'Only Super Administrators can delete branch records.', 'alert');
      return;
    }
    if (b.id === currentBranch.id) {
      quickNotification('Action Restricted', 'Cannot delete the currently active operating branch.', 'alert');
      return;
    }
    if (window.confirm(`Are you sure you want to delete branch "${b.name}" (${b.code})?`)) {
      await deleteBranch(b.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9] dark:border-slate-800">
        <div>
          <h2 className="text-base font-black text-[#1F1916] dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#D97706]" />
            Enterprise Branch System
          </h2>
          <p className="text-xs text-[#786C65] dark:text-slate-400 mt-0.5">
            Manage multi-location branch network, store IDs, addresses, and branch managers.
          </p>
        </div>

        {isSuper ? (
          <button
            onClick={openAddModal}
            id="btn_add_new_branch"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Branch</span>
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Branch Scoped Manager Mode</span>
          </div>
        )}
      </div>

      {/* Current Active Workspace Indicator */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300/70 dark:border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Active Operating Workspace:</span>
              <span className="text-xs font-black text-amber-700 dark:text-amber-300">{currentBranch.name}</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                {currentBranch.code}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              All catalog records, inward notes, POS carts, and warehouse inventories are scoped to this branch.
            </p>
          </div>
        </div>
      </div>

      {/* Branches Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {branches.map(b => {
          const isActiveWorkspace = currentBranch.id === b.id;
          return (
            <div
              key={b.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                isActiveWorkspace
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-400/80 dark:border-amber-800 shadow-md ring-1 ring-amber-400/30'
                  : 'bg-white dark:bg-slate-900 border-[#E8E2D9] dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              {/* Card Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm text-[#1F1916] dark:text-white truncate">
                        {b.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {b.code}
                      </span>
                      {b.isMain && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          Main HQ
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{b.location} ({b.city}, {b.state})</span>
                    </p>
                  </div>

                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'active' || b.isActive !== false
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {(b.status || (b.isActive !== false ? 'active' : 'inactive')).toUpperCase()}
                  </span>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-400">
                  {b.managerName && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Mgr: <strong className="text-slate-800 dark:text-slate-200">{b.managerName}</strong></span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.phone}</span>
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{b.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 gap-2">
                <div>
                  {isActiveWorkspace ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-lg bg-amber-100/60 dark:bg-amber-900/40">
                      <Check className="w-3.5 h-3.5" />
                      <span>Current Workspace</span>
                    </span>
                  ) : (
                    (() => {
                      const canAccess = isSuper || (userAccessibleBranches(user) || []).some(ub => ub.id === b.id);
                      if (!canAccess) {
                        return (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800" title="Restricted to your assigned operating branch">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Restricted Branch</span>
                          </span>
                        );
                      }
                      return (
                        <button
                          type="button"
                          onClick={() => setCurrentBranch(b)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-amber-600 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-amber-400 transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Switch to this Branch</span>
                        </button>
                      );
                    })()
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(b)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit Branch Configuration"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(b)}
                    disabled={isActiveWorkspace || branches.length <= 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                    title="Delete Branch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Add / Edit Branch */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-950 rounded-3xl border border-[#E8E2D9] dark:border-slate-800 shadow-2xl max-w-lg w-full my-8 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E8E2D9] dark:border-slate-800 flex items-center justify-between bg-[#FAF8F5] dark:bg-slate-900/60">
              <h3 className="text-sm font-black text-[#1F1916] dark:text-white flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-[#D97706]" />
                <span>{editingBranch ? 'Edit Branch Configuration' : 'Register New Branch'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Branch Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vrindavan Krishna Balaram"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Branch Code */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Branch ID / Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VRINDAVAN-01"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold uppercase"
                  />
                </div>

                {/* City */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vrindavan"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* State */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    State / Region
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Uttar Pradesh"
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Manager Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Branch Manager
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gopal Krishna Das"
                    value={managerName}
                    onChange={e => setManagerName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Full Address / Location */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Full Address & Location *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bhaktivedanta Swami Marg, Raman Reti, Vrindavan 281121"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 565 2540021"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Branch Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. vrindavan.store@aura-retail.org"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Operational Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold cursor-pointer"
                  >
                    <option value="active">Active Operational</option>
                    <option value="inactive">Inactive / Suspended</option>
                  </select>
                </div>

                {/* Main Branch Flag */}
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_main_branch"
                    checked={isMain}
                    onChange={e => setIsMain(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="is_main_branch" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    Main Headquarters Branch
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold transition-all shadow-md shadow-amber-600/20 cursor-pointer"
                >
                  {editingBranch ? 'Save Changes' : 'Register Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
