import Dexie, { type Table } from 'dexie';
import { 
  Institute, 
  Employee, 
  EmployeeInstituteRelationship, 
  Visit, 
  FieldObservation, 
  AuditEvent, 
  ImportJob, 
  AppSettings 
} from '../types';

export class FieldVerifyDB extends Dexie {
  institutes!: Table<Institute, string>;
  employees!: Table<Employee, string>;
  relationships!: Table<EmployeeInstituteRelationship, string>;
  visits!: Table<Visit, string>;
  observations!: Table<FieldObservation, string>;
  auditEvents!: Table<AuditEvent, string>;
  importJobs!: Table<ImportJob, string>;
  appSettings!: Table<AppSettings, string>;

  constructor() {
    super('FieldVerifyDB');
    this.version(2).stores({
      institutes: 'id, instituteCode, name, district, area, locationStatus, dataSource, createdAt',
      employees: 'id, employeeCode, name, designation, currentInstituteId, relationshipStatus, dataSource',
      relationships: 'id, employeeId, instituteId, status, source',
      visits: 'id, visitCode, moId, instituteId, status, startedAt',
      observations: 'id, observationCode, visitId, entityType, entityId, actionType, verificationStatus, priority, submittedBy',
      auditEvents: 'id, entityType, entityId, action, actorId, timestamp',
      importJobs: 'id, jobCode, dataType, status, uploadedAt',
      appSettings: 'id'
    });
  }
}

export const db = new FieldVerifyDB();

// ---------------------------------------------------------
// SEED DATA SPECIFICATION
// ---------------------------------------------------------

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'default',
  locationSearchRadiusMeters: 1000,
  locationVerificationThresholdMeters: 100,
  demoModeEnabled: true,
  appVersion: '1.0.0-prototype',
  selectedDemoLocationKey: 'abc_model'
};

// 1. Institutes Seed (10 institutes, covering verified, imported, missing, and duplicate)
export const SEED_INSTITUTES: Institute[] = [
  {
    id: 'ins-001',
    instituteCode: 'INS-DHK-001',
    name: 'ABC Model College',
    type: 'College',
    address: 'House 14, Road 7, Dhanmondi, Dhaka-1205',
    district: 'Dhaka',
    area: 'Dhanmondi',
    latitude: 23.7465,
    longitude: 90.3762,
    locationStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-15T10:30:00Z',
  },
  {
    id: 'ins-002',
    instituteCode: 'INS-DHK-002',
    name: 'Dhanmondi Model School',
    type: 'School & College',
    address: 'Road 5/A, Dhanmondi R/A, Dhaka-1209',
    district: 'Dhaka',
    area: 'Dhanmondi',
    latitude: 23.7420,
    longitude: 90.3780,
    locationStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  },
  {
    id: 'ins-003',
    instituteCode: 'INS-DHK-003',
    name: 'Gulshan Education Center',
    type: 'College',
    address: 'Plot 22, Road 113, Gulshan-2, Dhaka-1212',
    district: 'Dhaka',
    area: 'Gulshan',
    latitude: 23.7925,
    longitude: 90.4077,
    locationStatus: 'verified',
    dataSource: 'field_visit',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-09-01T14:20:00Z',
  },
  {
    id: 'ins-004',
    instituteCode: 'INS-DHK-004',
    name: 'Dhaka City Ideal College',
    type: 'College',
    address: 'Mirpur Road, Dhanmondi, Dhaka-1205',
    district: 'Dhaka',
    area: 'Dhanmondi',
    latitude: 23.7381,
    longitude: 90.3842,
    locationStatus: 'imported', // Imported unverified coordinates
    dataSource: 'legacy_import',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'ins-005',
    instituteCode: 'INS-DHK-005',
    name: 'Notre Dame College',
    type: 'College',
    address: 'Toyenbee Circular Road, Arambagh, Motijheel, Dhaka-1000',
    district: 'Dhaka',
    area: 'Motijheel',
    latitude: 23.7297,
    longitude: 90.4217,
    locationStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-07-20T11:30:00Z',
  },
  {
    id: 'ins-006',
    instituteCode: 'INS-DHK-006',
    name: 'Rajuk Uttara Model College',
    type: 'School & College',
    address: 'Sector 6, Uttara Model Town, Dhaka-1230',
    district: 'Dhaka',
    area: 'Uttara',
    latitude: 23.8687,
    longitude: 90.3985,
    locationStatus: 'imported', // Imported unverified coordinates
    dataSource: 'legacy_import',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-02-14T09:00:00Z',
  },
  {
    id: 'ins-007',
    instituteCode: 'INS-DHK-007',
    name: 'Mirpur Cantonment Public School & College',
    type: 'School & College',
    address: 'Mirpur Cantonment, Section 12, Dhaka-1216',
    district: 'Dhaka',
    area: 'Mirpur',
    latitude: null, // MISSING coordinates
    longitude: null,
    locationStatus: 'missing',
    dataSource: 'legacy_import',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'ins-008',
    instituteCode: 'INS-DHK-008',
    name: 'Tejgaon Government Science High School',
    type: 'School & College',
    address: 'Tejgaon Industrial Area, Dhaka-1208',
    district: 'Dhaka',
    area: 'Tejgaon',
    latitude: null, // MISSING coordinates
    longitude: null,
    locationStatus: 'missing',
    dataSource: 'legacy_import',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'ins-009',
    instituteCode: 'INS-DHK-009',
    name: 'ABC Model College & School', // Possible duplicate of INS-001 by similar name!
    type: 'School & College',
    address: 'Road 7/A, Dhanmondi, Dhaka-1205',
    district: 'Dhaka',
    area: 'Dhanmondi',
    latitude: 23.7470,
    longitude: 90.3765,
    locationStatus: 'observed',
    dataSource: 'field_visit',
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-20T10:00:00Z',
  },
  {
    id: 'ins-010',
    instituteCode: 'INS-DHK-010',
    name: 'Viqarunnisa Noon School & College',
    type: 'School & College',
    address: '1/A New Bailey Road, Ramna, Dhaka-1000',
    district: 'Dhaka',
    area: 'Ramna',
    latitude: 23.7431,
    longitude: 90.4079,
    locationStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-02T14:15:00Z',
  },
  {
    id: 'ins-011',
    instituteCode: 'INS-DHK-011',
    name: 'XYZ School',
    type: 'School',
    address: 'Road 9/A, Dhanmondi, Dhaka-1209',
    district: 'Dhaka',
    area: 'Dhanmondi',
    latitude: 23.7510,
    longitude: 90.3740,
    locationStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  }
];

// 2. Employees Seed (22 employees, covering mapped, conflict, unmapped, duplicate)
export const SEED_EMPLOYEES: Employee[] = [
  // Mapped to ABC Model College (ins-001)
  {
    id: 'emp-001',
    employeeCode: 'EMP-DHK-001',
    name: 'Prof. Mohammad Yousuf',
    designation: 'Principal',
    phone: '+8801711223344',
    currentInstituteId: 'ins-001',
    relationshipStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'emp-002',
    employeeCode: 'EMP-DHK-002',
    name: 'Kabir Ahmed Chowdhury',
    designation: 'Vice Principal & Head of Physics',
    phone: '+8801712334455',
    currentInstituteId: 'ins-001',
    relationshipStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'emp-003',
    employeeCode: 'EMP-DHK-003',
    name: 'Shirin Akhter',
    designation: 'Associate Professor',
    phone: '+8801819556677',
    currentInstituteId: 'ins-001',
    relationshipStatus: 'pending_verification',
    dataSource: 'field_visit',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-24T10:45:00Z',
  },
  {
    id: 'emp-004',
    employeeCode: 'EMP-DHK-004',
    name: 'Syed Tanvir Hasan',
    designation: 'Senior Lecturer in English',
    phone: '+8801912889900',
    currentInstituteId: 'ins-001',
    relationshipStatus: 'verified',
    dataSource: 'legacy_import',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },

  // Mapped to Dhanmondi Model School (ins-002)
  {
    id: 'emp-005',
    employeeCode: 'EMP-DHK-005',
    name: 'Dr. Anwarul Haque',
    designation: 'Headmaster',
    phone: '+8801715445566',
    currentInstituteId: 'ins-002',
    relationshipStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  },
  {
    id: 'emp-006',
    employeeCode: 'EMP-DHK-006',
    name: 'Farida Yasmin',
    designation: 'Assistant Headmistress',
    phone: '+8801819667788',
    currentInstituteId: 'ins-002',
    relationshipStatus: 'verified',
    dataSource: 'legacy_import',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },

  // CONFLICT EMPLOYEE 1: Mapped to ins-001, but MO observed / proposed at ins-002
  {
    id: 'emp-007',
    employeeCode: 'EMP-DHK-007',
    name: 'Kazi Tariqul Islam',
    designation: 'Senior Chemistry Teacher',
    phone: '+8801716778899',
    currentInstituteId: 'ins-001', // Listed under ABC Model College
    relationshipStatus: 'observed', // Field visit noted transfer to Dhanmondi Model School
    dataSource: 'field_visit',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-22T14:00:00Z',
  },

  // CONFLICT EMPLOYEE 2: Mapped to ins-005, but observed at ins-003
  {
    id: 'emp-008',
    employeeCode: 'EMP-DHK-008',
    name: 'Dr. Sultana Razia',
    designation: 'Senior Biology Lecturer',
    phone: '+8801717889900',
    currentInstituteId: 'ins-005', // Notre Dame College in Master
    relationshipStatus: 'pending_verification', // Transferred to Gulshan Education Center
    dataSource: 'field_visit',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-23T11:15:00Z',
  },

  // Mapped to Gulshan Education Center (ins-003)
  {
    id: 'emp-009',
    employeeCode: 'EMP-DHK-009',
    name: 'M. A. Rashid',
    designation: 'Director of Studies',
    phone: '+8801913334455',
    currentInstituteId: 'ins-003',
    relationshipStatus: 'verified',
    dataSource: 'field_visit',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-09-01T14:20:00Z',
  },
  {
    id: 'emp-010',
    employeeCode: 'EMP-DHK-010',
    name: 'Nadia Sharmin',
    designation: 'Coordinator, Senior Section',
    phone: '+8801614556677',
    currentInstituteId: 'ins-003',
    relationshipStatus: 'imported',
    dataSource: 'legacy_import',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-02-14T09:00:00Z',
  },

  // Mapped to Dhaka City Ideal College (ins-004)
  {
    id: 'emp-011',
    employeeCode: 'EMP-DHK-011',
    name: 'Kamrul Hassan Mollah',
    designation: 'Vice Principal',
    phone: '+8801718990011',
    currentInstituteId: 'ins-004',
    relationshipStatus: 'imported',
    dataSource: 'legacy_import',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'emp-012',
    employeeCode: 'EMP-DHK-012',
    name: 'Afroza Begum',
    designation: 'Lecturer in Economics',
    phone: '+8801815112233',
    currentInstituteId: 'ins-004',
    relationshipStatus: 'imported',
    dataSource: 'legacy_import',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },

  // Mapped to Notre Dame College (ins-005)
  {
    id: 'emp-013',
    employeeCode: 'EMP-DHK-013',
    name: 'Dr. Father Hemanto Rosario, CSC',
    designation: 'Principal',
    phone: '+8801713445566',
    currentInstituteId: 'ins-005',
    relationshipStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-07-20T11:30:00Z',
  },
  {
    id: 'emp-014',
    employeeCode: 'EMP-DHK-014',
    name: 'Tapan Kanti Roy',
    designation: 'Senior Lecturer & Admission Coordinator',
    phone: '+8801911442211',
    currentInstituteId: 'ins-005',
    relationshipStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-07-20T11:30:00Z',
  },

  // Mapped to Rajuk Uttara Model College (ins-006)
  {
    id: 'emp-015',
    employeeCode: 'EMP-DHK-015',
    name: 'Lt. Col. Aminul Islam',
    designation: 'Vice Principal (College Section)',
    phone: '+8801722889900',
    currentInstituteId: 'ins-006',
    relationshipStatus: 'imported',
    dataSource: 'legacy_import',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-02-14T09:00:00Z',
  },
  {
    id: 'emp-016',
    employeeCode: 'EMP-DHK-016',
    name: 'Mahbubur Rahman',
    designation: 'Assistant Professor in English',
    phone: '+8801817112233',
    currentInstituteId: 'ins-006',
    relationshipStatus: 'imported',
    dataSource: 'legacy_import',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-02-14T09:00:00Z',
  },

  // Mapped to Mirpur Cantonment Public (ins-007)
  {
    id: 'emp-017',
    employeeCode: 'EMP-DHK-017',
    name: 'Col. Shahadat Hossain',
    designation: 'Principal',
    phone: '+8801719223344',
    currentInstituteId: 'ins-007',
    relationshipStatus: 'imported',
    dataSource: 'legacy_import',
    createdAt: '2026-01-15T09:00:00Z',
    updatedAt: '2026-01-15T09:00:00Z',
  },

  // Mapped to Tejgaon Science (ins-008)
  {
    id: 'emp-018',
    employeeCode: 'EMP-DHK-018',
    name: 'Kazi Faruk Hossain',
    designation: 'Headmaster',
    phone: '+8801816334455',
    currentInstituteId: 'ins-008',
    relationshipStatus: 'imported',
    dataSource: 'legacy_import',
    createdAt: '2026-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z',
  },

  // UNMAPPED EMPLOYEES (currentInstituteId is null)
  {
    id: 'emp-019',
    employeeCode: 'EMP-DHK-019',
    name: 'Mahmudul Hasan',
    designation: 'Visiting Faculty & Researcher',
    phone: '+8801918776655',
    currentInstituteId: null, // UNMAPPED
    relationshipStatus: 'unmapped',
    dataSource: 'legacy_import',
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'emp-020',
    employeeCode: 'EMP-DHK-020',
    name: 'Nusrat Jahan',
    designation: 'ICT & STEM Coordinator',
    phone: '+8801678123456',
    currentInstituteId: null, // UNMAPPED (Discovered in field, not yet assigned)
    relationshipStatus: 'unmapped',
    dataSource: 'field_visit',
    createdAt: '2026-09-25T15:10:00Z',
    updatedAt: '2026-09-25T15:10:00Z',
  },

  // DUPLICATE BY SIMILAR NAME
  // Note: emp-001 is "Prof. Mohammad Yousuf" at ABC Model College.
  // emp-021 is "Mohammad Yousuf" at Dhanmondi Model School.
  {
    id: 'emp-021',
    employeeCode: 'EMP-DHK-021',
    name: 'Mohammad Yousuf',
    designation: 'Assistant Teacher (General Science)',
    phone: '+8801711998877',
    currentInstituteId: 'ins-002',
    relationshipStatus: 'imported',
    dataSource: 'legacy_import',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'emp-022',
    employeeCode: 'EMP-DHK-022',
    name: 'Rehana Parveen',
    designation: 'Senior Teacher in Mathematics',
    phone: '+8801814223344',
    currentInstituteId: 'ins-010',
    relationshipStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-02T14:15:00Z',
  },
  {
    id: 'emp-023',
    employeeCode: 'EMP-XYZ-001',
    name: 'Tariqul Islam',
    designation: 'Senior Mathematics Faculty',
    phone: '+8801718991122',
    currentInstituteId: 'ins-011', // Currently mapped to XYZ School
    relationshipStatus: 'verified',
    dataSource: 'verified_update',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  }
];

// 3. Employee-Institute Relationships Seed (19 relationships, active, proposed, historical, rejected)
export const SEED_RELATIONSHIPS: EmployeeInstituteRelationship[] = [
  {
    id: 'rel-023',
    employeeId: 'emp-023',
    instituteId: 'ins-011',
    status: 'active',
    source: 'admin_verification',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  },
  {
    id: 'rel-001',
    employeeId: 'emp-001',
    instituteId: 'ins-001',
    status: 'active',
    source: 'admin_verification',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'rel-002',
    employeeId: 'emp-002',
    instituteId: 'ins-001',
    status: 'active',
    source: 'admin_verification',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-15T10:00:00Z',
  },
  {
    id: 'rel-003',
    employeeId: 'emp-003',
    instituteId: 'ins-001',
    status: 'active',
    source: 'legacy_master',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'rel-004',
    employeeId: 'emp-004',
    instituteId: 'ins-001',
    status: 'active',
    source: 'legacy_master',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'rel-005',
    employeeId: 'emp-005',
    instituteId: 'ins-002',
    status: 'active',
    source: 'admin_verification',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-08-20T11:00:00Z',
  },
  {
    id: 'rel-006',
    employeeId: 'emp-006',
    instituteId: 'ins-002',
    status: 'active',
    source: 'legacy_master',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  // CONFLICT 1: emp-007 was active at ins-001, but proposed at ins-002
  {
    id: 'rel-007',
    employeeId: 'emp-007',
    instituteId: 'ins-001',
    status: 'historical',
    source: 'legacy_master',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-22T14:00:00Z',
  },
  {
    id: 'rel-008',
    employeeId: 'emp-007',
    instituteId: 'ins-002',
    status: 'proposed', // Proposed transfer awaiting verifier review
    source: 'mo_field_check',
    createdAt: '2026-09-22T14:00:00Z',
    updatedAt: '2026-09-22T14:00:00Z',
  },
  // CONFLICT 2: emp-008 was active at ins-005, proposed at ins-003
  {
    id: 'rel-009',
    employeeId: 'emp-008',
    instituteId: 'ins-005',
    status: 'historical',
    source: 'legacy_master',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-23T11:15:00Z',
  },
  {
    id: 'rel-010',
    employeeId: 'emp-008',
    instituteId: 'ins-003',
    status: 'proposed',
    source: 'mo_field_check',
    createdAt: '2026-09-23T11:15:00Z',
    updatedAt: '2026-09-23T11:15:00Z',
  },
  {
    id: 'rel-011',
    employeeId: 'emp-009',
    instituteId: 'ins-003',
    status: 'active',
    source: 'mo_field_check',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-09-01T14:20:00Z',
  },
  {
    id: 'rel-012',
    employeeId: 'emp-010',
    instituteId: 'ins-003',
    status: 'active',
    source: 'legacy_master',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-02-14T09:00:00Z',
  },
  {
    id: 'rel-013',
    employeeId: 'emp-013',
    instituteId: 'ins-005',
    status: 'active',
    source: 'admin_verification',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-07-20T11:30:00Z',
  },
  {
    id: 'rel-014',
    employeeId: 'emp-014',
    instituteId: 'ins-005',
    status: 'active',
    source: 'admin_verification',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-07-20T11:30:00Z',
  },
  {
    id: 'rel-015',
    employeeId: 'emp-015',
    instituteId: 'ins-006',
    status: 'active',
    source: 'legacy_master',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-02-14T09:00:00Z',
  },
  {
    id: 'rel-016',
    employeeId: 'emp-016',
    instituteId: 'ins-006',
    status: 'active',
    source: 'legacy_master',
    createdAt: '2026-02-14T09:00:00Z',
    updatedAt: '2026-02-14T09:00:00Z',
  },
  {
    id: 'rel-017',
    employeeId: 'emp-021',
    instituteId: 'ins-002',
    status: 'active',
    source: 'legacy_master',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'rel-018',
    employeeId: 'emp-022',
    instituteId: 'ins-010',
    status: 'active',
    source: 'admin_verification',
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-09-02T14:15:00Z',
  }
];

// 4. Visits Seed
export const SEED_VISITS: Visit[] = [
  {
    id: 'vis-001',
    visitCode: 'VIS-2026-09-001',
    moId: 'mo@fieldverify.demo',
    instituteId: 'ins-001',
    startedAt: '2026-09-24T10:15:00Z',
    completedAt: '2026-09-24T11:45:00Z',
    currentLatitude: 23.7465,
    currentLongitude: 90.3762,
    currentAccuracy: 8,
    status: 'submitted',
  },
  {
    id: 'vis-002',
    visitCode: 'VIS-2026-09-002',
    moId: 'mo@fieldverify.demo',
    instituteId: 'ins-002',
    startedAt: '2026-09-25T14:30:00Z',
    completedAt: '2026-09-25T15:50:00Z',
    currentLatitude: 23.7420,
    currentLongitude: 90.3780,
    currentAccuracy: 10,
    status: 'submitted',
  }
];

// 5. FieldObservations Seed
export const SEED_OBSERVATIONS: FieldObservation[] = [
  {
    id: 'obs-001',
    observationCode: 'OBS-2026-001',
    visitId: 'vis-001',
    entityType: 'employee_relationship',
    entityId: 'emp-003',
    actionType: 'update',
    existingValue: { designation: 'Associate Professor', phone: '+8801819556677' },
    proposedValue: { designation: 'Head of Mathematics Dept', phone: '+8801819556688' },
    latitude: 23.7465,
    longitude: 90.3762,
    accuracy: 8,
    evidence: 'Official department promotion circular noticed in staff room',
    submittedBy: 'mo@fieldverify.demo',
    submittedAt: '2026-09-24T10:45:00Z',
    verificationStatus: 'pending',
    priority: 'medium',
    verifierId: null,
    verifiedAt: null,
    verifierComment: null,
  },
  {
    id: 'obs-002',
    observationCode: 'OBS-2026-002',
    visitId: 'vis-002',
    entityType: 'employee_relationship',
    entityId: 'emp-007',
    actionType: 'update',
    existingValue: { instituteId: 'ins-001', instituteName: 'ABC Model College' },
    proposedValue: { instituteId: 'ins-002', instituteName: 'Dhanmondi Model School' },
    latitude: 23.7420,
    longitude: 90.3780,
    accuracy: 10,
    evidence: 'Teacher present at morning assembly and signed attendance sheet',
    submittedBy: 'mo@fieldverify.demo',
    submittedAt: '2026-09-25T14:45:00Z',
    verificationStatus: 'pending',
    priority: 'high',
    verifierId: null,
    verifiedAt: null,
    verifierComment: null,
  },
  {
    id: 'obs-003',
    observationCode: 'OBS-2026-003',
    visitId: 'vis-001',
    entityType: 'institute_location',
    entityId: 'ins-001',
    actionType: 'confirm',
    existingValue: { latitude: 23.7465, longitude: 90.3762 },
    proposedValue: { latitude: 23.7465, longitude: 90.3762 },
    latitude: 23.7465,
    longitude: 90.3762,
    accuracy: 6,
    evidence: 'Standing at main college entrance on Road 7 Dhanmondi',
    submittedBy: 'mo@fieldverify.demo',
    submittedAt: '2026-09-24T10:20:00Z',
    verificationStatus: 'approved',
    priority: 'low',
    verifierId: 'admin@fieldverify.demo',
    verifiedAt: '2026-09-24T16:00:00Z',
    verifierComment: 'Coordinates confirmed within threshold (<10m variance).',
  }
];

// 6. AuditEvents Seed
export const SEED_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'aud-001',
    entityType: 'System',
    entityId: 'sys-init',
    action: 'LEGACY_DATA_LOADED',
    previousValue: null,
    newValue: { institutes: 10, employees: 22, relationships: 18 },
    actorId: 'admin@fieldverify.demo',
    actorRole: 'admin',
    timestamp: '2026-01-10T08:00:00Z',
    description: 'Initial legacy master dataset imported into local database',
  },
  {
    id: 'aud-002',
    entityType: 'FieldObservation',
    entityId: 'obs-003',
    action: 'VERIFICATION_APPROVED',
    previousValue: { locationStatus: 'observed' },
    newValue: { locationStatus: 'verified' },
    actorId: 'admin@fieldverify.demo',
    actorRole: 'admin',
    timestamp: '2026-09-24T16:00:00Z',
    description: 'Approved location confirmation for ABC Model College',
  },
  {
    id: 'aud-003',
    entityType: 'Visit',
    entityId: 'vis-001',
    action: 'VISIT_COMPLETED',
    previousValue: { status: 'in_progress' },
    newValue: { status: 'submitted' },
    actorId: 'mo@fieldverify.demo',
    actorRole: 'mo',
    timestamp: '2026-09-24T11:45:00Z',
    description: 'MO submitted visit observations at ABC Model College',
  }
];

// 7. ImportJobs Seed
export const SEED_IMPORT_JOBS: ImportJob[] = [
  {
    id: 'imp-001',
    jobCode: 'IMP-2026-001',
    dataType: 'mixed',
    fileName: 'master_institutes_employees_2026_q1.csv',
    uploadedBy: 'admin@fieldverify.demo',
    uploadedAt: '2026-01-10T08:00:00Z',
    totalRows: 32,
    validRows: 30,
    warningRows: 2,
    errorRows: 0,
    status: 'completed_with_warnings',
  }
];

// Database initialisation function
export async function initializeDatabase(forceReset = false) {
  const count = await db.institutes.count();
  if (count === 0 || forceReset) {
    if (forceReset) {
      await db.institutes.clear();
      await db.employees.clear();
      await db.relationships.clear();
      await db.visits.clear();
      await db.observations.clear();
      await db.auditEvents.clear();
      await db.importJobs.clear();
      await db.appSettings.clear();
    }

    await db.appSettings.put(DEFAULT_APP_SETTINGS);
    await db.institutes.bulkAdd(SEED_INSTITUTES);
    await db.employees.bulkAdd(SEED_EMPLOYEES);
    await db.relationships.bulkAdd(SEED_RELATIONSHIPS);
    await db.visits.bulkAdd(SEED_VISITS);
    await db.observations.bulkAdd(SEED_OBSERVATIONS);
    await db.auditEvents.bulkAdd(SEED_AUDIT_EVENTS);
    await db.importJobs.bulkAdd(SEED_IMPORT_JOBS);

    console.log('FieldVerify IndexedDB initialized successfully with all 8 core entities and demo seed records.');
  }
}
