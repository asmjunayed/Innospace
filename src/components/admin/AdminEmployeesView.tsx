import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Phone, 
  AlertTriangle,
  HelpCircle,
  Eye,
  X,
  History,
  Calendar,
  Sparkles,
  ShieldCheck,
  Send,
  Clock,
  Compass,
  FileCheck
} from 'lucide-react';
import { useEmployees } from '../../hooks/useEmployees';
import { useInstitutes } from '../../hooks/useInstitutes';
import { useObservations } from '../../hooks/useObservations';
import { useAuditEvents } from '../../hooks/useAuditEvents';
import { relationshipRepository } from '../../services/db/repositories/relationshipRepository';
import { Employee, Institute, RelationshipStatus, EmployeeInstituteRelationship, FieldObservation, AuditEvent } from '../../types';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';

type StatusFilter = 'ALL' | RelationshipStatus;

export const AdminEmployeesView: React.FC = () => {
  const { employees, loading: employeesLoading } = useEmployees();
  const { institutes, loading: institutesLoading } = useInstitutes();
  const { observations } = useObservations();
  const { auditEvents } = useAuditEvents();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Active detail tab in drawer
  const [activeDetailTab, setActiveDetailTab] = useState<
    'basic' | 'institute' | 'relationship_history' | 'observations' | 'audit'
  >('basic');

  // Employee relationships state (loaded dynamically when employee is selected)
  const [employeeRelationships, setEmployeeRelationships] = useState<EmployeeInstituteRelationship[]>([]);
  const [loadingRelationships, setLoadingRelationships] = useState(false);

  // Fetch relationships when an employee is selected
  useEffect(() => {
    async function fetchRelationships() {
      if (!selectedEmployee) {
        setEmployeeRelationships([]);
        return;
      }
      setLoadingRelationships(true);
      try {
        const rels = await relationshipRepository.getByEmployeeId(selectedEmployee.id);
        setEmployeeRelationships(rels);
      } catch (err) {
        console.error('Failed to load relationships for employee:', err);
      } finally {
        setLoadingRelationships(false);
      }
    }
    fetchRelationships();
  }, [selectedEmployee]);

  // Helper map for Institute lookup
  const instituteMap = useMemo(() => {
    const map = new Map<string, Institute>();
    for (const inst of institutes) {
      map.set(inst.id, inst);
    }
    return map;
  }, [institutes]);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchTerm.trim().toLowerCase();
      const inst = emp.currentInstituteId ? instituteMap.get(emp.currentInstituteId) : null;
      const instName = inst ? inst.name.toLowerCase() : 'unmapped';

      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.phone.includes(q) ||
        instName.includes(q);

      const matchesStatus = statusFilter === 'ALL' || emp.relationshipStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter, instituteMap]);

  // Detail Data for Selected Employee
  const currentInstitute = selectedEmployee?.currentInstituteId
    ? instituteMap.get(selectedEmployee.currentInstituteId)
    : null;

  const employeeObservations = useMemo(() => {
    if (!selectedEmployee) return [];
    return observations.filter(
      (o) =>
        o.entityId === selectedEmployee.id ||
        (o.existingValue && o.existingValue.employeeCode === selectedEmployee.employeeCode) ||
        (o.proposedValue && o.proposedValue.employeeCode === selectedEmployee.employeeCode)
    );
  }, [observations, selectedEmployee]);

  const employeeAudits = useMemo(() => {
    if (!selectedEmployee) return [];
    return auditEvents.filter(
      (a) =>
        a.entityId === selectedEmployee.id ||
        (a.entityType === 'Employee' && a.description.includes(selectedEmployee.name))
    );
  }, [auditEvents, selectedEmployee]);

  // Format relationship history display
  const formattedRelationshipHistory = useMemo(() => {
    if (!selectedEmployee) return [];

    // Fallback if no explicit relationships stored in DB table
    if (employeeRelationships.length === 0) {
      if (currentInstitute) {
        return [
          {
            id: 'current-fallback',
            instituteName: currentInstitute.name,
            statusLabel: selectedEmployee.relationshipStatus === 'verified' ? 'Verified' : 'Active',
            dateRange: `${new Date(selectedEmployee.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - Current`,
            source: selectedEmployee.dataSource,
          }
        ];
      }
      return [];
    }

    return employeeRelationships.map((rel) => {
      const inst = instituteMap.get(rel.instituteId);
      const instName = inst ? inst.name : 'Unknown Institute';

      let statusLabel = 'Historical';
      if (rel.status === 'active') {
        statusLabel = selectedEmployee.relationshipStatus === 'verified' ? 'Verified' : 'Active';
      } else if (rel.status === 'proposed') {
        statusLabel = 'Pending Verification';
      } else if (rel.status === 'rejected') {
        statusLabel = 'Rejected';
      }

      // Format Date Range: e.g. "Jan 2025 - Sep 2026" or "Sep 2026 - Current"
      const startDate = new Date(rel.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const endDate = rel.status === 'active'
        ? 'Current'
        : new Date(rel.updatedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      return {
        id: rel.id,
        instituteName: instName,
        statusLabel,
        dateRange: `${startDate} - ${endDate}`,
        source: rel.source,
      };
    });
  }, [selectedEmployee, employeeRelationships, currentInstitute, instituteMap]);

  // Loading State
  if (employeesLoading || institutesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Loading Employees Master Data from IndexedDB...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Master Data Repository
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Faculty & Staff Register</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-sky-400" />
              Employees Master Data
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Authoritative personnel records linked to educational institutions. Review faculty rosters, track historical transfers, and inspect field observations.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
              Total Staff: <strong className="text-white">{employees.length}</strong>
            </span>
            <span className="bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800 text-emerald-400 font-semibold">
              {employees.filter((e) => e.relationshipStatus === 'verified').length} Verified
            </span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by faculty name, designation, institute, ID, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            Showing <strong className="text-white">{filteredEmployees.length}</strong> records
          </div>
        </div>

        {/* Filter Pills (All Required Filters) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'verified', label: 'Verified' },
              { key: 'imported', label: 'Imported' },
              { key: 'pending_verification', label: 'Pending Verification' },
              { key: 'observed', label: 'Observed' },
              { key: 'unmapped', label: 'Unmapped' },
              { key: 'rejected', label: 'Rejected' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key as StatusFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === key
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* EMPLOYEES MASTER TABLE (Desktop) & CARDS (Mobile) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Employee ID</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Current Institute</th>
                <th className="py-3.5 px-4">Relationship Status</th>
                <th className="py-3.5 px-4">Data Source</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredEmployees.map((emp) => {
                const inst = emp.currentInstituteId ? instituteMap.get(emp.currentInstituteId) : null;

                return (
                  <tr
                    key={emp.id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="hover:bg-slate-800/40 cursor-pointer transition group"
                  >
                    {/* ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-400 whitespace-nowrap">
                      {emp.employeeCode}
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-white truncate">{emp.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">Phone: {emp.phone}</div>
                    </td>

                    {/* Designation */}
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-300">
                      {emp.designation}
                    </td>

                    {/* Current Institute */}
                    <td className="py-3.5 px-4 max-w-xs">
                      {inst ? (
                        <div>
                          <div className="font-semibold text-white truncate">{inst.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">{inst.area}, {inst.district}</div>
                        </div>
                      ) : (
                        <span className="text-amber-400 italic">Unmapped (No Institute)</span>
                      )}
                    </td>

                    {/* Relationship Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={emp.relationshipStatus} size="sm" />
                    </td>

                    {/* Data Source */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                      {emp.dataSource}
                    </td>

                    {/* Last Updated */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {new Date(emp.updatedAt).toLocaleDateString()}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(emp);
                        }}
                        className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 group-hover:border-sky-500 transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No faculty or employee records found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Card View */}
        <div className="block md:hidden divide-y divide-slate-800/80">
          {filteredEmployees.map((emp) => {
            const inst = emp.currentInstituteId ? instituteMap.get(emp.currentInstituteId) : null;
            return (
              <div
                key={emp.id}
                onClick={() => setSelectedEmployee(emp)}
                className="p-4 hover:bg-slate-800/40 active:bg-slate-800 transition cursor-pointer space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-sky-400">
                      {emp.employeeCode}
                    </span>
                    <h3 className="font-bold text-sm text-white mt-0.5">{emp.name}</h3>
                    <p className="text-xs text-slate-400">{emp.designation}</p>
                  </div>
                  <StatusBadge status={emp.relationshipStatus} size="sm" className="shrink-0" />
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 text-slate-400">
                  <span className="truncate max-w-[200px] text-slate-300">
                    {inst ? inst.name : <em className="text-amber-400">Unmapped</em>}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEmployee(emp);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-sky-400 font-semibold text-xs flex items-center gap-1 border border-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredEmployees.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No faculty or employee records found matching your filter criteria.
            </div>
          )}
        </div>
      </div>

      {/* DETAIL DRAWER / INSPECTION MODAL */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-sky-400 font-bold">
                    {selectedEmployee.employeeCode}
                  </span>
                  <span className="text-slate-600">•</span>
                  <StatusBadge status={selectedEmployee.relationshipStatus} size="sm" />
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  {selectedEmployee.name}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedEmployee.designation} • {currentInstitute?.name || 'Unmapped'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs">
              {(
                [
                  { id: 'basic', label: 'Basic Employee Information' },
                  { id: 'institute', label: 'Current Institute' },
                  { id: 'relationship_history', label: 'Relationship History' },
                  { id: 'observations', label: `Field Observations (${employeeObservations.length})` },
                  { id: 'audit', label: `Audit History (${employeeAudits.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`px-3 py-2 font-semibold border-b-2 whitespace-nowrap transition ${
                    activeDetailTab === tab.id
                      ? 'border-sky-500 text-sky-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* TAB 1: BASIC INFORMATION */}
              {activeDetailTab === 'basic' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                    Personnel Master Profile
                  </span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Employee ID:</span>
                    <strong className="text-white font-mono">{selectedEmployee.employeeCode}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Full Name:</span>
                    <strong className="text-white">{selectedEmployee.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Designation / Role:</span>
                    <span className="text-slate-300">{selectedEmployee.designation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Primary Contact Phone:</span>
                    <span className="text-sky-300 font-mono">{selectedEmployee.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data Source:</span>
                    <span className="font-mono text-emerald-400">{selectedEmployee.dataSource}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Record Created:</span>
                    <span className="text-slate-400">{new Date(selectedEmployee.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Last Updated:</span>
                    <span className="text-slate-400">{new Date(selectedEmployee.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* TAB 2: CURRENT INSTITUTE */}
              {activeDetailTab === 'institute' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                    Active Institutional Affiliation
                  </span>

                  {currentInstitute ? (
                    <div className="space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Institute Name:</span>
                        <strong className="text-white">{currentInstitute.name}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Institute Code:</span>
                        <span className="font-mono text-amber-400">{currentInstitute.instituteCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type & District:</span>
                        <span className="text-slate-300">{currentInstitute.type} • {currentInstitute.district}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Location Status:</span>
                        <span className="font-mono text-emerald-400 uppercase">{currentInstitute.locationStatus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Physical Address:</span>
                        <span className="text-slate-300 text-right">{currentInstitute.address}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-amber-400 italic">
                      This faculty member is currently unmapped and has no active institute assigned in Master Data.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RELATIONSHIP HISTORY (EXACT REQUIREMENT) */}
              {activeDetailTab === 'relationship_history' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                    Chronological audit record of educational institutions where this employee was previously or currently stationed.
                  </div>

                  <div className="space-y-2.5">
                    {formattedRelationshipHistory.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-emerald-400" />
                            {item.instituteName}
                          </h4>
                          <div className="font-mono text-xs text-slate-400">
                            {item.dateRange}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Recorded via: {item.source}
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.statusLabel === 'Verified' || item.statusLabel === 'Active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.statusLabel === 'Historical'
                            ? 'bg-slate-800 text-slate-400 border border-slate-700'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {item.statusLabel}
                        </span>
                      </div>
                    ))}

                    {formattedRelationshipHistory.length === 0 && (
                      <div className="p-8 text-center text-slate-500 italic bg-slate-950 rounded-xl border border-slate-800">
                        No historical institutional records on file.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: FIELD OBSERVATIONS */}
              {activeDetailTab === 'observations' && (
                <div className="space-y-2">
                  {employeeObservations.length > 0 ? (
                    employeeObservations.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sky-400">{obs.observationCode}</span>
                            <span className="font-mono text-[10px] text-slate-400 uppercase bg-slate-900 px-2 py-0.5 rounded">
                              {obs.actionType}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            obs.verificationStatus === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : obs.verificationStatus === 'rejected'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {obs.verificationStatus}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Submitted By: {obs.submittedBy} • Date: {new Date(obs.submittedAt).toLocaleDateString()}
                        </div>
                        {obs.evidence && (
                          <div className="text-[11px] text-slate-400 italic">
                            Evidence: "{obs.evidence}"
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 italic bg-slate-950 rounded-xl border border-slate-800">
                      No field observations recorded concerning this employee.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: AUDIT HISTORY */}
              {activeDetailTab === 'audit' && (
                <div className="space-y-2">
                  {employeeAudits.length > 0 ? (
                    employeeAudits.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-amber-400 font-bold">{a.action}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(a.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-white font-medium">{a.description}</div>
                        <div className="text-[11px] text-slate-400">
                          Actor: <span className="font-mono text-slate-300">{a.actorId}</span> ({a.actorRole})
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 italic bg-slate-950 rounded-xl border border-slate-800">
                      No audit events on record for this employee.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
