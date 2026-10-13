'use client';

import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { UserProfile, ModuleType } from '../../types';
import { INITIAL_BRANCHES } from '../../data/initialData';
import {
  ALL_SYSTEM_MODULES,
  isSuperAdmin,
  getDefaultPermissionsForRole
} from '../../lib/authUtils';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Power,
  Edit3,
  Trash2,
  Check,
  X,
  Mail,
  MapPin,
  Clock,
  Briefcase,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Lock
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, user: currentUser, quickNotification, branches } = useERP();
  const isCurrentSuperAdmin = isSuperAdmin(currentUser);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserProfile['role']>('Store Executive');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('branch-mayapur-hq');
  const [accessibleBranchIds, setAccessibleBranchIds] = useState<string[]>(['branch-mayapur-hq']);
  const [isMultiBranch, setIsMultiBranch] = useState(false);
  const [shift, setShift] = useState('08:00 – 17:00 IST');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<ModuleType[]>(['dashboard', 'pos', 'products', 'events']);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('Store Executive');
    const defaultBranch = branches[0] || INITIAL_BRANCHES[0];
    setSelectedBranchId(defaultBranch.id);
    setAccessibleBranchIds([defaultBranch.id]);
    setIsMultiBranch(false);
    setShift('08:00 – 17:00 IST');
    setIsActive(true);
    setSelectedPermissions(getDefaultPermissionsForRole('Store Executive') as ModuleType[]);
    setIsModalOpen(true);
  };

  const openCreateSuperAdminModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('Super Admin');
    const defaultBranch = branches[0] || INITIAL_BRANCHES[0];
    setSelectedBranchId(defaultBranch.id);
    setIsMultiBranch(true);
    setAccessibleBranchIds(branches.map(b => b.id));
    setShift('24/7 Global Oversight');
    setIsActive(true);
    setSelectedPermissions(getDefaultPermissionsForRole('Super Admin') as ModuleType[]);
    setIsModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPassword(u.password || '');
    setRole(u.role);
    
    // Find matching branch
    const match = branches.find(b => b.id === u.branchId || b.name.toLowerCase() === u.branch?.toLowerCase());
    const bId = match?.id || u.branchId || branches[0]?.id || 'branch-mayapur-hq';
    setSelectedBranchId(bId);

    const userBranchIds = (u.accessibleBranchIds && u.accessibleBranchIds.length > 0)
      ? u.accessibleBranchIds
      : [bId];
    setAccessibleBranchIds(userBranchIds);
    setIsMultiBranch(userBranchIds.length > 1 || isSuperAdmin(u) || u.role === 'Store Manager' || u.role === 'Branch Admin');

    setShift(u.shift);
    setIsActive(u.isActive);
    
    let perms = u.permissions && u.permissions.length > 0 ? [...u.permissions] : (getDefaultPermissionsForRole(u.role) as ModuleType[]);
    setSelectedPermissions(perms);
    setIsModalOpen(true);
  };

  const handleBranchAccessToggle = (bId: string) => {
    setAccessibleBranchIds(prev => {
      if (prev.includes(bId)) {
        if (prev.length <= 1) {
          quickNotification('Validation', 'User must have access to at least one branch.', 'warning');
          return prev;
        }
        return prev.filter(id => id !== bId);
      } else {
        return [...prev, bId];
      }
    });
  };

  const handlePermissionToggle = (modId: ModuleType) => {
    setSelectedPermissions(prev =>
      prev.includes(modId) ? prev.filter(p => p !== modId) : [...prev, modId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      quickNotification('Validation Error', 'Full Name and Email are required.', 'alert');
      return;
    }

    if (!editingUser && !password.trim()) {
      quickNotification('Validation Error', 'A secure passcode must be set for new staff accounts.', 'alert');
      return;
    }

    // Verify unique email (ignoring self on edit)
    const duplicate = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim() && u.id !== editingUser?.id);
    if (duplicate) {
      quickNotification('Email Registered', 'A staff profile already exists with this email address.', 'alert');
      return;
    }

    const chosenBranch = branches.find(b => b.id === selectedBranchId) || branches[0] || INITIAL_BRANCHES[0];
    const finalAccessible = isMultiBranch && accessibleBranchIds.length > 0
      ? Array.from(new Set([chosenBranch.id, ...accessibleBranchIds]))
      : [chosenBranch.id];

    const userData: Omit<UserProfile, 'id'> = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      branch: chosenBranch.name,
      branchId: chosenBranch.id,
      accessibleBranchIds: isSuperAdmin({ role } as any) ? ['*'] : finalAccessible,
      shift,
      isActive,
      permissions: selectedPermissions,
      password: password.trim(),
      avatar: editingUser?.avatar || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 900000)}?w=150&auto=format&fit=crop&q=80`
    };

    if (editingUser) {
      updateUser(editingUser.id, userData);
      quickNotification('User Updated', `Staff profile for "${name}" (Role: ${role}) successfully saved.`, 'success');
    } else {
      addUser(userData);
      quickNotification('User Registered', `New staff account created for "${name}" assigned to ${chosenBranch.name}.`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleToggleActiveStatus = (u: UserProfile) => {
    if (u.id === currentUser.id) {
      quickNotification('Action Blocked', 'You cannot deactivate your own active session.', 'alert');
      return;
    }
    const nextStatus = !u.isActive;
    updateUser(u.id, { isActive: nextStatus });
    quickNotification(
      nextStatus ? 'Profile Enabled' : 'Profile Disabled',
      `Account for "${u.name}" has been ${nextStatus ? 'activated (can now log in)' : 'deactivated (login access blocked)'}.`,
      nextStatus ? 'success' : 'warning'
    );
  };

  const handleDeleteUser = (id: string, userName: string) => {
    if (id === currentUser.id) {
      quickNotification('Action Blocked', 'You cannot delete your own active admin session.', 'alert');
      return;
    }

    if (window.confirm(`Are you sure you want to move the user profile for "${userName}" to the Recycle Bin? (You can restore it anytime from the Recycle Bin)`)) {
      deleteUser(id);
    }
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Search
      const matchSearch =
        !searchQuery.trim() ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());

      // Role filter
      const matchRole =
        roleFilter === 'all' ||
        (roleFilter === 'superadmin' && isSuperAdmin(u)) ||
        (roleFilter === 'manager' && (u.role === 'Store Manager' || u.role === 'Branch Admin')) ||
        (roleFilter === 'executive' && (u.role === 'Store Executive' || u.role === 'Cashier' || u.role === 'Lead Cashier'));

      // Branch filter
      const matchBranch =
        branchFilter === 'all' ||
        u.branchId === branchFilter ||
        (u.accessibleBranchIds && u.accessibleBranchIds.includes(branchFilter));

      // Status filter
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);

      return matchSearch && matchRole && matchBranch && matchStatus;
    });
  }, [users, searchQuery, roleFilter, branchFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Super Admin Access Management Header */}
      <div className="bg-white dark:bg-slate-900 border border-[#E8E2D9] dark:border-slate-800 p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[#D97706] border border-[#FDE68A] dark:border-amber-800">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-[#1F1916] dark:text-white">
                  Super Admin Access Management Dashboard
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  RBAC & Multi-Branch
                </span>
              </div>
              <p className="text-[11px] text-[#786C65] dark:text-slate-400 mt-0.5">
                Manage roles (Super Admin, Store Manager, Store Executive), multi-branch permissions, and account activation for {users.length} staff members.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={openCreateSuperAdminModal}
              id="btn_create_super_admin"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer select-none"
              title="Quickly create a new Super Admin account with full global privileges"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-200" />
              <span>+ Create Super Admin</span>
            </button>

            <button
              onClick={openAddModal}
              id="btn_add_new_staff"
              className="px-4 py-2 bg-[#D97706] hover:bg-amber-600 active:scale-[0.98] transition-all text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer select-none"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Staff</span>
            </button>
          </div>
        </div>

        {/* Super Admin & Role Setup Quick Helper Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/80 via-white to-amber-50/80 dark:from-indigo-950/40 dark:via-slate-900 dark:to-amber-950/40 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>How to create a Super Admin account:</span>
                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-800">
                  Global Access
                </span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                Click <strong>+ Create Super Admin</strong> or <strong>Add New Staff</strong> &rarr; select role <strong>Super Admin</strong> &rarr; enter full name, email, and passcode. Super Admins bypass all module restrictions and manage all temple branches.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateSuperAdminModal}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition-colors cursor-pointer whitespace-nowrap shadow-2xs shrink-0 flex items-center gap-1.5"
          >
            <span>⚡ Setup Super Admin</span>
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
          >
            <option value="all">All Roles ({users.length})</option>
            <option value="superadmin">Super Admins</option>
            <option value="manager">Store Managers / Admins</option>
            <option value="executive">Store Executives / Staff</option>
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
          >
            <option value="all">All Operating Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-semibold focus:outline-hidden"
          >
            <option value="all">All Account Statuses</option>
            <option value="active">Active Profiles Only</option>
            <option value="inactive">Disabled Profiles Only</option>
          </select>
        </div>
      </div>

      {/* Main Staff Registry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map(u => {
          const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
          const isMe = u.id === currentUser.id;
          const isSuper = isSuperAdmin(u);
          const isExecutive = u.role === 'Store Executive';

          return (
            <div
              key={u.id}
              className={`flex flex-col rounded-2xl border transition-all ${
                u.isActive
                  ? 'bg-white dark:bg-slate-900 border-[#E8E2D9] dark:border-slate-800 hover:shadow-md'
                  : 'bg-[#FAF8F5]/80 dark:bg-slate-900/40 border-red-200 dark:border-red-950/60 opacity-80'
              }`}
            >
              {/* Header/Identity Segment */}
              <div className="p-5 border-b border-slate-50 dark:border-slate-800/60 flex items-start gap-3.5 relative">
                {/* Profile Photo */}
                <div className={`w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 shadow-xs flex items-center justify-center ${
                  isSuper
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : isExecutive
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-amber-500 bg-amber-50 text-amber-700'
                }`}>
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold">{initials}</span>
                  )}
                </div>

                {/* Main Details */}
                <div className="flex-1 min-w-0 pr-12">
                  <h4 className="text-sm font-black text-[#1F1916] dark:text-white truncate flex items-center gap-1.5">
                    {u.name}
                    {isMe && (
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-mono text-[9px] font-bold">
                        YOU
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-300" />
                    {u.email}
                  </p>
                </div>

                {/* Status Toggle Button */}
                <div className="absolute top-5 right-5 flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleActiveStatus(u)}
                    disabled={isMe}
                    title={
                      isMe
                        ? 'Cannot deactivate your own active session'
                        : u.isActive
                        ? 'Click to Deactivate (Disable Profile)'
                        : 'Click to Activate (Enable Profile)'
                    }
                    className={`p-1.5 rounded-lg border transition-all ${
                      u.isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60 hover:bg-emerald-100'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/60 hover:bg-red-100'
                    } ${isMe ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Meta Parameters Segment */}
              <div className="p-5 flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  {/* Role */}
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-slate-300" /> Role
                    </span>
                    <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] truncate ${
                      isSuper
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-200'
                        : isExecutive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200'
                    }`}>
                      {u.role}
                    </span>
                  </div>

                  {/* Branch */}
                  <div className="space-y-0.5">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-300" /> Assigned Branch
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-slate-700 dark:text-slate-300 truncate">
                        {isSuper ? 'All Branches (Global)' : u.branch}
                      </p>
                      {u.accessibleBranchIds && u.accessibleBranchIds.length > 1 && !isSuper && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[9px] font-bold">
                          +{u.accessibleBranchIds.length} branches
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Active Status Pill */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-50 dark:border-slate-800/40">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-slate-300" /> Account Status:
                  </span>
                  <span className={`px-2 py-0.2 rounded-full font-bold text-[10px] ${
                    u.isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                  }`}>
                    {u.isActive ? 'Active (Can Log In)' : 'Disabled (Blocked)'}
                  </span>
                </div>

                {/* Modules/Permissions Chips */}
                <div className="space-y-1.5 pt-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Shield className="w-3 h-3 text-slate-300" /> Authorized Modules ({u.permissions?.length || 0})
                    </span>
                    {isSuper && (
                      <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                        Full Override
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(u.permissions || []).map(p => {
                      const mod = ALL_SYSTEM_MODULES.find(m => m.id === p);
                      return (
                        <span
                          key={p}
                          className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-[#FAF8F5] dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[#F1ECE6] dark:border-slate-700"
                          title={mod?.description}
                        >
                          {mod?.label || p}
                        </span>
                      );
                    })}
                    {(!u.permissions || u.permissions.length === 0) && (
                      <span className="text-[10px] text-red-500 italic font-semibold">
                        No modules authorized!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-5 py-3.5 bg-[#FAF8F5] dark:bg-slate-900/60 rounded-b-2xl border-t border-[#F1ECE6] dark:border-slate-800/60 flex items-center justify-between gap-4">
                <button
                  onClick={() => openEditModal(u)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#D97706] dark:hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs hover:border-amber-400"
                >
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>Configure Permissions</span>
                </button>

                <button
                  onClick={() => handleDeleteUser(u.id, u.name)}
                  disabled={isMe}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1.5 rounded-lg ${
                    isMe
                      ? 'opacity-30 cursor-not-allowed text-slate-300'
                      : 'text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer'
                  }`}
                  title={isMe ? 'Cannot delete your own active session' : 'Delete user profile'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-[#E8E2D9] dark:border-slate-800 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-[#D97706] border border-amber-200 dark:border-amber-900/60 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">No Staff Profiles Found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No staff members match the selected search query or filters.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={openCreateSuperAdminModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>+ Create Super Admin</span>
            </button>
            <button
              onClick={openAddModal}
              className="px-4 py-2 bg-[#D97706] hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Staff</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 rounded-2xl border border-[#E8E2D9] dark:border-slate-800 shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E8E2D9] dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1F1916] dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D97706]" />
                {editingUser ? 'Configure Staff Access & Permissions' : 'Register New Staff Profile'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abhishek"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. abhishekgatty1@gmail.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold"
                  />
                </div>

                {/* Passcode */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-slate-400" />
                    Secure Passcode
                  </label>
                  <input
                    type="text"
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to retain current passcode' : 'e.g. 111111'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold font-mono"
                  />
                </div>

                {/* User Role */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Enterprise Role (RBAC Hierarchy)
                  </label>
                  <select
                    value={role}
                    onChange={e => {
                      const newRole = e.target.value as UserProfile['role'];
                      setRole(newRole);
                      const defs = getDefaultPermissionsForRole(newRole) as ModuleType[];
                      setSelectedPermissions(defs);
                      if (newRole === 'Super Admin') {
                        setIsMultiBranch(true);
                        setAccessibleBranchIds(branches.map(b => b.id));
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold"
                  >
                    <option value="Super Admin">Super Admin (Global Access to All Branches & Full RBAC)</option>
                    <option value="Branch Admin">Branch Admin / Store Manager (Elevated Branch Access)</option>
                    <option value="Store Manager">Store Manager (Store Inventory, POS, Orders & Reports)</option>
                    <option value="Store Executive">Staff / Store Executive (Restricted Operational Access: POS, Catalog, Events)</option>
                    <option value="Warehouse Manager">Warehouse Manager (Inward GRN, Inventory, Barcodes)</option>
                    <option value="Lead Cashier">Lead Cashier (POS Checkout & Catalog)</option>
                    <option value="Cashier">Cashier (POS Checkout Stalls)</option>
                  </select>
                </div>

                {/* Primary Operating Branch */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    Primary Operating Branch
                  </label>
                  <select
                    value={selectedBranchId}
                    onChange={e => {
                      const newBId = e.target.value;
                      setSelectedBranchId(newBId);
                      if (!isMultiBranch) {
                        setAccessibleBranchIds([newBId]);
                      } else if (!accessibleBranchIds.includes(newBId)) {
                        setAccessibleBranchIds(prev => [...prev, newBId]);
                      }
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code}) — {b.city}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shift Schedule */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Service Shift
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 08:00 – 17:00 IST"
                    value={shift}
                    onChange={e => setShift(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E8E2D9] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#1F1916] dark:text-white focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-semibold"
                  />
                </div>
              </div>

              {/* Multi-Branch Assignment Section */}
              <div className="p-4 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="multi_branch_toggle"
                      checked={isMultiBranch}
                      onChange={e => {
                        const checked = e.target.checked;
                        setIsMultiBranch(checked);
                        if (!checked) {
                          setAccessibleBranchIds([selectedBranchId]);
                        } else if (accessibleBranchIds.length <= 1) {
                          setAccessibleBranchIds(branches.map(b => b.id));
                        }
                      }}
                      className="rounded-sm border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="multi_branch_toggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                      Enable Multi-Branch Access (Assign multiple branches e.g., Bangalore, Mangalore)
                    </label>
                  </div>
                  {isMultiBranch && (
                    <button
                      type="button"
                      onClick={() => {
                        if (accessibleBranchIds.length === branches.length) {
                          setAccessibleBranchIds([selectedBranchId]);
                        } else {
                          setAccessibleBranchIds(branches.map(b => b.id));
                        }
                      }}
                      className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      {accessibleBranchIds.length === branches.length ? 'Select Only Primary' : 'Select All Branches'}
                    </button>
                  )}
                </div>

                {isMultiBranch && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40">
                    {branches.map(b => {
                      const isChecked = accessibleBranchIds.includes(b.id);
                      const isPrimary = b.id === selectedBranchId;
                      return (
                        <div
                          key={b.id}
                          onClick={() => handleBranchAccessToggle(b.id)}
                          className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs select-none ${
                            isChecked
                              ? 'bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 font-bold text-slate-900 dark:text-white shadow-2xs'
                              : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-500 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded-sm border-slate-300 text-amber-600 focus:ring-amber-500 shrink-0"
                            />
                            <div className="truncate">
                              <span className="truncate block">{b.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal">
                                {b.code} • {b.city}
                              </span>
                            </div>
                          </div>
                          {isPrimary && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[9px] font-bold shrink-0">
                              PRIMARY
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* User Account Active Status Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="user_active_toggle"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    disabled={editingUser?.id === currentUser.id}
                    className="rounded-sm border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="user_active_toggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                      User Account Active Status (Enable / Disable Profile)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      When disabled, this user cannot authenticate, log in, or interact with any branch data.
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                }`}>
                  {isActive ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>

              {/* Module-Level Access Permissions Checklist */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div>
                    <span className="text-xs font-black text-[#1F1916] dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#D97706]" />
                      Individual Module Access Permissions ({selectedPermissions.length} Authorized)
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Toggle specific module access for this user. Route guards prevent unauthorized access.
                    </p>
                  </div>
                  
                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedPermissions(['dashboard', 'pos', 'products', 'events'])}
                      className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800 cursor-pointer hover:bg-emerald-100"
                    >
                      Operations Only (POS, Products, Events)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedPermissions.length === ALL_SYSTEM_MODULES.length) {
                          setSelectedPermissions(['dashboard']);
                        } else {
                          setSelectedPermissions(ALL_SYSTEM_MODULES.map(m => m.id as ModuleType));
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800 cursor-pointer hover:bg-amber-100"
                    >
                      Toggle All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ALL_SYSTEM_MODULES.map(mod => {
                    const hasAccess = selectedPermissions.includes(mod.id as ModuleType);
                    return (
                      <div
                        key={mod.id}
                        onClick={() => handlePermissionToggle(mod.id as ModuleType)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 select-none ${
                          hasAccess
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-[#FDE68A]/80 dark:border-amber-800/80'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={hasAccess}
                          onChange={() => {}}
                          className="mt-0.5 rounded-sm border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{mod.label}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal mt-0.5">{mod.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Security Warning */}
              {selectedPermissions.includes('settings') && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-950/60 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-700 dark:text-red-300 leading-relaxed font-semibold">
                    <span className="font-bold uppercase">Security Note:</span> Granting access to Settings allows this staff member to configure system parameters and manage user profiles. Restrict to Administrators and Managers.
                  </p>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E8E2D9] dark:border-slate-800 flex items-center justify-end gap-3 bg-[#FAF8F5] dark:bg-slate-900/40 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-[#D97706] hover:bg-amber-600 active:scale-[0.98] transition-all text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {editingUser ? 'Save Updates' : 'Create Staff Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

