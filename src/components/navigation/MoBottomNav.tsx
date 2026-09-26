import React from 'react';
import { Home, CalendarCheck, Send, User } from 'lucide-react';

export type MoTab = 'home' | 'visits' | 'submissions' | 'profile';

interface Props {
  activeTab: MoTab;
  onChangeTab: (tab: MoTab) => void;
  pendingObservationsCount?: number;
}

export const MoBottomNav: React.FC<Props> = ({ 
  activeTab, 
  onChangeTab,
  pendingObservationsCount = 0 
}) => {
  const tabs = [
    { id: 'home' as MoTab, label: 'Home', icon: Home },
    { id: 'visits' as MoTab, label: 'Visits', icon: CalendarCheck },
    { 
      id: 'submissions' as MoTab, 
      label: 'Submissions', 
      icon: Send,
      badge: pendingObservationsCount > 0 ? pendingObservationsCount : undefined
    },
    { id: 'profile' as MoTab, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 lg:hidden safe-area-bottom">
      <div className="max-w-md mx-auto grid grid-cols-4 px-2 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`min-h-[52px] flex flex-col items-center justify-center py-1 relative rounded-xl transition-colors duration-150 ${
                isActive
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : 'stroke-2'}`} />
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center ring-2 ring-slate-950 font-mono">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight leading-none">{tab.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
