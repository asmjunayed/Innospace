import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  HelpCircle,
  MapPin,
  Users,
  Compass,
  History,
  Calendar,
  Eye,
  X,
  ArrowLeft,
  ChevronRight,
  Filter,
  FileCheck,
  ShieldCheck,
  Send,
  Clock,
  Sparkles
} from 'lucide-react';
import { useInstitutes } from '../../hooks/useInstitutes';
import { useEmployees } from '../../hooks/useEmployees';
import { useObservations } from '../../hooks/useObservations';
import { useVisits } from '../../hooks/useVisits';
import { useAuditEvents } from '../../hooks/useAuditEvents';
import { Institute, LocationStatus, FieldObservation, Visit, AuditEvent } from '../../types';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';

type FilterOption = 'ALL' | 'verified' | 'imported' | 'missing' | 'pending_verification' | 'needs_review';

export const AdminInstitutesView: React.FC = () => {
  const { institutes, loading: institutesLoading } = useInstitutes();
  const { employees, loading: employeesLoading } = useEmployees();
  const { observations } = useObservations();
  const { visits } = useVisits();
  const { auditEvents } = useAuditEvents();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterOption>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedInstitute, setSelectedInstitute] = useState<Institute | null>(null);

  // Active detail tab in drawer
  const [activeDetailTab, setActiveDetailTab] = useState<
    'basic' | 'location' | 'employees' | 'visits' | 'observations' | 'audit' | 'location_history'
  >('basic');

  // Compute unique districts
  const districts = useMemo(() => {
    return Array.from(new Set(institutes.map((i) => i.district))).sort();
  }, [institutes]);

  // Map employee counts by institute
  const employeeCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const emp of employees) {
      if (emp.currentInstituteId) {
        map.set(emp.currentInstituteId, (map.get(emp.currentInstituteId) || 0) + 1);
      }
    }
    return map;
  }, [employees]);

  // Filtered Institutes
  const filteredInstitutes = useMemo(() => {
    return institutes.filter((ins) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = 
        !q ||
        ins.name.toLowerCase().includes(q) ||
        ins.instituteCode.toLowerCase().includes(q) ||
        ins.district.toLowerCase().includes(q) ||
        ins.area.toLowerCase().includes(q) ||
        ins.address.toLowerCase().includes(q);

      const matchesDistrict = selectedDistrict === 'ALL' || ins.district === selectedDistrict;

      let matchesStatus = true;
      if (filterStatus === 'ALL') {
        matchesStatus = true;
      } else if (filterStatus === 'verified') {
        matchesStatus = ins.locationStatus === 'verified';
      } else if (filterStatus === 'imported') {
        matchesStatus = ins.locationStatus === 'imported';
      } else if (filterStatus === 'missing') {
        matchesStatus = ins.locationStatus === 'missing' || ins.latitude === null || ins.longitude === null;
      } else if (filterStatus === 'pending_verification') {
        matchesStatus = ins.locationStatus === 'pending_verification';
      } else if (filterStatus === 'needs_review') {
        matchesStatus = ins.locationStatus === 'needs_review';
      }

      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [institutes, searchTerm, filterStatus, selectedDistrict]);

  // Data for the selected institute
  const mappedEmployees = useMemo(() => {
    if (!selectedInstitute) return [];
    return employees.filter((e) => e.currentInstituteId === selectedInstitute.id);
  }, [employees, selectedInstitute]);

  const instituteVisits = useMemo(() => {
    if (!selectedInstitute) return [];
    return visits.filter((v) => v.instituteId === selectedInstitute.id);
  }, [visits, selectedInstitute]);

  const instituteObservations = useMemo(() => {
    if (!selectedInstitute) return [];
    return observations.filter((o) => o.entityId === selectedInstitute.id || o.entityType.includes('institute'));
  }, [observations, selectedInstitute]);

  const instituteAudits = useMemo(() => {
    if (!selectedInstitute) return [];
    return auditEvents.filter(
      (a) => a.entityId === selectedInstitute.id || (a.entityType === 'Institute' && a.description.includes(selectedInstitute.name))
    );
  }, [auditEvents, selectedInstitute]);

  // Location History for selected institute
  const locationHistoryEntries = useMemo(() => {
    if (!selectedInstitute) return [];
    
    // Derived from observations targeting location and audit entries
    const entries: Array<{
      id: string;
      prevCoords: string;
      newCoords: string;
      source: string;
      submittedBy: string;
      verifiedBy: string;
      date: string;
    }> = [];

    // Add from field observations
    const locObs = observations.filter(
      (o) => (o.entityId === selectedInstitute.id || o.entityType === 'institute_location') && o.entityType === 'institute_location'
    );

    for (const obs of locObs) {
      const prevLat = obs.existingValue?.latitude;
      const prevLng = obs.existingValue?.longitude;
      const prevCoords = prevLat !== undefined && prevLng !== undefined
        ? `${prevLat.toFixed(5)}, ${prevLng.toFixed(5)}`
        : 'Missing / Unregistered';

      const newCoords = obs.latitude !== null && obs.longitude !== null
        ? `${obs.latitude.toFixed(5)}, ${obs.longitude.toFixed(5)} (±${obs.accuracy ?? 10}m)`
        : obs.proposedValue?.latitude
        ? `${obs.proposedValue.latitude.toFixed(5)}, ${obs.proposedValue.longitude.toFixed(5)}`
        : 'Coordinates Reported';

      entries.push({
        id: obs.id,
        prevCoords,
        newCoords,
        source: obs.actionType === 'confirm' ? 'Field Verification (On-Site GPS)' : 'MO Location Proposal',
        submittedBy: obs.submittedBy,
        verifiedBy: obs.verifierId || (obs.verificationStatus === 'routine' ? 'System Auto-Routine' : 'Pending Review'),
        date: obs.verifiedAt || obs.submittedAt,
      });
    }

    // Add baseline import entry
    entries.push({
      id: `baseline-${selectedInstitute.id}`,
      prevCoords: 'Legacy Paper Registry',
      newCoords: selectedInstitute.latitude !== null && selectedInstitute.longitude !== null
        ? `${selectedInstitute.latitude.toFixed(5)}, ${selectedInstitute.longitude.toFixed(5)}`
        : 'Missing GPS',
      source: selectedInstitute.dataSource === 'legacy_import' ? 'Legacy Database Import' : 'Master Registration',
      submittedBy: 'System Migration Job',
      verifiedBy: selectedInstitute.locationStatus === 'verified' ? 'Master Verifier' : 'Unverified',
      date: selectedInstitute.createdAt,
    });

    return entries;
  }, [selectedInstitute, observations]);

  // Loading State
  if (institutesLoading || employeesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-medium">Loading Institutes from IndexedDB...</span>
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
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Master Data Repository
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Educational Institutions</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-emerald-400" />
              Institutes Master Data
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Authoritative registry of educational institutions across Bangladesh. Inspect geocodes, linked faculty rosters, and field observation provenance.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
              Total: <strong className="text-white">{institutes.length}</strong>
            </span>
            <span className="bg-emerald-950/60 px-3 py-1.5 rounded-xl border border-emerald-800 text-emerald-400 font-semibold">
              {institutes.filter((i) => i.locationStatus === 'verified').length} Verified
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
              placeholder="Search by code, institute name, area, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
            />
          </div>

          {/* District Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">District:</span>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-emerald-500"
            >
              <option value="ALL">All Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills (All Required Filters) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'verified', label: 'Verified' },
              { key: 'imported', label: 'Imported' },
              { key: 'missing', label: 'Missing Location' },
              { key: 'pending_verification', label: 'Pending Verification' },
              { key: 'needs_review', label: 'Needs Review' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilterStatus(key as FilterOption)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterStatus === key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* INSTITUTES MASTER TABLE (Desktop) & CARDS (Mobile) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Institute Code</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">District</th>
                <th className="py-3.5 px-4">Location Status</th>
                <th className="py-3.5 px-4 font-mono">Latitude</th>
                <th className="py-3.5 px-4 font-mono">Longitude</th>
                <th className="py-3.5 px-4 text-center">Employees</th>
                <th className="py-3.5 px-4">Last Updated</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredInstitutes.map((ins) => {
                const empCount = employeeCountMap.get(ins.id) || 0;

                return (
                  <tr
                    key={ins.id}
                    onClick={() => setSelectedInstitute(ins)}
                    className="hover:bg-slate-800/40 cursor-pointer transition group"
                  >
                    {/* Code */}
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {ins.instituteCode}
                    </td>

                    {/* Name & Area */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-white truncate">{ins.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{ins.area}</div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      {ins.type}
                    </td>

                    {/* District */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                      {ins.district}
                    </td>

                    {/* Location Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={ins.locationStatus} size="sm" />
                    </td>

                    {/* Lat */}
                    <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap text-slate-400">
                      {ins.latitude !== null ? ins.latitude.toFixed(5) : <span className="text-rose-400 italic">None</span>}
                    </td>

                    {/* Lng */}
                    <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap text-slate-400">
                      {ins.longitude !== null ? ins.longitude.toFixed(5) : <span className="text-rose-400 italic">None</span>}
                    </td>

                    {/* Employee Count */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {empCount}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(ins.updatedAt).toLocaleDateString()}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInstitute(ins);
                        }}
                        className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 group-hover:border-emerald-500 transition inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredInstitutes.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                    No educational institutions found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Card View */}
        <div className="block md:hidden divide-y divide-slate-800/80">
          {filteredInstitutes.map((ins) => {
            const empCount = employeeCountMap.get(ins.id) || 0;
            return (
              <div
                key={ins.id}
                onClick={() => setSelectedInstitute(ins)}
                className="p-4 hover:bg-slate-800/40 active:bg-slate-800 transition cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-amber-400">
                        {ins.instituteCode}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {ins.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white mt-0.5">{ins.name}</h3>
                    <p className="text-xs text-slate-400">{ins.area}, {ins.district}</p>
                  </div>
                  <StatusBadge status={ins.locationStatus} size="sm" className="shrink-0" />
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-300">
                      {ins.latitude !== null ? `${ins.latitude.toFixed(3)}, ${ins.longitude?.toFixed(3)}` : 'No GPS'}
                    </span>
                    <span>•</span>
                    <span className="text-white font-medium">{empCount} Faculty</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInstitute(ins);
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

          {filteredInstitutes.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No educational institutions found matching criteria.
            </div>
          )}
        </div>
      </div>

      {/* DETAIL DRAWER / INSPECTION MODAL */}
      {selectedInstitute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-amber-400 font-bold">
                    {selectedInstitute.instituteCode}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    {selectedInstitute.type}
                  </span>
                  <StatusBadge status={selectedInstitute.locationStatus} size="sm" />
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  {selectedInstitute.name}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{selectedInstitute.address || `${selectedInstitute.area}, ${selectedInstitute.district}`}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInstitute(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs">
              {(
                [
                  { id: 'basic', label: 'Basic Information' },
                  { id: 'location', label: 'Location' },
                  { id: 'employees', label: `Mapped Employees (${mappedEmployees.length})` },
                  { id: 'visits', label: `Recent Field Visits (${instituteVisits.length})` },
                  { id: 'observations', label: `Observation History (${instituteObservations.length})` },
                  { id: 'location_history', label: 'Location History' },
                  { id: 'audit', label: `Audit History (${instituteAudits.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveDetailTab(tab.id)}
                  className={`px-3 py-2 font-semibold border-b-2 whitespace-nowrap transition ${
                    activeDetailTab === tab.id
                      ? 'border-emerald-500 text-emerald-400'
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                      General Registry Details
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Institute Code:</span>
                      <strong className="text-white font-mono">{selectedInstitute.instituteCode}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Full Name:</span>
                      <strong className="text-white text-right">{selectedInstitute.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Institution Type:</span>
                      <span className="text-slate-300">{selectedInstitute.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Data Source:</span>
                      <span className="font-mono text-emerald-400">{selectedInstitute.dataSource}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
                      Geographic & Administrative Area
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">District:</span>
                      <strong className="text-white">{selectedInstitute.district}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sub-Area / Thana:</span>
                      <span className="text-slate-300">{selectedInstitute.area}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Address:</span>
                      <span className="text-slate-300 text-right">{selectedInstitute.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">First Registered:</span>
                      <span className="text-slate-400">{new Date(selectedInstitute.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Last Master Update:</span>
                      <span className="text-slate-400">{new Date(selectedInstitute.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LOCATION */}
              {activeDetailTab === 'location' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Location Status</span>
                      <strong className="text-white font-mono text-sm capitalize">{selectedInstitute.locationStatus}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Latitude</span>
                      <strong className="text-emerald-400 font-mono text-sm">
                        {selectedInstitute.latitude !== null ? selectedInstitute.latitude.toFixed(6) : 'Missing'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Longitude</span>
                      <strong className="text-emerald-400 font-mono text-sm">
                        {selectedInstitute.longitude !== null ? selectedInstitute.longitude.toFixed(6) : 'Missing'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Geographic Ground Truth Preview
                    </span>
                    <p className="text-slate-400">
                      Coordinates represent the certified GPS centroid of the institution's primary gate or administrative building, verified through hardware-tethered Marketing Officer field visits.
                    </p>
                    <div className="font-mono text-[11px] text-emerald-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      geo:{selectedInstitute.latitude},{selectedInstitute.longitude}?q={encodeURIComponent(selectedInstitute.name)}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MAPPED EMPLOYEES */}
              {activeDetailTab === 'employees' && (
                <div className="space-y-2">
                  {mappedEmployees.length > 0 ? (
                    mappedEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-white">{emp.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {emp.designation} • ID: <span className="font-mono text-sky-400">{emp.employeeCode}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Phone: {emp.phone}</div>
                        </div>

                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          emp.relationshipStatus === 'verified'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {emp.relationshipStatus}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 italic bg-slate-950 rounded-xl border border-slate-800">
                      No employees actively mapped to this institute.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: RECENT FIELD VISITS */}
              {activeDetailTab === 'visits' && (
                <div className="space-y-2">
                  {instituteVisits.length > 0 ? (
                    instituteVisits.map((visit) => (
                      <div
                        key={visit.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">{visit.visitCode}</span>
                            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                              {visit.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Officer: {visit.moId} • Started: {new Date(visit.startedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-slate-500 font-mono">
                          Completed: {visit.completedAt ? new Date(visit.completedAt).toLocaleTimeString() : 'In Progress'}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500 italic bg-slate-950 rounded-xl border border-slate-800">
                      No field visits recorded for this institute.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: OBSERVATION HISTORY */}
              {activeDetailTab === 'observations' && (
                <div className="space-y-2">
                  {instituteObservations.length > 0 ? (
                    instituteObservations.map((obs) => (
                      <div
                        key={obs.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">{obs.observationCode}</span>
                            <span className="font-mono text-[10px] text-slate-400 uppercase bg-slate-900 px-2 py-0.5 rounded">
                              {obs.entityType.replace(/_/g, ' ')}
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
                          Action: <strong>{obs.actionType}</strong> • Submitted By: {obs.submittedBy}
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
                      No observations captured for this institute.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: LOCATION HISTORY (EXACT REQUIREMENT) */}
              {activeDetailTab === 'location_history' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-900 text-[10px] uppercase font-bold text-slate-400">
                          <th className="py-2.5 px-3">Previous Coordinates</th>
                          <th className="py-2.5 px-3">New Coordinates</th>
                          <th className="py-2.5 px-3">Source</th>
                          <th className="py-2.5 px-3">Submitted By</th>
                          <th className="py-2.5 px-3">Verified By</th>
                          <th className="py-2.5 px-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {locationHistoryEntries.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/50">
                            <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                              {item.prevCoords}
                            </td>
                            <td className="py-3 px-3 font-mono text-emerald-300 font-semibold whitespace-nowrap">
                              {item.newCoords}
                            </td>
                            <td className="py-3 px-3 text-slate-300 whitespace-nowrap">
                              {item.source}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400 whitespace-nowrap">
                              {item.submittedBy}
                            </td>
                            <td className="py-3 px-3 font-semibold text-white whitespace-nowrap">
                              {item.verifiedBy}
                            </td>
                            <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 7: AUDIT HISTORY */}
              {activeDetailTab === 'audit' && (
                <div className="space-y-2">
                  {instituteAudits.length > 0 ? (
                    instituteAudits.map((a) => (
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
                      No audit events on record for this institute.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInstitute(null)}
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
