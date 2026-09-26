import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Clock, 
  ShieldCheck, 
  User, 
  Building2, 
  Users, 
  FileCheck, 
  Eye, 
  X, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  Calendar,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { useAuditEvents } from '../../hooks/useAuditEvents';
import { AuditEvent } from '../../types';

export const AdminAuditHistoryView: React.FC = () => {
  const { auditEvents, loading } = useAuditEvents();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'Marketing Officer' | 'Verifier' | 'Admin' | 'System'>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

  // Helper for human-readable Role display
  const formatRole = (role: string) => {
    const r = role.toLowerCase();
    if (r === 'mo' || r.includes('marketing')) return 'Marketing Officer';
    if (r === 'admin' || r.includes('verifier')) return 'Verifier';
    if (r === 'system') return 'System';
    return role;
  };

  // Helper for human-readable Action title
  const formatAction = (action: string, description: string) => {
    if (action === 'CONFIRM_LOCATION' || action.includes('LOCATION_CONFIRMED')) return 'Confirmed Institute Location';
    if (action === 'UPDATE_LOCATION' || action.includes('LOCATION_UPDATED')) return 'Proposed Institute Location Update';
    if (action === 'VERIFICATION_APPROVED') {
      if (description.includes('Employee') || description.includes('Mapping')) return 'Approved Employee Mapping Change';
      if (description.includes('New Institute') || description.includes('Institute')) return 'Approved New Institute';
      return 'Approved Field Observation';
    }
    if (action === 'VERIFICATION_REJECTED') return 'Rejected Field Observation';
    if (action === 'VERIFICATION_NEEDS_INFO') return 'Requested More Information';
    if (action === 'CREATE_MASTER_INSTITUTE') return 'Approved New Institute';
    if (action === 'CREATE_MASTER_EMPLOYEE') return 'Approved New Employee';
    if (action === 'OBSERVATION_SUBMITTED') return 'Submitted Field Observation';
    if (action === 'VISIT_STARTED') return 'Started Field Visit';
    if (action === 'VISIT_COMPLETED') return 'Completed Field Visit';
    if (action === 'LEGACY_DATA_LOADED') return 'Loaded Legacy Master Data';
    return action.replace(/_/g, ' ');
  };

  // Filtered and sorted audit events
  const filteredEvents = useMemo(() => {
    return auditEvents.filter((ev) => {
      const q = searchTerm.trim().toLowerCase();
      const roleStr = formatRole(ev.actorRole);
      const actionStr = formatAction(ev.action, ev.description);

      const matchesSearch =
        !q ||
        ev.actorId.toLowerCase().includes(q) ||
        roleStr.toLowerCase().includes(q) ||
        ev.entityType.toLowerCase().includes(q) ||
        actionStr.toLowerCase().includes(q) ||
        ev.description.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || roleStr === roleFilter;
      const matchesEntity = entityFilter === 'ALL' || ev.entityType.toLowerCase() === entityFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesEntity;
    });
  }, [auditEvents, searchTerm, roleFilter, entityFilter]);

  // Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Loading Audit Trail from IndexedDB...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Governance & Compliance Ledger
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Append-Only Audit Log</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <History className="w-6 h-6 text-emerald-400" />
              Master Data Audit History
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Immutable audit ledger capturing all field observations, verifier decisions, and Master Data promotions. Audit events cannot be modified or deleted.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Total Recorded: <strong className="text-white">{auditEvents.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by actor ID, role, action, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-emerald-500"
            >
              <option value="ALL">All Roles</option>
              <option value="Marketing Officer">Marketing Officer</option>
              <option value="Verifier">Verifier</option>
              <option value="Admin">Admin</option>
              <option value="System">System</option>
            </select>

            {/* Entity Filter */}
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-emerald-500"
            >
              <option value="ALL">All Entities</option>
              <option value="Institute">Institutes</option>
              <option value="Employee">Employees</option>
              <option value="FieldObservation">Field Observations</option>
              <option value="Visit">Field Visits</option>
            </select>
          </div>
        </div>
      </div>

      {/* SEARCHABLE AUDIT TABLE (Desktop) & CARDS (Mobile) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4 whitespace-nowrap">Date / Time</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Actor</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Role</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Entity</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Action</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredEvents.map((log) => {
                const formattedRole = formatRole(log.actorRole);
                const formattedAction = formatAction(log.action, log.description);

                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedEvent(log)}
                    className="hover:bg-slate-800/40 cursor-pointer transition group"
                  >
                    {/* Date / Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Actor */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-white">
                      {log.actorId}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        formattedRole === 'Verifier' || formattedRole === 'Admin'
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : formattedRole === 'Marketing Officer'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {formattedRole}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-300">
                      {log.entityType}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-white">
                        {formattedAction}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-4 max-w-md truncate text-slate-300">
                      {log.description}
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(log);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 group-hover:border-emerald-500 transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No audit events found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Cards */}
        <div className="block md:hidden divide-y divide-slate-800/80">
          {filteredEvents.map((log) => {
            const formattedRole = formatRole(log.actorRole);
            const formattedAction = formatAction(log.action, log.description);
            return (
              <div
                key={log.id}
                onClick={() => setSelectedEvent(log)}
                className="p-4 hover:bg-slate-800/40 active:bg-slate-800 transition cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">{log.actorId}</span>
                      <span className="text-[10px] text-slate-400 uppercase">({formattedRole})</span>
                    </div>
                    <h3 className="font-bold text-xs text-amber-400 mt-0.5">{formattedAction}</h3>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-snug">
                  {log.description}
                </p>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                  <span className="font-mono text-[10px] text-emerald-400 uppercase">
                    Entity: {log.entityType}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(log);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-emerald-400 font-semibold text-xs flex items-center gap-1 border border-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No audit events found matching the filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* FULL AUDIT EVENT INSPECTION MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-amber-400 font-bold">
                    {selectedEvent.id}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs uppercase font-semibold text-slate-400">
                    {selectedEvent.entityType}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {formatAction(selectedEvent.action, selectedEvent.description)}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  Logged on {new Date(selectedEvent.timestamp).toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Immutable Notice Banner */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-slate-300">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px]">
                  <strong className="text-white">Immutable Audit Record:</strong> Audit events are append-only and cannot be edited or tampered with through the normal UI.
                </span>
              </div>

              {/* Event Provenance Details */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                  Audit Provenance
                </span>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actor ID:</span>
                  <strong className="text-white font-mono">{selectedEvent.actorId}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Actor Role:</span>
                  <span className="text-slate-300">{formatRole(selectedEvent.actorRole)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Entity Type:</span>
                  <span className="font-mono text-emerald-400">{selectedEvent.entityType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Entity ID:</span>
                  <span className="font-mono text-slate-300">{selectedEvent.entityId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Action Code:</span>
                  <span className="font-mono text-amber-400 font-semibold">{selectedEvent.action}</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-slate-400 block text-[11px] mb-1">Human-Readable Narrative:</span>
                  <p className="text-white text-xs leading-relaxed bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    {selectedEvent.description}
                  </p>
                </div>
              </div>

              {/* State Change Comparison: Previous vs New */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Previous Value
                  </span>
                  <pre className="p-2 rounded bg-slate-900 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-48">
                    {selectedEvent.previousValue
                      ? JSON.stringify(selectedEvent.previousValue, null, 2)
                      : 'null'}
                  </pre>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    New Value
                  </span>
                  <pre className="p-2 rounded bg-slate-900 text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-48">
                    {selectedEvent.newValue
                      ? JSON.stringify(selectedEvent.newValue, null, 2)
                      : 'null'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
