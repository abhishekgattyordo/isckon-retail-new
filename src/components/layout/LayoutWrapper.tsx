'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalSearchModal } from './GlobalSearchModal';
import { Plus } from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { LoginPage } from '../auth/LoginPage';
import { canAccessModule } from '../../lib/authUtils';

export const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setActiveModule, isAuthenticated, user } = useERP();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAF9F6] dark:bg-slate-950 text-[#786C65] font-sans text-xs">
        Loading ISKCON ERP...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen w-full bg-[#FFFFFF] dark:bg-slate-950 font-sans text-[#1F1916] dark:text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Scrollable Content Viewport */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto space-y-6 sm:space-y-8 bg-[#FAF9F6] dark:bg-slate-950/40 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {children}
        </div>
      </main>

      {/* Quick Search Modal */}
      <GlobalSearchModal />

      {/* Floating Action Button for Quick Entry (Only for users permitted for inward) */}
      {canAccessModule(user, 'inward') && (
        <button
          onClick={() => setActiveModule('inward')}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 bg-[#D97706] hover:bg-[#B45309] text-white py-3 px-5 rounded-2xl shadow-lg shadow-[#D97706]/25 hover:shadow-[#D97706]/40 flex items-center gap-2.5 hover:-translate-y-0.5 transition-all z-30 group border border-[#D97706]/30 font-semibold text-sm cursor-pointer"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform text-white" />
          <span className="font-semibold pr-1 tracking-tight">Quick Inward GRN</span>
        </button>
      )}
    </div>
  );
};
