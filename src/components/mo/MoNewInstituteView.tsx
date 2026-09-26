import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Camera, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronLeft, 
  X, 
  UploadCloud, 
  Phone, 
  User, 
  FileText, 
  ArrowRight,
  ShieldAlert,
  Clock,
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useInstitutes } from '../../hooks/useInstitutes';
import { useVisits } from '../../hooks/useVisits';
import { useObservations } from '../../hooks/useObservations';
import { stringSimilarity } from '../../services/dataImportService';
import { Institute, FieldObservation } from '../../types';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';

interface DuplicateCandidate {
  institute: Institute;
  distanceMeters: number | null;
  nameSimilarity: number;
  addressSimilarity: number;
  matchReason: string;
}

interface Props {
  onBack: () => void;
  onSelectExistingInstitute: (instituteId: string) => void;
  onCompleteObservation: (candidateInstituteName: string) => void;
}

export const MoNewInstituteView: React.FC<Props> = ({
  onBack,
  onSelectExistingInstitute,
  onCompleteObservation,
}) => {
  const { user } = useAuth();
  const { location, calculateDistanceMeters, isDemoMode, refreshRealGps, isPoorAccuracy } = useGps();
  const { institutes } = useInstitutes();
  const { activeVisit, startVisit } = useVisits(user?.email);
  const { submitObservation } = useObservations();
  const { toast } = useToast();

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState('College');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [area, setArea] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [signboardPhoto, setSignboardPhoto] = useState<string | null>(null);

  // Form Inline Validation State
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Duplicate Check Modal State
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState<string | null>(null);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!name.trim()) {
      errors.name = 'Institute name is required.';
    } else if (name.trim().length < 3) {
      errors.name = 'Institute name must be at least 3 characters.';
    }

    if (!area.trim()) {
      errors.area = 'Area / Thana / Upazila is required.';
    }

    if (!address.trim()) {
      errors.address = 'Street address or landmark is required.';
    }

    if (contactNumber.trim() && !/^[0-9+() -]{6,20}$/.test(contactNumber.trim())) {
      errors.contactNumber = 'Please enter a valid phone number format.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateForm();
  };

  // Photo capture / upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSignboardPhoto(dataUrl);
      toast.info('Signboard photo attached');
    };
    reader.readAsDataURL(file);
  };

  // Perform multi-criteria duplicate check
  const performDuplicateCheck = (): DuplicateCandidate[] => {
    const candidates: DuplicateCandidate[] = [];
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();

    for (const inst of institutes) {
      let isCandidate = false;
      const reasons: string[] = [];

      // 1. Name similarity
      const nameSim = stringSimilarity(trimmedName, inst.name);
      if (nameSim >= 0.75) {
        isCandidate = true;
        reasons.push(`${Math.round(nameSim * 100)}% name similarity`);
      }

      // 2. Address similarity
      let addrSim = 0;
      if (trimmedAddress && inst.address) {
        addrSim = stringSimilarity(trimmedAddress, inst.address);
        if (addrSim >= 0.75) {
          isCandidate = true;
          reasons.push(`${Math.round(addrSim * 100)}% address similarity`);
        }
      }

      // 3. Geographic proximity
      let distanceMeters: number | null = null;
      if (location.latitude !== 0 && inst.latitude !== null && inst.longitude !== null) {
        distanceMeters = calculateDistanceMeters(inst.latitude, inst.longitude);
        if (distanceMeters <= 300) {
          isCandidate = true;
          reasons.push(`${distanceMeters}m away from current location`);
        }
      }

      if (isCandidate) {
        candidates.push({
          institute: inst,
          distanceMeters,
          nameSimilarity: nameSim,
          addressSimilarity: addrSim,
          matchReason: reasons.join(' • '),
        });
      }
    }

    return candidates.sort((a, b) => {
      if (a.distanceMeters !== null && b.distanceMeters !== null) {
        return a.distanceMeters - b.distanceMeters;
      }
      return b.nameSimilarity - a.nameSimilarity;
    });
  };

  // Submit Handler
  const handleValidateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, area: true, address: true, contactNumber: true });

    if (!validateForm()) {
      toast.error('Please resolve the highlighted inline errors before submitting.');
      return;
    }

    const duplicates = performDuplicateCheck();
    if (duplicates.length > 0) {
      setDuplicateCandidates(duplicates);
      setShowDuplicateModal(true);
    } else {
      handleFinalCommitNewInstitute();
    }
  };

  // Commit New Institute Observation
  const handleFinalCommitNewInstitute = async () => {
    if (!user || !name.trim()) return;
    setIsSubmitting(true);

    try {
      const now = new Date().toISOString();
      const generatedCandidateId = `CAND-${Math.floor(1000 + Math.random() * 9000)}`;

      const proposedValue = {
        name: name.trim(),
        type,
        address: address.trim(),
        district: district.trim(),
        area: area.trim(),
        latitude: location.latitude !== 0 ? location.latitude : null,
        longitude: location.longitude !== 0 ? location.longitude : null,
        accuracy: location.accuracy || null,
        capturedAt: now,
        contactPerson: contactPerson.trim() || null,
        contactNumber: contactNumber.trim() || null,
        notes: notes.trim() || null,
        signboardPhotoUrl: signboardPhoto || null,
        candidateCode: generatedCandidateId,
        submissionStatus: 'pending_verification',
      };

      let visitId = activeVisit?.id;
      if (!visitId) {
        const newVisit = await startVisit(
          `pending-${generatedCandidateId}`,
          location.latitude,
          location.longitude,
          location.accuracy,
          user.name
        );
        visitId = newVisit.id;
      }

      await submitObservation(
        {
          visitId,
          entityType: 'new_institute',
          entityId: null,
          actionType: 'create',
          existingValue: null,
          proposedValue,
          latitude: location.latitude !== 0 ? location.latitude : null,
          longitude: location.longitude !== 0 ? location.longitude : null,
          accuracy: location.accuracy || null,
          evidence: `Field officer discovered new educational institute on-site. Photo attached: ${signboardPhoto ? 'Yes' : 'No'}. Coordinates: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}. Notes: ${notes || 'None'}`,
          submittedBy: user.email,
          verificationStatus: 'pending',
          priority: 'high',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );

      setShowDuplicateModal(false);
      setSubmittedSuccess(name.trim());
      toast.success('New institute submitted for verification');
    } catch (err: any) {
      console.error('Failed to submit new institute observation:', err);
      toast.error('Failed to submit observation. Please check connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Top Breadcrumb */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Institute Discovery</span>
      </button>

      {/* HEADER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Field Discovery
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-xs text-slate-400">Add Unregistered Facility</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          New Institute
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Can't find the Institute in our database? Add what you found during your visit.
        </p>

        {/* Governance banner */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-300">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Trust Rule:</strong> This institution will be logged with status{' '}
            <span className="text-amber-400 font-semibold uppercase">Pending Verification</span>. It will not become trusted master data until audited by an Admin.
          </div>
        </div>
      </div>

      {/* SUCCESS CONFIRMATION STATE */}
      {submittedSuccess ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <StatusBadge status="pending" size="md" />
            <h2 className="text-lg sm:text-xl font-bold text-white mt-2">
              New Institute submitted for verification
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
              Candidate record for <strong className="text-white">"{submittedSuccess}"</strong> has been anchored to your current visit. Coordinates and signboard evidence have been forwarded for Admin review.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 max-w-sm mx-auto text-left text-xs font-mono text-slate-300 space-y-1">
            <div>GPS Latitude: <span className="text-emerald-400">{location.latitude.toFixed(6)}</span></div>
            <div>GPS Longitude: <span className="text-emerald-400">{location.longitude.toFixed(6)}</span></div>
            <div>Accuracy: <span className="text-slate-400">±{location.accuracy}m</span></div>
            <div>Status: <span className="text-amber-400 font-semibold">Pending Admin Review</span></div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onCompleteObservation(submittedSuccess)}
              className="w-full sm:w-auto py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950 flex items-center justify-center gap-2 transition"
            >
              <span>Continue Visit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
            >
              Back to Discovery
            </button>
          </div>
        </div>
      ) : (
        /* MAIN FORM WORKBENCH */
        <form onSubmit={handleValidateAndSubmit} noValidate className="space-y-4">
          {/* 1. AUTOMATICALLY CAPTURED GPS LOCATION STRIP */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                Automatic Location Capture
              </span>
              <button
                type="button"
                onClick={refreshRealGps}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh GPS</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Current Physical Coordinates</span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Default Auto-Pin
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-1">
                  Lat: <strong className="text-emerald-300">{location.latitude.toFixed(6)}</strong>, Lng: <strong className="text-emerald-300">{location.longitude.toFixed(6)}</strong> (±{location.accuracy}m accuracy)
                </div>
              </div>

              <div className="text-[11px] text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                {location.locationName || 'Field Location Captured'}
              </div>
            </div>

            {isPoorAccuracy && (
              <div className="text-[11px] text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Note: Satellite accuracy is ±{location.accuracy}m. Move to open ground if possible.</span>
              </div>
            )}
          </div>

          {/* 2. REQUIRED INSTITUTE DETAILS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Required Information
            </h2>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Institute Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Green Valley Model College"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (formErrors.name) validateForm();
                  }}
                  onBlur={() => handleBlur('name')}
                  className={`w-full bg-slate-950 border rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-emerald-500 transition ${
                    touched.name && formErrors.name ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700'
                  }`}
                />
                {touched.name && formErrors.name && (
                  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formErrors.name}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Institute Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-emerald-500"
                  >
                    <option value="College">College</option>
                    <option value="School & College">School & College</option>
                    <option value="University">University</option>
                    <option value="Polytechnic Institute">Polytechnic Institute</option>
                    <option value="Secondary High School">Secondary High School</option>
                    <option value="Madrasah">Madrasah</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    District / Division *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-emerald-500"
                  >
                    <option value="Dhaka">Dhaka</option>
                    <option value="Chittagong">Chittagong</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Khulna">Khulna</option>
                    <option value="Barisal">Barisal</option>
                    <option value="Sylhet">Sylhet</option>
                    <option value="Rangpur">Rangpur</option>
                    <option value="Mymensingh">Mymensingh</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Area / Thana / Upazila *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhanmondi, Mirpur 10, Mohammadpur..."
                  value={area}
                  onChange={(e) => {
                    setArea(e.target.value);
                    if (formErrors.area) validateForm();
                  }}
                  onBlur={() => handleBlur('area')}
                  className={`w-full bg-slate-950 border rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-emerald-500 transition ${
                    touched.area && formErrors.area ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700'
                  }`}
                />
                {touched.area && formErrors.area && (
                  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formErrors.area}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Full Street Address *
                </label>
                <input
                  type="text"
                  placeholder="e.g. House 24, Road 7/A, Near Main Market"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (formErrors.address) validateForm();
                  }}
                  onBlur={() => handleBlur('address')}
                  className={`w-full bg-slate-950 border rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-emerald-500 transition ${
                    touched.address && formErrors.address ? 'border-rose-500 ring-1 ring-rose-500/50' : 'border-slate-700'
                  }`}
                />
                {touched.address && formErrors.address && (
                  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{formErrors.address}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 3. OPTIONAL CONTACT, NOTES & SIGNBOARD PHOTO */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Optional Supporting Evidence
            </h2>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Contact Person
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. Prof. Shamsul Islam, Principal"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="+880 17..."
                      value={contactNumber}
                      onChange={(e) => {
                        setContactNumber(e.target.value);
                        if (formErrors.contactNumber) validateForm();
                      }}
                      onBlur={() => handleBlur('contactNumber')}
                      className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-emerald-500 font-mono ${
                        touched.contactNumber && formErrors.contactNumber ? 'border-rose-500' : 'border-slate-700'
                      }`}
                    />
                  </div>
                  {touched.contactNumber && formErrors.contactNumber && (
                    <p className="mt-1 text-[11px] text-rose-400">{formErrors.contactNumber}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Field Notes & Observations
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Newly constructed branch, signage clearly visible at gate, approximately 800 enrolled students..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-emerald-500"
                />
              </div>

              {/* SIGNBOARD PHOTO CAPTURE / UPLOAD */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Institute Signboard Photo
                </label>

                {signboardPhoto ? (
                  <div className="relative rounded-xl border border-slate-700 overflow-hidden bg-slate-950 p-2 max-w-xs">
                    <img
                      src={signboardPhoto}
                      alt="Signboard"
                      className="w-full h-36 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setSignboardPhoto(null)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-rose-400 hover:text-white"
                      title="Remove Photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-emerald-400 font-semibold block mt-1.5 text-center">
                      ✓ Signboard Photo Attached
                    </span>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer block transition bg-slate-950/40 hover:bg-slate-950/70">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <Camera className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
                    <span className="text-xs font-semibold text-white block">
                      Take Photo or Upload Signboard
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Supports mobile camera capture or photo upload
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting for Verification...</span>
                </span>
              ) : (
                <>
                  <span>Submit for Verification</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ------------------------------------------------------------- */}
      {/* INSTITUTE CASE 5: POSSIBLE DUPLICATE INSTITUTE MODAL          */}
      {/* ------------------------------------------------------------- */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border-2 border-amber-500/80 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Possible existing Institute</h3>
                <p className="text-xs text-amber-300 mt-0.5">
                  We found existing record(s) matching your proposed institute details.
                </p>
              </div>
            </div>

            {/* Candidate list */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {duplicateCandidates.map(({ institute: existing, distanceMeters, matchReason }) => (
                <div
                  key={existing.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-sm">{existing.name}</span>
                      <span className="font-mono text-[10px] text-sky-400 ml-2">
                        {existing.instituteCode}
                      </span>
                    </div>
                    {distanceMeters !== null && (
                      <span className="font-mono text-emerald-400 font-bold text-xs">
                        {distanceMeters}m away
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 text-[11px]">
                    {existing.address} • {existing.area}, {existing.district}
                  </p>

                  <div className="text-[10px] text-amber-300 font-mono bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
                    Match Factor: {matchReason}
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSelectExistingInstitute(existing.id)}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition"
                    >
                      This is the same Institute
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Go Back & Edit
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinalCommitNewInstitute}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 active:scale-95 disabled:opacity-50 text-white rounded-xl shadow-md transition"
              >
                {isSubmitting ? 'Submitting...' : 'Continue with New Institute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
