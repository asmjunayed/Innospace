import React, { useState } from 'react';
import { 
  Users, 
  ChevronLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Check, 
  Phone, 
  Building2, 
  Search, 
  ArrowRight, 
  X, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Institute, Employee, FieldObservation } from '../../types';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useInstitutes } from '../../hooks/useInstitutes';
import { useObservations } from '../../hooks/useObservations';
import { useVisits } from '../../hooks/useVisits';
import { stringSimilarity } from '../../services/dataImportService';
import { useToast } from '../../context/ToastContext';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface Props {
  institute: Institute;
  onBackToInstitute: () => void;
  onContinue: () => void;
}

export const MoEmployeeMappingView: React.FC<Props> = ({
  institute,
  onBackToInstitute,
  onContinue,
}) => {
  const { user } = useAuth();
  const { location } = useGps();
  const { employees } = useEmployees();
  const { institutes } = useInstitutes();
  const { submitObservation } = useObservations();
  const { activeVisit } = useVisits(user?.email);
  const { toast } = useToast();

  // Confirmed and reported issue states for this visit session
  const [confirmedEmpIds, setConfirmedEmpIds] = useState<Set<string>>(new Set());
  const [reportedIssues, setReportedIssues] = useState<Map<string, string>>(new Map());
  const [confirmingEmpId, setConfirmingEmpId] = useState<string | null>(null);

  // Report Issue Modal
  const [issueModalTarget, setIssueModalTarget] = useState<Employee | null>(null);
  const [issueReason, setIssueReason] = useState<'Employee does not work here' | 'Wrong Institute' | 'Other'>('Employee does not work here');
  const [issueNote, setIssueNote] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Search Employee Workflow
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConflictEmployee, setSelectedConflictEmployee] = useState<Employee | null>(null);
  const [selectedUnmappedEmployee, setSelectedUnmappedEmployee] = useState<Employee | null>(null);
  const [conflictTransferEvidence, setConflictTransferEvidence] = useState('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);
  const [proposalSubmittedEmpIds, setProposalSubmittedEmpIds] = useState<Set<string>>(new Set());

  // Add New Employee Workflow
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDesignation, setNewDesignation] = useState('Lecturer');
  const [newPhone, setNewPhone] = useState('');
  const [newEvidence, setNewEvidence] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formTouched, setFormTouched] = useState<Record<string, boolean>>({});

  // Duplicate Check Modal for New Employee
  const [possibleDuplicates, setPossibleDuplicates] = useState<Employee[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [newlyCreatedSuccessName, setNewlyCreatedSuccessName] = useState<string | null>(null);

  // Helper to get Institute by ID
  const getInstituteName = (instId: string | null): string => {
    if (!instId) return 'Unmapped';
    const found = institutes.find((i) => i.id === instId);
    return found ? found.name : 'Unknown Institute';
  };

  // Employees currently linked to this institute
  const linkedEmployees = employees.filter((e) => e.currentInstituteId === institute.id);

  // 1. CONFIRM FLOW (EMPLOYEE CASE 1)
  const handleConfirmEmployee = async (emp: Employee) => {
    if (!user) return;
    setConfirmingEmpId(emp.id);
    try {
      await submitObservation(
        {
          visitId: activeVisit?.id || 'vis-active',
          entityType: 'employee_relationship',
          entityId: emp.id,
          actionType: 'confirm',
          existingValue: {
            employeeId: emp.id,
            employeeName: emp.name,
            employeeCode: emp.employeeCode,
            instituteId: institute.id,
            designation: emp.designation,
          },
          proposedValue: {
            confirmed: true,
            status: 'active',
            instituteId: institute.id,
          },
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          evidence: `Verified on-site by ${user.name} during visit to ${institute.name}.`,
          submittedBy: user.email,
          verificationStatus: 'routine',
          priority: 'low',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );
      setConfirmedEmpIds((prev) => new Set(prev).add(emp.id));
      toast.success(`Confirmed ${emp.name} active at this institute`);
    } catch (err: any) {
      console.error('Failed to confirm employee relationship:', err);
      toast.error('Failed to record confirmation.');
    } finally {
      setConfirmingEmpId(null);
    }
  };

  // 2. REPORT ISSUE FLOW
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !issueModalTarget) return;
    setIsSubmittingIssue(true);
    try {
      await submitObservation(
        {
          visitId: activeVisit?.id || 'vis-active',
          entityType: 'employee_relationship',
          entityId: issueModalTarget.id,
          actionType: 'report_issue',
          existingValue: {
            employeeId: issueModalTarget.id,
            employeeName: issueModalTarget.name,
            instituteId: institute.id,
            designation: issueModalTarget.designation,
          },
          proposedValue: {
            issueType: issueReason,
            notes: issueNote,
            instituteId: institute.id,
          },
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          evidence: `Field issue reported: ${issueReason}. Note: ${issueNote}`,
          submittedBy: user.email,
          verificationStatus: 'pending',
          priority: 'medium',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );
      setReportedIssues((prev) => new Map(prev).set(issueModalTarget.id, issueReason));
      setIssueModalTarget(null);
      setIssueNote('');
      toast.success('Employee issue observation reported');
    } catch (err: any) {
      console.error('Failed to report employee issue:', err);
      toast.error('Failed to report issue.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // 3. SEARCH & CONFLICT FLOW (EMPLOYEE CASE 2 & 3)
  const searchResults = searchQuery.trim()
    ? employees.filter((emp) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          emp.name.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q) ||
          emp.phone.includes(q)
        );
      })
    : [];

  const handleProposeConflictChange = async (emp: Employee, customEvidence?: string) => {
    if (!user) return;
    setIsSubmittingProposal(true);
    try {
      const currentInstName = getInstituteName(emp.currentInstituteId);
      const isTransfer = Boolean(emp.currentInstituteId);

      await submitObservation(
        {
          visitId: activeVisit?.id || 'vis-active',
          entityType: 'employee_relationship',
          entityId: emp.id,
          actionType: 'update',
          existingValue: {
            employeeId: emp.id,
            employeeName: emp.name,
            employeeCode: emp.employeeCode,
            currentInstituteId: emp.currentInstituteId,
            currentInstituteName: currentInstName,
          },
          proposedValue: {
            instituteId: institute.id,
            instituteName: institute.name,
            transferType: isTransfer ? 'faculty_transfer' : 'faculty_initial_mapping',
            notes: customEvidence || conflictTransferEvidence,
          },
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          evidence: isTransfer
            ? `Field Marketing Officer verified presence at ${institute.name}. Proposed transfer from ${currentInstName}. Evidence: ${customEvidence || conflictTransferEvidence || 'Present on campus'}`
            : `Field Marketing Officer proposed assigning unmapped employee to ${institute.name}. Evidence: ${customEvidence || conflictTransferEvidence || 'Verified in staff registry'}`,
          submittedBy: user.email,
          verificationStatus: 'pending',
          priority: 'high',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );

      setProposalSubmittedEmpIds((prev) => new Set(prev).add(emp.id));
      setSelectedConflictEmployee(null);
      setSelectedUnmappedEmployee(null);
      setConflictTransferEvidence('');
      toast.success(isTransfer ? 'Employee transfer observation proposed' : 'Employee mapping observation proposed');
    } catch (err: any) {
      console.error('Failed to propose employee reassignment:', err);
      toast.error('Failed to propose reassignment.');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  // 4. DUPLICATE CHECK & ADD NEW EMPLOYEE (EMPLOYEE CASE 5 & 6)
  const validateNewEmployeeForm = () => {
    const errors: Record<string, string> = {};
    if (!newName.trim()) {
      errors.name = 'Employee name is required.';
    } else if (newName.trim().length < 3) {
      errors.name = 'Employee name must be at least 3 characters.';
    }

    if (!newDesignation.trim()) {
      errors.designation = 'Designation is required.';
    }

    if (newPhone.trim() && !/^[0-9+() -]{6,20}$/.test(newPhone.trim())) {
      errors.phone = 'Please enter a valid phone number.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInitiateAddNew = (e: React.FormEvent) => {
    e.preventDefault();
    setFormTouched({ name: true, designation: true, phone: true });

    if (!validateNewEmployeeForm()) {
      toast.error('Please fix the inline errors before submitting.');
      return;
    }

    // Perform duplicate check
    const matches = employees.filter((existing) => {
      // 1. Code match
      if (newCode && existing.employeeCode.toLowerCase() === newCode.trim().toLowerCase()) {
        return true;
      }
      // 2. Phone match
      if (newPhone && existing.phone) {
        const cleanP1 = newPhone.replace(/[^0-9]/g, '');
        const cleanP2 = existing.phone.replace(/[^0-9]/g, '');
        if (cleanP1.length >= 8 && cleanP2.includes(cleanP1)) return true;
      }
      // 3. Name similarity >= 80%
      const sim = stringSimilarity(newName.trim(), existing.name);
      return sim >= 0.80;
    });

    if (matches.length > 0) {
      setPossibleDuplicates(matches);
      setShowDuplicateWarning(true);
    } else {
      handleCommitNewEmployee();
    }
  };

  const handleCommitNewEmployee = async () => {
    if (!user || !newName.trim()) return;
    setIsSubmittingNew(true);
    try {
      await submitObservation(
        {
          visitId: activeVisit?.id || 'vis-active',
          entityType: 'new_employee',
          entityId: institute.id,
          actionType: 'create',
          existingValue: null,
          proposedValue: {
            name: newName.trim(),
            employeeCode: newCode.trim() || `EMP-NEW-${Math.floor(100 + Math.random() * 900)}`,
            designation: newDesignation.trim(),
            phone: newPhone.trim(),
            instituteId: institute.id,
            instituteName: institute.name,
            evidenceNotes: newEvidence.trim(),
          },
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          evidence: `Unlisted faculty member encountered on-site: ${newEvidence.trim() || 'Verified in campus department room'}`,
          submittedBy: user.email,
          verificationStatus: 'pending',
          priority: 'high',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );

      setNewlyCreatedSuccessName(newName.trim());
      setAddModalOpen(false);
      setShowDuplicateWarning(false);
      setPossibleDuplicates([]);
      setNewName('');
      setNewCode('');
      setNewDesignation('Lecturer');
      setNewPhone('');
      setNewEvidence('');
      setFormErrors({});
      setFormTouched({});

      toast.success('New employee submitted for verification');
      setTimeout(() => setNewlyCreatedSuccessName(null), 6000);
    } catch (err: any) {
      console.error('Failed to create new employee observation:', err);
      toast.error('Failed to save new employee observation.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Breadcrumb Navigation */}
      <button
        type="button"
        onClick={onBackToInstitute}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Institute</span>
      </button>

      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Employee Mapping
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">{institute.district}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {institute.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 font-semibold">
              <span className="text-emerald-400 font-bold">{linkedEmployees.length} Employees</span> currently linked
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchOpen(true);
                setSearchQuery('');
              }}
              className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Search Employee</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAddModalOpen(true);
                setShowDuplicateWarning(false);
                setFormErrors({});
                setFormTouched({});
              }}
              className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold shadow-md shadow-emerald-950 flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {newlyCreatedSuccessName && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              New Employee <strong className="text-white">"{newlyCreatedSuccessName}"</strong> added to this visit. 
              <span className="text-emerald-200 ml-1">New Employees are reviewed before becoming trusted master data.</span>
            </div>
          </div>
        )}
      </div>

      {/* EMPLOYEE CARDS LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Faculty & Staff Roster</span>
          <span>
            {confirmedEmpIds.size} Confirmed • {reportedIssues.size} Issues Reported
          </span>
        </div>

        {linkedEmployees.map((emp) => {
          const isConfirmed = confirmedEmpIds.has(emp.id);
          const reportedIssue = reportedIssues.get(emp.id);
          const isConfirming = confirmingEmpId === emp.id;

          return (
            <div
              key={emp.id}
              className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isConfirmed
                  ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm shadow-emerald-950/30'
                  : reportedIssue
                  ? 'bg-amber-950/20 border-amber-500/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  isConfirmed 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : reportedIssue
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  <Users className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{emp.name}</h3>
                    <span className="font-mono text-[11px] font-semibold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-900">
                      {emp.employeeCode}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {emp.designation}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400">
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mapped to this Institute
                    </span>
                    <span>•</span>
                    <StatusBadge status={emp.relationshipStatus} size="sm" />
                    {emp.phone && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{emp.phone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800 justify-end">
                {isConfirmed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirmed during this visit</span>
                  </span>
                ) : reportedIssue ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Issue: {reportedIssue}</span>
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={isConfirming}
                      onClick={() => handleConfirmEmployee(emp)}
                      className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1"
                    >
                      {isConfirming ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                      <span>Confirm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIssueModalTarget(emp);
                        setIssueReason('Employee does not work here');
                        setIssueNote('');
                      }}
                      className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition"
                    >
                      Report Issue
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {linkedEmployees.length === 0 && (
          <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
            <div>No employees currently mapped to this institute.</div>
            <p className="text-[11px] text-slate-500">
              Use "Search Employee" to find existing faculty, or "Add New" to register staff found on campus.
            </p>
          </div>
        )}
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToInstitute}
          className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
        >
          Back to Institute
        </button>

        <button
          type="button"
          onClick={onContinue}
          className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. REPORT ISSUE COMPACT MODAL                                  */}
      {/* ------------------------------------------------------------- */}
      {issueModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="font-mono text-[10px] text-amber-400 font-bold">{issueModalTarget.employeeCode}</span>
                <h3 className="text-sm font-bold text-white">What is incorrect?</h3>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalTarget(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Reporting affiliation discrepancy for <strong className="text-white">{issueModalTarget.name}</strong> ({issueModalTarget.designation}).
            </p>

            <form onSubmit={handleSubmitIssue} className="space-y-3.5">
              <div className="space-y-2">
                {(['Employee does not work here', 'Wrong Institute', 'Other'] as const).map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition ${
                      issueReason === opt
                        ? 'bg-amber-950/30 border-amber-500/60 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="issueOption"
                      checked={issueReason === opt}
                      onChange={() => setIssueReason(opt)}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Optional Short Note:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Left last semester, or transferred to another district..."
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                Core Rule: Does not delete the master relationship immediately. Set to <strong>pending</strong> verification.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIssueModalTarget(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIssue}
                  className="px-4 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition"
                >
                  {isSubmittingIssue ? 'Submitting...' : 'Submit Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. SEARCH EMPLOYEE MODAL (EMPLOYEE CASE 2, 3, 4)               */}
      {/* ------------------------------------------------------------- */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-400" />
                  Search Employee Registry
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Search by Employee name, code, or phone to link or propose transfers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter employee name or ID (e.g. Mohammad Yousuf, EMP-DHK-007)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
                />
              </div>
            </div>

            {/* Results or Empty State */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {searchQuery.trim() === '' ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Type an employee name or ID to search across the master database.
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2.5">
                  <div className="text-[11px] text-slate-400 px-1 font-semibold">
                    Matching Results ({searchResults.length}):
                  </div>

                  {searchResults.map((emp) => {
                    const isAtCurrent = emp.currentInstituteId === institute.id;
                    const isUnmapped = !emp.currentInstituteId;
                    const empInstName = getInstituteName(emp.currentInstituteId);
                    const proposalSubmitted = proposalSubmittedEmpIds.has(emp.id);

                    return (
                      <div
                        key={emp.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{emp.name}</span>
                            <span className="font-mono text-[10px] text-sky-400 bg-sky-950 px-1.5 py-0.2 rounded border border-sky-900">
                              {emp.employeeCode}
                            </span>
                            <span className="text-[11px] text-slate-400">{emp.designation}</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span>Status:</span>
                            {isAtCurrent ? (
                              <strong className="text-emerald-400">Currently Mapped Here</strong>
                            ) : isUnmapped ? (
                              <strong className="text-sky-400">Currently Unmapped</strong>
                            ) : (
                              <strong className="text-amber-400">Mapped to {empInstName}</strong>
                            )}
                            {emp.phone && (
                              <>
                                <span>•</span>
                                <span className="font-mono">{emp.phone}</span>
                              </>
                            )}
                          </div>

                          {/* SCENARIO 3: Distinct Current Institute & Proposed Institute badge */}
                          {!isAtCurrent && !isUnmapped && (
                            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 text-[11px] space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-amber-400">Transfer Reassignment Candidate</span>
                                <span className="text-slate-500 font-mono">Master Conflict</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950 border border-slate-800">
                                <div>
                                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Current Institute:</span>
                                  <span className="font-bold text-amber-300 line-through decoration-amber-500/60 block mt-0.5">
                                    {empInstName}
                                  </span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div className="text-right">
                                  <span className="text-[10px] text-slate-500 block uppercase font-mono">Proposed:</span>
                                  <span className="font-bold text-emerald-300 block mt-0.5">
                                    {institute.name}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isAtCurrent ? (
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-900">
                              Already Linked
                            </span>
                          ) : proposalSubmitted ? (
                            <span className="text-[11px] font-semibold text-amber-300 bg-amber-950/60 px-2 py-1 rounded border border-amber-900">
                              Proposal Queued
                            </span>
                          ) : isUnmapped ? (
                            /* EMPLOYEE CASE 3: UNMAPPED */
                            <button
                              type="button"
                              onClick={() => setSelectedUnmappedEmployee(emp)}
                              className="py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition"
                            >
                              Map to this Institute
                            </button>
                          ) : (
                            /* EMPLOYEE CASE 2: MAPPED ELSEWHERE */
                            <button
                              type="button"
                              onClick={() => setSelectedConflictEmployee(emp)}
                              className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition"
                            >
                              Propose Transfer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* EMPLOYEE CASE 4: EMPLOYEE NOT FOUND */
                <div className="text-center py-8 space-y-3">
                  <div className="text-xs font-semibold text-slate-300">
                    Employee not found for "{searchQuery}"
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    This staff member is not currently in the master database. You can register them as a new faculty member on-site.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="py-2 px-3 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      Clear Search
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchOpen(false);
                        setNewName(searchQuery);
                        setAddModalOpen(true);
                      }}
                      className="py-2 px-3.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Employee</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs">
              <span className="text-slate-500 text-[11px]">Visiting: {institute.name}</span>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: EMPLOYEE CASE 2 (TRANSFER FROM OTHER INSTITUTE) */}
      {selectedConflictEmployee && (
        <ConfirmationModal
          isOpen={Boolean(selectedConflictEmployee)}
          onClose={() => setSelectedConflictEmployee(null)}
          title="Propose Faculty Reassignment / Transfer"
          description={`Current Institute: ${getInstituteName(selectedConflictEmployee.currentInstituteId)}\nProposed Institute: ${institute.name}\n\nPropose transferring ${selectedConflictEmployee.name} (${selectedConflictEmployee.designation}) from ${getInstituteName(selectedConflictEmployee.currentInstituteId)} to ${institute.name}?`}
          confirmLabel="Propose Reassignment"
          variant="warning"
          isLoading={isSubmittingProposal}
          requireReason={true}
          reasonLabel="Transfer Reason / Evidence:"
          reasonOptions={[
            'Physically present and teaching classes at this campus',
            'Signed teacher attendance roster',
            'Official institutional transfer circular noticed',
            'Staff confirmed new placement',
            'Other field finding'
          ]}
          onConfirm={(reason, note) => {
            const combinedEvidence = `${reason}${note ? ' - ' + note : ''}`;
            handleProposeConflictChange(selectedConflictEmployee, combinedEvidence);
          }}
        />
      )}

      {/* CONFIRMATION MODAL: EMPLOYEE CASE 3 (MAP UNMAPPED EMPLOYEE) */}
      {selectedUnmappedEmployee && (
        <ConfirmationModal
          isOpen={Boolean(selectedUnmappedEmployee)}
          onClose={() => setSelectedUnmappedEmployee(null)}
          title="Map Unmapped Faculty Member"
          description={`Propose affiliating unmapped employee "${selectedUnmappedEmployee.name}" (${selectedUnmappedEmployee.designation}) with "${institute.name}"?`}
          confirmLabel="Propose Affiliation"
          variant="primary"
          isLoading={isSubmittingProposal}
          requireReason={true}
          reasonLabel="Affiliation Basis:"
          reasonOptions={[
            'Present on-site during campus visit',
            'Listed on departmental roster',
            'Confirmed with Principal',
            'Other evidence'
          ]}
          onConfirm={(reason, note) => {
            const combinedEvidence = `${reason}${note ? ' - ' + note : ''}`;
            handleProposeConflictChange(selectedUnmappedEmployee, combinedEvidence);
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. CREATE NEW EMPLOYEE MODAL (EMPLOYEE CASE 6)                 */}
      {/* ------------------------------------------------------------- */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">New Observation</span>
                <h3 className="text-base font-bold text-white mt-0.5">Create New Employee</h3>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInitiateAddNew} noValidate className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Employee Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Mohammad Masud"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (formErrors.name) validateNewEmployeeForm();
                  }}
                  onBlur={() => {
                    setFormTouched((prev) => ({ ...prev, name: true }));
                    validateNewEmployeeForm();
                  }}
                  className={`w-full bg-slate-950 border rounded-lg p-2.5 text-xs text-white focus:outline-emerald-500 transition ${
                    formTouched.name && formErrors.name ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700'
                  }`}
                />
                {formTouched.name && formErrors.name && (
                  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formErrors.name}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Employee ID if available
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EMP1024"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Designation *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Assistant Professor, Physics"
                    value={newDesignation}
                    onChange={(e) => {
                      setNewDesignation(e.target.value);
                      if (formErrors.designation) validateNewEmployeeForm();
                    }}
                    onBlur={() => {
                      setFormTouched((prev) => ({ ...prev, designation: true }));
                      validateNewEmployeeForm();
                    }}
                    className={`w-full bg-slate-950 border rounded-lg p-2.5 text-xs text-white focus:outline-emerald-500 transition ${
                      formTouched.designation && formErrors.designation ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700'
                    }`}
                  />
                  {formTouched.designation && formErrors.designation && (
                    <p className="mt-1 text-[11px] text-rose-400">{formErrors.designation}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Phone if available
                </label>
                <input
                  type="text"
                  placeholder="+88017..."
                  value={newPhone}
                  onChange={(e) => {
                    setNewPhone(e.target.value);
                    if (formErrors.phone) validateNewEmployeeForm();
                  }}
                  onBlur={() => {
                    setFormTouched((prev) => ({ ...prev, phone: true }));
                    validateNewEmployeeForm();
                  }}
                  className={`w-full bg-slate-950 border rounded-lg p-2.5 text-xs text-white focus:outline-emerald-500 font-mono ${
                    formTouched.phone && formErrors.phone ? 'border-rose-500' : 'border-slate-700'
                  }`}
                />
                {formTouched.phone && formErrors.phone && (
                  <p className="mt-1 text-[11px] text-rose-400">{formErrors.phone}</p>
                )}
              </div>

              {/* Locked/Auto-filled Institute */}
              <div>
                <label className="block font-semibold text-slate-400 mb-1">
                  Institute (Auto-locked to Current Visit)
                </label>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-medium flex items-center justify-between">
                  <span>{institute.name}</span>
                  <span className="font-mono text-[10px] text-emerald-400">{institute.instituteCode}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Add supporting evidence (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Met in laboratory, shown ID card, listed on department board..."
                  value={newEvidence}
                  onChange={(e) => setNewEvidence(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                <span className="font-bold text-white">Trust Governance:</span> New Employees are reviewed before becoming trusted master data.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition"
                >
                  {isSubmittingNew ? 'Saving...' : 'Save & Validate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. DUPLICATE CHECK WARNING MODAL (EMPLOYEE CASE 5)             */}
      {/* ------------------------------------------------------------- */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border-2 border-amber-500 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Possible existing Employee found</h3>
                <p className="text-xs text-amber-300 mt-0.5">
                  A potential duplicate record with similar credentials already exists in the system.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400">Possible Matches in Registry:</div>
              {possibleDuplicates.map((match) => (
                <div
                  key={match.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="font-bold text-white">{match.name}</span>
                    <span className="font-mono text-sky-400 ml-2">({match.employeeCode})</span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {match.designation} • {getInstituteName(match.currentInstituteId)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDuplicateWarning(false);
                      setAddModalOpen(false);
                      if (match.currentInstituteId !== institute.id) {
                        setSelectedConflictEmployee(match);
                      } else {
                        handleConfirmEmployee(match);
                      }
                    }}
                    className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700 shrink-0"
                  >
                    This is the same Employee
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDuplicateWarning(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                disabled={isSubmittingNew}
                onClick={handleCommitNewEmployee}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition"
              >
                {isSubmittingNew ? 'Saving...' : 'Continue as Distinct Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
