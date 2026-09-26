import React, { useState } from 'react';
import { 
  Compass, 
  MapPin, 
  Check, 
  RefreshCw, 
  X, 
  Laptop, 
  Smartphone,
  Navigation,
  AlertCircle
} from 'lucide-react';
import { useGps } from '../../context/GpsContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GpsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { 
    location, 
    isDemoMode, 
    selectedDemoKey, 
    demoPresets, 
    toggleDemoMode, 
    selectDemoLocation, 
    refreshRealGps, 
    isLocating, 
    gpsError 
  } = useGps();

  const [customLat, setCustomLat] = useState<string>(location.latitude.toString());
  const [customLng, setCustomLng] = useState<string>(location.longitude.toString());
  const { setCustomCoordinates } = useGps();

  if (!isOpen) return null;

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lngNum = parseFloat(customLng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      setCustomCoordinates(latNum, lngNum, 'Manual Custom Coordinates');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">GPS Location Controller</h2>
              <p className="text-xs text-slate-400">
                Browser Geolocation Service & Deterministic Demo Presets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Mode Selector Toggle */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/70">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              GPS Operating Mode
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleDemoMode(true)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium border transition ${
                  isDemoMode
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>Demo GPS Mode</span>
                {isDemoMode && <Check className="w-3.5 h-3.5 ml-1" />}
              </button>
              <button
                type="button"
                onClick={() => toggleDemoMode(false)}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium border transition ${
                  !isDemoMode
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Real Device GPS</span>
                {!isDemoMode && <Check className="w-3.5 h-3.5 ml-1" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              {isDemoMode 
                ? 'Desktop-friendly: Simulates field location coordinates without requiring physical presence at an institute.' 
                : 'Using HTML5 Browser Geolocation API from your actual device hardware.'}
            </p>
          </div>

          {/* Current Live Coordinates Card */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                Active Coordinates
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {isDemoMode ? 'Simulated Preset' : 'Hardware Live'}
              </span>
            </div>
            <div className="text-sm font-semibold text-white mb-1">
              {location.locationName || 'Unknown Location'}
            </div>
            <div className="font-mono text-xs text-slate-300 flex items-center gap-4">
              <span>Lat: {location.latitude.toFixed(6)}</span>
              <span>Lng: {location.longitude.toFixed(6)}</span>
              <span>Acc: ±{location.accuracy}m</span>
            </div>

            {!isDemoMode && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                {gpsError ? (
                  <span className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {gpsError}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Position updated</span>
                )}
                <button
                  type="button"
                  onClick={() => refreshRealGps()}
                  disabled={isLocating}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2 py-1 rounded bg-slate-900 border border-slate-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  {isLocating ? 'Acquiring...' : 'Refresh Position'}
                </button>
              </div>
            )}
          </div>

          {/* Demo Location Presets (Only when in demo mode) */}
          {isDemoMode && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Select Demo GPS Location
              </div>
              <div className="space-y-2">
                {demoPresets.map((preset) => {
                  const isSelected = selectedDemoKey === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => selectDemoLocation(preset.key)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-start justify-between ${
                        isSelected
                          ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                          : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-semibold">{preset.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{preset.description}</div>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                        {preset.latitude.toFixed(4)}, {preset.longitude.toFixed(4)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Lat/Lng Form */}
              <form onSubmit={handleApplyCustom} className="mt-4 pt-4 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-400 mb-2">
                  Or enter custom latitude & longitude:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (e.g. 23.7465)"
                    value={customLat}
                    onChange={(e) => setCustomLat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-emerald-500 font-mono"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (e.g. 90.3762)"
                    value={customLng}
                    onChange={(e) => setCustomLng(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-emerald-500 font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 w-full py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                >
                  Apply Custom Coordinates
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
