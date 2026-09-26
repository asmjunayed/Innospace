import React, { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Compass, 
  ChevronRight,
  ShieldCheck,
  MapPin,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { Institute } from '../../types';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useInstitutes } from '../../hooks/useInstitutes';
import { useVisits } from '../../hooks/useVisits';
import { useObservations } from '../../hooks/useObservations';
import { useAppSettings } from '../../hooks/useAppSettings';

interface Props {
  onNavigateToVisits: () => void;
  onNavigateToSubmissions: () => void;
  onNavigateToDiscover?: () => void;
  onSelectInstitute?: (instituteId: string) => void;
  onNavigateToReview?: () => void;
}

export const MoHomeView: React.FC<Props> = ({ 
  onNavigateToVisits, 
  onNavigateToSubmissions,
  onNavigateToDiscover,
  onSelectInstitute,
  onNavigateToReview
}) => {
  const { user } = useAuth();
  const { location, calculateDistanceMeters, isDemoMode } = useGps();
  const { institutes } = useInstitutes();
  const { visits, activeVisit, startVisit, completeVisit } = useVisits(user?.email);
  const { observations, pendingCount } = useObservations();
  const { settings } = useAppSettings();

  const [startingVisitId, setStartingVisitId] = useState<string | null>(null);

  // Compute nearby institutes with distances using repositories
  const institutesWithDistance = institutes
    .filter((ins) => ins.latitude !== null && ins.longitude !== null)
    .map((ins) => {
      const distanceMeters = calculateDistanceMeters(ins.latitude!, ins.longitude!);
      return {
        ...ins,
        distanceMeters,
        isWithinThreshold: distanceMeters <= settings.locationVerificationThresholdMeters,
      };
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  const nearest = institutesWithDistance[0];
  const isNearNearest = nearest && nearest.distanceMeters <= settings.locationSearchRadiusMeters;

  const handleStartVisit = async (institute: Institute) => {
    if (!user) return;
    setStartingVisitId(institute.id);
    try {
      await startVisit(
        institute.id, 
        location.latitude, 
        location.longitude, 
        location.accuracy,
        user.name
      );
    } catch (err) {
      console.error('Failed to start visit:', err);
    } finally {
      setStartingVisitId(null);
    }
  };

  const handleEndVisit = async () => {
    if (!activeVisit || !user) return;
    try {
      await completeVisit(
        activeVisit.id, 
        location.latitude, 
        location.longitude, 
        location.accuracy,
        user.name
      );
    } catch (err) {
      console.error('Failed to complete visit:', err);
    }
  };

  const activeVisitInstitute = activeVisit 
    ? institutes.find((i) => i.id === activeVisit.instituteId) 
    : null;

  return (
    <div className="space-y-5 pb-8">
      {/* Welcome Banner - Clean enterprise styling without gradients */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Marketing Officer Field App
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">{user?.region} Territory</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Welcome back, {user?.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Turn physical field visits into trusted master records. Validate location geofences, verify faculty rosters, and submit on-site observations.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
            <span className="text-[11px] text-slate-400">Persistence Store:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              IndexedDB Active
            </span>
          </div>
        </div>
      </div>

      {/* Active Visit Alert Banner */}
      {activeVisit && (
        <div className="bg-emerald-950/50 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 animate-pulse mt-0.5">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Active Visit In Progress
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {activeVisitInstitute?.name || activeVisit.instituteId}
                </h3>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Started: {new Date(activeVisit.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>•</span>
                  <span>Code: {activeVisit.visitCode}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onNavigateToReview && (
                <button
                  type="button"
                  onClick={onNavigateToReview}
                  className="py-2 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm shadow-emerald-950 transition flex items-center gap-1.5"
                >
                  <span>Review & Submit</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleEndVisit}
                className="py-2 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition"
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS Geo-Fence & Nearest Institute Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">GPS Proximity Matcher</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {isDemoMode ? 'Demo Location' : 'Real Hardware GPS'} (Radius: {settings.locationSearchRadiusMeters}m)
          </span>
        </div>

        {nearest ? (
          <div className={`p-4 rounded-xl border transition ${
            isNearNearest 
              ? 'bg-emerald-950/20 border-emerald-500/40' 
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    nearest.isWithinThreshold
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : isNearNearest
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {nearest.isWithinThreshold 
                      ? 'At Institute (<100m)' 
                      : isNearNearest 
                      ? 'Nearby in Vicinity' 
                      : 'Outside Direct Radius'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {nearest.distanceMeters < 1000 
                      ? `${nearest.distanceMeters}m away` 
                      : `${(nearest.distanceMeters / 1000).toFixed(1)} km away`}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {nearest.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {nearest.address} • {nearest.area}, {nearest.district}
                </p>
              </div>

              {!activeVisit && (
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectInstitute) {
                      onSelectInstitute(nearest.id);
                    } else {
                      handleStartVisit(nearest);
                    }
                  }}
                  disabled={startingVisitId === nearest.id}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Field Visit</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-3 text-center">
            Loading nearest institutes...
          </div>
        )}
      </div>

      {/* Quick Action & Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div 
          onClick={onNavigateToVisits}
          className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">My Visits</span>
            <ChevronRight className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white">{visits.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Logged in territory</div>
        </div>

        <div 
          onClick={onNavigateToSubmissions}
          className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pending Verifications</span>
            <ChevronRight className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting admin sign-off</div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Verified Coordinates</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {institutes.length > 0 
              ? `${Math.round((institutes.filter((i) => i.locationStatus === 'verified').length / institutes.length) * 100)}%` 
              : '0%'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Verified institute locations</div>
        </div>
      </div>

      {/* Educational Institutes in Territory List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Institutes in Proximity</h2>
            <p className="text-xs text-slate-400">Sorted by distance from current GPS position</p>
          </div>
          {onNavigateToDiscover ? (
            <button
              type="button"
              onClick={onNavigateToDiscover}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Discover All</span>
              <Compass className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="text-xs text-slate-400 font-mono">
              {institutesWithDistance.length} reachable
            </span>
          )}
        </div>

        <div className="space-y-2.5">
          {institutesWithDistance.slice(0, 5).map((ins) => (
            <div
              key={ins.id}
              onClick={() => onSelectInstitute && onSelectInstitute(ins.id)}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition flex items-center justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                  ins.locationStatus === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : ins.locationStatus === 'imported'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{ins.name}</span>
                    <StatusBadge status={ins.locationStatus} size="sm" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {ins.address} • {ins.area}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-mono text-slate-400">
                  {ins.distanceMeters < 1000 
                    ? `${ins.distanceMeters}m` 
                    : `${(ins.distanceMeters / 1000).toFixed(1)}km`}
                </span>
                {!activeVisit && (
                  <button
                    type="button"
                    onClick={() => handleStartVisit(ins)}
                    className="block mt-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                  >
                    Start Visit →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
