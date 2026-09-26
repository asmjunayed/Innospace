import React, { useState } from 'react';
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  HelpCircle,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Eye,
  X,
  ShieldCheck,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useVisits } from '../../hooks/useVisits';
import { useObservations } from '../../hooks/useObservations';
import { useInstitutes } from '../../hooks/useInstitutes';
import { Visit, FieldObservation } from '../../types';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';

export const MoSubmissionsView: React.FC = () => {
  const { user } = useAuth();
  const { location } = useGps();
  const { visits } = useVisits(user?.email);
  const { observations } = useObservations();
  const { institutes } = useInstitutes();

  // Tab: 'visits' vs 'observations'
  const [subTab, setSubTab] = useState<'visits' | 'observations'>('visits');
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  // Helper to get Institute by ID
  const getInstitute = (instId: string) => {
    return institutes.find((i) => i.id === instId);
  };

  // Filter submitted visits (or all visits for this MO)
  const submittedVisits = visits.filter((v) => v.status === 'submitted');

  // Observations for selected visit modal
  const selectedVisitObs = selectedVisit
    ? observations.filter((o) => o.visitId === selectedVisit.id)
    : [];

  // Helper for human-readable observation summary
  const formatObservationSummary = (obs: FieldObservation) => {
    const prop = obs.proposedValue || {};
    if (obs.entityType === 'institute_location') {
      if (obs.actionType === 'confirm') {
        return `Confirmed existing master coordinates (${obs.latitude?.toFixed(5)}, ${obs.longitude?.toFixed(5)})`;
      }
      return `Proposed new field coordinates (${obs.latitude?.toFixed(5)}, ${obs.longitude?.toFixed(5)})${
        prop.discrepancyMeters !== undefined ? ` • ${prop.discrepancyMeters}m drift` : ''
      }`;
    }
    if (obs.entityType === 'employee_relationship') {
      if (obs.actionType === 'confirm') {
        return 'Confirmed faculty presence on-site on institutional roster';
      }
      return `Proposed transfer to ${prop.instituteName || 'new institute'}${
        prop.transferReason ? ` • ${prop.transferReason}` : ''
      }`;
    }
    if (obs.entityType === 'new_employee') {
      return `New Faculty: ${prop.name || 'Staff'} (${prop.designation || 'Lecturer'})${
        prop.phone ? ` • Tel: ${prop.phone}` : ''
      }`;
    }
    if (obs.entityType === 'new_institute') {
      return `New Institute: ${prop.name} (${prop.type || 'College'}) • ${prop.area}, ${prop.district}`;
    }
    if (obs.entityType === 'institute_information') {
      return `Correction on ${prop.reportedField || 'info'}: "${prop.correctionNote || 'Note'}"`;
    }
    return JSON.stringify(prop);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Audit Registry
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Field Submissions</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              My Submissions
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Review completed field visits and tracked observations submitted into the verification queue.
            </p>
          </div>

          <div className="self-start sm:self-center flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setSubTab('visits')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                subTab === 'visits'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Submitted Visits ({submittedVisits.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('observations')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                subTab === 'observations'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Observations ({observations.length})
            </button>
          </div>
        </div>

        {/* Local Storage Indicator Banner */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-slate-200">Saved locally:</strong> Stored in this prototype via IndexedDB. Admin verifiers evaluate observations on the same local database.
            </span>
          </div>
          <span className="font-mono text-emerald-400 font-semibold shrink-0">
            Local Master
          </span>
        </div>
      </div>

      {/* SUBMITTED VISITS LIST */}
      {subTab === 'visits' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Completed Field Visits ({submittedVisits.length})</span>
            <span>Sorted by Completion Date</span>
          </div>

          {submittedVisits.map((visit) => {
            const inst = getInstitute(visit.instituteId);
            const visitObs = observations.filter((o) => o.visitId === visit.id);
            const routineCount = visitObs.filter((o) => o.verificationStatus === 'routine').length;
            const pendingCount = visitObs.filter((o) => o.verificationStatus === 'pending').length;

            return (
              <div
                key={visit.id}
                onClick={() => setSelectedVisit(visit)}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                    <Building2 className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        {inst?.name || 'Candidate Institution'}
                      </h3>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        {visit.visitCode}
                      </span>
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {visit.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                      <span>{inst?.area || 'Field Area'}, {inst?.district || 'Dhaka'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(visit.completedAt || visit.startedAt).toLocaleDateString()} at {new Date(visit.completedAt || visit.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Overall Summary Line */}
                    <div className="mt-2 text-xs text-slate-300">
                      <span className="font-semibold text-white">{visitObs.length} observations recorded:</span>{' '}
                      <span className="text-emerald-400">{routineCount} routine confirmations</span>,{' '}
                      <span className="text-amber-400">{pendingCount} pending verification</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  {pendingCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-900">
                      <Clock className="w-3 h-3" />
                      {pendingCount} Pending Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-900">
                      <CheckCircle2 className="w-3 h-3" />
                      All Routine
                    </span>
                  )}

                  <button
                    type="button"
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {submittedVisits.length === 0 && (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
              <FileCheck className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="font-semibold text-white">No submitted visits yet</div>
              <p className="max-w-xs mx-auto">
                Completed field visits will appear here after clicking "Submit Visit" on the review screen.
              </p>
            </div>
          )}
        </div>
      )}

      {/* INDIVIDUAL OBSERVATIONS FEED */}
      {subTab === 'observations' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>All Field Observations ({observations.length})</span>
            <span>Recorded in IndexedDB</span>
          </div>

          {observations.map((obs) => {
            const inst = institutes.find((i) => i.id === obs.entityId);
            return (
              <div
                key={obs.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold">{obs.observationCode}</span>
                    <span className="font-mono text-[10px] text-slate-400 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {obs.entityType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-white font-medium">{inst?.name || 'Entity Field Observation'}</span>
                  </div>

                  <StatusBadge status={obs.verificationStatus} size="sm" />
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs">
                  <div className="font-semibold text-emerald-300">
                    {formatObservationSummary(obs)}
                  </div>
                  {obs.proposedValue && (
                    <details className="mt-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-500">
                      <summary className="cursor-pointer hover:text-slate-400 font-mono">
                        View Payload JSON
                      </summary>
                      <pre className="mt-1 p-2 rounded bg-slate-900 font-mono text-[10px] text-slate-400 overflow-x-auto">
                        {JSON.stringify(obs.proposedValue, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                {obs.evidence && (
                  <div className="text-slate-400 text-[11px] italic">
                    Evidence: "{obs.evidence}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VISIT INSPECTION MODAL */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-emerald-400 font-bold">
                  {selectedVisit.visitCode}
                </span>
                <h3 className="text-base font-bold text-white mt-0.5">
                  {getInstitute(selectedVisit.instituteId)?.name || 'Field Visit Record'}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Completed on {new Date(selectedVisit.completedAt || selectedVisit.startedAt).toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedVisit(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: List of observations */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              <div className="font-bold uppercase tracking-wider text-slate-400 text-[11px]">
                Observations Captured in this Visit ({selectedVisitObs.length})
              </div>

              {selectedVisitObs.map((obs) => (
                <div
                  key={obs.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold">{obs.observationCode}</span>
                      <span className="font-mono text-[10px] text-slate-400 uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {obs.entityType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <StatusBadge status={obs.verificationStatus} size="sm" />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200">
                    <div className="font-semibold text-emerald-300">
                      {formatObservationSummary(obs)}
                    </div>
                    {obs.proposedValue && (
                      <details className="mt-2 pt-1 border-t border-slate-800/80 text-[10px] text-slate-500">
                        <summary className="cursor-pointer hover:text-slate-400 font-mono">
                          View Payload JSON
                        </summary>
                        <pre className="mt-1 p-2 rounded bg-slate-950 font-mono text-[10px] text-slate-400 overflow-x-auto">
                          {JSON.stringify(obs.proposedValue, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  {obs.evidence && (
                    <div className="text-slate-400 text-[11px] italic">
                      Note: "{obs.evidence}"
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/80">
                    Captured at Lat {obs.latitude?.toFixed(5) ?? 'N/A'}, Lng {obs.longitude?.toFixed(5) ?? 'N/A'} (±{obs.accuracy ?? 10}m)
                  </div>
                </div>
              ))}

              {selectedVisitObs.length === 0 && (
                <div className="text-center py-8 text-slate-500 italic">
                  No individual observations attached to this visit.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
              <span className="text-[11px] text-slate-500">Stored locally in IndexedDB</span>
              <button
                type="button"
                onClick={() => setSelectedVisit(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
