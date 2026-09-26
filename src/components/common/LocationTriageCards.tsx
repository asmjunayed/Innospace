import React from 'react';
import { 
  Navigation, 
  Building2, 
  Compass, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Database,
  Smartphone,
  Laptop
} from 'lucide-react';
import { StatusBadge, ProvenanceBadge } from './StatusBadge';

interface CurrentGpsInfo {
  latitude: number;
  longitude: number;
  accuracy: number;
  locationName?: string;
  isDemo?: boolean;
  isPoorAccuracy?: boolean;
}

interface StoredLocationInfo {
  latitude: number | null;
  longitude: number | null;
  locationStatus: string;
  dataSource?: string;
  address?: string;
}

interface LocationTriageCardsProps {
  currentGps: CurrentGpsInfo;
  storedLocation: StoredLocationInfo;
  distanceMeters: number | null;
  thresholdMeters: number;
  isConsistent: boolean;
  className?: string;
}

/**
 * MO Flow Location Triage:
 * Presents Current GPS, Stored Institute Location, and Distance
 * with immediate clarity on both mobile and desktop screens.
 */
export const LocationTriageCards: React.FC<LocationTriageCardsProps> = ({
  currentGps,
  storedLocation,
  distanceMeters,
  thresholdMeters,
  isConsistent,
  className = ''
}) => {
  const hasGps = currentGps.latitude !== 0 && currentGps.longitude !== 0;
  const hasStored = storedLocation.latitude !== null && storedLocation.longitude !== null;

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* 3 High-Visibility Triage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* CARD 1: CURRENT GPS */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                Current GPS (On-Site)
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                currentGps.isDemo 
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800' 
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
              }`}>
                {currentGps.isDemo ? <Laptop className="w-2.5 h-2.5 text-amber-400" /> : <Smartphone className="w-2.5 h-2.5 text-emerald-400" />}
                <span>{currentGps.isDemo ? 'Demo Mode' : 'Hardware GPS'}</span>
              </span>
            </div>

            {hasGps ? (
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Lat:</span>
                  <span className="font-bold text-emerald-300 tabular-nums">
                    {currentGps.latitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Lng:</span>
                  <span className="font-bold text-emerald-300 tabular-nums">
                    {currentGps.longitude.toFixed(6)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-amber-400 italic py-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Acquiring satellite lock...</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className={`font-mono ${currentGps.isPoorAccuracy ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
              Accuracy: ±{currentGps.accuracy}m
            </span>
            <span className="truncate max-w-[120px] text-slate-300 text-[10px]">
              {currentGps.locationName || 'Field Position'}
            </span>
          </div>
        </div>

        {/* CARD 2: STORED INSTITUTE LOCATION */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                Stored Master Location
              </span>
              <StatusBadge status={storedLocation.locationStatus} size="sm" />
            </div>

            {hasStored ? (
              <div className="space-y-1 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Lat:</span>
                  <span className="font-bold text-sky-300 tabular-nums">
                    {storedLocation.latitude!.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Lng:</span>
                  <span className="font-bold text-sky-300 tabular-nums">
                    {storedLocation.longitude!.toFixed(6)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-rose-400 py-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>No coordinates pinned in database.</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">
              Source: <strong className="text-slate-300 font-normal">{storedLocation.dataSource ? storedLocation.dataSource.replace(/_/g, ' ') : 'Database'}</strong>
            </span>
            {!hasStored && (
              <span className="text-rose-400 font-bold uppercase text-[10px]">Capture Required</span>
            )}
          </div>
        </div>

        {/* CARD 3: DISTANCE & GEOFENCE STATUS */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between shadow-2xs ${
          !hasStored
            ? 'bg-rose-950/20 border-rose-500/40'
            : isConsistent
            ? 'bg-emerald-950/25 border-emerald-500/50'
            : 'bg-amber-950/25 border-amber-500/50'
        }`}>
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                Calculated Distance
              </span>
              {hasGps && hasStored && (
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                  isConsistent
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {isConsistent ? 'In-Geofence' : 'Location Drift'}
                </span>
              )}
            </div>

            {hasGps && hasStored && distanceMeters !== null ? (
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-extrabold font-mono tabular-nums ${
                    isConsistent ? 'text-emerald-300' : 'text-amber-300'
                  }`}>
                    {distanceMeters}m
                  </span>
                  <span className="text-xs text-slate-300 font-medium">from stored gate</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {isConsistent
                    ? `Within tolerance (gate threshold ±${thresholdMeters}m)`
                    : `Exceeds gate threshold (±${thresholdMeters}m) by ${distanceMeters - thresholdMeters}m`}
                </div>
              </div>
            ) : !hasStored ? (
              <div className="py-1">
                <span className="text-sm font-bold text-rose-300">Coordinates Missing</span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Pin current GPS coordinates to establish master location.
                </p>
              </div>
            ) : (
              <div className="py-1">
                <span className="text-xs text-amber-400 italic">Waiting for GPS fix...</span>
              </div>
            )}
          </div>

          {/* Tolerance progress gauge */}
          {hasGps && hasStored && distanceMeters !== null && (
            <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1">
              <div className="relative w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isConsistent ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, (distanceMeters / Math.max(250, distanceMeters * 1.2)) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>0m</span>
                <span className="text-slate-300">Limit: {thresholdMeters}m</span>
                <span>{distanceMeters}m</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
