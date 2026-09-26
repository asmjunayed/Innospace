import React from 'react';
import { 
  Database, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Check, 
  FileText, 
  AlertCircle, 
  History,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { VerificationStatus, LocationStatus, RelationshipStatus, DataSource } from '../../types';

export type ProvenanceType = 'master' | 'field' | 'verified_update' | 'legacy_import' | 'field_visit';

interface ProvenanceBadgeProps {
  type: ProvenanceType | DataSource;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Visually distinct badge for Trusted Master Data vs Field Observation
 */
export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({ 
  type, 
  size = 'sm',
  className = '' 
}) => {
  const isMaster = type === 'master' || type === 'verified_update';
  const isField = type === 'field' || type === 'field_visit';
  const isImport = type === 'legacy_import';

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-2 py-0.5' 
    : 'text-xs px-2.5 py-1';

  if (isMaster) {
    return (
      <span 
        className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-md bg-slate-950 text-slate-200 border border-slate-700/90 shadow-2xs ${sizeClasses} ${className}`}
        title="Authoritative Master Record"
      >
        <Database className={size === 'sm' ? 'w-3 h-3 text-sky-400' : 'w-3.5 h-3.5 text-sky-400'} />
        <span>Trusted Master</span>
      </span>
    );
  }

  if (isField) {
    return (
      <span 
        className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-600/50 shadow-2xs ${sizeClasses} ${className}`}
        title="Field Observation Captured On-Site"
      >
        <MapPin className={size === 'sm' ? 'w-3 h-3 text-emerald-400' : 'w-3.5 h-3.5 text-emerald-400'} />
        <span>Field Observation</span>
      </span>
    );
  }

  return (
    <span 
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-md bg-slate-900 text-slate-300 border border-slate-700 ${sizeClasses} ${className}`}
      title="Legacy Imported Dataset"
    >
      <FileText className={size === 'sm' ? 'w-3 h-3 text-slate-400' : 'w-3.5 h-3.5 text-slate-400'} />
      <span>Legacy Import</span>
    </span>
  );
};

export type UnifiedStatus = 
  | VerificationStatus 
  | LocationStatus 
  | RelationshipStatus 
  | 'active' 
  | 'historical'
  | 'unmapped';

interface StatusBadgeProps {
  status: UnifiedStatus | string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
  labelOverride?: string;
}

/**
 * Standardized status badge ensuring crisp, unambiguous visual distinctions:
 * - Pending Verification: Amber with Clock
 * - Approved / Verified: Emerald with CheckCircle2
 * - Rejected: Rose with XCircle
 * - Needs More Information / Needs Review: Indigo with HelpCircle
 * - Routine Confirmation: Emerald with Check
 * - Missing / Unmapped: Rose with AlertCircle
 * - Imported: Slate with FileText
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
  className = '',
  labelOverride
}) => {
  const norm = String(status).toLowerCase().trim();
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const iconSize = size === 'sm' ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0';

  // 1. Pending Verification
  if (norm === 'pending' || norm === 'pending_verification' || norm === 'proposed') {
    return (
      <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md bg-amber-950/70 text-amber-300 border border-amber-500/50 shadow-2xs ${sizeClasses} ${className}`}>
        {showIcon && <Clock className={`${iconSize} text-amber-400`} />}
        <span>{labelOverride || 'Pending Verification'}</span>
      </span>
    );
  }

  // 2. Approved / Verified
  if (norm === 'approved' || norm === 'verified' || norm === 'active') {
    const label = norm === 'active' ? 'Active' : norm === 'verified' ? 'Verified' : 'Approved';
    return (
      <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-500/50 shadow-2xs ${sizeClasses} ${className}`}>
        {showIcon && <CheckCircle2 className={`${iconSize} text-emerald-400`} />}
        <span>{labelOverride || label}</span>
      </span>
    );
  }

  // 3. Rejected
  if (norm === 'rejected') {
    return (
      <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md bg-rose-950/70 text-rose-300 border border-rose-500/50 shadow-2xs ${sizeClasses} ${className}`}>
        {showIcon && <XCircle className={`${iconSize} text-rose-400`} />}
        <span>{labelOverride || 'Rejected'}</span>
      </span>
    );
  }

  // 4. Needs More Information / Needs Review
  if (norm === 'needs_more_information' || norm === 'needs_review') {
    return (
      <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md bg-indigo-950/70 text-indigo-300 border border-indigo-500/50 shadow-2xs ${sizeClasses} ${className}`}>
        {showIcon && <HelpCircle className={`${iconSize} text-indigo-400`} />}
        <span>{labelOverride || 'Needs More Info'}</span>
      </span>
    );
  }

  // 5. Routine Confirmation
  if (norm === 'routine' || norm === 'observed') {
    return (
      <span className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider rounded-md bg-emerald-950/40 text-emerald-400 border border-emerald-700/40 ${sizeClasses} ${className}`}>
        {showIcon && <Check className={`${iconSize} text-emerald-400`} />}
        <span>{labelOverride || (norm === 'routine' ? 'Routine Confirmed' : 'Observed')}</span>
      </span>
    );
  }

  // 6. Missing / Unmapped
  if (norm === 'missing' || norm === 'unmapped') {
    return (
      <span className={`inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md bg-rose-950/50 text-rose-300 border border-rose-600/40 ${sizeClasses} ${className}`}>
        {showIcon && <AlertCircle className={`${iconSize} text-rose-400`} />}
        <span>{labelOverride || (norm === 'missing' ? 'Missing GPS' : 'Unmapped')}</span>
      </span>
    );
  }

  // 7. Imported Baseline
  if (norm === 'imported') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium uppercase tracking-wider rounded-md bg-slate-900 text-slate-300 border border-slate-700 ${sizeClasses} ${className}`}>
        {showIcon && <FileText className={`${iconSize} text-slate-400`} />}
        <span>{labelOverride || 'Imported'}</span>
      </span>
    );
  }

  // 8. Historical Archive
  if (norm === 'historical') {
    return (
      <span className={`inline-flex items-center gap-1 font-medium uppercase tracking-wider rounded-md bg-slate-950 text-slate-400 border border-slate-800 ${sizeClasses} ${className}`}>
        {showIcon && <History className={`${iconSize} text-slate-500`} />}
        <span>{labelOverride || 'Historical'}</span>
      </span>
    );
  }

  // Fallback default
  return (
    <span className={`inline-flex items-center gap-1 font-medium uppercase tracking-wider rounded-md bg-slate-800 text-slate-300 border border-slate-700 ${sizeClasses} ${className}`}>
      <span>{labelOverride || norm.replace(/_/g, ' ')}</span>
    </span>
  );
};
