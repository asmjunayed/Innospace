import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  Building2, 
  Users, 
  FileText, 
  ArrowRight, 
  X, 
  Info, 
  Check, 
  Sliders, 
  ChevronRight,
  Database
} from 'lucide-react';
import { 
  dataImportService, 
  INSTITUTE_FIELDS, 
  EMPLOYEE_FIELDS, 
  ValidationSummary, 
  ValidatedRecord 
} from '../../services/dataImportService';
import { 
  importJobRepository, 
  instituteRepository, 
  employeeRepository 
} from '../../services/db/repositories';
import { ImportJob } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { initializeDatabase } from '../../db';
import { useToast } from '../../context/ToastContext';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { StatusBadge, ProvenanceBadge } from '../common/StatusBadge';

export const AdminDataImportView: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [selectedJobForModal, setSelectedJobForModal] = useState<ImportJob | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Import Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [dataType, setDataType] = useState<'institutes' | 'employees'>('institutes');
  const [fileName, setFileName] = useState('');
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [includeWarnings, setIncludeWarnings] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [importResult, setImportResult] = useState<{ importedCount: number; skippedCount: number; job: ImportJob } | null>(null);

  // Inline error state for import wizard (IMPORT CASE 1, 2, 3, 4)
  const [wizardInlineError, setWizardInlineError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadJobs = async () => {
    const jobs = await importJobRepository.getAll();
    setImportJobs(jobs);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const openWizard = (type: 'institutes' | 'employees') => {
    setDataType(type);
    setWizardStep(2);
    setFileName('');
    setDetectedHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setValidationSummary(null);
    setImportResult(null);
    setIncludeWarnings(true);
    setWizardInlineError(null);
    setImportProgress(0);
    setWizardOpen(true);
  };

  const handleFileUpload = async (file: File) => {
    setWizardInlineError(null);

    // IMPORT CASE 2: UNSUPPORTED FILE TYPE CHECK
    const lowerName = file.name.toLowerCase();
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const isSupported = validExtensions.some((ext) => lowerName.endsWith(ext));
    if (!isSupported) {
      setWizardInlineError('Unsupported file type. Please upload a .csv, .xlsx, or .xls spreadsheet file.');
      toast.error('Unsupported file type.');
      return;
    }

    try {
      setIsProcessing(true);
      const parsed = await dataImportService.parseSpreadsheetFile(file);

      // IMPORT CASE 3: EMPTY FILE CHECK
      if (!parsed.rows || parsed.rows.length === 0) {
        setWizardInlineError('Uploaded file contains no data rows.');
        toast.error('File contains no data rows.');
        setIsProcessing(false);
        return;
      }

      setFileName(parsed.fileName);
      setDetectedHeaders(parsed.headers);
      setRawRows(parsed.rows);

      // Auto-suggest mappings
      const fields = dataType === 'institutes' ? INSTITUTE_FIELDS : EMPLOYEE_FIELDS;
      const suggested = dataImportService.autoSuggestMapping(parsed.headers, fields);
      setColumnMapping(suggested);

      setWizardStep(4);
      toast.info(`Parsed ${parsed.rows.length} rows from ${file.name}`);
    } catch (err: any) {
      // IMPORT CASE 1: INVALID FILE CATCH
      console.error('File parsing failed:', err);
      setWizardInlineError(`Failed to parse file: ${err.message || 'File format is corrupt or unreadable.'}`);
      toast.error('Invalid or corrupt file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSample = async (type: 'institutes' | 'employees') => {
    const csvContent = dataImportService.getSampleData(type);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const file = new File([blob], `sample_${type}_import.csv`, { type: 'text/csv' });
    await handleFileUpload(file);
  };

  const downloadSampleTemplate = (type: 'institutes' | 'employees') => {
    const csvContent = dataImportService.getSampleData(type);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fieldverify_${type}_template.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.info('Template downloaded');
  };

  // Step 4 to Step 6: Validate
  const handleProceedToValidation = async () => {
    setWizardInlineError(null);

    // IMPORT CASE 4: MISSING REQUIRED COLUMN CHECK
    if (!columnMapping.name || columnMapping.name.trim() === '') {
      setWizardInlineError(`Required column "${dataType === 'institutes' ? 'Institute Name' : 'Employee Name'}" must be mapped.`);
      toast.error('Required name column is unmapped.');
      return;
    }

    setIsProcessing(true);
    try {
      let summary: ValidationSummary;
      if (dataType === 'institutes') {
        summary = await dataImportService.validateInstitutes(rawRows, columnMapping);
      } else {
        summary = await dataImportService.validateEmployees(rawRows, columnMapping);
      }
      setValidationSummary(summary);
      setWizardStep(6);
    } catch (err: any) {
      console.error('Validation error:', err);
      setWizardInlineError(`Validation error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Step 8: Commit
  const handleConfirmImport = async () => {
    if (!validationSummary) return;
    setIsProcessing(true);
    setImportProgress(10);
    try {
      setImportProgress(40);
      const result = await dataImportService.commitImport(
        dataType,
        fileName || `imported_${dataType}.csv`,
        user?.email || 'admin@fieldverify.demo',
        validationSummary,
        includeWarnings
      );
      setImportProgress(100);
      setImportResult(result);
      await loadJobs();
      setWizardStep(9);
      toast.success(`Import complete: ${result.importedCount} ${dataType} records imported`);
    } catch (err: any) {
      console.error('Commit import error:', err);
      setWizardInlineError(`Failed to save import to IndexedDB: ${err.message}`);
      toast.error('Import failed to commit.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetToFactory = async () => {
    setIsResetting(true);
    try {
      await initializeDatabase(true);
      await loadJobs();
      setShowResetModal(false);
      toast.success('Master demo database restored to factory seed state.');
    } catch (err: any) {
      console.error('Reset error:', err);
      toast.error('Failed to reset demo database.');
    } finally {
      setIsResetting(false);
    }
  };

  const currentFields = dataType === 'institutes' ? INSTITUTE_FIELDS : EMPLOYEE_FIELDS;
  const isNameMapped = Boolean(columnMapping.name && columnMapping.name.trim() !== '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Master Data Migration
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Local Prototype
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Data Import</h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Bring existing Institute and Employee spreadsheets into FieldVerify.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            disabled={isResetting}
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo Dataset</span>
          </button>
        </div>

        {/* Governance Principle Message */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Important Data Rule:</strong> Imported data is the starting master dataset. Field verification improves its reliability over time. 
            Imported coordinates are designated as <strong className="text-sky-400 font-mono">"Imported"</strong> rather than <strong className="text-emerald-400 font-mono">"Verified"</strong> until audited on-site.
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Two Import Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Import Institutes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
          <div>
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">Import Institutes</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Upload existing master lists of schools, colleges, and polytechnics. 
              Supports name, institute code, area, district, address, and coordinates.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <span>Accepted:</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">.xlsx</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">.xls</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">.csv</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => openWizard('institutes')}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-emerald-950 transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Institutes File</span>
            </button>
            <button
              type="button"
              onClick={() => downloadSampleTemplate('institutes')}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 flex items-center justify-center gap-2 transition"
              title="Download sample institute CSV template with sample data"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download Sample Institute File</span>
            </button>
          </div>
        </div>

        {/* Card 2: Import Employees */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
          <div>
            <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400 w-fit mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">Import Employees</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Upload faculty, principals, department heads, and coordinators. 
              Supports employee codes, designations, phone numbers, and institute affiliations.
            </p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <span>Accepted:</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">.xlsx</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">.xls</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">.csv</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => openWizard('employees')}
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-sky-950 transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Employees File</span>
            </button>
            <button
              type="button"
              onClick={() => downloadSampleTemplate('employees')}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 flex items-center justify-center gap-2 transition"
              title="Download sample employee CSV template with sample data"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Download Sample Employee File</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white">Import History & Audit Log</h2>
            <p className="text-xs text-slate-400">
              Audit records of all spreadsheet imports executed in browser IndexedDB.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{importJobs.length} Jobs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Job ID</th>
                <th className="py-3 px-3">Data Type</th>
                <th className="py-3 px-3">File Name</th>
                <th className="py-3 px-3">Uploaded By</th>
                <th className="py-3 px-3">Uploaded At</th>
                <th className="py-3 px-3 text-center">Records</th>
                <th className="py-3 px-3 text-center">Warnings</th>
                <th className="py-3 px-3 text-center">Errors</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {importJobs.map((job) => (
                <tr key={job.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-mono text-emerald-400">{job.jobCode}</td>
                  <td className="py-3 px-3 uppercase text-[11px] font-semibold text-slate-300">
                    {job.dataType}
                  </td>
                  <td className="py-3 px-3 font-medium text-white max-w-[180px] truncate" title={job.fileName}>
                    {job.fileName}
                  </td>
                  <td className="py-3 px-3 text-slate-400 truncate max-w-[140px]">{job.uploadedBy}</td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                    {new Date(job.uploadedAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-white">
                    {job.validRows}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {job.warningRows > 0 ? (
                      <span className="text-amber-400 font-semibold">{job.warningRows}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {job.errorRows > 0 ? (
                      <span className="text-rose-400 font-semibold">{job.errorRows}</span>
                    ) : (
                      <span className="text-slate-500">0</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <StatusBadge 
                      status={job.status === 'completed' ? 'approved' : job.status === 'completed_with_warnings' ? 'pending' : 'rejected'} 
                      labelOverride={job.status.replace(/_/g, ' ')}
                      size="sm" 
                    />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedJobForModal(job)}
                      className="text-xs font-semibold text-sky-400 hover:text-sky-300"
                    >
                      View Summary
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {importJobs.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            No import jobs recorded yet.
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 9-STEP INTERACTIVE IMPORT WIZARD MODAL                        */}
      {/* ------------------------------------------------------------- */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Step {wizardStep} of 9
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-xs text-slate-400">
                    Target: <strong className="text-white capitalize">{dataType}</strong>
                  </span>
                </div>
                <h2 className="text-base font-bold text-white mt-0.5">
                  {wizardStep <= 3 && 'Upload Spreadsheet File'}
                  {(wizardStep === 4 || wizardStep === 5) && 'Map Columns to System Fields'}
                  {(wizardStep === 6 || wizardStep === 7) && 'Record Validation & Quality Audit'}
                  {wizardStep === 8 && 'Confirm & Review Import Plan'}
                  {wizardStep === 9 && 'Import Completed'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setWizardOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Wizard Inline Error Notice */}
              {wizardInlineError && (
                <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">File Error Detected:</span>
                    <span>{wizardInlineError}</span>
                  </div>
                </div>
              )}

              {/* STEP 2 & 3: File Upload Area */}
              {wizardStep <= 3 && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-950/40 hover:bg-slate-950/70"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    <UploadCloud className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-white">Click or drag file to upload</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                    </p>
                  </div>

                  {/* 1-Click Fast Prototype Test Button */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold text-white">Want to test with sample data?</div>
                        <div className="text-[11px] text-slate-400">
                          Instantly load pre-built test file with a mix of valid records, warnings & duplicate checks.
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleLoadSample(dataType)}
                      className="py-2 px-3 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition shrink-0"
                    >
                      Load Sample Test File
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4 & 5: Detected Columns & Mapping UI */}
              {(wizardStep === 4 || wizardStep === 5) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400">File:</span> <strong className="text-white">{fileName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Detected Rows:</span> <strong className="text-emerald-400">{rawRows.length}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Columns:</span> <strong className="text-sky-400">{detectedHeaders.length}</strong>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Column Mapping Workbench
                    </h3>
                    <p className="text-xs text-slate-400 mb-3">
                      Match columns from your uploaded file to FieldVerify standard fields. Auto-suggested matches are highlighted.
                    </p>

                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {currentFields.map((field) => {
                        const selectedHeader = columnMapping[field.key] || '';
                        return (
                          <div 
                            key={field.key}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="max-w-[280px]">
                              <div className="flex items-center gap-1.5 font-semibold text-white">
                                <span>{field.label}</span>
                                {field.required ? (
                                  <span className="text-[10px] text-rose-400 font-bold">*Required</span>
                                ) : (
                                  <span className="text-[10px] text-slate-500">Optional</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">{field.description}</div>
                            </div>

                            <div className="flex-1 max-w-xs">
                              <select
                                value={selectedHeader}
                                onChange={(e) => {
                                  setColumnMapping(prev => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-emerald-500 font-mono"
                              >
                                <option value="">-- Do Not Import / Not in File --</option>
                                {detectedHeaders.map((header) => (
                                  <option key={header} value={header}>
                                    {header}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6 & 7: Validation Summary & Audit Results */}
              {(wizardStep === 6 || wizardStep === 7) && validationSummary && (
                <div className="space-y-5">
                  {/* Summary Metric Strip */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
                      <span className="text-sm font-bold text-white">
                        {validationSummary.totalRows.toLocaleString()} records found
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Dataset Pre-Check Audit
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                        <div className="text-xs text-emerald-400 font-medium">Valid</div>
                        <div className="text-lg font-bold text-emerald-400 mt-0.5">
                          {validationSummary.validCount.toLocaleString()} valid
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30">
                        <div className="text-xs text-amber-400 font-medium">Warnings</div>
                        <div className="text-lg font-bold text-amber-400 mt-0.5">
                          {validationSummary.warningCount.toLocaleString()} warnings
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30">
                        <div className="text-xs text-rose-400 font-medium">Errors (Skipped)</div>
                        <div className="text-lg font-bold text-rose-400 mt-0.5">
                          {validationSummary.errorCount.toLocaleString()} errors
                        </div>
                      </div>
                    </div>

                    {/* Breakdown of validation criteria */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/80 text-[11px]">
                      <div className="space-y-1 text-amber-300/90">
                        <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">Warnings Criteria:</span>
                        <div>• Missing GPS coordinates (defaults to "missing")</div>
                        <div>• Missing optional fields (address, area)</div>
                        <div>• Possible duplicate candidate (by name, ID, or nearby coordinates)</div>
                      </div>
                      <div className="space-y-1 text-rose-300/90">
                        <span className="font-bold text-rose-400 uppercase tracking-wider text-[10px]">Errors Criteria (Skipped):</span>
                        <div>• Missing required field (e.g. Name empty)</div>
                        <div>• Invalid coordinates (non-numeric, &gt;90 / &gt;180)</div>
                        <div>• Invalid record structure</div>
                      </div>
                    </div>
                  </div>

                  {/* Row-Level Validation Inspection */}
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Row-Level Validation Inspection
                    </h3>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {validationSummary.records.map((rec) => (
                        <div
                          key={rec.rowIndex}
                          className={`p-3 rounded-xl border text-xs ${
                            rec.status === 'valid'
                              ? 'bg-slate-950/40 border-slate-800'
                              : rec.status === 'warning'
                              ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                              : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-slate-400">Row {rec.rowIndex}:</span>
                              <span className="text-white">{rec.parsed.name || '(No Name Provided)'}</span>
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                              rec.status === 'valid'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : rec.status === 'warning'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {rec.status}
                            </span>
                          </div>

                          {rec.errors.length > 0 && (
                            <div className="mt-1.5 space-y-0.5 text-[11px] text-rose-400">
                              {rec.errors.map((err, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <AlertCircle className="w-3 h-3 shrink-0" />
                                  <span>{err}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {rec.warnings.length > 0 && (
                            <div className="mt-1.5 space-y-0.5 text-[11px] text-amber-300">
                              {rec.warnings.map((warn, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span>{warn}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warning Options */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={includeWarnings}
                        onChange={(e) => setIncludeWarnings(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Include records with warnings (e.g. missing GPS or unmapped affiliations)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* STEP 8: Confirmation Screen */}
              {wizardStep === 8 && validationSummary && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/40 text-xs space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Ready to Commit Master Ingestion
                    </h3>
                    <p className="text-slate-300 leading-relaxed">
                      You are about to import <strong className="text-white">
                        {includeWarnings ? validationSummary.validCount + validationSummary.warningCount : validationSummary.validCount}
                      </strong> {dataType} into local browser IndexedDB.
                    </p>
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300">
                      <div>File Name: {fileName}</div>
                      <div>Data Type: {dataType.toUpperCase()}</div>
                      <div>Duplicate Candidates: {validationSummary.duplicateCount}</div>
                      <div>Skipped Rows: {validationSummary.errorCount + (!includeWarnings ? validationSummary.warningCount : 0)}</div>
                    </div>
                  </div>

                  {/* IMPORT CASE 7: Progress bar indicator */}
                  {isProcessing && (
                    <div className="space-y-2 p-4 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Ingesting records into IndexedDB...</span>
                        <span className="font-mono text-emerald-400">{importProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-2 transition-all duration-300 rounded-full"
                          style={{ width: `${importProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 italic">
                    Note: Records will be marked with status "Imported" and data source "legacy_import". 
                    Field Marketing Officers will verify locations and faculty status during routine field visits.
                  </p>
                </div>
              )}

              {/* STEP 9: Success Summary */}
              {wizardStep === 9 && importResult && (
                <div className="space-y-5 text-center py-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Migration Successful!</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Job Code: <strong className="font-mono text-emerald-400">{importResult.job.jobCode}</strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs max-w-xl mx-auto text-center">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px]">Records Imported</div>
                      <div className="text-lg font-bold text-emerald-400 mt-0.5">{importResult.importedCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px]">Records Skipped</div>
                      <div className="text-lg font-bold text-rose-400 mt-0.5">{importResult.skippedCount}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px]">Records with Warnings</div>
                      <div className="text-lg font-bold text-amber-400 mt-0.5">{importResult.job.warningRows}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 text-[11px]">Duplicate Candidates</div>
                      <div className="text-lg font-bold text-sky-400 mt-0.5">{importResult.job.summary?.duplicatesCount ?? 0}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div>
                {wizardStep > 3 && wizardStep < 9 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => prev <= 5 ? 2 : prev - 1)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    ← Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {wizardStep === 9 ? (
                  <button
                    type="button"
                    onClick={() => setWizardOpen(false)}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition"
                  >
                    Done & Close
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setWizardOpen(false)}
                      className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>

                    {(wizardStep === 4 || wizardStep === 5) && (
                      <button
                        type="button"
                        disabled={isProcessing || !isNameMapped}
                        onClick={handleProceedToValidation}
                        className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition flex items-center gap-1.5"
                      >
                        {isProcessing ? 'Validating...' : 'Validate Records →'}
                      </button>
                    )}

                    {(wizardStep === 6 || wizardStep === 7) && (
                      <button
                        type="button"
                        onClick={() => setWizardStep(8)}
                        className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition flex items-center gap-1.5"
                      >
                        Review Import Plan →
                      </button>
                    )}

                    {wizardStep === 8 && (
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={handleConfirmImport}
                        className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white rounded-xl transition flex items-center gap-1.5 shadow-md shadow-emerald-950"
                      >
                        {isProcessing ? 'Saving to IndexedDB...' : 'Confirm & Save to Master'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR FACTORY RESET */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Demo Master Dataset?"
        description="This will clear all local IndexedDB tables (institutes, employees, visits, observations) and restore the original seeded dataset. Any local test imports will be discarded."
        confirmLabel="Reset All Demo Data"
        variant="danger"
        isLoading={isResetting}
        onConfirm={handleResetToFactory}
      />

      {/* JOB SUMMARY MODAL */}
      {selectedJobForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-mono text-xs text-emerald-400">{selectedJobForModal.jobCode}</span>
                <h3 className="text-base font-bold text-white mt-0.5">Import Job Summary</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobForModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 font-mono text-slate-300">
                <div>File: {selectedJobForModal.fileName}</div>
                <div>Data Type: {selectedJobForModal.dataType.toUpperCase()}</div>
                <div>Uploaded By: {selectedJobForModal.uploadedBy}</div>
                <div>Date: {new Date(selectedJobForModal.uploadedAt).toLocaleString()}</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-[11px]">Total Rows</div>
                  <div className="text-base font-bold text-white mt-0.5">{selectedJobForModal.totalRows}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <div className="text-emerald-400 text-[11px]">Valid Imported</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">{selectedJobForModal.validRows}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30">
                  <div className="text-amber-400 text-[11px]">Warnings</div>
                  <div className="text-base font-bold text-amber-400 mt-0.5">{selectedJobForModal.warningRows}</div>
                </div>
              </div>

              {selectedJobForModal.summary && (
                <div className="space-y-2 pt-2">
                  {selectedJobForModal.summary.sampleWarnings && selectedJobForModal.summary.sampleWarnings.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1">
                      <div className="font-semibold text-amber-400 text-[11px]">Warnings Sample:</div>
                      {selectedJobForModal.summary.sampleWarnings.map((w, i) => (
                        <div key={i} className="text-amber-200 text-[11px]">• {w}</div>
                      ))}
                    </div>
                  )}

                  {selectedJobForModal.summary.sampleErrors && selectedJobForModal.summary.sampleErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                      <div className="font-semibold text-rose-400 text-[11px]">Errors Sample:</div>
                      {selectedJobForModal.summary.sampleErrors.map((e, i) => (
                        <div key={i} className="text-rose-200 text-[11px]">• {e}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedJobForModal(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
