import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  ChevronLeft, 
  Navigation, 
  ShieldCheck, 
  Compass, 
  Check, 
  Edit3, 
  HelpCircle,
  X,
  RefreshCw
} from 'lucide-react';
import { Institute, FieldObservation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useVisits } from '../../hooks/useVisits';
import { useObservations } from '../../hooks/useObservations';
import { useToast } from '../../context/ToastContext';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';
import { LocationTriageCards } from '../common/LocationTriageCards';

interface Props {
  institute: Institute;
  onChooseAnotherInstitute: () => void;
  onContinueToEmployees: (instituteId: string) => void;
}

export const MoInstituteVerificationView: React.FC<Props> = ({
  institute,
  onChooseAnotherInstitute,
  onContinueToEmployees,
}) => {
  const { user } = useAuth();
  const { location, calculateDistanceMeters, isDemoMode, refreshRealGps, isLocating, isPoorAccuracy } = useGps();
  const { settings } = useAppSettings();
  const { activeVisit, startVisit } = useVisits(user?.email);
  const { submitObservation } = useObservations();
  const { toast } = useToast();

  // State: Confirmation step
  const [isInstituteConfirmed, setIsInstituteConfirmed] = useState(
    activeVisit ? activeVisit.instituteId === institute.id : false
  );
  const [isConfirmingInstitute, setIsConfirmingInstitute] = useState(false);

  // State: Location verification action status
  const [locationDecision, setLocationDecision] = useState<'confirmed' | 'updated_proposed' | 'kept_existing' | null>(null);
  const [isSubmittingLocation, setIsSubmittingLocation] = useState(false);

  // Confirmation Modals for significant actions
  const [showLocationUpdateModal, setShowLocationUpdateModal] = useState(false);
  const [locationUpdateReason, setLocationUpdateReason] = useState('Main entrance gate relocated');
  const [locationUpdateNote, setLocationUpdateNote] = useState('');

  // State: Institute Information verification
  const [infoStatus, setInfoStatus] = useState<'confirmed' | 'reported' | null>(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueField, setIssueField] = useState<'Address' | 'Institute Name' | 'Type' | 'Other'>('Address');
  const [issueNote, setIssueNote] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Location calculations
  const hasGps = location.latitude !== 0 && location.longitude !== 0;
  const hasStoredCoords = institute.latitude !== null && institute.longitude !== null;

  let distanceMeters: number | null = null;
  let isConsistent = false;

  if (hasGps && hasStoredCoords) {
    distanceMeters = calculateDistanceMeters(institute.latitude!, institute.longitude!);
    isConsistent = distanceMeters <= settings.locationVerificationThresholdMeters;
  }

  // 1. Confirm Visiting Institute
  const handleConfirmInstitute = async () => {
    setIsConfirmingInstitute(true);
    try {
      if (!activeVisit || activeVisit.instituteId !== institute.id) {
        await startVisit(
          institute.id,
          hasGps ? location.latitude : null,
          hasGps ? location.longitude : null,
          hasGps ? location.accuracy : null,
          user?.name || 'Marketing Officer'
        );
      }
      setIsInstituteConfirmed(true);
      toast.success('Institute check-in confirmed');
    } catch (err: any) {
      console.error('Failed to confirm visit:', err);
      toast.error('Failed to confirm check-in. Please try again.');
    } finally {
      setIsConfirmingInstitute(false);
    }
  };

  // 2. Case A: Distance <= 100m -> Confirm Location
  const handleConfirmLocationConsistent = async () => {
    if (!user) return;
    setIsSubmittingLocation(true);
    try {
      await submitObservation(
        {
          visitId: activeVisit?.id || 'vis-active',
          entityType: 'institute_location',
          entityId: institute.id,
          actionType: 'confirm',
          existingValue: {
            latitude: institute.latitude,
            longitude: institute.longitude,
            locationStatus: institute.locationStatus,
          },
          proposedValue: {
            latitude: institute.latitude,
            longitude: institute.longitude,
            confirmed: true,
          },
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          evidence: `Verified on-site by ${user.name}. Distance was ${distanceMeters}m from stored coordinates (<= ${settings.locationVerificationThresholdMeters}m threshold).`,
          submittedBy: user.email,
          verificationStatus: 'routine',
          priority: 'low',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );
      setLocationDecision('confirmed');
      toast.success('Location observation saved');
    } catch (err: any) {
      console.error('Failed to confirm location:', err);
      toast.error('Error saving location confirmation.');
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  // 2. Case B: Distance > 100m or Missing -> Propose Current Location
  const handleExecuteLocationUpdate = async (reason?: string, note?: string) => {
    if (!user) return;
    setIsSubmittingLocation(true);
    try {
      const userReason = reason || locationUpdateReason;
      const userNote = note || locationUpdateNote;

      await submitObservation(
        {
          visitId: activeVisit?.id || 'vis-active',
          entityType: 'institute_location',
          entityId: institute.id,
          actionType: 'update',
          existingValue: {
            latitude: institute.latitude,
            longitude: institute.longitude,
            locationStatus: institute.locationStatus,
          },
          proposedValue: {
            latitude: location.latitude,
            longitude: location.longitude,
            source: 'field_gps_update',
            discrepancyMeters: distanceMeters,
            updateReason: userReason,
            notes: userNote,
          },
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          evidence: `Field officer at gate recorded new GPS coordinates. Reason: ${userReason}. Note: ${userNote || 'None'}. Distance discrepancy: ${distanceMeters ?? 'missing'}m.`,
          submittedBy: user.email,
          verificationStatus: 'pending',
          priority: 'medium',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );
      setLocationDecision('updated_proposed');
      setShowLocationUpdateModal(false);
      setLocationUpdateNote('');
      toast.success('Location observation saved');
    } catch (err: any) {
      console.error('Failed to propose location update:', err);
      toast.error('Error proposing location update.');
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  // 2. Case B: Retain Existing Location
  const handleKeepExistingLocation = async () => {
    if (!user) return;
    setIsSubmittingLocation(true);
    try {
      await submitObservation(
        {
          visitId: activeVisit?.id || 'vis-active',
          entityType: 'institute_location',
          entityId: institute.id,
          actionType: 'confirm',
          existingValue: {
            latitude: institute.latitude,
            longitude: institute.longitude,
          },
          proposedValue: {
            latitude: institute.latitude,
            longitude: institute.longitude,
            retained: true,
          },
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          evidence: `Field officer elected to retain existing master coordinates despite ${distanceMeters ?? 'missing'}m distance.`,
          submittedBy: user.email,
          verificationStatus: 'routine',
          priority: 'low',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );
      setLocationDecision('kept_existing');
      toast.success('Existing location observation saved');
    } catch (err: any) {
      console.error('Failed to retain location:', err);
      toast.error('Error recording location retention.');
    } finally {
      setIsSubmittingLocation(false);
    }
  };

  // 3. Institute Info Confirmation
  const handleConfirmInfo = () => {
    setInfoStatus('confirmed');
    toast.success('Information confirmed');
  };

  // 3. Report Information Issue
  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !issueNote.trim()) return;
    setIsSubmittingIssue(true);
    try {
      await submitObservation(
        {
          visitId: activeVisit?.id || 'vis-active',
          entityType: 'institute_information',
          entityId: institute.id,
          actionType: 'report_issue',
          existingValue: {
            name: institute.name,
            address: institute.address,
            type: institute.type,
          },
          proposedValue: {
            reportedField: issueField,
            correctionNote: issueNote.trim(),
          },
          latitude: hasGps ? location.latitude : null,
          longitude: hasGps ? location.longitude : null,
          accuracy: hasGps ? location.accuracy : null,
          evidence: `Field observation on ${issueField}: ${issueNote.trim()}`,
          submittedBy: user.email,
          verificationStatus: 'pending',
          priority: 'medium',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );
      setInfoStatus('reported');
      setShowIssueModal(false);
      setIssueNote('');
      toast.success('Information observation saved');
    } catch (err: any) {
      console.error('Failed to submit info issue:', err);
      toast.error('Failed to submit observation.');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Navigation & Breadcrumb */}
      <button
        type="button"
        onClick={onChooseAnotherInstitute}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Institute Discovery</span>
      </button>

      {/* Institute Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-emerald-400 font-bold">
                {institute.instituteCode}
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {institute.type}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">
                {institute.district} District
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {institute.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {institute.address} • <strong className="text-slate-200">{institute.area}, {institute.district}</strong>
            </p>
          </div>

          <div className="self-start sm:self-center">
            <StatusBadge status={institute.locationStatus} size="md" />
          </div>
        </div>

        {/* STEP 1: Institute Confirmation Question */}
        {!isInstituteConfirmed ? (
          <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center sm:text-left">
              <h3 className="text-sm font-bold text-white">
                Are you visiting this Institute?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Confirm your check-in to begin field location validation and faculty inspection.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={handleConfirmInstitute}
                disabled={isConfirmingInstitute}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-950 flex items-center justify-center gap-2 transition"
              >
                {isConfirmingInstitute ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Confirming Check-In...</span>
                  </span>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Yes, Confirm Institute</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onChooseAnotherInstitute}
                className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition"
              >
                Choose Another Institute
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Institute Check-In Confirmed</span>
            </div>
            <button
              type="button"
              onClick={onChooseAnotherInstitute}
              className="text-xs text-slate-400 hover:text-white underline underline-offset-4"
            >
              Change Institute
            </button>
          </div>
        )}
      </div>

      {/* Only show subsequent validation sections once Institute is confirmed */}
      {isInstituteConfirmed && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* STEP 2: LOCATION VALIDATION WORKBENCH */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Location Validation
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Gate Threshold: ±{settings.locationVerificationThresholdMeters}m
              </span>
            </div>

            {/* POOR GPS ACCURACY WARNING */}
            {isPoorAccuracy && (
              <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/40 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Poor GPS Accuracy (±{location.accuracy}m):</strong> Device satellite reception is degraded. Coordinates will be recorded with this accuracy figure.
                </span>
              </div>
            )}

            {/* THREE-METRIC LOCATION TRIAGE (Current GPS, Stored Location, Distance) */}
            <LocationTriageCards
              currentGps={{
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                locationName: location.locationName,
                isDemo: isDemoMode,
                isPoorAccuracy
              }}
              storedLocation={{
                latitude: institute.latitude,
                longitude: institute.longitude,
                locationStatus: institute.locationStatus,
                dataSource: institute.dataSource,
                address: institute.address
              }}
              distanceMeters={distanceMeters}
              thresholdMeters={settings.locationVerificationThresholdMeters}
              isConsistent={isConsistent}
            />

            {/* LOCATION DECISION ACTIONS */}
            <div className="pt-2">
              {/* CASE 1 & 2: Distance <= 100m -> Location matches */}
              {hasGps && hasStoredCoords && isConsistent && (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Location matches master coordinates</h3>
                      <p className="text-xs text-slate-300">
                        You are physically present within {distanceMeters}m of the stored institute gate.
                      </p>
                    </div>
                  </div>

                  {locationDecision === 'confirmed' ? (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Location confirmed for this visit. Master coordinates retained.</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConfirmLocationConsistent}
                      disabled={isSubmittingLocation}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-950 flex items-center justify-center gap-2 transition"
                    >
                      {isSubmittingLocation ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Recording Confirmation...</span>
                        </span>
                      ) : (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Confirm Location</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* CASE 3: Distance > 100m -> Location differs significantly */}
              {hasGps && hasStoredCoords && !isConsistent && (
                <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/40 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Location differs significantly</h3>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                        The stored location is <strong className="text-amber-300">{distanceMeters}m away</strong> from your current device position, which exceeds the {settings.locationVerificationThresholdMeters}m gate threshold.
                      </p>
                    </div>
                  </div>

                  {locationDecision ? (
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>
                        {locationDecision === 'updated_proposed'
                          ? 'Observation queued: Proposed new GPS coordinates submitted for Admin verification.'
                          : 'Retained existing master coordinates on record.'}
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowLocationUpdateModal(true)}
                        disabled={isSubmittingLocation}
                        className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-950 flex items-center justify-center gap-2 transition"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>Use Current Location</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleKeepExistingLocation}
                        disabled={isSubmittingLocation}
                        className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                      >
                        Keep Existing Location
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* CASE 4: Missing coordinates on existing institute */}
              {hasGps && !hasStoredCoords && (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Existing Institute Missing Coordinates</h3>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                        This institution was imported without latitude/longitude coordinates. Capture your current position to assign verified coordinates to the master record.
                      </p>
                    </div>
                  </div>

                  {locationDecision === 'updated_proposed' ? (
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>Coordinates recorded and forwarded for Admin verification.</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLocationUpdateModal(true)}
                      disabled={isSubmittingLocation}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-emerald-950 flex items-center justify-center gap-2 transition"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Capture & Assign Current GPS</span>
                    </button>
                  )}
                </div>
              )}

              {/* CASE C: GPS Unavailable */}
              {!hasGps && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                    <AlertCircle className="w-4 h-4" />
                    <span>Current location unavailable</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Location coordinates could not be acquired from device sensors. You can still continue to verify employee rosters and report information issues.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 3: INSTITUTE INFORMATION SECTION */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Institute Information
              </h2>
              <span className="text-[11px] text-slate-400">Master Record Summary</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-500 font-medium">Name:</span>
                  <div className="text-white font-semibold mt-0.5">{institute.name}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Type:</span>
                  <div className="text-slate-200 mt-0.5">{institute.type}</div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Area / District:</span>
                  <div className="text-slate-200 mt-0.5">{institute.area}, {institute.district}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80">
                <span className="text-slate-500 font-medium">Full Address:</span>
                <div className="text-slate-200 mt-0.5">{institute.address}</div>
              </div>
            </div>

            {/* Quick Actions: Look Correct vs Report Issue */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={handleConfirmInfo}
                className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  infoStatus === 'confirmed'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Information looks correct</span>
              </button>

              <button
                type="button"
                onClick={() => setShowIssueModal(true)}
                className={`w-full sm:w-auto py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                  infoStatus === 'reported'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Report Information Issue</span>
              </button>
            </div>
          </div>

          {/* PRIMARY BOTTOM ACTION: Continue to Employees */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onContinueToEmployees(institute.id)}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition"
            >
              <span>Continue to Employees</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR SIGNIFICANT LOCATION DISCREPANCY */}
      <ConfirmationModal
        isOpen={showLocationUpdateModal}
        onClose={() => setShowLocationUpdateModal(false)}
        title="Propose Location Coordinate Update"
        description={`Your current GPS coordinates (${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}) differ from the master record by ${distanceMeters ?? 'missing'}m. Proposing this will create a verification request for Admin review without directly overwriting master data.`}
        confirmLabel="Submit Location Observation"
        variant="warning"
        isLoading={isSubmittingLocation}
        requireReason={true}
        reasonLabel="Reason for Location Difference:"
        reasonOptions={[
          'Main entrance gate relocated',
          'Stored coordinates pointed to wrong building',
          'Campus expanded or rebuilt',
          'Missing initial coordinates',
          'Other field observation'
        ]}
        onConfirm={(reason, note) => handleExecuteLocationUpdate(reason, note)}
      />

      {/* COMPACT ISSUE REPORTING MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Report Information Issue</h3>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Field with Issue:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Address', 'Institute Name', 'Type', 'Other'] as const).map((field) => (
                    <button
                      key={field}
                      type="button"
                      onClick={() => setIssueField(field)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border text-left transition ${
                        issueField === field
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {field}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Correction Note / Observed Finding:
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={`e.g. Changed address to Gate 2 Road 14, or institute renamed...`}
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIssue || !issueNote.trim()}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition"
                >
                  {isSubmittingIssue ? 'Submitting...' : 'Submit Observation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
