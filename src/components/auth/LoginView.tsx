import React, { useState } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  CheckCircle2, 
  Users, 
  Building2, 
  ArrowRight, 
  Sparkles,
  Database,
  WifiOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';

export const LoginView: React.FC = () => {
  const { loginAs } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>('mo');

  const handleLogin = (roleToLogin: Role) => {
    loginAs(roleToLogin);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="max-w-4xl mx-auto w-full pt-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/40">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              FieldVerify
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Local Prototype
              </span>
            </h1>
            <p className="text-xs text-slate-400">Turn every field visit into better data.</p>
          </div>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-xl mx-auto w-full my-auto py-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-medium border border-slate-700/60 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Product Manager Assessment Prototype
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Select Demo Role to Continue
            </h2>
            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
              Experience the dual-sided workflow between field Marketing Officers and central Master Data Verifiers.
            </p>
          </div>

          {/* Role Cards */}
          <div className="space-y-3.5 mb-6">
            {/* Marketing Officer Card */}
            <div
              onClick={() => setSelectedRole('mo')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                selectedRole === 'mo'
                  ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Marketing Officer (Field App)</span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900">
                    mo@fieldverify.demo
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Mobile-optimized for visiting educational institutes in Bangladesh. Check in via GPS, confirm locations, validate employee rosters, record field observations.
                </p>
                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-300 font-medium">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mobile UI
                  </span>
                  <span>•</span>
                  <span>GPS Check-in</span>
                  <span>•</span>
                  <span>Observations Queue</span>
                </div>
              </div>
            </div>

            {/* Admin / Verifier Card */}
            <div
              onClick={() => setSelectedRole('admin')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3.5 ${
                selectedRole === 'admin'
                  ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/30'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Admin / Data Verifier (HQ)</span>
                  <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-900">
                    admin@fieldverify.demo
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Desktop-optimized operations center. Review incoming field exceptions, compare proposed vs master data, approve or reject updates, maintain audit trails.
                </p>
                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-300 font-medium">
                  <span className="flex items-center gap-1 text-sky-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Desktop UI
                  </span>
                  <span>•</span>
                  <span>Verification Workflow</span>
                  <span>•</span>
                  <span>Audit Logs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => handleLogin(selectedRole)}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-sm font-semibold shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition"
          >
            <span>Enter as {selectedRole === 'mo' ? 'Marketing Officer' : 'Master Data Admin'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Key Product Principle Note */}
          <div className="mt-5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed flex items-start gap-2.5">
            <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Core Principle:</strong> Field observations do not automatically overwrite Master Data. All field findings pass through an explicit Verification step before updating trusted records.
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-4xl mx-auto w-full pb-4 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-4">
        <span className="flex items-center gap-1 text-emerald-400">
          <Database className="w-3.5 h-3.5" /> 100% Local IndexedDB
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 text-amber-400">
          <WifiOff className="w-3.5 h-3.5" /> Offline-Capable PWA
        </span>
        <span>•</span>
        <span>Simulated & Real GPS</span>
        <span>•</span>
        <span>No External Backend Required</span>
      </div>
    </div>
  );
};
