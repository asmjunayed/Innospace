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
  Clock, 
  Send
} from 'lucide-react';
import { Institute, Employee } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useGps } from '../../context/GpsContext';
import { useEmployees } from '../../hooks/useEmployees';
import { useObservations } from '../../hooks/useObservations';
import { useVisits } from '../../hooks/useVisits';

interface Props {
  institute: Institute;
  onBackToInstitute: () => void;
  onFinishVisit: () => void;
}

export const MoEmployeeVerificationView: React.FC<Props> = ({
  institute,
  onBackToInstitute,
  onFinishVisit,
}) => {
  const { user } = useAuth();
  const { location } = useGps();
  const { employees } = useEmployees();
  const { submitObservation } = useObservations();
  const { activeVisit, completeVisit } = useVisits(user?.email);

  const [confirmedEmpIds, setConfirmedEmpIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Employees affiliated with this institute
  const instituteEmployees = employees.filter((e) => e.currentInstituteId === institute.id);

  const handleConfirmEmployee = async (emp: Employee) => {
    if (!user) return;
    try {
      await submitObservation(
        {
          visitId: activeVisit?.id || 'vis-active',
          entityType: 'employee_relationship',
          entityId: emp.id,
          actionType: 'confirm',
          existingValue: {
            instituteId: institute.id,
            employeeName: emp.name,
            designation: emp.designation,
          },
          proposedValue: {
            confirmed: true,
            status: 'active',
          },
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          evidence: `Verified active on-site by ${user.name} during routine visit.`,
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
    } catch (err) {
      console.error('Failed to confirm employee:', err);
    }
  };

  const handleAddNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newName.trim()) return;

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
            designation: newDesignation.trim() || 'Faculty Member',
            phone: newPhone.trim(),
            instituteId: institute.id,
            instituteName: institute.name,
          },
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          evidence: `New employee reported during visit to ${institute.name}`,
          submittedBy: user.email,
          verificationStatus: 'pending',
          priority: 'medium',
          verifierId: null,
          verifiedAt: null,
          verifierComment: null,
        },
        user.name
      );
      setShowAddModal(false);
      setNewName('');
      setNewDesignation('');
      setNewPhone('');
    } catch (err) {
      console.error('Failed to report new employee:', err);
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Back Button */}
      <button
        type="button"
        onClick={onBackToInstitute}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Back to Location & Institute Verification</span>
      </button>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-400">
                Faculty Roster Inspection
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">{institute.name}</span>
            </div>
            <h1 className="text-xl font-bold text-white mt-1">Verify Affiliated Staff</h1>
            <p className="text-xs text-slate-300 mt-1">
              Confirm faculty presence or report unlisted teachers to maintain the institutional roster.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="self-start sm:self-center py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Report New Staff</span>
          </button>
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>Roster Records ({instituteEmployees.length})</span>
          <span>{confirmedEmpIds.size} verified this visit</span>
        </div>

        {instituteEmployees.map((emp) => {
          const isConfirmed = confirmedEmpIds.has(emp.id);
          return (
            <div
              key={emp.id}
              className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isConfirmed
                  ? 'bg-emerald-950/20 border-emerald-500/50'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  isConfirmed 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  <Users className="w-5 h-5" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{emp.name}</h3>
                    <span className="font-mono text-[10px] text-sky-400 bg-sky-950 px-1.5 py-0.2 rounded border border-sky-800">
                      {emp.employeeCode}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-0.5">{emp.designation}</p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {emp.phone || 'No phone'}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{emp.relationshipStatus} relationship</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {isConfirmed ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Check className="w-4 h-4" />
                    <span>Verified</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConfirmEmployee(emp)}
                    className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                  >
                    Confirm Presence
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {instituteEmployees.length === 0 && (
          <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
            No employees currently mapped to this institute. Click "Report New Staff" to submit faculty members found on site.
          </div>
        )}
      </div>

      {/* Complete Visit Button */}
      <div className="pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onFinishVisit}
          className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-sm font-bold shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Complete & Submit Field Visit</span>
        </button>
      </div>

      {/* Add New Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Report New Staff Member</h3>
            <form onSubmit={handleAddNewEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Faculty Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Kazi Tariqul Islam"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assistant Professor, Physics"
                  value={newDesignation}
                  onChange={(e) => setNewDesignation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+88017..."
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                >
                  Submit Observation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
