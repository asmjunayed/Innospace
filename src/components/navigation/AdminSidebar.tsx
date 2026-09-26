import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Building2, 
  Users, 
  UploadCloud, 
  History, 
  Settings,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export type AdminTab = 
  | 'dashboard'
  | 'verification'
  | 'institutes'
  | 'employees'
  | 'import'
  | 'audit'
  | 'settings';

interface Props {
  activeTab: AdminTab;
  onChangeTab: (tab: AdminTab) => void;
  pendingCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<Props> = ({
  activeTab,
  onChangeTab,
  pendingCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard' as AdminTab, label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'verification' as AdminTab, 
      label: 'Verification Queue', 
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold'
    },
    { id: 'institutes' as AdminTab, label: 'Institutes Master', icon: Building2 },
    { id: 'employees' as AdminTab, label: 'Employees Master', icon: Users },
    { id: 'import' as AdminTab, label: 'Data Import', icon: UploadCloud },
    { id: 'audit' as AdminTab, label: 'Audit History', icon: History },
    { id: 'settings' as AdminTab, label: 'Settings', icon: Settings },
  ];

  const content = (
    <div className="h-full flex flex-col justify-between p-4 bg-slate-950 border-r border-slate-800 text-slate-200">
      <div>
        {/* Verification Queue Highlight Box */}
        <div className="mb-5 p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Pending Exceptions</span>
            <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              {pendingCount} to verify
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 leading-snug">
            Field observations awaiting review before updating Master Data.
          </p>
        </div>

        {/* Nav Links */}
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChangeTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                ) : (
                  isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Trust & Verification Status Footer */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-tight">
            <span className="text-white font-medium">Trusted Storage</span>
            <div className="text-slate-500">IndexedDB Local Master</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 min-h-[calc(100vh-3.5rem)]">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs" 
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
