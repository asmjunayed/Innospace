import * as XLSX from 'xlsx';
import { 
  Institute, 
  Employee, 
  ImportJob, 
  AuditEvent 
} from '../types';
import { instituteRepository } from './db/repositories/instituteRepository';
import { employeeRepository } from './db/repositories/employeeRepository';
import { relationshipRepository } from './db/repositories/relationshipRepository';
import { importJobRepository } from './db/repositories/importJobRepository';
import { auditRepository } from './db/repositories/auditRepository';

export interface FieldDefinition {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number';
  description: string;
}

export const INSTITUTE_FIELDS: FieldDefinition[] = [
  { key: 'name', label: 'Institute Name', required: true, type: 'string', description: 'Official institution name (Required)' },
  { key: 'instituteCode', label: 'Institute Code / ID', required: false, type: 'string', description: 'Unique code or EIIN (e.g. INS-DHK-001)' },
  { key: 'type', label: 'Institute Type', required: false, type: 'string', description: 'College, School & College, University, etc.' },
  { key: 'district', label: 'District', required: false, type: 'string', description: 'e.g. Dhaka, Chittagong' },
  { key: 'area', label: 'Area / Upazila', required: false, type: 'string', description: 'e.g. Dhanmondi, Gulshan, Mirpur' },
  { key: 'address', label: 'Address', required: false, type: 'string', description: 'Street address or location details' },
  { key: 'latitude', label: 'Latitude', required: false, type: 'number', description: 'GPS Latitude (-90 to 90)' },
  { key: 'longitude', label: 'Longitude', required: false, type: 'number', description: 'GPS Longitude (-180 to 180)' },
];

export const EMPLOYEE_FIELDS: FieldDefinition[] = [
  { key: 'name', label: 'Employee Name', required: true, type: 'string', description: 'Full name of teacher/staff (Required)' },
  { key: 'employeeCode', label: 'Employee Code / ID', required: false, type: 'string', description: 'Unique staff ID (e.g. EMP-DHK-101)' },
  { key: 'designation', label: 'Designation', required: false, type: 'string', description: 'Principal, Lecturer, Professor, etc.' },
  { key: 'phone', label: 'Phone Number', required: false, type: 'string', description: 'Mobile or landline number' },
  { key: 'currentInstituteId', label: 'Institute ID / Code', required: false, type: 'string', description: 'Affiliated Institute ID or Code' },
];

export interface ValidatedRecord {
  rowIndex: number;
  raw: Record<string, any>;
  parsed: Record<string, any>;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
  warnings: string[];
  isDuplicateCandidate?: boolean;
  duplicateReason?: string;
}

export interface ValidationSummary {
  totalRows: number;
  validCount: number;
  warningCount: number;
  errorCount: number;
  duplicateCount: number;
  records: ValidatedRecord[];
}

// String similarity metric (Levenshtein distance based ratio)
export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.88;

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return 1 - distance / maxLen;
}

export const dataImportService = {
  /**
   * Parse uploaded file (.xlsx, .xls, .csv) into headers and JSON rows
   */
  async parseSpreadsheetFile(file: File): Promise<{ fileName: string; headers: string[]; rows: Record<string, any>[] }> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Read headers as array of raw strings
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    
    // Extract column keys
    const headersSet = new Set<string>();
    rawData.forEach(row => {
      Object.keys(row).forEach(k => headersSet.add(k.trim()));
    });
    const headers = Array.from(headersSet);

    return {
      fileName: file.name,
      headers,
      rows: rawData,
    };
  },

  /**
   * Auto-suggest best column mappings based on common column name synonyms
   */
  autoSuggestMapping(headers: string[], fields: FieldDefinition[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    const synonyms: Record<string, string[]> = {
      name: ['institute name', 'institution name', 'name', 'institution', 'college name', 'school name', 'employee name', 'faculty name', 'staff name', 'full name', 'teacher name'],
      instituteCode: ['institute code', 'institute id', 'institution code', 'code', 'eiin', 'id'],
      employeeCode: ['employee code', 'employee id', 'staff id', 'emp code', 'emp id', 'id'],
      type: ['type', 'category', 'institution type', 'institute type', 'level'],
      district: ['district', 'zila', 'city', 'region'],
      area: ['area', 'thana', 'upazila', 'subdistrict', 'location area'],
      address: ['address', 'location', 'street', 'road', 'full address'],
      latitude: ['latitude', 'lat', 'gps latitude', 'geo lat', 'y'],
      longitude: ['longitude', 'long', 'lng', 'gps longitude', 'geo lng', 'x'],
      designation: ['designation', 'title', 'role', 'position', 'rank'],
      phone: ['phone', 'mobile', 'contact', 'phone number', 'mobile number', 'cell', 'telephone'],
      currentInstituteId: ['institute id', 'institute code', 'institution id', 'college code', 'school id', 'institute'],
    };

    fields.forEach(field => {
      const syns = synonyms[field.key] || [field.key.toLowerCase()];
      // Check exact or partial match
      const matchedHeader = headers.find(h => {
        const lowerH = h.toLowerCase().trim();
        return syns.some(syn => lowerH === syn || lowerH.includes(syn) || syn.includes(lowerH));
      });

      if (matchedHeader) {
        mapping[field.key] = matchedHeader;
      } else {
        mapping[field.key] = ''; // Unmapped
      }
    });

    return mapping;
  },

  /**
   * Validate rows for Institutes
   */
  async validateInstitutes(
    rows: Record<string, any>[], 
    mapping: Record<string, string>
  ): Promise<ValidationSummary> {
    const existingInstitutes = await instituteRepository.getAll();
    const records: ValidatedRecord[] = [];

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const errors: string[] = [];
      const warnings: string[] = [];
      let isDuplicate = false;
      let duplicateReason = '';

      const name = String(row[mapping.name] || '').trim();
      const instituteCode = String(row[mapping.instituteCode] || '').trim();
      const type = String(row[mapping.type] || 'College').trim();
      const district = String(row[mapping.district] || 'Dhaka').trim();
      const area = String(row[mapping.area] || '').trim();
      const address = String(row[mapping.address] || '').trim();
      const rawLat = row[mapping.latitude];
      const rawLng = row[mapping.longitude];

      // 1. Name validation (Required)
      if (!name) {
        errors.push('Institute Name is missing or empty.');
      }

      // 2. Latitude & Longitude validation
      let latitude: number | null = null;
      let longitude: number | null = null;

      const hasLat = rawLat !== undefined && rawLat !== null && String(rawLat).trim() !== '';
      const hasLng = rawLng !== undefined && rawLng !== null && String(rawLng).trim() !== '';

      if (hasLat || hasLng) {
        const parsedLat = parseFloat(String(rawLat));
        const parsedLng = parseFloat(String(rawLng));

        if (isNaN(parsedLat)) {
          errors.push(`Invalid latitude value "${rawLat}": must be a valid decimal number.`);
        } else if (parsedLat < -90 || parsedLat > 90) {
          errors.push(`Latitude "${parsedLat}" out of range: must be between -90 and 90.`);
        } else {
          latitude = parsedLat;
        }

        if (isNaN(parsedLng)) {
          errors.push(`Invalid longitude value "${rawLng}": must be a valid decimal number.`);
        } else if (parsedLng < -180 || parsedLng > 180) {
          errors.push(`Longitude "${parsedLng}" out of range: must be between -180 and 180.`);
        } else {
          longitude = parsedLng;
        }
      } else {
        warnings.push('No GPS coordinates provided. Will be registered with "missing" location status.');
      }

      // 3. Optional fields warnings
      if (!area && !address) {
        warnings.push('Area or Address details are missing.');
      }

      // 4. Duplicate checks
      if (name) {
        // Check code duplicate
        if (instituteCode) {
          const matchCode = existingInstitutes.find(e => e.instituteCode.toLowerCase() === instituteCode.toLowerCase());
          if (matchCode) {
            isDuplicate = true;
            duplicateReason = `Same Institute Code matches existing "${matchCode.name}".`;
            warnings.push(duplicateReason);
          }
        }

        // Check name similarity
        if (!isDuplicate) {
          for (const existing of existingInstitutes) {
            const similarity = stringSimilarity(name, existing.name);
            if (similarity >= 0.85) {
              isDuplicate = true;
              duplicateReason = `Name highly similar (${Math.round(similarity * 100)}%) to existing "${existing.name}".`;
              warnings.push(duplicateReason);
              break;
            }
          }
        }

        // Check nearby coordinates (within 50 meters)
        if (!isDuplicate && latitude !== null && longitude !== null) {
          for (const existing of existingInstitutes) {
            if (existing.latitude !== null && existing.longitude !== null) {
              const R = 6371e3;
              const φ1 = (latitude * Math.PI) / 180;
              const φ2 = (existing.latitude * Math.PI) / 180;
              const Δφ = ((existing.latitude - latitude) * Math.PI) / 180;
              const Δλ = ((existing.longitude - longitude) * Math.PI) / 180;
              const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
              const distMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
              if (distMeters <= 50) {
                isDuplicate = true;
                duplicateReason = `Coordinates within ${distMeters}m of existing "${existing.name}".`;
                warnings.push(duplicateReason);
                break;
              }
            }
          }
        }

        // Check address similarity
        if (!isDuplicate && address && address.length > 5) {
          for (const existing of existingInstitutes) {
            if (existing.address && existing.address.length > 5) {
              const addrSim = stringSimilarity(address, existing.address);
              if (addrSim >= 0.85) {
                isDuplicate = true;
                duplicateReason = `Address highly similar (${Math.round(addrSim * 100)}%) to existing "${existing.name}".`;
                warnings.push(duplicateReason);
                break;
              }
            }
          }
        }
      }

      let status: 'valid' | 'warning' | 'error' = 'valid';
      if (errors.length > 0) {
        status = 'error';
        errorCount++;
      } else if (warnings.length > 0) {
        status = 'warning';
        warningCount++;
        if (isDuplicate) duplicateCount++;
      } else {
        status = 'valid';
        validCount++;
      }

      records.push({
        rowIndex: index + 1,
        raw: row,
        parsed: {
          name,
          instituteCode: instituteCode || `INS-GEN-${Math.floor(100 + Math.random() * 900)}`,
          type: type || 'College',
          district: district || 'Dhaka',
          area: area || 'Central',
          address: address || 'Dhaka, Bangladesh',
          latitude,
          longitude,
          locationStatus: latitude !== null && longitude !== null ? 'imported' : 'missing',
          dataSource: 'legacy_import',
        },
        status,
        errors,
        warnings,
        isDuplicateCandidate: isDuplicate,
        duplicateReason,
      });
    }

    return {
      totalRows: rows.length,
      validCount,
      warningCount,
      errorCount,
      duplicateCount,
      records,
    };
  },

  /**
   * Validate rows for Employees
   */
  async validateEmployees(
    rows: Record<string, any>[], 
    mapping: Record<string, string>
  ): Promise<ValidationSummary> {
    const existingEmployees = await employeeRepository.getAll();
    const existingInstitutes = await instituteRepository.getAll();
    const records: ValidatedRecord[] = [];

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const errors: string[] = [];
      const warnings: string[] = [];
      let isDuplicate = false;
      let duplicateReason = '';

      const name = String(row[mapping.name] || '').trim();
      const employeeCode = String(row[mapping.employeeCode] || '').trim();
      const designation = String(row[mapping.designation] || 'Faculty Member').trim();
      const phone = String(row[mapping.phone] || '').trim();
      const instituteRaw = String(row[mapping.currentInstituteId] || '').trim();

      // 1. Name validation (Required)
      if (!name) {
        errors.push('Employee Name is missing or empty.');
      }

      // 2. Institute mapping (Optional)
      let currentInstituteId: string | null = null;
      if (instituteRaw) {
        // Try matching by id, code, or name
        const matchInst = existingInstitutes.find(i => 
          i.id === instituteRaw || 
          i.instituteCode.toLowerCase() === instituteRaw.toLowerCase() ||
          i.name.toLowerCase() === instituteRaw.toLowerCase()
        );
        if (matchInst) {
          currentInstituteId = matchInst.id;
        } else {
          warnings.push(`Institute "${instituteRaw}" was not recognized in master data; recorded as Unmapped.`);
        }
      } else {
        warnings.push('No affiliated institute provided. Employee will be marked as "Unmapped".');
      }

      // 3. Duplicate checks
      if (name) {
        if (employeeCode) {
          const matchCode = existingEmployees.find(e => e.employeeCode.toLowerCase() === employeeCode.toLowerCase());
          if (matchCode) {
            isDuplicate = true;
            duplicateReason = `Same Employee Code matches existing "${matchCode.name}".`;
            warnings.push(duplicateReason);
          }
        }

        if (!isDuplicate && phone) {
          const cleanPhone = phone.replace(/[^0-9]/g, '');
          if (cleanPhone.length >= 8) {
            const matchPhone = existingEmployees.find(e => e.phone.replace(/[^0-9]/g, '').includes(cleanPhone));
            if (matchPhone) {
              isDuplicate = true;
              duplicateReason = `Phone number matches existing employee "${matchPhone.name}".`;
              warnings.push(duplicateReason);
            }
          }
        }

        if (!isDuplicate) {
          for (const existing of existingEmployees) {
            const similarity = stringSimilarity(name, existing.name);
            if (similarity >= 0.88) {
              isDuplicate = true;
              duplicateReason = `Name highly similar (${Math.round(similarity * 100)}%) to existing faculty "${existing.name}".`;
              warnings.push(duplicateReason);
              break;
            }
          }
        }
      }

      let status: 'valid' | 'warning' | 'error' = 'valid';
      if (errors.length > 0) {
        status = 'error';
        errorCount++;
      } else if (warnings.length > 0) {
        status = 'warning';
        warningCount++;
        if (isDuplicate) duplicateCount++;
      } else {
        status = 'valid';
        validCount++;
      }

      records.push({
        rowIndex: index + 1,
        raw: row,
        parsed: {
          name,
          employeeCode: employeeCode || `EMP-GEN-${Math.floor(100 + Math.random() * 900)}`,
          designation,
          phone,
          currentInstituteId,
          relationshipStatus: currentInstituteId ? 'imported' : 'unmapped',
          dataSource: 'legacy_import',
        },
        status,
        errors,
        warnings,
        isDuplicateCandidate: isDuplicate,
        duplicateReason,
      });
    }

    return {
      totalRows: rows.length,
      validCount,
      warningCount,
      errorCount,
      duplicateCount,
      records,
    };
  },

  /**
   * Commit verified and warning records to IndexedDB and log ImportJob
   */
  async commitImport(
    dataType: 'institutes' | 'employees',
    fileName: string,
    uploaderEmail: string,
    validationSummary: ValidationSummary,
    includeWarnings = true
  ): Promise<{ importedCount: number; skippedCount: number; job: ImportJob }> {
    const recordsToImport = validationSummary.records.filter(r => 
      r.status === 'valid' || (includeWarnings && r.status === 'warning')
    );
    const skippedCount = validationSummary.totalRows - recordsToImport.length;

    const now = new Date().toISOString();
    let duplicatesCount = 0;
    let warningsCount = 0;

    if (dataType === 'institutes') {
      for (const rec of recordsToImport) {
        if (rec.isDuplicateCandidate) duplicatesCount++;
        if (rec.status === 'warning') warningsCount++;

        await instituteRepository.create({
          instituteCode: rec.parsed.instituteCode,
          name: rec.parsed.name,
          type: rec.parsed.type,
          address: rec.parsed.address,
          district: rec.parsed.district,
          area: rec.parsed.area,
          latitude: rec.parsed.latitude,
          longitude: rec.parsed.longitude,
          locationStatus: rec.parsed.locationStatus,
          dataSource: 'legacy_import',
        });
      }
    } else {
      for (const rec of recordsToImport) {
        if (rec.isDuplicateCandidate) duplicatesCount++;
        if (rec.status === 'warning') warningsCount++;

        const emp = await employeeRepository.create({
          employeeCode: rec.parsed.employeeCode,
          name: rec.parsed.name,
          designation: rec.parsed.designation,
          phone: rec.parsed.phone,
          currentInstituteId: rec.parsed.currentInstituteId,
          relationshipStatus: rec.parsed.relationshipStatus,
          dataSource: 'legacy_import',
        });

        if (rec.parsed.currentInstituteId) {
          await relationshipRepository.create({
            employeeId: emp.id,
            instituteId: rec.parsed.currentInstituteId,
            status: 'active',
            source: 'legacy_import',
          });
        }
      }
    }

    const jobStatus = validationSummary.errorCount > 0 
      ? (recordsToImport.length > 0 ? 'completed_with_warnings' : 'failed')
      : (warningsCount > 0 ? 'completed_with_warnings' : 'completed');

    const job = await importJobRepository.create({
      dataType,
      fileName,
      uploadedBy: uploaderEmail,
      uploadedAt: now,
      totalRows: validationSummary.totalRows,
      validRows: recordsToImport.length,
      warningRows: validationSummary.warningCount,
      errorRows: validationSummary.errorCount,
      status: jobStatus,
      summary: {
        importedCount: recordsToImport.length,
        skippedCount,
        warningsCount,
        duplicatesCount,
        sampleErrors: validationSummary.records.filter(r => r.status === 'error').flatMap(r => r.errors).slice(0, 5),
        sampleWarnings: validationSummary.records.filter(r => r.status === 'warning').flatMap(r => r.warnings).slice(0, 5),
      }
    });

    await auditRepository.log({
      entityType: 'ImportJob',
      entityId: job.id,
      action: 'DATA_MIGRATION_IMPORTED',
      previousValue: null,
      newValue: {
        dataType,
        importedCount: recordsToImport.length,
        skippedCount,
      },
      actorId: uploaderEmail,
      actorRole: 'admin',
      description: `Admin imported ${recordsToImport.length} ${dataType} records from "${fileName}"`,
    });

    return {
      importedCount: recordsToImport.length,
      skippedCount,
      job,
    };
  },

  /**
   * Pre-packaged Demo Templates for instantaneous testing
   */
  getSampleData(type: 'institutes' | 'employees'): string {
    if (type === 'institutes') {
      return `Institute Code,Institute Name,Type,District,Area,Address,Latitude,Longitude
INS-DHK-101,Dhaka Residential Model College,College,Dhaka,Mohammadpur,Mirpur Road Mohammadpur Dhaka-1207,23.7592,90.3664
INS-DHK-102,Motijheel Government Boys High School,School & College,Dhaka,Motijheel,Outer Circular Road Motijheel Dhaka,23.7314,90.4190
INS-DHK-103,Adamjee Cantonment College,College,Dhaka,Cantonment,Dhaka Cantonment Dhaka-1206,23.7915,90.3892
INS-DHK-104,Savar Model College,College,Dhaka,Savar,Thana Road Savar Dhaka-1340,,,
INS-DHK-001,ABC Model College,College,Dhaka,Dhanmondi,House 14 Road 7 Dhanmondi,23.7465,90.3762
INS-ERR-001,Faulty Coordinate College,College,Dhaka,Tejgaon,Tejgaon Industrial Area,195.45,90.3842
INS-ERR-002,,College,Dhaka,Mirpur,Section 10 Mirpur,23.8050,90.3680`;
    } else {
      return `Employee Code,Employee Name,Designation,Phone,Institute Code
EMP-NEW-501,Prof. Shamsul Alam,Head of Chemistry,+8801711778899,INS-DHK-001
EMP-NEW-502,Dr. Nasreen Sultana,Associate Professor in Physics,+8801819445566,INS-DHK-002
EMP-NEW-503,Tanvir Ahmed,Senior Lecturer in Mathematics,+8801912667788,
EMP-NEW-504,Fazlul Karim,Admission Officer,+8801715889900,INS-UNKNOWN-999
EMP-DHK-001,Prof. Mohammad Yousuf,Principal,+8801711223344,INS-DHK-001
EMP-ERR-001,,Lecturer in Accounting,+8801818223344,INS-DHK-001`;
    }
  }
};
