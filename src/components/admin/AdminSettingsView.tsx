import React, { useState } from 'react';
import { 
  Settings, 
  Database, 
  MapPin, 
  RefreshCw, 
  ArrowLeftRight, 
  Sliders,
  CheckCircle2,
  Check,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useToast } from '../../context/ToastContext';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { initializeDatabase } from '../../db';

export const AdminSettingsView: React.FC = () => {
  const { switchRole } = useAuth();
  const { 
    isDemoMode, 
    toggleDemoMode, 
    selectedDemoKey, 
    selectDemoLocation, 
    demoPresets 
  } = useGps();

  const { settings, updateSettings, resetDefaults } = useAppSettings();
  const { showToast } = useToast();

  const [radiusInput, setRadiusInput] = useState(settings.locationSearchRadiusMeters.toString());
  const [thresholdInput, setThresholdInput] = useState(settings.locationVerificationThresholdMeters.toString());
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const handleSaveParameters = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const radius = parseInt(radiusInput, 10);
    const threshold = parseInt(thresholdInput, 10);

    if (isNaN(radius) || radius < 50 || radius > 50000) {
      setFormError('Location search radius must be between 50 and 50,000 meters.');
      return;
    }

    if (isNaN(threshold) || threshold < 10 || threshold > 1000) {
      setFormError('Location verification threshold must be between 10 and 1,000 meters.');
      return;
    }

    if (threshold >= radius) {
      setFormError('Verification threshold cannot be greater than or equal to the search radius.');
      return;
    }

    await updateSettings({
      locationSearchRadiusMeters: radius,
      locationVerificationThresholdMeters: threshold,
    });
    setSaveMessage('Product geofence parameters updated successfully!');
    showToast('Geofence parameters updated successfully', 'success');
    setTimeout(() => setSaveMessage(null), 3500);
  };

  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      await initializeDatabase(true);
      await resetDefaults();
      setRadiusInput('1000');
      setThresholdInput('100');
      setFormError(null);
      setSaveMessage('Demo master database successfully restored to factory seed state.');
      showToast('Demo data reset successfully', 'success');
      setShowResetConfirmModal(false);
    } catch (err: any) {
      console.error('Reset database failed:', err);
      showToast('Failed to reset demo database: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsResetting(false);
      setTimeout(() => setSaveMessage(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <Settings className="w-5 h-5 text-slate-400" />
          <h1 className="text-xl font-bold text-white">
            System & Product Settings
          </h1>
          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            FieldVerify Prototype
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            Frontend-only assessment build
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Configure geofence search radii, verification tolerances, demo GPS location presets, and local IndexedDB state. All demo data is stored locally in this browser.
        </p>
      </div>

      {saveMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Developer Demo GPS Location Control */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Demo GPS Location Preset</h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {isDemoMode ? 'Active Preset' : 'Real Hardware Live'}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Select a deterministic demo institute location to evaluate GPS matching from a desktop browser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {demoPresets.map((preset) => {
            const isSelected = isDemoMode && selectedDemoKey === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => selectDemoLocation(preset.key)}
                className={`p-3.5 rounded-xl border text-left transition flex items-start justify-between ${
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
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    Lat: {preset.latitude.toFixed(4)}, Lng: {preset.longitude.toFixed(4)}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
          <span className="text-slate-400">
            Current mode: <strong className="text-slate-200">{isDemoMode ? 'Demo GPS Mode' : 'Real Hardware GPS'}</strong>
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

      {/* Geofence & Verification Parameters Form */}
      <form onSubmit={handleSaveParameters} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-sky-400" />
          Configurable Geolocation Thresholds
        </h2>

        {formError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Location Search Radius (Meters)
            </label>
            <input
              type="number"
              min="50"
              max="50000"
              value={radiusInput}
              onChange={(e) => {
                setRadiusInput(e.target.value);
                setFormError(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Default: 1000m. Maximum radius within which nearby institutes are surfaced to the MO.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Location Verification Threshold (Meters)
            </label>
            <input
              type="number"
              min="10"
              max="1000"
              value={thresholdInput}
              onChange={(e) => {
                setThresholdInput(e.target.value);
                setFormError(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Default: 100m. Tolerance threshold to consider an MO physically present at an institute gate.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
          >
            Save Parameters
          </button>
        </div>
      </form>

      {/* Quick Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Switch Role */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Marketing Officer View</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Switch immediately to the Marketing Officer mobile-first experience to simulate field visits and record observations.
            </p>
          </div>

          <button
            type="button"
            onClick={switchRole}
            className="mt-5 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Switch to Marketing Officer View</span>
          </button>
        </div>

        {/* Master Database Reset */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Reset Demo Data</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Clear local IndexedDB tables and restore original seeded dataset with all 8 core entities and demo conflict records.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowResetConfirmModal(true)}
            disabled={isResetting}
            className="mt-5 w-full py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            <span>{isResetting ? 'Resetting Local Database...' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </div>

      {/* Prototype Assessment Footer */}
      <div className="pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-400">FieldVerify Prototype</div>
        <div>Frontend-only assessment build • All demo data is stored locally in this browser.</div>
      </div>

      {/* Confirmation Dialog for Resetting Demo Data */}
      <ConfirmationModal
        isOpen={showResetConfirmModal}
        title="Reset Demo Database?"
        description="This high-impact action will erase all pending observations, custom imports, visits, and relationship changes stored in your browser's IndexedDB, and restore the initial factory prototype seed data. This cannot be undone."
        confirmLabel="Yes, Reset Database"
        cancelLabel="Keep Current Data"
        variant="danger"
        isLoading={isResetting}
        onConfirm={handleConfirmReset}
        onClose={() => !isResetting && setShowResetConfirmModal(false)}
      />
    </div>
  );
};
