import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Search, 
  Building2, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  Sliders,
  Play,
  Plus,
  RefreshCw,
  Laptop,
  Smartphone,
  Navigation
} from 'lucide-react';
import { useInstitutes } from '../../hooks/useInstitutes';
import { useGps } from '../../context/GpsContext';
import { useAppSettings } from '../../hooks/useAppSettings';
import { Institute } from '../../types';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';

interface Props {
  onSelectInstitute: (instituteId: string) => void;
  onBackToHome?: () => void;
  onNavigateToNewInstitute?: () => void;
}

export const MoDiscoverView: React.FC<Props> = ({ 
  onSelectInstitute, 
  onBackToHome,
  onNavigateToNewInstitute 
}) => {
  const { institutes } = useInstitutes();
  const { 
    location, 
    calculateDistanceMeters, 
    findNearestInstitute,
    isDemoMode, 
    selectedDemoKey,
    selectDemoLocation,
    demoPresets,
    toggleDemoMode,
    refreshRealGps,
    isLocating, 
    gpsError,
    gpsErrorCode,
    isPoorAccuracy
  } = useGps();
  const { settings } = useAppSettings();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [nearestInstituteInfo, setNearestInstituteInfo] = useState<{
    institute: Institute;
    distanceMeters: number;
  } | null>(null);

  // Compute nearest institute in registry for "Far from all known Institutes" state
  useEffect(() => {
    let isMounted = true;
    findNearestInstitute().then((res) => {
      if (isMounted) setNearestInstituteInfo(res);
    });
    return () => { isMounted = false; };
  }, [location.latitude, location.longitude, institutes]);

  // Compute nearby institutes with distances
  const institutesWithDistance = institutes
    .map((ins) => {
      let distanceMeters: number | null = null;
      let isWithinThreshold = false;

      if (ins.latitude !== null && ins.longitude !== null && location.latitude !== 0) {
        distanceMeters = calculateDistanceMeters(ins.latitude, ins.longitude);
        isWithinThreshold = distanceMeters <= settings.locationVerificationThresholdMeters;
      }

      return {
        ...ins,
        distanceMeters,
        isWithinThreshold,
      };
    })
    .sort((a, b) => {
      if (a.distanceMeters === null) return 1;
      if (b.distanceMeters === null) return -1;
      return a.distanceMeters - b.distanceMeters;
    });

  const filtered = institutesWithDistance.filter((ins) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = 
      !q ||
      ins.name.toLowerCase().includes(q) ||
      ins.instituteCode.toLowerCase().includes(q) ||
      ins.area.toLowerCase().includes(q) ||
      ins.address.toLowerCase().includes(q);

    const matchesType = filterType === 'ALL' || ins.type === filterType;
    return matchesSearch && matchesType;
  });

  const nearbyInstitutes = institutesWithDistance.filter(
    (i) => i.distanceMeters !== null && i.distanceMeters <= settings.locationSearchRadiusMeters
  );
  const nearbyCount = nearbyInstitutes.length;
  const isFarFromAll = nearbyCount === 0 && !searchTerm.trim();

  return (
    <div className="space-y-4 pb-8">
      {/* 1. TOP GPS STATUS & GEOFENCE STATUS BANNER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">
              Institute Discovery & Proximity Matcher
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
              isDemoMode 
                ? 'bg-amber-950/60 text-amber-300 border-amber-800' 
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
            }`}>
              {isDemoMode ? <Laptop className="w-3 h-3 text-amber-400" /> : <Smartphone className="w-3 h-3 text-emerald-400" />}
              <span>{isDemoMode ? 'Demo GPS Mode' : 'Live Hardware GPS'}</span>
            </span>
            {onNavigateToNewInstitute && (
              <button
                type="button"
                onClick={onNavigateToNewInstitute}
                className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Institute</span>
              </button>
            )}
          </div>
        </div>

        {/* Current Location Badge Strip */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {location.locationName || 'Current Field Location'}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                  isPoorAccuracy
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-slate-800 text-slate-300'
                }`}>
                  ±{location.accuracy}m accuracy
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Lat: {location.latitude.toFixed(5)}, Lng: {location.longitude.toFixed(5)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => refreshRealGps()}
              disabled={isLocating}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition"
              title="Refresh GPS Coordinates"
            >
              <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isLocating ? 'Locating...' : 'Refresh GPS'}</span>
            </button>
          </div>
        </div>

        {/* GPS CASE 7: DEMO GPS MODE ACTIVE QUICK SELECTOR */}
        {isDemoMode && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-amber-300">
              <Laptop className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Demo GPS Active:</strong> Simulated location allows desktop testing of geofences.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedDemoKey}
                onChange={(e) => selectDemoLocation(e.target.value)}
                className="bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-emerald-500 font-medium"
              >
                {demoPresets.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label} (±{p.accuracy}m)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* GPS CASE 1: PERMISSION DENIED BANNER */}
        {gpsErrorCode === 'PERMISSION_DENIED' && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>GPS Permission Denied:</strong> Browser blocked location access. Please allow permission or use Demo GPS mode.
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleDemoMode(true)}
              className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded-lg font-semibold shrink-0 transition"
            >
              Switch to Demo GPS
            </button>
          </div>
        )}

        {/* GPS CASE 2: GPS UNAVAILABLE / SENSOR TIMEOUT */}
        {gpsError && gpsErrorCode !== 'PERMISSION_DENIED' && (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/50 text-xs text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>GPS Unavailable:</strong> {gpsError}
              </span>
            </div>
            <button
              type="button"
              onClick={() => toggleDemoMode(true)}
              className="px-3 py-1 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-semibold shrink-0 transition"
            >
              Use Demo Location
            </button>
          </div>
        )}

        {/* GPS CASE 3: POOR GPS ACCURACY WARNING */}
        {isPoorAccuracy && !gpsError && (
          <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/40 text-xs text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Poor GPS Accuracy (±{location.accuracy}m):</strong> Satellite reception is degraded. Proximity matches may vary. Wait for sensor stabilization or move outside.
            </span>
          </div>
        )}
      </div>

      {/* GPS CASE 6: USER IS FAR FROM ALL KNOWN INSTITUTES */}
      {isFarFromAll && nearestInstituteInfo && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2.5">
          <div className="flex items-start gap-2.5">
            <Compass className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white text-sm">
                You are outside the normal institute search radius ({settings.locationSearchRadiusMeters}m)
              </div>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                Nearest known institute is <strong className="text-emerald-400">"{nearestInstituteInfo.institute.name}"</strong> located{' '}
                <span className="font-mono font-bold text-white">
                  {(nearestInstituteInfo.distanceMeters / 1000).toFixed(1)} km away
                </span>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
            {onNavigateToNewInstitute && (
              <button
                type="button"
                onClick={onNavigateToNewInstitute}
                className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Visiting an Unlisted Institute? Add It</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => selectDemoLocation('abc_model')}
              className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              Simulate Visit to ABC Model College
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-900 border border-slate-800 p-3 rounded-xl">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search institute name, code, area, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-emerald-500"
        >
          <option value="ALL">All Institute Types</option>
          <option value="College">College</option>
          <option value="School & College">School & College</option>
          <option value="University">University</option>
          <option value="Secondary High School">Secondary High School</option>
        </select>
      </div>

      {/* GPS CASE 5: MULTIPLE INSTITUTES NEARBY & DISAMBIGUATION LIST */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Institutes in Registry ({filtered.length})</span>
          <span className="font-mono text-emerald-400 font-semibold">
            {nearbyCount > 1 
              ? `${nearbyCount} institutes nearby (Multiple)`
              : nearbyCount === 1 
              ? '1 institute nearby' 
              : '0 nearby within radius'}
          </span>
        </div>

        {filtered.map((ins) => {
          const isNearby = ins.distanceMeters !== null && ins.distanceMeters <= settings.locationSearchRadiusMeters;
          const isAtLocation = ins.isWithinThreshold;

          return (
            <div
              key={ins.id}
              onClick={() => onSelectInstitute(ins.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isAtLocation
                  ? 'bg-emerald-950/25 border-emerald-500/70 hover:border-emerald-400 shadow-md shadow-emerald-950/30'
                  : isNearby
                  ? 'bg-slate-900 border-sky-500/40 hover:border-emerald-500/50'
                  : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 opacity-90'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  isAtLocation
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : isNearby
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  <Building2 className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{ins.name}</h3>
                    <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                      {ins.instituteCode}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {ins.type}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-1">
                    {ins.address} • <strong className="text-slate-200">{ins.area}, {ins.district}</strong>
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={ins.locationStatus} size="sm" />
                  </div>
                </div>
              </div>

              {/* Proximity Distance & Action */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                {ins.distanceMeters !== null ? (
                  <div className="text-left sm:text-right">
                    <span className={`text-xs font-bold font-mono ${
                      isAtLocation 
                        ? 'text-emerald-400' 
                        : isNearby 
                        ? 'text-sky-400' 
                        : 'text-slate-400'
                    }`}>
                      {ins.distanceMeters < 1000 
                        ? `${ins.distanceMeters} meters away` 
                        : `${(ins.distanceMeters / 1000).toFixed(1)} km away`}
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {isAtLocation ? 'Within 100m gate zone' : isNearby ? 'In 1km vicinity' : 'Outside radius'}
                    </div>
                  </div>
                ) : (
                  <span className="text-[11px] text-rose-400 italic">No GPS on file</span>
                )}

                <button
                  type="button"
                  className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                >
                  <span>Select Institute</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* GPS CASE 4: NO NEARBY INSTITUTES EMPTY STATE */}
        {filtered.length === 0 ? (
          <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
            <Building2 className="w-8 h-8 text-slate-500 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-white">No nearby Institutes found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm 
                  ? `No institutes match your search term "${searchTerm}".`
                  : 'No registered educational institutes located near your current GPS position.'}
              </p>
            </div>
            {onNavigateToNewInstitute && (
              <button
                type="button"
                onClick={onNavigateToNewInstitute}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-emerald-950 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Institute</span>
              </button>
            )}
          </div>
        ) : (
          /* "None of these" Entry Point */
          onNavigateToNewInstitute && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-dashed border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-white">Can't find the Institute you're visiting?</span>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  If the institution is not in the list above, select "None of these" to report an unlisted facility.
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToNewInstitute}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-semibold border border-slate-700 shrink-0 flex items-center gap-1.5 transition"
              >
                <span>None of these</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};
