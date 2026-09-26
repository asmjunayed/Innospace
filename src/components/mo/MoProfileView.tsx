import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  ShieldCheck, 
  Database, 
  RefreshCw, 
  Smartphone, 
  Laptop, 
  ArrowLeftRight,
  LogOut,
  Sliders,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useInstitutes } from '../../hooks/useInstitutes';
import { useEmployees } from '../../hooks/useEmployees';
import { useVisits } from '../../hooks/useVisits';
import { useObservations } from '../../hooks/useObservations';
import { initializeDatabase } from '../../db';

export const MoProfileView: React.FC = () => {
  const { user, switchRole, logout } = useAuth();
  const { 
    isDemoMode, 
    toggleDemoMode, 
    location, 
    selectedDemoKey, 
    selectDemoLocation, 
    demoPresets 
  } = useGps();

  const { institutes, refreshInstitutes } = useInstitutes();
  const { employees, refreshEmployees } = useEmployees();
  const { visits, refreshVisits } = useVisits(user?.email);
  const { observations, refreshObservations } = useObservations();

  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    if (window.confirm('Reset local IndexedDB master data to initial factory state?')) {
      setIsResetting(true);
      await initializeDatabase(true);
      await Promise.all([
        refreshInstitutes(),
        refreshEmployees(),
        refreshVisits(),
        refreshObservations(),
      ]);
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Profile Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-2xl">
            {user?.name.charAt(0) || 'M'}
          </div>
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Marketing Officer
            </div>
            <h1 className="text-xl font-bold text-white">{user?.name}</h1>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-3 text-xs text-slate-300">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                Territory: {user?.region}
              </span>
              <span>•</span>
              <span>Emp Code: MO-DHK-409</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">Local Prototype Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Demo GPS Location Control */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Demo GPS Location Control</h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            Assessment Simulator
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Select a deterministic demo location to evaluate distance calculation, geofencing, and institute matching from a desktop browser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {demoPresets.map((preset) => {
            const isSelected = isDemoMode && selectedDemoKey === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => selectDemoLocation(preset.key)}
                className={`p-3 rounded-xl border text-left transition flex items-start justify-between ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500/80 text-white ring-1 ring-emerald-500/40'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    {preset.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{preset.description}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs">
          <span className="text-slate-400">
            Current GPS Source: <strong className="text-slate-200">{isDemoMode ? 'Demo Preset' : 'Real Hardware'}</strong>
          </span>
          <button
            type="button"
            onClick={() => toggleDemoMode()}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300"
          >
            Switch to {isDemoMode ? 'Real Device GPS' : 'Demo GPS Mode'}
          </button>
        </div>
      </div>

      {/* Local IndexedDB Storage Diagnostics */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Local Device Storage (IndexedDB)</h2>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            Offline Capable
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">Institutes Master</div>
            <div className="text-lg font-bold text-white mt-1">{institutes.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">Employees Master</div>
            <div className="text-lg font-bold text-white mt-1">{employees.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">Visits Logged</div>
            <div className="text-lg font-bold text-white mt-1">{visits.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-xs text-slate-400">Observations</div>
            <div className="text-lg font-bold text-white mt-1">{observations.length}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetData}
          disabled={isResetting}
          className="w-full py-2 px-3 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
          <span>Reset Master Data to Factory Seed</span>
        </button>
      </div>

      {/* Role Switch & Logout */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">Session Controls</h2>

        <button
          type="button"
          onClick={switchRole}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition"
        >
          <ArrowLeftRight className="w-4 h-4 text-sky-400" />
          <span>Switch to Admin / Verifier Role</span>
        </button>

        <button
          type="button"
          onClick={logout}
          className="w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 border border-rose-500/20 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Demo Session</span>
        </button>
      </div>
    </div>
  );
};
