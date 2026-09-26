// User & Authentication Roles
export type Role = 'mo' | 'admin';

export interface UserSession {
  email: string;
  name: string;
  role: Role;
  designation: string;
  region: string;
  avatarUrl?: string;
}

// 1. Institute Entity
export type LocationStatus = 
  | 'missing' 
  | 'imported' 
  | 'observed' 
  | 'pending_verification' 
  | 'verified'
  | 'needs_review';

export type DataSource = 
  | 'legacy_import' 
  | 'field_visit' 
  | 'verified_update';

export interface Institute {
  id: string;
  instituteCode: string;
  name: string;
  type: string; // e.g. 'College', 'School & College', 'University'
  address: string;
  district: string;
  area: string;
  latitude: number | null;
  longitude: number | null;
  locationStatus: LocationStatus;
  dataSource: DataSource;
  createdAt: string;
  updatedAt: string;
}

// 2. Employee Entity
export type RelationshipStatus = 
  | 'unmapped' 
  | 'imported' 
  | 'observed' 
  | 'pending_verification' 
  | 'verified' 
  | 'rejected';

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  designation: string;
  phone: string;
  currentInstituteId: string | null;
  relationshipStatus: RelationshipStatus;
  dataSource: DataSource;
  createdAt: string;
  updatedAt: string;
}

// 3. EmployeeInstituteRelationship Entity
export type EmployeeRelationshipStatus = 
  | 'active' 
  | 'proposed' 
  | 'rejected' 
  | 'historical';

export interface EmployeeInstituteRelationship {
  id: string;
  employeeId: string;
  instituteId: string;
  status: EmployeeRelationshipStatus;
  source: string; // e.g. 'legacy_master', 'mo_field_check', 'admin_verification'
  createdAt: string;
  updatedAt: string;
}

// 4. Visit Entity
export type VisitStatus = 
  | 'draft' 
  | 'in_progress' 
  | 'ready_for_submission' 
  | 'submitted';

export interface Visit {
  id: string;
  visitCode: string;
  moId: string;
  instituteId: string;
  startedAt: string;
  completedAt: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentAccuracy: number | null;
  status: VisitStatus;
}

// 5. FieldObservation Entity
export type ObservationEntityType = 
  | 'institute_location' 
  | 'institute_information' 
  | 'employee_relationship' 
  | 'new_employee' 
  | 'new_institute';

export type ObservationActionType = 
  | 'confirm' 
  | 'update' 
  | 'create' 
  | 'report_issue';

export type VerificationStatus = 
  | 'routine' 
  | 'pending' 
  | 'approved' 
  | 'rejected' 
  | 'needs_more_information';

export type ObservationPriority = 
  | 'low' 
  | 'medium' 
  | 'high';

export interface FieldObservation {
  id: string;
  observationCode: string;
  visitId: string;
  entityType: ObservationEntityType;
  entityId: string | null;
  actionType: ObservationActionType;
  existingValue: any;
  proposedValue: any;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  evidence: string | null;
  submittedBy: string; // MO ID or Email
  submittedAt: string;
  verificationStatus: VerificationStatus;
  priority: ObservationPriority;
  verifierId: string | null;
  verifiedAt: string | null;
  verifierComment: string | null;
}

// 6. AuditEvent Entity
export interface AuditEvent {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  previousValue: any;
  newValue: any;
  actorId: string;
  actorRole: string;
  timestamp: string;
  description: string;
}

// 7. ImportJob Entity
export type ImportJobStatus = 
  | 'processing' 
  | 'completed' 
  | 'completed_with_warnings' 
  | 'failed';

export interface ImportJobSummary {
  importedCount: number;
  skippedCount: number;
  warningsCount: number;
  duplicatesCount: number;
  sampleErrors?: string[];
  sampleWarnings?: string[];
}

export interface ImportJob {
  id: string;
  jobCode: string;
  dataType: string; // 'institutes' | 'employees' | 'mixed'
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  status: ImportJobStatus;
  summary?: ImportJobSummary;
}

// 8. AppSettings Entity
export interface AppSettings {
  id: string; // usually 'default'
  locationSearchRadiusMeters: number;
  locationVerificationThresholdMeters: number;
  demoModeEnabled: boolean;
  appVersion: string;
  selectedDemoLocationKey: string;
}

// Geolocation Types
export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GpsLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  isDemo: boolean;
  locationName: string;
  source: 'hardware' | 'demo';
  timestamp: string;
}

export interface DemoGpsPreset {
  key: string;
  label: string;
  instituteName: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  description: string;
}
