import React, { useState } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  LogOut, 
  ArrowLeftRight, 
  Laptop, 
  Smartphone,
  Menu,
  X,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';
import { GpsModal } from './GpsModal';

interface Props {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const Header: React.FC<Props> = ({ onToggleSidebar, sidebarOpen }) => {
  const { user, role, logout, switchRole } = useAuth();
  const { location, isDemoMode } = useGps();
  const { isOnline, isSimulatedOffline, toggleSimulateOffline } = useOnlineStatus();
  const [gpsModalOpen, setGpsModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Left Brand & Mobile Hamburger */}
          <div className="flex items-center gap-2">
            {role === 'admin' && onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Toggle navigation menu"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/30 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-bold text-sm tracking-tight text-white">FieldVerify</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Database className="w-2.5 h-2.5" />
                    FieldVerify Prototype
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 hidden md:inline leading-tight">
                  Frontend-only assessment build • All demo data is stored locally in this browser.
                </span>
              </div>
            </div>
          </div>

          {/* Center / Right Control Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Online / Offline Status Indicator */}
            <div 
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium border transition ${
                isOnline
                  ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                  : 'bg-amber-950/70 border-amber-600/80 text-amber-300 animate-pulse'
              }`}
              title={isOnline ? 'Online - Local data continues to work offline.' : 'Offline - Local data continues to work offline.'}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span className="font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Development / Demo Control: Simulate Offline */}
            <button
              type="button"
              onClick={toggleSimulateOffline}
              className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                isSimulatedOffline
                  ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              title="Toggle simulated offline state. Local data continues to work offline."
            >
              {isSimulatedOffline ? (
                <>
                  <WifiOff className="w-3 h-3 text-white" />
                  <span>Offline (Simulated)</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3 text-slate-400" />
                  <span>Simulate Offline</span>
                </>
              )}
            </button>

            {/* GPS Status Chip (Clickable to open GPS Modal) */}
            <button
              type="button"
              onClick={() => setGpsModalOpen(true)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/90 border border-slate-700/80 hover:bg-slate-700 text-slate-200 transition"
              title="Click to change Demo GPS location or toggle real GPS"
            >
              {isDemoMode ? (
                <Laptop className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="hidden xs:inline text-[11px] text-slate-400">
                {isDemoMode ? 'Demo GPS:' : 'Live GPS:'}
              </span>
              <span className="max-w-[70px] xs:max-w-[110px] sm:max-w-[140px] truncate text-[11px] font-semibold text-emerald-300">
                {location.locationName || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`}
              </span>
              <MapPin className="w-3 h-3 text-emerald-400 ml-0.5 shrink-0" />
            </button>

            {/* PWA Install Button */}
            <PWAInstallButton compact />

            {/* Role Switcher Pill */}
            {user && (
              <button
                type="button"
                onClick={switchRole}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition"
                title={`Switch role (Currently ${user.role === 'mo' ? 'Marketing Officer' : 'Admin'})`}
              >
                <ArrowLeftRight className="w-3 h-3 text-sky-400" />
                <span className="text-[11px]">
                  Role: <strong className="text-white uppercase">{user.role}</strong>
                </span>
              </button>
            )}

            {/* User Session Chip & Logout */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2 pl-1 border-l border-slate-800">
                <div className="flex flex-col text-right hidden md:flex leading-tight">
                  <span className="text-xs font-medium text-white">{user.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {user.role === 'mo' ? 'Marketing Officer' : 'Data Verifier'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Logout demo session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* GPS Configuration Modal */}
      <GpsModal isOpen={gpsModalOpen} onClose={() => setGpsModalOpen(false)} />
    </>
  );
};
