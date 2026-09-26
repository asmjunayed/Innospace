import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  Users, 
  MapPin, 
  FileCheck, 
  AlertTriangle, 
  HelpCircle, 
  ArrowLeft, 
  Eye, 
  Search, 
  Filter, 
  ArrowUpDown, 
  ShieldAlert, 
  ShieldCheck, 
  Compass, 
  Calendar, 
  Camera, 
  MessageSquare, 
  History, 
  X, 
  Check, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  ArrowLeftRight,
  Database
} from 'lucide-react';
import { FieldObservation, VerificationStatus, ObservationPriority, Institute, Employee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useObservations } from '../../hooks/useObservations';
import { useInstitutes } from '../../hooks/useInstitutes';
import { useEmployees } from '../../hooks/useEmployees';
import { useToast } from '../../context/ToastContext';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';

interface Props {
  selectedId?: string | null;
  onSelectId?: (id: string | null) => void;
}

type FilterType = 
  | 'all' 
  | 'high' 
  | 'medium' 
  | 'low' 
  | 'location' 
  | 'employee_mapping' 
  | 'new_employee' 
  | 'new_institute' 
  | 'needs_more_information' 
  | 'approved' 
  | 'rejected';

type SortOption = 'priority' | 'newest' | 'oldest';

export const AdminVerificationView: React.FC<Props> = ({ 
  selectedId: propSelectedId, 
  onSelectId 
}) => {
  const { user, role } = useAuth();
  const { 
    observations, 
    approveObservation, 
    rejectObservation, 
    requestMoreInformationObservation, 
    loading 
  } = useObservations();
  const { institutes } = useInstitutes();
  const { employees } = useEmployees();
  const { toast } = useToast();

  // Internal selected ID state synced with prop
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const currentSelectedId = propSelectedId !== undefined ? propSelectedId : internalSelectedId;

  const handleSelectObservation = (id: string | null) => {
    if (onSelectId) {
      onSelectId(id);
    } else {
      setInternalSelectedId(id);
    }
  };

  // Filter and Sort states
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('priority');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modals State
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>('Incorrect information');
  const [rejectComment, setRejectComment] = useState('');

  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false);
  const [requestInfoComment, setRequestInfoComment] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);

  // Helper mappings
  const getInstitute = (id?: string | null) => institutes.find((i) => i.id === id);
  const getEmployee = (id?: string | null) => employees.find((e) => e.id === id);

  // Filtered & Sorted observations
  const filteredAndSortedObservations = useMemo(() => {
    let result = [...observations];

    // Filter
    if (activeFilter === 'high') {
      result = result.filter((o) => o.priority === 'high');
    } else if (activeFilter === 'medium') {
      result = result.filter((o) => o.priority === 'medium');
    } else if (activeFilter === 'low') {
      result = result.filter((o) => o.priority === 'low');
    } else if (activeFilter === 'location') {
      result = result.filter((o) => o.entityType === 'institute_location');
    } else if (activeFilter === 'employee_mapping') {
      result = result.filter((o) => o.entityType === 'employee_relationship');
    } else if (activeFilter === 'new_employee') {
      result = result.filter((o) => o.entityType === 'new_employee');
    } else if (activeFilter === 'new_institute') {
      result = result.filter((o) => o.entityType === 'new_institute');
    } else if (activeFilter === 'needs_more_information') {
      result = result.filter((o) => o.verificationStatus === 'needs_more_information');
    } else if (activeFilter === 'approved') {
      result = result.filter((o) => o.verificationStatus === 'approved');
    } else if (activeFilter === 'rejected') {
      result = result.filter((o) => o.verificationStatus === 'rejected');
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) => {
        const inst = getInstitute(o.entityId);
        const emp = getEmployee(o.entityId);
        const proposed = o.proposedValue || {};
        return (
          o.observationCode.toLowerCase().includes(q) ||
          o.submittedBy.toLowerCase().includes(q) ||
          (inst && inst.name.toLowerCase().includes(q)) ||
          (inst && inst.instituteCode.toLowerCase().includes(q)) ||
          (emp && emp.name.toLowerCase().includes(q)) ||
          (emp && emp.employeeCode.toLowerCase().includes(q)) ||
          (proposed.name && String(proposed.name).toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortOption === 'priority') {
        const priorityOrder: Record<ObservationPriority, number> = { high: 3, medium: 2, low: 1 };
        const pDiff = (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1);
        if (pDiff !== 0) return pDiff;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (sortOption === 'newest') {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (sortOption === 'oldest') {
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      }
      return 0;
    });

    return result;
  }, [observations, activeFilter, sortOption, searchQuery, institutes, employees]);

  // Selected Observation for Detail View
  const selectedObs = currentSelectedId
    ? observations.find((o) => o.id === currentSelectedId) || null
    : null;

  // VERIFICATION CASE 4: Role enforcement
  const isVerifierAdmin = role === 'admin';

  // VERIFICATION CASE 5: Separation of duties (cannot approve own submission)
  const isSubmitter = Boolean(user && selectedObs && (user.email === selectedObs.submittedBy));

  // VERIFICATION CASE 6: Already reviewed observation
  const isAlreadyFinalized = Boolean(selectedObs && (selectedObs.verificationStatus === 'approved' || selectedObs.verificationStatus === 'rejected'));

  // Previous related observations for history panel
  const relatedHistoryObservations = useMemo(() => {
    if (!selectedObs) return [];
    return observations.filter(
      (o) =>
        o.id !== selectedObs.id &&
        ((selectedObs.entityId && o.entityId === selectedObs.entityId) ||
          o.entityType === selectedObs.entityType)
    ).slice(0, 5);
  }, [observations, selectedObs]);

  // Handler: Confirm Approve Observation (VERIFICATION CASE 1)
  const handleExecuteApprove = async () => {
    if (!selectedObs || !user) return;
    if (!isVerifierAdmin) {
      toast.error('Permission denied: Only Admin accounts can approve verifications.');
      return;
    }
    if (isSubmitter) {
      toast.error('Separation of Duties: You cannot approve your own submission.');
      return;
    }

    setIsProcessing(true);
    try {
      await approveObservation(
        selectedObs.id,
        user.email,
        'Verified and approved into Trusted Master Data by Administrator.'
      );
      setShowApproveModal(false);
      toast.success(`Verification approved — Master record updated [${selectedObs.observationCode}]`);
    } catch (err) {
      console.error('Failed to approve observation:', err);
      toast.error('Error approving observation.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Confirm Reject Observation (VERIFICATION CASE 2)
  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObs || !user) return;
    if (!isVerifierAdmin) {
      toast.error('Permission denied: Only Admin accounts can reject verifications.');
      return;
    }

    setIsProcessing(true);
    try {
      const fullComment = `${rejectReason}${rejectComment ? ': ' + rejectComment.trim() : ''}`;
      await rejectObservation(selectedObs.id, user.email, fullComment);
      setShowRejectModal(false);
      setRejectComment('');
      toast.success(`Verification rejected [${selectedObs.observationCode}]`);
    } catch (err) {
      console.error('Failed to reject observation:', err);
      toast.error('Error rejecting observation.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler: Request More Information (VERIFICATION CASE 3)
  const handleConfirmRequestMoreInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObs || !user || !requestInfoComment.trim()) return;

    setIsProcessing(true);
    try {
      await requestMoreInformationObservation(
        selectedObs.id,
        user.email,
        requestInfoComment.trim()
      );
      setShowRequestInfoModal(false);
      setRequestInfoComment('');
      toast.info(`Information request dispatched for [${selectedObs.observationCode}]`);
    } catch (err) {
      console.error('Failed to request more info:', err);
      toast.error('Error dispatching information request.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper formatting for Table rows
  const formatRecordTitle = (obs: FieldObservation) => {
    if (obs.entityType === 'institute_location' || obs.entityType === 'institute_information') {
      const inst = getInstitute(obs.entityId);
      return {
        title: inst?.name || 'Institute',
        subtitle: inst?.instituteCode || 'INS-ID',
      };
    }
    if (obs.entityType === 'employee_relationship') {
      const emp = getEmployee(obs.entityId);
      return {
        title: emp?.name || obs.existingValue?.employeeName || 'Employee',
        subtitle: emp?.employeeCode || obs.existingValue?.employeeCode || 'EMP-ID',
      };
    }
    if (obs.entityType === 'new_employee') {
      return {
        title: obs.proposedValue?.name || 'New Faculty Candidate',
        subtitle: 'New Discovery',
      };
    }
    if (obs.entityType === 'new_institute') {
      return {
        title: obs.proposedValue?.name || 'New Institute Candidate',
        subtitle: obs.proposedValue?.candidateCode || 'Unregistered Site',
      };
    }
    return { title: 'Unknown Record', subtitle: '' };
  };

  const formatCurrentData = (obs: FieldObservation) => {
    if (obs.entityType === 'employee_relationship') {
      return obs.existingValue?.currentInstituteName || 'Current Institute on file';
    }
    if (obs.entityType === 'institute_location') {
      return obs.existingValue?.latitude !== undefined
        ? `Lat ${obs.existingValue.latitude.toFixed(4)}, Lng ${obs.existingValue.longitude.toFixed(4)}`
        : 'Missing GPS';
    }
    if (obs.entityType === 'new_employee' || obs.entityType === 'new_institute') {
      return 'None (Not in Registry)';
    }
    return JSON.stringify(obs.existingValue || 'None');
  };

  const formatProposedData = (obs: FieldObservation) => {
    if (obs.entityType === 'employee_relationship') {
      const prop = obs.proposedValue || {};
      const targetInst = getInstitute(prop.instituteId);
      return targetInst?.name || prop.instituteName || 'Reassign / Transfer';
    }
    if (obs.entityType === 'institute_location') {
      return obs.latitude !== null && obs.longitude !== null
        ? `Lat ${obs.latitude.toFixed(4)}, Lng ${obs.longitude.toFixed(4)}`
        : 'New Coordinates Proposed';
    }
    if (obs.entityType === 'new_employee') {
      return `${obs.proposedValue?.name || 'New Staff'} (${obs.proposedValue?.designation || 'Faculty'})`;
    }
    if (obs.entityType === 'new_institute') {
      return `${obs.proposedValue?.name} • ${obs.proposedValue?.area}`;
    }
    return JSON.stringify(obs.proposedValue || {});
  };

  // --------------------------------------------------------------------------
  // DETAIL VIEW (/admin/verification/:id)
  // --------------------------------------------------------------------------
  if (selectedObs) {
    const recordMeta = formatRecordTitle(selectedObs);
    const photoUrl = selectedObs.proposedValue?.signboardPhotoUrl || selectedObs.proposedValue?.photoUrl;

    return (
      <div className="space-y-6 pb-20">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleSelectObservation(null)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Verification Queue</span>
          </button>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              selectedObs.priority === 'high'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : selectedObs.priority === 'medium'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {selectedObs.priority} Priority
            </span>

            <StatusBadge status={selectedObs.verificationStatus} size="md" />
          </div>
        </div>

        {/* VERIFICATION CASE 6: ALREADY FINALIZED BANNER */}
        {isAlreadyFinalized && (
          <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
            selectedObs.verificationStatus === 'approved'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}>
            {selectedObs.verificationStatus === 'approved' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-sm text-white">
                Observation {selectedObs.verificationStatus.toUpperCase()}
              </div>
              <p className="mt-0.5">
                Reviewed by <strong className="text-white">{selectedObs.verifierId}</strong> on{' '}
                {selectedObs.verifiedAt ? new Date(selectedObs.verifiedAt).toLocaleString() : 'N/A'}.
              </p>
              {selectedObs.verifierComment && (
                <div className="mt-1 p-2 rounded-lg bg-slate-950/80 font-mono text-[11px] text-slate-200">
                  Verifier note: "{selectedObs.verifierComment}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* VERIFICATION CASE 5: SEPARATION OF DUTIES BANNER */}
        {isSubmitter && !isAlreadyFinalized && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-300 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white font-semibold">Separation of Duties Enforced:</strong> You submitted this observation ({selectedObs.submittedBy}). To safeguard master data governance, a user cannot approve their own submission. Another administrator account must conduct the review.
            </div>
          </div>
        )}

        {/* HEADER: Observation Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-amber-400">
                  {selectedObs.observationCode}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-xs uppercase font-semibold text-slate-400">
                  {selectedObs.entityType.replace(/_/g, ' ')}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {recordMeta.title}
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                Record Identifier: {recordMeta.subtitle}
              </p>
            </div>

            {/* Action Buttons Workbench */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowRequestInfoModal(true)}
                disabled={isProcessing || isAlreadyFinalized}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sky-400 hover:text-sky-300 text-xs font-bold border border-slate-700 transition flex items-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4" />
                <span>Request More Information</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={isProcessing || isAlreadyFinalized}
                className="px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 disabled:opacity-50 text-rose-400 hover:text-rose-300 text-xs font-bold border border-rose-900/60 transition flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>

              <button
                type="button"
                onClick={() => setShowApproveModal(true)}
                disabled={isProcessing || isSubmitter || isAlreadyFinalized}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-emerald-950 transition flex items-center gap-1.5"
                title={
                  isSubmitter 
                    ? 'Cannot approve own submission' 
                    : isAlreadyFinalized 
                    ? 'Observation already finalized' 
                    : 'Approve observation into Master Data'
                }
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>{selectedObs.verificationStatus === 'approved' ? 'Approved' : 'Approve'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* SIDE-BY-SIDE COMPARISON WORKBENCH (CURRENT MASTER VS PROPOSED FINDING) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Master Data Change Comparison
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              Review current authoritative baseline against on-site field observation
            </span>
          </div>

          {/* EXECUTIVE CHANGE DIFF DELTA BANNER */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                Comparison Summary: Master Baseline vs Field Observation
              </span>
              <StatusBadge status={selectedObs.verificationStatus} size="sm" />
            </div>

            {selectedObs.entityType === 'institute_location' && (() => {
              const inst = getInstitute(selectedObs.entityId);
              const curLat = selectedObs.existingValue?.latitude ?? inst?.latitude;
              const curLng = selectedObs.existingValue?.longitude ?? inst?.longitude;
              const propLat = selectedObs.latitude ?? selectedObs.proposedValue?.latitude;
              const propLng = selectedObs.longitude ?? selectedObs.proposedValue?.longitude;
              const drift = selectedObs.proposedValue?.discrepancyMeters;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Stored Pin:</span>
                    <span className="font-mono text-slate-200 font-semibold block mt-0.5">
                      {curLat !== undefined && curLng !== undefined ? `${Number(curLat).toFixed(5)}, ${Number(curLng).toFixed(5)}` : 'Missing / Unpinned'}
                    </span>
                    <span className="text-[10px] text-slate-500">Database baseline</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Proposed Field Pin:</span>
                    <span className="font-mono text-emerald-300 font-bold block mt-0.5">
                      {propLat !== undefined && propLng !== undefined ? `${Number(propLat).toFixed(5)}, ${Number(propLng).toFixed(5)}` : 'Pending'}
                    </span>
                    <span className="text-[10px] text-emerald-400/80">
                      {drift !== undefined ? `${drift}m drift from baseline` : 'Captured on site'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Impact on Approval:</span>
                    <span className="text-slate-300 text-[11px] leading-tight mt-0.5">
                      Master coordinates will update to field fix; status becomes <strong className="text-emerald-400">Verified</strong>.
                    </span>
                  </div>
                </div>
              );
            })()}

            {selectedObs.entityType === 'employee_relationship' && (() => {
              const emp = getEmployee(selectedObs.entityId);
              const currInst = emp?.currentInstituteId ? getInstitute(emp.currentInstituteId) : null;
              const currName = currInst?.name || selectedObs.existingValue?.currentInstituteName || 'Unmapped';
              const targetInstId = selectedObs.proposedValue?.instituteId;
              const targetInst = targetInstId ? getInstitute(targetInstId) : null;
              const targetName = targetInst?.name || selectedObs.proposedValue?.instituteName || 'Selected Institute';
              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Former Affiliated Institute:</span>
                    <span className="text-amber-300 font-semibold block mt-0.5 line-through decoration-amber-500/60 truncate">
                      {currName}
                    </span>
                    <span className="text-[10px] text-slate-500">Current baseline in registry</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Target Affiliated Institute:</span>
                    <span className="text-emerald-300 font-bold block mt-0.5 truncate">
                      {targetName}
                    </span>
                    <span className="text-[10px] text-emerald-400/80">Observed active during visit</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Impact on Approval:</span>
                    <span className="text-slate-300 text-[11px] leading-tight mt-0.5">
                      Reassigns master faculty mapping to target institution; archives prior link.
                    </span>
                  </div>
                </div>
              );
            })()}

            {(selectedObs.entityType === 'new_institute' || selectedObs.entityType === 'new_employee') && (
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Registry Status:</span>
                  <span className="text-slate-300 text-[11px]">Uncatalogued Field Discovery (Not currently in Master Data)</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block">Impact on Approval:</span>
                  <span className="text-emerald-300 font-semibold text-[11px]">Creates new verified Master Record</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Master Data Panel */}
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block">
                      CURRENT MASTER DATA
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">Authoritative baseline in database • Protected record</span>
                </div>
                <ProvenanceBadge type="master" size="md" />
              </div>

              {/* Structured Master View */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3 text-xs">
                {selectedObs.entityType === 'institute_location' && (() => {
                  const inst = getInstitute(selectedObs.entityId);
                  const lat = selectedObs.existingValue?.latitude ?? inst?.latitude;
                  const lng = selectedObs.existingValue?.longitude ?? inst?.longitude;
                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Institution:</span>
                        <span className="font-semibold text-white">{inst?.name || 'Institute on file'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Stored Coordinates:</span>
                        <span className="font-mono text-slate-200">
                          {lat !== undefined && lng !== undefined 
                            ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}` 
                            : 'Missing / Unpinned'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Location Status:</span>
                        <span className="text-[11px] font-mono uppercase text-sky-400">
                          {selectedObs.existingValue?.locationStatus || inst?.locationStatus || 'imported'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Campus Address:</span>
                        <span className="text-slate-300 truncate max-w-[200px]">{inst?.address || 'On file'}</span>
                      </div>
                    </div>
                  );
                })()}

                {selectedObs.entityType === 'employee_relationship' && (() => {
                  const emp = getEmployee(selectedObs.entityId);
                  const currInst = emp?.currentInstituteId ? getInstitute(emp.currentInstituteId) : null;
                  const currName = currInst?.name || selectedObs.existingValue?.currentInstituteName || 'Unmapped / Unassigned';
                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Faculty Name:</span>
                        <span className="font-semibold text-white">{emp?.name || selectedObs.existingValue?.employeeName || 'Staff'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Current Mapped Institute:</span>
                        <span className="font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/60">
                          {currName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Designation:</span>
                        <span className="text-slate-300">{emp?.designation || selectedObs.existingValue?.designation || 'Faculty'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Relationship Status:</span>
                        <span className="text-[11px] font-mono uppercase text-slate-300">
                          {emp?.relationshipStatus || 'active'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {(selectedObs.entityType === 'new_institute' || selectedObs.entityType === 'new_employee') && (
                  <div className="py-4 text-center text-slate-400 space-y-1">
                    <span className="text-sm font-semibold text-slate-300 block">Not Found in Master Registry</span>
                    <p className="text-[11px] text-slate-500">
                      This is an uncatalogued discovery submitted from the field. Approving will create a brand new master record.
                    </p>
                  </div>
                )}

                {selectedObs.entityType === 'institute_information' && (
                  <div className="space-y-2">
                    <span className="text-slate-400 block">Current Stored Information:</span>
                    <div className="font-medium text-white">{formatCurrentData(selectedObs)}</div>
                  </div>
                )}

                {/* Collapsible Technical Payload */}
                {selectedObs.existingValue && (
                  <details className="pt-2 border-t border-slate-800 text-[11px]">
                    <summary className="text-slate-500 hover:text-slate-300 cursor-pointer font-mono text-[10px] uppercase">
                      Inspect Baseline Payload JSON
                    </summary>
                    <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 font-mono text-[10px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(selectedObs.existingValue, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>

            {/* Proposed Field Discovery Panel */}
            <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl p-5 shadow-lg shadow-emerald-950/20 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">
                      PROPOSED FIELD DATA
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block">Captured on site by {selectedObs.submittedBy} • Action: {selectedObs.actionType.toUpperCase()}</span>
                </div>
                <ProvenanceBadge type="field" size="md" />
              </div>

              {/* Structured Proposed View */}
              <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 text-xs">
                {selectedObs.entityType === 'institute_location' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Proposed Coordinates:</span>
                      <span className="font-mono font-bold text-emerald-300 text-sm">
                        {selectedObs.latitude !== null && selectedObs.longitude !== null
                          ? `${selectedObs.latitude.toFixed(6)}, ${selectedObs.longitude.toFixed(6)}`
                          : selectedObs.proposedValue?.latitude !== undefined
                          ? `${Number(selectedObs.proposedValue.latitude).toFixed(6)}, ${Number(selectedObs.proposedValue.longitude).toFixed(6)}`
                          : 'Pending Coordinates'}
                      </span>
                    </div>
                    {selectedObs.proposedValue?.discrepancyMeters !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Location Discrepancy:</span>
                        <span className="font-mono font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/60">
                          {selectedObs.proposedValue.discrepancyMeters}m Drift from Stored Gate
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Accuracy & Source:</span>
                      <span className="text-slate-300">
                        ±{selectedObs.accuracy ?? 10}m • {selectedObs.proposedValue?.source?.replace(/_/g, ' ') || 'Field GPS'}
                      </span>
                    </div>
                    {selectedObs.proposedValue?.updateReason && (
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200">
                        <span className="text-slate-400 font-semibold block">Officer Justification:</span>
                        "{selectedObs.proposedValue.updateReason}"
                        {selectedObs.proposedValue.notes && ` — ${selectedObs.proposedValue.notes}`}
                      </div>
                    )}
                  </div>
                )}

                {selectedObs.entityType === 'employee_relationship' && (() => {
                  const targetInstId = selectedObs.proposedValue?.instituteId;
                  const targetInst = targetInstId ? getInstitute(targetInstId) : null;
                  const targetName = targetInst?.name || selectedObs.proposedValue?.instituteName || 'Selected Institute';
                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Proposed Institute:</span>
                        <span className="font-bold text-emerald-300 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800 text-sm">
                          {targetName}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Proposed Action:</span>
                        <span className="font-semibold text-white">Faculty Transfer / Reassignment</span>
                      </div>
                      {selectedObs.proposedValue?.transferReason && (
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200">
                          <span className="text-slate-400 font-semibold block">Transfer Reason:</span>
                          "{selectedObs.proposedValue.transferReason}"
                          {selectedObs.proposedValue.notes && ` — ${selectedObs.proposedValue.notes}`}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {selectedObs.entityType === 'new_institute' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">New Institute Name:</span>
                      <span className="font-bold text-emerald-300 text-sm">{selectedObs.proposedValue?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Area & District:</span>
                      <span className="text-white">{selectedObs.proposedValue?.area}, {selectedObs.proposedValue?.district}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Address:</span>
                      <span className="text-slate-300">{selectedObs.proposedValue?.address}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Captured GPS:</span>
                      <span className="font-mono text-emerald-300">
                        {selectedObs.latitude?.toFixed(6)}, {selectedObs.longitude?.toFixed(6)}
                      </span>
                    </div>
                  </div>
                )}

                {selectedObs.entityType === 'new_employee' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">New Faculty Name:</span>
                      <span className="font-bold text-emerald-300 text-sm">{selectedObs.proposedValue?.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Designation:</span>
                      <span className="text-white">{selectedObs.proposedValue?.designation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Department & Phone:</span>
                      <span className="text-slate-300">{selectedObs.proposedValue?.department || 'General'} • {selectedObs.proposedValue?.phone || 'N/A'}</span>
                    </div>
                  </div>
                )}

                {selectedObs.entityType === 'institute_information' && (
                  <div className="space-y-2">
                    <span className="text-slate-400 block">Reported Correction:</span>
                    <div className="font-medium text-emerald-300">{formatProposedData(selectedObs)}</div>
                  </div>
                )}

                {/* Collapsible Proposed Payload */}
                {selectedObs.proposedValue && (
                  <details className="pt-2 border-t border-slate-800 text-[11px]">
                    <summary className="text-slate-500 hover:text-slate-300 cursor-pointer font-mono text-[10px] uppercase">
                      Inspect Proposed Payload JSON
                    </summary>
                    <pre className="mt-2 p-2.5 rounded-lg bg-slate-900 font-mono text-[10px] text-emerald-400/90 overflow-x-auto">
                      {JSON.stringify(selectedObs.proposedValue, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* METADATA, AUDIT LOGISTICS & EVIDENCE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          {/* Metadata Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
              Field Logistics & Provenance
            </span>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Submitted By:</span>
                <span className="text-white font-mono font-semibold">{selectedObs.submittedBy}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Visit Session:</span>
                <span className="font-mono text-emerald-400">{selectedObs.visitId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Captured At:</span>
                <span className="text-slate-300">
                  {new Date(selectedObs.submittedAt).toLocaleDateString()} {new Date(selectedObs.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-slate-400">GPS Coordinates:</span>
                <div className="text-right font-mono text-emerald-300">
                  {selectedObs.latitude !== null && selectedObs.longitude !== null
                    ? `${selectedObs.latitude.toFixed(5)}, ${selectedObs.longitude.toFixed(5)}`
                    : 'N/A'}
                  <div className="text-[10px] text-slate-500">
                    Accuracy: ±{selectedObs.accuracy ?? 10}m
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence & Photo Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
              Evidence & Photo Signboard
            </span>

            {photoUrl ? (
              <div className="space-y-2">
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-1">
                  <img
                    src={photoUrl}
                    alt="Field Signboard Evidence"
                    className="w-full h-36 object-cover rounded-lg"
                  />
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold block text-center">
                  ✓ Photo evidence attached
                </span>
              </div>
            ) : (
              <div className="h-36 rounded-xl border border-dashed border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-500 text-center p-3">
                <Camera className="w-6 h-6 mb-1 text-slate-600" />
                <span>No photographic evidence attached</span>
              </div>
            )}
          </div>

          {/* Comments & Field Rationale */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-800">
              MO Notes & Field Rationale
            </span>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 italic min-h-[90px] leading-relaxed">
              "{selectedObs.evidence || 'No supplemental notes provided by field officer.'}"
            </div>

            {selectedObs.verifierComment && (
              <div className="pt-2 border-t border-slate-800 text-[11px]">
                <strong className="text-amber-400 block">Verifier Note:</strong>
                <span className="text-slate-300">{selectedObs.verifierComment}</span>
              </div>
            )}
          </div>
        </div>

        {/* HISTORY: Previous Related Observations */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              History: Previous Related Observations
            </h3>
          </div>

          {relatedHistoryObservations.length > 0 ? (
            <div className="space-y-2">
              {relatedHistoryObservations.map((hist) => (
                <div
                  key={hist.id}
                  onClick={() => handleSelectObservation(hist.id)}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-emerald-400 font-bold">{hist.observationCode}</span>
                    <span className="text-slate-400 uppercase text-[10px]">{hist.entityType.replace(/_/g, ' ')}</span>
                    <span className="text-white">{hist.submittedBy}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      hist.verificationStatus === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : hist.verificationStatus === 'rejected'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {hist.verificationStatus}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950 text-slate-500 text-xs italic text-center">
              No prior recorded observations for this specific record.
            </div>
          )}
        </div>

        {/* VERIFICATION CASE 1: CONFIRMATION MODAL FOR APPROVAL */}
        <ConfirmationModal
          isOpen={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Approve Observation into Master Data?"
          description={`Approving observation [${selectedObs.observationCode}] will promote the proposed field findings into trusted Master Data and generate a permanent audit trail entry.`}
          confirmLabel="Confirm Approval"
          variant="primary"
          isLoading={isProcessing}
          onConfirm={handleExecuteApprove}
        />

        {/* VERIFICATION CASE 2: CONFIRMATION MODAL FOR REJECTION */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-rose-400" />
                  Reject Observation
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Rejecting this observation leaves master data unchanged. A rejection audit event will be recorded.
              </p>

              <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Rejection Reason (Required):
                  </label>
                  <select
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-emerald-500"
                  >
                    <option value="Incorrect information">Incorrect information</option>
                    <option value="Duplicate record">Duplicate record</option>
                    <option value="Insufficient evidence">Insufficient evidence</option>
                    <option value="Outside campus boundaries">Outside campus boundaries</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Optional Reviewer Comment:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide details on why this observation is rejected..."
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md transition"
                  >
                    {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VERIFICATION CASE 3: MODAL FOR REQUEST MORE INFORMATION */}
        {showRequestInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-sky-400" />
                  Request More Information
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRequestInfoModal(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmRequestMoreInfo} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Admin Inquiry Comment (Required):
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="e.g. Please supply a clearer photo of the institute signboard, or provide the direct contact phone for the Principal..."
                    value={requestInfoComment}
                    onChange={(e) => setRequestInfoComment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowRequestInfoModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing || !requestInfoComment.trim()}
                    className="px-5 py-2.5 text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-md transition"
                  >
                    {isProcessing ? 'Sending...' : 'Send Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // QUEUE LIST VIEW (/admin/verification)
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Governance Workflow
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">Desktop Verification Queue</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-amber-400" />
              Verification Queue
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Inspect unverified field findings collected by Marketing Officers. Compare side-by-side with Master Data before promoting changes into verified records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              Total Queue: <strong className="text-white">{observations.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* FILTER BAR & SEARCH CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by observation code, record name, or officer email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-emerald-500 font-medium"
            >
              <option value="priority">Priority (High first)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'high', label: 'High' },
              { key: 'medium', label: 'Medium' },
              { key: 'low', label: 'Low' },
              { key: 'location', label: 'Location' },
              { key: 'employee_mapping', label: 'Employee Mapping' },
              { key: 'new_employee', label: 'New Employee' },
              { key: 'new_institute', label: 'New Institute' },
              { key: 'needs_more_information', label: 'Needs More Info' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(key as FilterType)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeFilter === key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* PROFESSIONAL TABLE & MOBILE CARDS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Record</th>
                <th className="py-3.5 px-4">Current Data</th>
                <th className="py-3.5 px-4">Proposed Data</th>
                <th className="py-3.5 px-4">Submitted By</th>
                <th className="py-3.5 px-4">Submitted At</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredAndSortedObservations.map((obs) => {
                const record = formatRecordTitle(obs);

                return (
                  <tr
                    key={obs.id}
                    onClick={() => handleSelectObservation(obs.id)}
                    className={`hover:bg-slate-800/40 cursor-pointer transition group border-l-3 ${
                      obs.priority === 'high'
                        ? 'border-l-rose-500 bg-rose-950/15 hover:bg-rose-950/25'
                        : obs.priority === 'medium'
                        ? 'border-l-amber-500/40'
                        : 'border-l-transparent'
                    }`}
                  >
                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        obs.priority === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : obs.priority === 'medium'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 bg-slate-900 border border-slate-800'
                      }`}>
                        {obs.priority === 'high' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />}
                        {obs.priority}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-slate-300 font-semibold uppercase text-[10px]">
                        {obs.entityType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Record */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-white truncate">{record.title}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">
                        {record.subtitle}
                      </div>
                    </td>

                    {/* Current Data */}
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-400 text-[11px]">
                      <span className="text-[10px] uppercase text-slate-500 mr-1.5 font-mono">Current:</span>
                      {formatCurrentData(obs)}
                    </td>

                    {/* Proposed Data */}
                    <td className="py-3.5 px-4 max-w-xs truncate text-emerald-300 font-medium text-[11px]">
                      <span className="text-[10px] uppercase text-emerald-500/80 mr-1.5 font-mono">Proposed:</span>
                      {formatProposedData(obs)}
                    </td>

                    {/* Submitted By */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                      {obs.submittedBy}
                    </td>

                    {/* Submitted At */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {new Date(obs.submittedAt).toLocaleDateString()} {new Date(obs.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={obs.verificationStatus} size="sm" />
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectObservation(obs.id);
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
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Cards View (Visible on screens < md) */}
        <div className="block md:hidden divide-y divide-slate-800/80">
          {filteredAndSortedObservations.map((obs) => {
            const record = formatRecordTitle(obs);

            return (
              <div
                key={obs.id}
                onClick={() => handleSelectObservation(obs.id)}
                className={`p-4 hover:bg-slate-800/40 active:bg-slate-800 transition cursor-pointer space-y-2.5 border-l-4 ${
                  obs.priority === 'high'
                    ? 'border-l-rose-500 bg-rose-950/15'
                    : obs.priority === 'medium'
                    ? 'border-l-amber-500/50'
                    : 'border-l-transparent'
                }`}
              >
                {/* Priority, Code & Status Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-amber-400">
                      {obs.observationCode}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      obs.priority === 'high'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : obs.priority === 'medium'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 bg-slate-900 border border-slate-800'
                    }`}>
                      {obs.priority === 'high' && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />}
                      {obs.priority}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {obs.entityType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <StatusBadge status={obs.verificationStatus} size="sm" className="shrink-0" />
                </div>

                {/* Record Details */}
                <div>
                  <h3 className="font-bold text-sm text-white">{record.title}</h3>
                  <div className="text-[11px] font-mono text-slate-400">{record.subtitle}</div>
                </div>

                {/* Current vs Proposed Diff Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Baseline:</span>
                    <span className="text-slate-300 text-[11px] truncate block mt-0.5">
                      {formatCurrentData(obs)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Proposed Value:</span>
                    <span className="text-emerald-300 font-semibold text-[11px] truncate block mt-0.5">
                      {formatProposedData(obs)}
                    </span>
                  </div>
                </div>

                {/* Submitter & Inspect Action */}
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/60 text-slate-400">
                  <div className="flex flex-col text-[10px] text-slate-400 leading-tight">
                    <span>By: <strong className="text-slate-300 font-mono">{obs.submittedBy}</strong></span>
                    <span>{new Date(obs.submittedAt).toLocaleDateString()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectObservation(obs.id);
                    }}
                    className="py-1 px-3 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* VERIFICATION CASE 7: EMPTY VERIFICATION QUEUE */}
        {filteredAndSortedObservations.length === 0 && (
          <div className="py-16 px-6 text-center space-y-3">
            <CheckSquare className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Verification queue is empty</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || activeFilter !== 'all'
                ? 'No field observations match your selected filter criteria.'
                : 'All observations have been reviewed or no field submissions are pending at this time.'}
            </p>
            {(searchQuery || activeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
                className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
              >
                Reset Filter & Search
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
