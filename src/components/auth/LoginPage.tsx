'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { INITIAL_USERS, INITIAL_BRANCHES } from '../../data/initialData';
import { UserProfile, Branch } from '../../types';
import { GLOBAL_ALL_BRANCHES, isSuperAdmin } from '../../lib/authUtils';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Compass,
  HelpCircle,
  LogIn,
  Sun,
  Moon,
  ShieldAlert,
  BookOpen,
  X,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Building2,
  MapPin,
  Check,
  Store,
  Briefcase,
  RotateCw,
  Globe
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, theme, setTheme, settings, users, resetUserPassword, branches, refreshUsers } = useERP();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Branch Selection Flow States
  const [loginStage, setLoginStage] = useState<'credentials' | 'select_branch'>('credentials');
  const [pendingUser, setPendingUser] = useState<{
    user: UserProfile;
    email: string;
    pass: string;
    accessibleBranches: Branch[];
  } | null>(null);

  // Remote synced staff state
  const [remoteUsers, setRemoteUsers] = useState<UserProfile[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  const loadStaffAccounts = async () => {
    try {
      setIsLoadingStaff(true);
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success && Array.isArray(data.users) && data.users.length > 0) {
        setRemoteUsers(data.users);
        if (refreshUsers) {
          refreshUsers(data.users);
        }
      }
    } catch (e) {
      console.warn('Failed to load active staff accounts on login page:', e);
    } finally {
      setIsLoadingStaff(false);
    }
  };

  useEffect(() => {
    loadStaffAccounts();
  }, []);

  // Available staff accounts & branches (merging initial, context, and live server state)
  const availableUsers = useMemo(() => {
    const map = new Map<string, UserProfile>();
    INITIAL_USERS.forEach(u => {
      map.set(u.email.toLowerCase().trim(), u);
    });
    if (Array.isArray(users)) {
      users.forEach(u => {
        map.set(u.email.toLowerCase().trim(), u);
      });
    }
    if (Array.isArray(remoteUsers)) {
      remoteUsers.forEach(u => {
        map.set(u.email.toLowerCase().trim(), u);
      });
    }
    return Array.from(map.values()).filter(u => !u.isDeleted);
  }, [users, remoteUsers]);

  const availableBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;

  // Forgot Password / Passcode Recovery States
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [showNewPasscode, setShowNewPasscode] = useState(false);
  const [forgotStep, setForgotStep] = useState<'verify_account' | 'enter_new_passcode' | 'success'>('verify_account');
  const [forgotError, setForgotError] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [matchedUser, setMatchedUser] = useState<any>(null);

  // Quick Super Admin Creation States
  const [isCreateSuperAdminModalOpen, setIsCreateSuperAdminModalOpen] = useState(false);
  const [superAdminName, setSuperAdminName] = useState('Abhishek Gatty');
  const [superAdminEmail, setSuperAdminEmail] = useState('abhishekgatty58@gmail.com');
  const [superAdminPasscode, setSuperAdminPasscode] = useState('111111');
  const [isCreatingSuperAdmin, setIsCreatingSuperAdmin] = useState(false);
  const [createSuperAdminError, setCreateSuperAdminError] = useState('');

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminName.trim() || !superAdminEmail.trim() || !superAdminPasscode.trim()) {
      setCreateSuperAdminError('Please fill in all fields.');
      return;
    }
    try {
      setIsCreatingSuperAdmin(true);
      setCreateSuperAdminError('');
      const cleanEmail = superAdminEmail.trim().toLowerCase();
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: superAdminName.trim(),
          email: cleanEmail,
          password: superAdminPasscode.trim(),
          role: 'Super Admin',
          branch: 'All Branches (Central HQ)',
          branchId: 'all-branches',
          accessibleBranchIds: ['*'],
          shift: '24/7 Global Oversight',
          isActive: true,
          permissions: ['dashboard', 'products', 'inward', 'inventory', 'barcode', 'pos', 'events', 'reports', 'settings', 'audit', 'recycle_bin']
        })
      });
      const data = await res.json();
      setIsCreateSuperAdminModalOpen(false);
      // Immediately log in with the new Super Admin credentials
      await login(cleanEmail, superAdminPasscode.trim(), 'all-branches');
    } catch (err: any) {
      console.error('Error creating super admin:', err);
      // Fallback direct login
      await login(superAdminEmail.trim().toLowerCase(), superAdminPasscode.trim(), 'all-branches');
    } finally {
      setIsCreatingSuperAdmin(false);
    }
  };

  // Calculate accessible branches for a given user
  const getUserBranches = (targetUser: UserProfile): Branch[] => {
    const activeBranches = availableBranches.filter(b => b.isActive !== false && b.status !== 'inactive');
    if (isSuperAdmin(targetUser)) {
      return [GLOBAL_ALL_BRANCHES, ...activeBranches];
    }
    // If user has specific accessibleBranchIds assigned, restrict strictly to those:
    if (targetUser.accessibleBranchIds && targetUser.accessibleBranchIds.length > 0 && !targetUser.accessibleBranchIds.includes('*')) {
      const filtered = activeBranches.filter(b => targetUser.accessibleBranchIds!.includes(b.id));
      if (filtered.length > 0) return filtered;
    }
    // If not superadmin, restrict strictly to their primary operating branch
    if (targetUser.branchId) {
      const primary = activeBranches.find(b => b.id === targetUser.branchId);
      if (primary) return [primary];
    }
    const raw = (targetUser.branch || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const isBlr = raw.includes('bang') || raw.includes('blr') || raw.includes('bengaluru');
    const isMgl = raw.includes('mang') || raw.includes('ixe') || raw.includes('mgl') || raw.includes('mangaluru');
    const isMayapur = raw.includes('mayapur') || raw.includes('hq');
    const isVrn = raw.includes('vrin') || raw.includes('vrn');
    const isMumbai = raw.includes('mumbai') || raw.includes('juhu') || raw.includes('bom');
    const isDelhi = raw.includes('delhi') || raw.includes('del');

    const matched = activeBranches.filter(b => {
      const bId = b.id.toLowerCase();
      const bName = b.name.toLowerCase();
      const bCity = b.city.toLowerCase();

      if (targetUser.branchId && b.id === targetUser.branchId) return true;
      if (isBlr && (bId.includes('bangalore') || bCity.includes('bangalore'))) return true;
      if (isMgl && (bId.includes('mangalore') || bCity.includes('mangalore'))) return true;
      if (isMayapur && (bId.includes('mayapur') || bCity.includes('mayapur'))) return true;
      if (isVrn && (bId.includes('vrindavan') || bCity.includes('vrindavan'))) return true;
      if (isMumbai && (bId.includes('mumbai') || bCity.includes('mumbai'))) return true;
      if (isDelhi && (bId.includes('delhi') || bCity.includes('delhi'))) return true;

      return bName.includes(raw) || raw.includes(bName) || bCity.includes(raw);
    });
    return matched.length > 0 ? matched : activeBranches.slice(0, 1);
  };

  const handleAuthenticate = async (inputEmail: string, inputPass: string) => {
    setIsSubmitting(true);
    setErrorMsg('');

    const clean = inputEmail.trim().toLowerCase();
    const cleanNorm = clean.replace(/yy+/g, 'y');
    let currentList = availableUsers;
    let found = currentList.find(u => {
      const uEmail = u.email.trim().toLowerCase();
      const uNorm = uEmail.replace(/yy+/g, 'y');
      return (uEmail === clean || uNorm === cleanNorm) && u.password === inputPass;
    });

    if (!found) {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          setRemoteUsers(data.users);
          if (refreshUsers) refreshUsers(data.users);
          currentList = data.users;
          found = currentList.find((u: UserProfile) => {
            const uEmail = u.email.trim().toLowerCase();
            const uNorm = uEmail.replace(/yy+/g, 'y');
            return (uEmail === clean || uNorm === cleanNorm) && u.password === inputPass;
          });
        }
      } catch (e) {
        console.warn('Live user auth check failed:', e);
      }
    }

    setIsSubmitting(false);

    if (!found) {
      setErrorMsg('Invalid login credentials. Please use your registered staff email and passcode, or pick an active account below.');
      return;
    }

    if (!found.isActive) {
      setErrorMsg('This staff user account is currently deactivated. Please contact an administrator.');
      return;
    }

    const userBranches = getUserBranches(found);

    // Multi-Branch Flow: If user has multiple accessible branches, prompt for branch selection
    if (userBranches.length > 1) {
      setPendingUser({
        user: found,
        email: found.email,
        pass: inputPass,
        accessibleBranches: userBranches
      });
      setLoginStage('select_branch');
    } else {
      // Single Branch Flow: Directly authenticate into their assigned branch
      const targetBranchId = userBranches[0]?.id || found.branchId;
      login(found.email, inputPass, targetBranchId, found);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthenticate(email, password);
  };

  const handleDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleAuthenticate(demoEmail, demoPass);
  };

  const handleBranchSelect = (branch: Branch) => {
    if (!pendingUser) return;
    setIsSubmitting(true);
    setTimeout(() => {
      login(pendingUser.email, pendingUser.pass, branch.id);
      setIsSubmitting(false);
    }, 250);
  };

  const handleBackToCredentials = () => {
    setLoginStage('credentials');
    setPendingUser(null);
    setErrorMsg('');
  };

  const handleOpenForgotModal = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const defaultEmail = email.trim() || availableUsers[0]?.email || 'store.manager@aura-retail.org';
    setForgotEmail(defaultEmail);
    setSecurityPin('108108'); // Default temple security PIN
    setNewPasscode('');
    setConfirmPasscode('');
    setForgotError('');
    setForgotStep('verify_account');
    setMatchedUser(null);
    setIsForgotModalOpen(true);
  };

  const handleVerifyAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    const clean = forgotEmail.trim().toLowerCase();
    const cleanNorm = clean.replace(/yy+/g, 'y');
    let currentList = availableUsers;
    let found = currentList.find(u => {
      const uEmail = u.email.trim().toLowerCase();
      const uNorm = uEmail.replace(/yy+/g, 'y');
      return uEmail === clean || uNorm === cleanNorm;
    });

    if (!found) {
      try {
        setIsResetting(true);
        const res = await fetch('/api/users');
        const data = await res.json();
        setIsResetting(false);
        if (data.success && Array.isArray(data.users)) {
          setRemoteUsers(data.users);
          if (refreshUsers) refreshUsers(data.users);
          currentList = data.users;
          found = currentList.find((u: UserProfile) => {
            const uEmail = u.email.trim().toLowerCase();
            const uNorm = uEmail.replace(/yy+/g, 'y');
            return uEmail === clean || uNorm === cleanNorm;
          });
        }
      } catch (e) {
        setIsResetting(false);
      }
    }

    if (!found) {
      setForgotError(`No registered staff account found matching "${forgotEmail}". Please pick one of the active staff accounts below.`);
      return;
    }

    setMatchedUser(found);
    setForgotEmail(found.email);
    setForgotStep('enter_new_passcode');
  };

  const handleResetPasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (securityPin.trim() !== '108108' && securityPin.trim().length < 4) {
      setForgotError('Please enter a valid 6-digit Temple Security PIN (default is 108108).');
      return;
    }

    if (!newPasscode.trim()) {
      setForgotError('Please enter a new passcode.');
      return;
    }

    if (newPasscode.length < 4) {
      setForgotError('Passcode must be at least 4 characters long.');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setForgotError('Passcode and confirmation do not match.');
      return;
    }

    setIsResetting(true);

    try {
      const success = await resetUserPassword(forgotEmail, newPasscode.trim());
      setIsResetting(false);
      if (success) {
        setForgotStep('success');
      } else {
        setForgotError('Failed to reset passcode. Please try again.');
      }
    } catch (err: any) {
      setIsResetting(false);
      setForgotError(err?.message || 'Failed to update passcode.');
    }
  };

  const handleFinishResetAndFill = () => {
    setEmail(forgotEmail);
    setPassword(newPasscode);
    setErrorMsg('');
    setIsForgotModalOpen(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#FAF9F6] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-250 relative overflow-hidden font-sans">
      {/* Absolute Decorative Background Patterns */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

      {/* Top bar with Theme Switcher */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-10 h-10 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <BookOpen className="w-5 h-5 text-[#D97706]" style={{ color: settings.brandingColor }} />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-black tracking-tight text-xs sm:text-sm text-slate-900 dark:text-white uppercase truncate">
              {settings.appTitle}
            </h1>
            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 truncate" style={{ color: settings.brandingColor }}>
              {settings.orgName}
            </p>
          </div>
        </div>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 transition-colors cursor-pointer"
          title="Toggle system theme colors"
          id="btn_theme_toggle_login"
        >
          {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <div className="w-full max-w-[500px] bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-xl p-6 sm:p-8 space-y-6 transition-all relative">
          
          {/* STAGE 1: CREDENTIALS AUTHENTICATION */}
          {loginStage === 'credentials' && (
            <>
              {/* Header Title Section */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-[#FFFBEB] dark:bg-amber-950/40 text-[#D97706] border border-amber-200/40 dark:border-amber-900/40 mb-1 overflow-hidden">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                  ) : (
                    <Compass className="w-6 h-6 text-[#D97706] animate-spin-slow" style={{ color: settings.brandingColor }} />
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-slate-900 dark:text-white uppercase">
                  {settings.appTitle}
                </h2>
                <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans leading-relaxed">
                  Staff and branch portal for <strong style={{ color: settings.brandingColor }}>{settings.orgName}</strong>. Secure multi-branch tenancy active.
                </p>
              </div>

              {/* Error Message banner */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="input_login_email" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input_login_email"
                      type="email"
                      required
                      placeholder="name@aura-retail.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#111827] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="input_login_password" className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Staff Passcode
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenForgotModal}
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      className="relative z-20 text-[11px] text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer py-1 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-all active:scale-95 shadow-xs"
                      id="btn_forgot_password"
                      title="Click to reset your password / passcode"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="underline decoration-amber-500/70 font-semibold">Forgot passcode?</span>
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="input_login_password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-[#111827] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      id="btn_password_toggle"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn_login_submit"
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/15 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Authenticate Session</span>
                    </>
                  )}
                </button>

                {/* Direct Secondary Passcode Reset Button */}
                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    onClick={handleOpenForgotModal}
                    className="text-xs text-slate-500 hover:text-amber-700 dark:text-slate-400 dark:hover:text-amber-300 font-medium flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Need to reset or change passcode? <strong className="underline decoration-amber-500 font-semibold">Click here</strong></span>
                  </button>
                </div>
              </form>


            </>
          )}

          {/* STAGE 2: MULTI-BRANCH OPERATING WORKSPACE SELECTION */}
          {loginStage === 'select_branch' && pendingUser && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
              {/* Back button and user identity header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Switch Account</span>
                </button>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {pendingUser.accessibleBranches.length} Branches Available
                </span>
              </div>

              {/* Verified staff banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/60 flex items-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-amber-500 shrink-0 bg-slate-200 dark:bg-slate-800">
                  <img
                    src={pendingUser.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={pendingUser.user.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {pendingUser.user.name}
                    </p>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500 text-white">
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {pendingUser.user.role} • {pendingUser.user.email}
                  </p>
                </div>
              </div>

              {/* Title & Instructions */}
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Select Operating Branch</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Your account has multi-branch access privileges. Select the branch workspace to enter for this ERP session:
                </p>
              </div>

              {/* Branch Cards List */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {pendingUser.accessibleBranches.map(branch => (
                  <button
                    key={branch.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleBranchSelect(branch)}
                    className="w-full p-3.5 text-left rounded-2xl bg-slate-50 dark:bg-slate-950/80 hover:bg-amber-50/60 dark:hover:bg-amber-950/40 border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 transition-all cursor-pointer group shadow-2xs flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {branch.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {branch.code}
                        </span>
                        {branch.isMain && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            HQ Main
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{branch.city}, {branch.state} — {branch.location}</span>
                      </p>
                      {branch.managerName && (
                        <p className="text-[10px] text-slate-400">
                          Manager: <strong className="text-slate-600 dark:text-slate-300">{branch.managerName}</strong>
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-2xs">
                      <span>Enter</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* FORGOT PASSWORD / PASSCODE RECOVERY MODAL */}
      {isForgotModalOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsForgotModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <KeyRound className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Passcode Recovery & Reset
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    TEMPLE STAFF VERIFIED AUTHENTICATION
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Error banner inside modal */}
            {forgotError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: Verify Staff Account */}
            {forgotStep === 'verify_account' && (
              <form onSubmit={handleVerifyAccount} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Enter your registered temple staff email to verify your identity and reset your passcode.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Staff Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. store.manager@aura-retail.org"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Quick Staff Selection Chips */}
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Quick Select Active Staff Account:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableUsers.slice(0, 4).map(u => (
                      <button
                        key={u.id || u.email}
                        type="button"
                        onClick={() => {
                          setForgotEmail(u.email);
                          setForgotError('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                          forgotEmail.toLowerCase() === u.email.toLowerCase()
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700 font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                        }`}
                      >
                        {u.name} ({u.role})
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Verify Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter Security Pin & New Passcode */}
            {forgotStep === 'enter_new_passcode' && (
              <form onSubmit={handleResetPasscodeSubmit} className="space-y-4">
                {matchedUser && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {matchedUser.name}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {matchedUser.role} • {matchedUser.branch || 'Mayapur HQ'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Temple Security PIN
                    </label>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                      PIN: 108108
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={securityPin}
                      onChange={(e) => setSecurityPin(e.target.value)}
                      placeholder="Enter 6-digit PIN (108108)"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    New Devotee Passcode
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPasscode ? 'text' : 'password'}
                      required
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      placeholder="e.g. radha108 or krishna2026"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPasscode(prev => !prev)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showNewPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Confirm New Passcode
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPasscode ? 'text' : 'password'}
                      required
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      placeholder="Re-enter new passcode"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('verify_account')}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isResetting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Update Passcode</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success View */}
            {forgotStep === 'success' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20 animate-in zoom-in-95">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white">
                    Passcode Reset Successful!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Your new passcode has been updated in the database and audit trail.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-1 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Account:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{forgotEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">New Passcode:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{newPasscode}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinishResetAndFill}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Return to Login & Auto-fill Passcode</span>
                </button>
              </div>
            )}

            {/* Quick Reference Box */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Security PIN: <strong>108108</strong></span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Audit Logged
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW SUPER ADMIN MODAL */}
      {isCreateSuperAdminModalOpen && (
        <div
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsCreateSuperAdminModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Create Super Admin Account
                  </h3>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                    FULL GLOBAL ACCESS &bull; ALL BRANCHES &bull; FULL RBAC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateSuperAdminModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {createSuperAdminError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{createSuperAdminError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSuperAdmin} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Register a new global Super Administrator profile. This account will have unrestricted access across all temple stores, modules, user management, and system settings.
              </p>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={superAdminName}
                  onChange={(e) => setSuperAdminName(e.target.value)}
                  placeholder="e.g. Abhishek Gatty"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Admin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={superAdminEmail}
                  onChange={(e) => setSuperAdminEmail(e.target.value)}
                  placeholder="e.g. abhishekgatty58@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold"
                />
              </div>

              {/* Passcode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Secure Passcode
                </label>
                <input
                  type="text"
                  required
                  value={superAdminPasscode}
                  onChange={(e) => setSuperAdminPasscode(e.target.value)}
                  placeholder="e.g. 111111"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono font-semibold"
                />
              </div>

              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Automatic Privileges:</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 pl-5">
                  &bull; All branches (Bangalore, Mangalore, Mayapur, Vrindavan, Mumbai, Delhi) + Global Combined View
                  <br />
                  &bull; All modules authorized (POS, Inward, Inventory, Events, Reports, Settings, Audit, Recycle Bin)
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSuperAdminModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSuperAdmin}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isCreatingSuperAdmin ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Create & Log In</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center z-10 text-[10px] text-slate-400 font-mono">
        <p>© 2026 ISKCON Devotional Literature & Books Distribution Society.</p>
        <p className="text-[9px] text-slate-500 mt-1 uppercase">
          SECURED BY SHA-256 DIGITAL LEDGER SIGNATURES
        </p>
      </footer>
    </div>
  );
};
