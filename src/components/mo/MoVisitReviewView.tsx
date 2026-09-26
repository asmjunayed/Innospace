import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  Users, 
  MapPin, 
  Trash2, 
  Edit3, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight, 
  Check, 
  X, 
  ShieldCheck, 
  AlertCircle,
  Compass,
  FileText,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useVisits } from '../../hooks/useVisits';
import { useObservations } from '../../hooks/useObservations';
import { useInstitutes } from '../../hooks/useInstitutes';
import { FieldObservation, Institute } from '../../types';
import { useToast } from '../../context/ToastContext';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface Props {
  onBackToInstitute: () => void;
  onNavigateToSubmissions: () => void;
  onBackToHome: () => void;
}

export const MoVisitReviewView: React.FC<Props> = ({
  onBackToInstitute,
  onNavigateToSubmissions,
  onBackToHome,
}) => {
  const { user } = useAuth();
  const { location } = useGps();
  const { institutes } = useInstitutes();
  const { activeVisit, completeVisit } = useVisits(user?.email);
  const { observations, deleteObservation, updateObservation } = useObservations();
  const { toast } = useToast();

  // Selected visit observations only
  const visitId = activeVisit?.id || 'vis-active';
  const visitObservations = observations.filter((o) => o.visitId === visitId);

  // Active Institute details
  const activeInstitute: Institute | undefined = activeVisit
    ? institutes.find((i) => i.id === activeVisit.instituteId) || {
        id: activeVisit.instituteId,
        instituteCode: 'NEW-CANDIDATE',
        name: 'New Candidate Institute',
        type: 'College',
        district: 'Dhaka',
        area: 'Field Location',
        address: 'Discovered during field visit',
        latitude: activeVisit.currentLatitude,
        longitude: activeVisit.currentLongitude,
        locationStatus: 'missing',
        dataSource: 'field_visit',
        createdAt: activeVisit.startedAt,
        updatedAt: activeVisit.startedAt,
      }
    : institutes[0];

  // Acknowledgment checkbox for duplicate warnings
  const [duplicateAcknowledged, setDuplicateAcknowledged] = useState(true);

  // Modal states
  const [obsToDelete, setObsToDelete] = useState<string | null>(null);
  const [editingObs, setEditingObs] = useState<FieldObservation | null>(null);
  const [editEvidence, setEditEvidence] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    institute: true,
    employees: true,
    relationships: true,
    newEmployees: true,
    newInstitutes: true,
    issues: true,
  });

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // State: Submission progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    visitCode: string;
    totalObs: number;
    routineCount: number;
    pendingCount: number;
  } | null>(null);

  // Group observations belonging to this visit
  const locationObs = visitObservations.filter((o) => o.entityType === 'institute_location');
  const infoObs = visitObservations.filter((o) => o.entityType === 'institute_information');
  
  const confirmedEmpObs = visitObservations.filter(
    (o) => o.entityType === 'employee_relationship' && o.actionType === 'confirm'
  );

  const relationshipChangeObs = visitObservations.filter(
    (o) => o.entityType === 'employee_relationship' && (o.actionType === 'update' || o.verificationStatus === 'pending')
  );

  const newEmpObs = visitObservations.filter((o) => o.entityType === 'new_employee');
  const newInstObs = visitObservations.filter((o) => o.entityType === 'new_institute');

  const issueObs = visitObservations.filter(
    (o) =>
      o.actionType === 'report_issue' ||
      (o.entityType === 'institute_location' && o.actionType === 'update') ||
      o.verificationStatus === 'pending'
  );

  // SUBMISSION VALIDATIONS
  const validationErrors: string[] = [];

  for (const emp of newEmpObs) {
    const prop = emp.proposedValue || {};
    if (!prop.name || String(prop.name).trim() === '') {
      validationErrors.push(`Incomplete new employee record: Missing name on observation ${emp.observationCode}`);
    }
  }

  for (const inst of newInstObs) {
    const prop = inst.proposedValue || {};
    if (!prop.name || !prop.address || !prop.area) {
      validationErrors.push(`Incomplete new institute record: Missing name or address details on observation ${inst.observationCode}`);
    }
  }

  for (const obs of visitObservations) {
    if (obs.latitude !== null && (obs.latitude < -90 || obs.latitude > 90)) {
      validationErrors.push(`Invalid latitude coordinate ${obs.latitude} on observation ${obs.observationCode}`);
    }
    if (obs.longitude !== null && (obs.longitude < -180 || obs.longitude > 180)) {
      validationErrors.push(`Invalid longitude coordinate ${obs.longitude} on observation ${obs.observationCode}`);
    }
  }

  const hasDuplicateWarnings = newEmpObs.length > 0 || newInstObs.length > 0 || relationshipChangeObs.length > 0;
  if (hasDuplicateWarnings && !duplicateAcknowledged) {
    validationErrors.push('Please acknowledge that potential duplicate checks have been reviewed.');
  }

  // Handle Remove draft observation with ConfirmationModal
  const handleConfirmDeleteObs = async () => {
    if (!obsToDelete) return;
    try {
      await deleteObservation(obsToDelete);
      setObsToDelete(null);
      toast.info('Draft observation removed');
    } catch (err) {
      console.error('Failed to remove observation:', err);
      toast.error('Failed to remove observation.');
    }
  };

  // Handle Edit draft observation
  const handleOpenEdit = (obs: FieldObservation) => {
    setEditingObs(obs);
    setEditEvidence(obs.evidence || '');
    setEditNotes(obs.proposedValue?.notes || obs.proposedValue?.correctionNote || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingObs) return;

    await updateObservation(editingObs.id, {
      evidence: editEvidence.trim(),
      proposedValue: {
        ...editingObs.proposedValue,
        notes: editNotes.trim(),
        correctionNote: editNotes.trim(),
      },
    });

    setEditingObs(null);
    toast.success('Observation note updated');
  };

  // Submit Visit
  const handleSubmitVisit = async () => {
    if (validationErrors.length > 0) {
      toast.error('Cannot submit visit with validation errors.');
      return;
    }
    if (!user) return;
    setIsSubmitting(true);

    try {
      const routineCount = visitObservations.filter((o) => o.verificationStatus === 'routine').length;
      const pendingCount = visitObservations.filter((o) => o.verificationStatus === 'pending').length;

      let visitCode = activeVisit?.visitCode || `VIS-${new Date().getFullYear()}-001`;
      if (activeVisit) {
        const completed = await completeVisit(
          activeVisit.id,
          location.latitude,
          location.longitude,
          location.accuracy,
          user.name
        );
        if (completed) {
          visitCode = completed.visitCode;
        }
      }

      setSubmitResult({
        visitCode,
        totalObs: visitObservations.length,
        routineCount,
        pendingCount,
      });
      toast.success('Visit submitted');
    } catch (err) {
      console.error('Failed to submit visit:', err);
      toast.error('Failed to submit visit. Please try again.');
    } finally {
      setIsSubmitting(false);
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
        <span>← Back to Institute</span>
      </button>

      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
              Visit Summary & Validation
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Review Visit
            </h1>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-300">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <strong className="text-white text-sm">{activeInstitute?.name}</strong>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{activeInstitute?.area}, {activeInstitute?.district}</span>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              {activeVisit?.visitCode || 'ACTIVE SESSION'}
            </span>
            <div className="text-[11px] text-emerald-400 mt-1">
              {visitObservations.length} Draft Observations
            </div>
          </div>
        </div>

        <div className="mt-3.5 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
          <strong className="text-white">Local-First Storage:</strong> Observations are saved directly in IndexedDB. No fake cloud sync — changes are instant and work 100% offline.
        </div>
      </div>

      {/* SUCCESS SCREEN STATE */}
      {submitResult ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-xl animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800">
              {submitResult.visitCode}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-2">
              Visit submitted
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
              All field observations have been permanently saved locally and queued for verification.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 max-w-sm mx-auto space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Total Observations:</span>
              <strong className="text-white font-mono">{submitResult.totalObs} observations recorded</strong>
            </div>
            <div className="flex items-center justify-between text-emerald-400">
              <span>Routine Confirmations:</span>
              <strong className="font-mono">{submitResult.routineCount} routine confirmations</strong>
            </div>
            <div className="flex items-center justify-between text-amber-400">
              <span>Pending Review:</span>
              <strong className="font-mono">{submitResult.pendingCount} items pending verification</strong>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic max-w-sm mx-auto">
            Stored locally in browser prototype (IndexedDB). Ready for field operations without network dependencies.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateToSubmissions}
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950 transition"
            >
              View My Submission
            </button>
            <button
              type="button"
              onClick={onBackToHome}
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
            >
              Back to Home
            </button>
          </div>
        </div>
      ) : (
        /* MAIN GROUPED SECTIONS */
        <div className="space-y-4">
          {/* SECTION 1: Institute (Location & Information) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div 
              onClick={() => toggleSection('institute')}
              className="p-4 bg-slate-950/60 flex items-center justify-between cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  SECTION 1: Institute
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {locationObs.length + infoObs.length} Items
                </span>
                {expandedSections.institute ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.institute && (
              <div className="p-4 space-y-3 text-xs">
                {/* Location Subsection */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">
                      Location Status
                    </span>
                    <div className="text-white font-medium mt-0.5 flex items-center gap-2">
                      {locationObs.length > 0 ? (
                        locationObs[0].actionType === 'confirm' ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Confirmed location match
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" /> Proposed Location Update
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 italic">No coordinates recorded</span>
                      )}
                    </div>
                  </div>

                  {locationObs.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(locationObs[0])}
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        title="Edit evidence note"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setObsToDelete(locationObs[0].id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                        title="Remove observation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Information Subsection */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">
                      Information Status
                    </span>
                    <div className="text-white font-medium mt-0.5">
                      {infoObs.length > 0 ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" /> Issue Reported: {infoObs[0].proposedValue?.reportedField || 'Information Discrepancy'}
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="w-4 h-4" /> No changes (Information looks correct)
                        </span>
                      )}
                    </div>
                  </div>

                  {infoObs.length > 0 && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(infoObs[0])}
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        title="Edit evidence"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setObsToDelete(infoObs[0].id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                        title="Remove observation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Employees (Routine Confirmations) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div 
              onClick={() => toggleSection('employees')}
              className="p-4 bg-slate-950/60 flex items-center justify-between cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  SECTION 2: Employees
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {confirmedEmpObs.length} confirmed
                </span>
                {expandedSections.employees ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.employees && (
              <div className="p-4 space-y-2 text-xs">
                {confirmedEmpObs.length > 0 ? (
                  confirmedEmpObs.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-white">
                          {obs.existingValue?.employeeName || 'Staff Member'}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 ml-2">
                          ({obs.existingValue?.employeeCode || 'ID On Record'})
                        </span>
                        <div className="text-[11px] text-emerald-400 mt-0.5">
                          ✓ Confirmed active during this visit
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setObsToDelete(obs.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                          title="Remove confirmation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-400 italic">
                    0 faculty confirmed during this visit.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: Relationship Changes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div 
              onClick={() => toggleSection('relationships')}
              className="p-4 bg-slate-950/60 flex items-center justify-between cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center gap-2.5">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  SECTION 3: Relationship Changes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 font-mono">
                  {relationshipChangeObs.length} pending verification
                </span>
                {expandedSections.relationships ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.relationships && (
              <div className="p-4 space-y-2 text-xs">
                {relationshipChangeObs.length > 0 ? (
                  relationshipChangeObs.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {obs.existingValue?.employeeName} ({obs.existingValue?.employeeCode})
                        </div>
                        <div className="text-[11px] text-amber-300 mt-0.5">
                          Propose Transfer from: {obs.existingValue?.currentInstituteName || 'Other Institute'} → {activeInstitute?.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(obs)}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setObsToDelete(obs.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-400 italic">
                    0 relationship changes requested.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 4: New Employees */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div 
              onClick={() => toggleSection('newEmployees')}
              className="p-4 bg-slate-950/60 flex items-center justify-between cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  SECTION 4: New Employees
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-400 font-mono">
                  {newEmpObs.length} pending verification
                </span>
                {expandedSections.newEmployees ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.newEmployees && (
              <div className="p-4 space-y-2 text-xs">
                {newEmpObs.length > 0 ? (
                  newEmpObs.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {obs.proposedValue?.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {obs.proposedValue?.designation} • Phone: {obs.proposedValue?.phone || 'None'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(obs)}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setObsToDelete(obs.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-400 italic">
                    0 new employees added during this visit.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 5: New Institutes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div 
              onClick={() => toggleSection('newInstitutes')}
              className="p-4 bg-slate-950/60 flex items-center justify-between cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  SECTION 5: New Institutes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono">
                  {newInstObs.length}
                </span>
                {expandedSections.newInstitutes ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.newInstitutes && (
              <div className="p-4 space-y-2 text-xs">
                {newInstObs.length > 0 ? (
                  newInstObs.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {obs.proposedValue?.name}
                        </div>
                        <div className="text-[11px] text-amber-300 mt-0.5">
                          {obs.proposedValue?.type} • {obs.proposedValue?.area}, {obs.proposedValue?.district}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setObsToDelete(obs.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-400 italic">
                    0 unregistered institutes reported.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 6: Issues */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div 
              onClick={() => toggleSection('issues')}
              className="p-4 bg-slate-950/60 flex items-center justify-between cursor-pointer border-b border-slate-800/80"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  SECTION 6: Issues & Exceptions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-400 font-mono">
                  {issueObs.length} issues / exceptions logged
                </span>
                {expandedSections.issues ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>
            </div>

            {expandedSections.issues && (
              <div className="p-4 space-y-2 text-xs">
                {issueObs.length > 0 ? (
                  issueObs.map((obs) => (
                    <div
                      key={obs.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-rose-300">
                          {obs.entityType.replace(/_/g, ' ').toUpperCase()} • {obs.actionType.toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {obs.evidence || 'Field discrepancy reported for review.'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setObsToDelete(obs.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 rounded-xl bg-slate-950 text-slate-400 italic">
                    0 issues or exceptions recorded.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DUPLICATE WARNING ACKNOWLEDGMENT CHECKBOX */}
          {hasDuplicateWarnings && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={duplicateAcknowledged}
                  onChange={(e) => setDuplicateAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-300 leading-relaxed">
                  I acknowledge and confirm that potential duplicate checks have been reviewed for unlisted staff or institutions.
                </span>
              </label>
            </div>
          )}

          {/* VALIDATION ERRORS BANNER */}
          {validationErrors.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-400">
                <AlertCircle className="w-4 h-4" />
                <span>Cannot submit visit — validation issues detected:</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 pl-1 text-[11px]">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* FINAL SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSubmitting || validationErrors.length > 0}
              onClick={handleSubmitVisit}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Finalizing Submission...</span>
                </span>
              ) : (
                <>
                  <span>Submit Visit</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL TO DELETE DRAFT OBSERVATION */}
      <ConfirmationModal
        isOpen={Boolean(obsToDelete)}
        onClose={() => setObsToDelete(null)}
        title="Remove Draft Observation?"
        description="Are you sure you want to remove this observation from the current visit draft? This action cannot be undone."
        confirmLabel="Remove Observation"
        variant="danger"
        onConfirm={handleConfirmDeleteObs}
      />

      {/* EDIT OBSERVATION MODAL */}
      {editingObs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Edit Draft Observation Note</h3>
              <button
                type="button"
                onClick={() => setEditingObs(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Supporting Evidence / Field Rationale:
                </label>
                <textarea
                  rows={3}
                  value={editEvidence}
                  onChange={(e) => setEditEvidence(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Additional Note:
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingObs(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
