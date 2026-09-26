import React from 'react';
import { 
  Building2, 
  Users, 
  CheckSquare, 
  TrendingUp,
  Clock,
  ArrowRight,
  Database,
  ShieldCheck
} from 'lucide-react';
import { useInstitutes } from '../../hooks/useInstitutes';
import { useEmployees } from '../../hooks/useEmployees';
import { useObservations } from '../../hooks/useObservations';
import { useAuditEvents } from '../../hooks/useAuditEvents';
import { AdminTab } from '../navigation/AdminSidebar';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';

interface Props {
  onNavigateTab: (tab: AdminTab) => void;
}

export const AdminDashboardView: React.FC<Props> = ({ onNavigateTab }) => {
  const { institutes } = useInstitutes();
  const { employees } = useEmployees();
  const { observations, pendingCount } = useObservations();
  const { auditEvents } = useAuditEvents(5);

  const verifiedInstitutes = institutes.filter((i) => i.locationStatus === 'verified');
  const verifiedEmployees = employees.filter((e) => e.relationshipStatus === 'verified');
  const instituteQualityScore = institutes.length > 0
    ? Math.round((verifiedInstitutes.length / institutes.length) * 100)
    : 0;

  // Exact calculations from IndexedDB state
  const pendingObservations = observations.filter((o) => o.verificationStatus === 'pending');
  const pendingVerificationCount = pendingObservations.length;
  const locationIssuesCount = observations.filter(
    (o) => o.entityType === 'institute_location' && (o.verificationStatus === 'pending' || o.actionType === 'update' || o.actionType === 'report_issue')
  ).length;
  const employeeMappingIssuesCount = observations.filter(
    (o) => o.entityType === 'employee_relationship' && (o.verificationStatus === 'pending' || o.actionType === 'update' || o.actionType === 'report_issue')
  ).length;
  const newEmployeesCount = observations.filter(
    (o) => o.entityType === 'new_employee' && (o.verificationStatus === 'pending' || o.actionType === 'create')
  ).length;
  const newInstitutesCount = observations.filter(
    (o) => o.entityType === 'new_institute' && (o.verificationStatus === 'pending' || o.actionType === 'create')
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner - Clean enterprise styling */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Operations & Data Governance
              </span>
              <span className="text-slate-600">•</span>
              <ProvenanceBadge type="master" size="sm" />
              <span className="text-slate-600">•</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-400 border border-slate-800">
                IndexedDB Persistence
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">Admin Dashboard</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Turn regular Marketing Officer field visits into a continuous data quality engine. 
              Review field observations, validate exceptions, and promote verified findings into trusted Master Data.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('verification')}
            className="self-start md:self-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-md transition"
          >
            <span>Review Queue ({pendingVerificationCount})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* HIGH-LEVEL DATA SUMMARY (IndexedDB Calculated) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              High-Level Master Registry & Exception Metrics
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Live calculated aggregations from local IndexedDB repositories.
            </p>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
            Real-time Sync
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Institutes */}
          <div 
            onClick={() => onNavigateTab('institutes')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition text-left"
          >
            <span className="text-[11px] font-semibold text-slate-400 block truncate">Institutes</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {institutes.length.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 block mt-0.5 truncate">
              {verifiedInstitutes.length} verified GPS
            </span>
          </div>

          {/* Employees */}
          <div 
            onClick={() => onNavigateTab('employees')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition text-left"
          >
            <span className="text-[11px] font-semibold text-slate-400 block truncate">Employees</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {employees.length.toLocaleString()}
            </div>
            <span className="text-[10px] text-sky-400 block mt-0.5 truncate">
              {verifiedEmployees.length} verified roster
            </span>
          </div>

          {/* Pending Verification */}
          <div 
            onClick={() => onNavigateTab('verification')}
            className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 hover:border-amber-400 cursor-pointer transition text-left"
          >
            <span className="text-[11px] font-semibold text-amber-300 block truncate">Pending Verification</span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1 font-mono">
              {pendingVerificationCount.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-400 block mt-0.5 truncate">
              Action Required
            </span>
          </div>

          {/* Location Issues */}
          <div 
            onClick={() => onNavigateTab('verification')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition text-left"
          >
            <span className="text-[11px] font-semibold text-slate-400 block truncate">Location Issues</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {locationIssuesCount}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              GPS mismatches
            </span>
          </div>

          {/* Employee Mapping Issues */}
          <div 
            onClick={() => onNavigateTab('verification')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition text-left"
          >
            <span className="text-[11px] font-semibold text-slate-400 block truncate">Employee Mapping Issues</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {employeeMappingIssuesCount}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
              Transfers & departures
            </span>
          </div>

          {/* New Employees */}
          <div 
            onClick={() => onNavigateTab('verification')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition text-left"
          >
            <span className="text-[11px] font-semibold text-slate-400 block truncate">New Employees</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {newEmployeesCount}
            </div>
            <span className="text-[10px] text-sky-400 block mt-0.5 truncate">
              Field discoveries
            </span>
          </div>

          {/* New Institutes */}
          <div 
            onClick={() => onNavigateTab('verification')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition text-left"
          >
            <span className="text-[11px] font-semibold text-slate-400 block truncate">New Institutes</span>
            <div className="text-2xl font-extrabold text-white mt-1 font-mono">
              {newInstitutesCount}
            </div>
            <span className="text-[10px] text-emerald-400 block mt-0.5 truncate">
              Discovered sites
            </span>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Verification Queue */}
        <div 
          onClick={() => onNavigateTab('verification')}
          className="bg-slate-900 border border-amber-500/30 p-5 rounded-2xl hover:border-amber-500/60 cursor-pointer transition shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pending Verifications</span>
            <CheckSquare className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {pendingCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
            <span className="text-amber-400 font-semibold">Action Required:</span> Field exceptions
          </div>
        </div>

        {/* Master Institutes */}
        <div 
          onClick={() => onNavigateTab('institutes')}
          className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 cursor-pointer transition shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Institutes Master</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {institutes.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            <strong className="text-emerald-400 font-semibold">{verifiedInstitutes.length} verified</strong> coordinates
          </div>
        </div>

        {/* Master Employees */}
        <div 
          onClick={() => onNavigateTab('employees')}
          className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-slate-700 cursor-pointer transition shadow-sm"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Employees Master</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {employees.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            <strong className="text-sky-400 font-semibold">{verifiedEmployees.length} verified</strong> mappings
          </div>
        </div>

        {/* Data Quality Health */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Location Precision</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            {instituteQualityScore}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">
            Institutes with verified GPS
          </div>
        </div>
      </div>

      {/* The Continuous Data Quality Loop Visual */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-white mb-1">
          Field-to-Master Continuous Verification Engine
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Core architectural lifecycle: Field observations are strictly segregated from Trusted Master Data until Verifier approval.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 1</span>
            <div className="text-white font-semibold mt-1">Existing Master Data</div>
            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              Base institute registry and employee rosters cached locally in IndexedDB for offline operation.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Step 2</span>
            <div className="text-white font-semibold mt-1">Field MO Check-in</div>
            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              GPS geofencing identifies institute. MO validates gate coordinates, faculty status & new discoveries.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Step 3</span>
            <div className="text-white font-semibold mt-1">Exception Queue</div>
            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              Unverified field observations enter the Verification Queue for human-in-the-loop review.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-sky-500/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Step 4</span>
            <div className="text-white font-semibold mt-1">Trusted Master Update</div>
            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
              Approved observations atomically merge into Trusted Master Data, powering future visits.
            </p>
          </div>
        </div>
      </div>

      {/* Verification Queue Preview & Recent Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Verification Queue Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Pending Verification Queue</h2>
              <p className="text-xs text-slate-400">Field submissions awaiting decision</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('verification')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {pendingObservations.slice(0, 3).map((obs) => {
              const institute = institutes.find((i) => i.id === obs.entityId);
              return (
                <div 
                  key={obs.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">
                        {institute?.name || obs.entityId || 'New Institute'}
                      </span>
                      <StatusBadge status={obs.verificationStatus} size="sm" />
                    </div>
                    <div className="text-slate-300 mt-1 font-mono text-[11px]">
                      {obs.observationCode} • {obs.entityType.replace(/_/g, ' ')} ({obs.actionType})
                    </div>
                    <div className="text-slate-500 text-[11px] mt-1">
                      Submitted by {obs.submittedBy} • {new Date(obs.submittedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigateTab('verification')}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition shrink-0"
                  >
                    Verify
                  </button>
                </div>
              );
            })}

            {pendingObservations.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                Verification queue is empty. All field findings verified!
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit History Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Recent Audit History</h2>
              <p className="text-xs text-slate-400">Immutable operations log</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('audit')}
              className="text-xs font-semibold text-sky-400 hover:text-sky-300"
            >
              View Full Trail →
            </button>
          </div>

          <div className="space-y-2.5">
            {auditEvents.map((log) => (
              <div 
                key={log.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs flex items-start gap-3"
              >
                <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 mt-0.5 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{log.description}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Action: <strong className="text-slate-300">{log.action}</strong> • By {log.actorId} ({log.actorRole.toUpperCase()})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
