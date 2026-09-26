/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GpsProvider } from './context/GpsContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { initializeDatabase } from './db';
import { observationRepository } from './services/db/repositories/observationRepository';
import { Header } from './components/common/Header';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { LoginView } from './components/auth/LoginView';

// MO Components
import { MoBottomNav, MoTab } from './components/navigation/MoBottomNav';
import { MoHomeView } from './components/mo/MoHomeView';
import { MoVisitsView } from './components/mo/MoVisitsView';
import { MoSubmissionsView } from './components/mo/MoSubmissionsView';
import { MoProfileView } from './components/mo/MoProfileView';
import { MoDiscoverView } from './components/mo/MoDiscoverView';
import { MoInstituteVerificationView } from './components/mo/MoInstituteVerificationView';
import { MoEmployeeMappingView } from './components/mo/MoEmployeeMappingView';
import { MoNewInstituteView } from './components/mo/MoNewInstituteView';
import { MoVisitReviewView } from './components/mo/MoVisitReviewView';
import { useInstitutes } from './hooks/useInstitutes';

// Admin Components
import { AdminSidebar, AdminTab } from './components/navigation/AdminSidebar';
import { AdminDashboardView } from './components/admin/AdminDashboardView';
import { AdminVerificationView } from './components/admin/AdminVerificationView';
import { AdminInstitutesView } from './components/admin/AdminInstitutesView';
import { AdminEmployeesView } from './components/admin/AdminEmployeesView';
import { AdminDataImportView } from './components/admin/AdminDataImportView';
import { AdminAuditHistoryView } from './components/admin/AdminAuditHistoryView';
import { AdminSettingsView } from './components/admin/AdminSettingsView';

const AppContent: React.FC = () => {
  const { user, role } = useAuth();
  
  // Navigation states
  const { institutes } = useInstitutes();

  type MoActiveView = 
    | { type: 'tab'; tab: MoTab }
    | { type: 'discover' }
    | { type: 'institute'; instituteId: string }
    | { type: 'employees'; instituteId: string }
    | { type: 'new-institute' }
    | { type: 'review' };

  const [moView, setMoView] = useState<MoActiveView>(() => {
    const combined = `${window.location.pathname.toLowerCase()} ${window.location.hash.toLowerCase()}`;
    if (combined.includes('review')) return { type: 'review' };
    if (combined.includes('new-institute')) return { type: 'new-institute' };
    if (combined.includes('discover')) return { type: 'discover' };
    const empSubMatch = combined.match(/institute[/:]([a-zA-Z0-9_-]+)[/:]employees/);
    if (empSubMatch) return { type: 'employees', instituteId: empSubMatch[1] };
    const instMatch = combined.match(/institute[/:]([a-zA-Z0-9_-]+)/);
    if (instMatch) return { type: 'institute', instituteId: instMatch[1] };
    const empMatch = combined.match(/employees[/:]([a-zA-Z0-9_-]+)/);
    if (empMatch) return { type: 'employees', instituteId: empMatch[1] };
    if (combined.includes('visits')) return { type: 'tab', tab: 'visits' };
    if (combined.includes('submissions')) return { type: 'tab', tab: 'submissions' };
    if (combined.includes('profile')) return { type: 'tab', tab: 'profile' };
    return { type: 'tab', tab: 'home' };
  });

  const [adminTab, setAdminTab] = useState<AdminTab>(() => {
    const combined = `${window.location.pathname.toLowerCase()} ${window.location.hash.toLowerCase()}`;
    if (combined.includes('import')) return 'import';
    if (combined.includes('verification')) return 'verification';
    if (combined.includes('institutes')) return 'institutes';
    if (combined.includes('employees')) return 'employees';
    if (combined.includes('history') || combined.includes('audit')) return 'audit';
    if (combined.includes('settings')) return 'settings';
    return 'dashboard';
  });
  const [selectedVerificationId, setSelectedVerificationId] = useState<string | null>(() => {
    const combined = `${window.location.pathname.toLowerCase()} ${window.location.hash.toLowerCase()}`;
    const verifMatch = combined.match(/admin\/verification\/([a-zA-Z0-9_-]+)/);
    return verifMatch ? verifMatch[1] : null;
  });
  const [adminSidebarMobileOpen, setAdminSidebarMobileOpen] = useState(false);
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);

  const { showToast } = useToast();

  // Sync browser route on load and popstate with strict Access Control
  useEffect(() => {
    const handleUrlRoute = () => {
      const combined = `${window.location.pathname.toLowerCase()} ${window.location.hash.toLowerCase()}`;
      
      // Access Control: MO cannot enter Admin routes
      if (role === 'mo' && (combined.includes('admin') || combined.includes('verification'))) {
        window.history.replaceState(null, '', '/mo/home');
        setMoView({ type: 'tab', tab: 'home' });
        showToast('Access restricted: Marketing Officers cannot access administrative tools or verification decisions.', 'error');
        return;
      }

      // Admin routes
      if (role === 'admin') {
        const verifMatch = combined.match(/admin\/verification\/([a-zA-Z0-9_-]+)/);
        if (verifMatch) {
          setAdminTab('verification');
          setSelectedVerificationId(verifMatch[1]);
          return;
        } else if (combined.includes('admin/verification') || combined.includes('verification')) {
          setAdminTab('verification');
          setSelectedVerificationId(null);
          return;
        } else if (combined.includes('admin/import') || combined.includes('import')) {
          setAdminTab('import');
          return;
        } else if (combined.includes('admin/institutes') || combined.includes('institutes')) {
          setAdminTab('institutes');
          return;
        } else if (combined.includes('admin/employees') || combined.includes('employees')) {
          setAdminTab('employees');
          return;
        } else if (combined.includes('admin/history') || combined.includes('history') || combined.includes('admin/audit') || combined.includes('audit')) {
          setAdminTab('audit');
          return;
        } else if (combined.includes('admin/settings') || combined.includes('settings')) {
          setAdminTab('settings');
          return;
        }
      }

      // MO routes
      if (combined.includes('review')) {
        setMoView({ type: 'review' });
      } else if (combined.includes('new-institute')) {
        setMoView({ type: 'new-institute' });
      } else if (combined.includes('discover')) {
        setMoView({ type: 'discover' });
      } else {
        const empSubMatch = combined.match(/institute[/:]([a-zA-Z0-9_-]+)[/:]employees/);
        if (empSubMatch) {
          setMoView({ type: 'employees', instituteId: empSubMatch[1] });
        } else {
          const instMatch = combined.match(/institute[/:]([a-zA-Z0-9_-]+)/);
          if (instMatch) {
            setMoView({ type: 'institute', instituteId: instMatch[1] });
          } else {
            const empMatch = combined.match(/employees[/:]([a-zA-Z0-9_-]+)/);
            if (empMatch) {
              setMoView({ type: 'employees', instituteId: empMatch[1] });
            } else if (combined.includes('visits')) {
              setMoView({ type: 'tab', tab: 'visits' });
            } else if (combined.includes('submissions')) {
              setMoView({ type: 'tab', tab: 'submissions' });
            } else if (combined.includes('profile')) {
              setMoView({ type: 'tab', tab: 'profile' });
            }
          }
        }
      }
    };

    // Trigger URL evaluation immediately on mount / role change
    handleUrlRoute();

    window.addEventListener('popstate', handleUrlRoute);
    window.addEventListener('hashchange', handleUrlRoute);
    return () => {
      window.removeEventListener('popstate', handleUrlRoute);
      window.removeEventListener('hashchange', handleUrlRoute);
    };
  }, [role, showToast]);

  const handleAdminTabChange = (newTab: AdminTab) => {
    setAdminTab(newTab);
    if (newTab !== 'verification') {
      setSelectedVerificationId(null);
    }
    const targetRoute = newTab === 'audit' ? '/admin/history' : `/admin/${newTab}`;
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
  };

  const handleSelectVerification = (id: string | null) => {
    setSelectedVerificationId(id);
    const targetRoute = id ? `/admin/verification/${id}` : '/admin/verification';
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
  };

  const handleMoNavigateTab = (tab: MoTab) => {
    setMoView({ type: 'tab', tab });
    const targetRoute = `/mo/${tab}`;
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
  };

  const handleMoNavigateDiscover = () => {
    setMoView({ type: 'discover' });
    const targetRoute = '/mo/visit/discover';
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
  };

  const handleMoNavigateInstitute = (instituteId: string) => {
    setMoView({ type: 'institute', instituteId });
    const targetRoute = `/mo/visit/institute/${instituteId}`;
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
  };

  const handleMoNavigateEmployees = (instituteId: string) => {
    setMoView({ type: 'employees', instituteId });
    const targetRoute = `/mo/visit/institute/${instituteId}/employees`;
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
  };

  const handleMoNavigateNewInstitute = () => {
    setMoView({ type: 'new-institute' });
    const targetRoute = '/mo/visit/new-institute';
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
  };

  const handleMoNavigateReview = () => {
    setMoView({ type: 'review' });
    const targetRoute = '/mo/visit/review';
    if (window.location.pathname !== targetRoute) {
      window.history.pushState(null, '', targetRoute);
    }
  };

  // Monitor pending count from repository for badges
  useEffect(() => {
    async function updatePendingCount() {
      try {
        const pending = await observationRepository.getPending();
        setPendingVerificationCount(pending.length);
      } catch (err) {
        console.error('Failed to read pending count:', err);
      }
    }

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 2500);
    return () => clearInterval(interval);
  }, []);

  // If not authenticated, render Demo Login
  if (!user || !role) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header 
        onToggleSidebar={() => setAdminSidebarMobileOpen(!adminSidebarMobileOpen)}
        sidebarOpen={adminSidebarMobileOpen}
      />

      {/* Main Role-Specific Layout */}
      {role === 'mo' ? (
        // Marketing Officer Experience (Mobile-First)
        <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 pt-4 pb-20 lg:pb-8">
          {/* Desktop Tab Switcher for MO if viewed on wide screens */}
          <div className="hidden lg:flex items-center gap-2 mb-5 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
            {(['home', 'visits', 'submissions', 'profile'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleMoNavigateTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  moView.type === 'tab' && moView.tab === tab
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab === 'submissions' ? `My Submissions (${pendingVerificationCount})` : tab}
              </button>
            ))}
          </div>

          {/* MO Views */}
          <main className="flex-1">
            {moView.type === 'discover' && (
              <MoDiscoverView 
                onSelectInstitute={handleMoNavigateInstitute}
                onBackToHome={() => handleMoNavigateTab('home')}
                onNavigateToNewInstitute={handleMoNavigateNewInstitute}
              />
            )}

            {moView.type === 'new-institute' && (
              <MoNewInstituteView 
                onBack={handleMoNavigateDiscover}
                onSelectExistingInstitute={handleMoNavigateInstitute}
                onCompleteObservation={() => handleMoNavigateTab('submissions')}
              />
            )}

            {moView.type === 'institute' && (() => {
              const targetInst = institutes.find((i) => i.id === moView.instituteId) || institutes[0];
              if (!targetInst) {
                return (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Institute not found.
                  </div>
                );
              }
              return (
                <MoInstituteVerificationView
                  institute={targetInst}
                  onChooseAnotherInstitute={handleMoNavigateDiscover}
                  onContinueToEmployees={handleMoNavigateEmployees}
                />
              );
            })()}

            {moView.type === 'employees' && (() => {
              const targetInst = institutes.find((i) => i.id === moView.instituteId) || institutes[0];
              if (!targetInst) {
                return (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Institute not found.
                  </div>
                );
              }
              return (
                <MoEmployeeMappingView
                  institute={targetInst}
                  onBackToInstitute={() => handleMoNavigateInstitute(moView.instituteId)}
                  onContinue={handleMoNavigateReview}
                />
              );
            })()}

            {moView.type === 'review' && (
              <MoVisitReviewView
                onBackToInstitute={handleMoNavigateDiscover}
                onNavigateToSubmissions={() => handleMoNavigateTab('submissions')}
                onBackToHome={() => handleMoNavigateTab('home')}
              />
            )}

            {moView.type === 'tab' && moView.tab === 'home' && (
              <MoHomeView 
                onNavigateToVisits={() => handleMoNavigateTab('visits')}
                onNavigateToSubmissions={() => handleMoNavigateTab('submissions')}
                onNavigateToDiscover={handleMoNavigateDiscover}
                onSelectInstitute={handleMoNavigateInstitute}
                onNavigateToReview={handleMoNavigateReview}
              />
            )}

            {moView.type === 'tab' && moView.tab === 'visits' && <MoVisitsView />}
            {moView.type === 'tab' && moView.tab === 'submissions' && <MoSubmissionsView />}
            {moView.type === 'tab' && moView.tab === 'profile' && <MoProfileView />}
          </main>

          {/* MO Mobile Bottom Navigation */}
          <MoBottomNav 
            activeTab={moView.type === 'tab' ? moView.tab : 'home'} 
            onChangeTab={handleMoNavigateTab}
            pendingObservationsCount={pendingVerificationCount}
          />
        </div>
      ) : (
        // Admin / Verifier Experience (Desktop & Tablet Optimized)
        <div className="flex-1 flex w-full">
          {/* Sidebar */}
          <AdminSidebar
            activeTab={adminTab}
            onChangeTab={handleAdminTabChange}
            pendingCount={pendingVerificationCount}
            isOpenMobile={adminSidebarMobileOpen}
            onCloseMobile={() => setAdminSidebarMobileOpen(false)}
          />

          {/* Admin Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
            {adminTab === 'dashboard' && <AdminDashboardView onNavigateTab={handleAdminTabChange} />}
            {adminTab === 'verification' && (
              <AdminVerificationView 
                selectedId={selectedVerificationId} 
                onSelectId={handleSelectVerification} 
              />
            )}
            {adminTab === 'institutes' && <AdminInstitutesView />}
            {adminTab === 'employees' && <AdminEmployeesView />}
            {adminTab === 'import' && <AdminDataImportView />}
            {adminTab === 'audit' && <AdminAuditHistoryView />}
            {adminTab === 'settings' && <AdminSettingsView />}
          </main>
        </div>
      )}

      {/* Global Assessment Prototype Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-2.5 px-4 text-center text-[11px] text-slate-500 mb-14 lg:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
          <span className="font-semibold text-slate-400">
            FieldVerify Prototype <span className="text-slate-700">•</span> Frontend-only assessment build
          </span>
          <span className="text-slate-500">
            All demo data is stored locally in this browser.
          </span>
        </div>
      </footer>

      {/* Global Offline Indicator */}
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  // Initialize IndexedDB on startup
  useEffect(() => {
    initializeDatabase().catch((err) => {
      console.error('Failed to initialize local IndexedDB master data:', err);
    });
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <GpsProvider>
          <AppContent />
        </GpsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
