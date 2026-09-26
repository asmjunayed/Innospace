import React, { useState } from 'react';
import { 
  CalendarCheck, 
  MapPin, 
  Clock, 
  Plus, 
  Building2, 
  Send
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useVisits } from '../../hooks/useVisits';
import { useInstitutes } from '../../hooks/useInstitutes';
import { StatusBadge } from '../common/StatusBadge';

export const MoVisitsView: React.FC = () => {
  const { user } = useAuth();
  const { location, isDemoMode } = useGps();
  const { institutes } = useInstitutes();
  const { visits, startVisit, completeVisit } = useVisits(user?.email);

  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [selectedInstituteId, setSelectedInstituteId] = useState('');

  const handleCreateVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedInstituteId) return;

    try {
      await startVisit(
        selectedInstituteId,
        location.latitude,
        location.longitude,
        location.accuracy,
        user.name
      );
      setShowNewVisitModal(false);
    } catch (err) {
      console.error('Failed to create visit:', err);
    }
  };

  const handleFinish = async (visitId: string) => {
    if (!user) return;
    try {
      await completeVisit(
        visitId,
        location.latitude,
        location.longitude,
        location.accuracy,
        user.name
      );
    } catch (err) {
      console.error('Failed to submit visit:', err);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-emerald-400" />
            Field Visits Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical and ongoing visits conducted across educational institutions in Bangladesh.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (institutes.length > 0 && !selectedInstituteId) {
              setSelectedInstituteId(institutes[0].id);
            }
            setShowNewVisitModal(true);
          }}
          className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-950 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Field Visit</span>
        </button>
      </div>

      {/* Visits List */}
      <div className="space-y-3">
        {visits.map((visit) => {
          const institute = institutes.find((i) => i.id === visit.instituteId);
          return (
            <div
              key={visit.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    visit.status === 'in_progress' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {institute?.name || visit.instituteId}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-[11px] text-emerald-400">{visit.visitCode}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3" />
                        {new Date(visit.startedAt).toLocaleDateString()} {new Date(visit.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge 
                    status={visit.status === 'in_progress' ? 'pending' : 'approved'} 
                    labelOverride={visit.status.replace(/_/g, ' ')} 
                    size="sm" 
                  />

                  {visit.status === 'in_progress' && (
                    <button
                      type="button"
                      onClick={() => handleFinish(visit.id)}
                      className="py-1 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                    >
                      Complete & Submit
                    </button>
                  )}
                </div>
              </div>

              {/* GPS Metadata Strip */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-mono text-[11px]">
                    Lat: {visit.currentLatitude?.toFixed(4) ?? 'N/A'}, Lng: {visit.currentLongitude?.toFixed(4) ?? 'N/A'}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-[11px] text-slate-400">
                    Accuracy: ±{visit.currentAccuracy ?? 10}m
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  {institute?.area}, {institute?.district}
                </div>
              </div>
            </div>
          );
        })}

        {visits.length === 0 && (
          <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
            No visits logged yet. Click "New Field Visit" to begin your first institute inspection.
          </div>
        )}
      </div>

      {/* Start Visit Modal */}
      {showNewVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-1">Start New Field Visit</h2>
            <p className="text-xs text-slate-400 mb-4">
              Check in at an educational institute using current {isDemoMode ? 'Demo Location' : 'Device GPS'}.
            </p>

            <form onSubmit={handleCreateVisit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Institute Master
                </label>
                <select
                  value={selectedInstituteId}
                  onChange={(e) => setSelectedInstituteId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-emerald-500"
                >
                  {institutes.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.name} ({ins.area}, {ins.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">GPS Geo-Stamp:</span> Lat {location.latitude.toFixed(4)}, Lng {location.longitude.toFixed(4)} ({location.locationName})
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewVisitModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                >
                  Check In & Start
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
