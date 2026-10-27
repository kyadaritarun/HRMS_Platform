import React, { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import {
  IconFileSpreadsheet,
  IconDownload,
  IconUpload,
  IconPlus,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconX,
  IconCopy,
  IconRefresh,
  IconUserCheck,
  IconArrowRight,
  IconSparkles,
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
} from '@tabler/icons-react';

export interface BulkEmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string;
  employeeNumber: string;
  dateOfBirth: string;
  workType: 'PERMANENT' | 'CONTRACT';
  jobTitle: string;
  role: 'EMPLOYEE' | 'HR' | 'COMPANY_ADMIN' | 'FINANCE' | 'IT';
  phone: string;
  workMode: 'WFO' | 'WFH';
  shiftTiming: string;
  address: string;
  workingAddress: string;
  joiningDate: string;
  monthlySalary: string;
  currency: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
}

const DEMO_ROWS: BulkEmployeeRow[] = [
  {
    id: 'demo-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@company.com',
    personalEmail: 'john.personal@gmail.com',
    employeeNumber: 'EMP-1001',
    dateOfBirth: '1992-05-15',
    workType: 'PERMANENT',
    jobTitle: 'Senior Software Engineer',
    role: 'EMPLOYEE',
    phone: '9876543210',
    workMode: 'WFO',
    shiftTiming: 'General Shift (09:30 AM - 06:30 PM)',
    address: 'Flat 402, Green Meadows, Indiranagar, Bengaluru, KA 560038',
    workingAddress: 'Uptrix Tower, 5th Floor, Outer Ring Road, Bengaluru',
    joiningDate: new Date().toISOString().split('T')[0],
    monthlySalary: '85000',
    currency: 'INR',
    emergencyContactName: 'Mary Doe',
    emergencyContactRelationship: 'Spouse',
    emergencyContactPhone: '9876543219',
  },
  {
    id: 'demo-2',
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah.c@company.com',
    personalEmail: 'sarah.connor@yahoo.com',
    employeeNumber: 'EMP-1002',
    dateOfBirth: '1994-08-22',
    workType: 'CONTRACT',
    jobTitle: 'Product Designer',
    role: 'EMPLOYEE',
    phone: '9811223344',
    workMode: 'WFH',
    shiftTiming: 'Flexible Shift',
    address: 'House 12, Palm Grove, Koramangala, Bengaluru, KA 560034',
    workingAddress: 'Remote / Work From Home',
    joiningDate: new Date().toISOString().split('T')[0],
    monthlySalary: '65000',
    currency: 'INR',
    emergencyContactName: 'Robert Connor',
    emergencyContactRelationship: 'Brother',
    emergencyContactPhone: '9811223399',
  },
];

const createEmptyRow = (): BulkEmployeeRow => ({
  id: Math.random().toString(36).substring(2, 9),
  firstName: '',
  lastName: '',
  email: '',
  personalEmail: '',
  employeeNumber: '',
  dateOfBirth: '',
  workType: 'PERMANENT',
  jobTitle: '',
  role: 'EMPLOYEE',
  phone: '',
  workMode: 'WFO',
  shiftTiming: 'General Shift (09:30 AM - 06:30 PM)',
  address: '',
  workingAddress: '',
  joiningDate: new Date().toISOString().split('T')[0],
  monthlySalary: '',
  currency: 'INR',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
});

/**
 * Robust date parser that handles:
 * 1. Excel numeric date serials (e.g. 31406, 46053)
 * 2. Date objects
 * 3. ISO / text dates (YYYY-MM-DD, DD/MM/YYYY, etc.)
 */
const parseExcelDate = (val: any): string => {
  if (!val && val !== 0) return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number' || (!isNaN(Number(val)) && !String(val).includes('-') && !String(val).includes('/'))) {
    const num = Number(val);
    if (num > 1000 && num < 100000) {
      // Excel epoch starts Dec 30 1899 due to 1900 leap year bug
      const date = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return str;
};

interface BulkEmployeeImportProps {
  onDownloadTemplate: () => void;
  isDownloadingTemplate?: boolean;
}

export const BulkEmployeeImport: React.FC<BulkEmployeeImportProps> = ({
  onDownloadTemplate,
  isDownloadingTemplate,
}) => {
  const { user } = useAuth();
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN' || user?.role === 'PRODUCT_SUPER_ADMIN';
  const isHr = user?.role === 'HR';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<BulkEmployeeRow[]>([createEmptyRow()]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    createdCount: number;
    failedCount: number;
    defaultTempPassword?: string;
    results: Array<{ row: number; email: string; success: boolean; error?: string }>;
  } | null>(null);
  const [copiedBulkPassword, setCopiedBulkPassword] = useState(false);

  // Pagination & Search state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'invalid'>('all');

  // Normalize row helper with robust header cleaning (strips parenthesized text)
  const normalizeRow = (raw: any): Omit<BulkEmployeeRow, 'id'> => {
    const getRaw = (keys: string[]) => {
      for (const k of keys) {
        const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const rawKey of Object.keys(raw)) {
          // Strip out anything in parentheses, like "(YYYY-MM-DD)" or "(PERMANENT / CONTRACT)"
          const cleanRawKey = rawKey.replace(/\([^)]*\)/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanRawKey === cleanK) {
            if (raw[rawKey] !== undefined && raw[rawKey] !== null) return raw[rawKey];
          }
        }
      }
      return '';
    };

    const getString = (keys: string[]) => String(getRaw(keys) || '').trim();

    const rawWorkType = getString(['worktype', 'work type', 'employmenttype', 'employment type']).toUpperCase();
    const rawWorkMode = getString(['workmode', 'work mode']).toUpperCase();
    const rawRole = getString(['role', 'system role']).toUpperCase();
    const rawShiftTiming = getString(['shifttiming', 'shift timing', 'shift', 'timing']);

    return {
      firstName: getString(['firstname', 'first name']),
      lastName: getString(['lastname', 'last name']),
      email: getString(['email', 'workemail', 'work email']),
      personalEmail: getString(['personalemail', 'personal email']),
      employeeNumber: getString(['employeenumber', 'employeeid', 'employee id', 'empid']),
      dateOfBirth: parseExcelDate(getRaw(['dateofbirth', 'date of birth', 'dob'])),
      workType: rawWorkType === 'CONTRACT' ? 'CONTRACT' : 'PERMANENT',
      jobTitle: getString(['jobtitle', 'job title', 'designation', 'role title']),
      role: isCompanyAdmin && ['HR', 'FINANCE', 'IT'].includes(rawRole) ? (rawRole as any) : 'EMPLOYEE',
      phone: getString(['phone', 'phonenumber', 'phone number', 'contact']),
      workMode: rawWorkMode === 'WFH' ? 'WFH' : 'WFO',
      shiftTiming: rawShiftTiming || 'General Shift (09:30 AM - 06:30 PM)',
      address: getString(['address', 'residentialaddress', 'residential address', 'permanentaddress', 'permanent address']),
      workingAddress: getString(['workingaddress', 'working address', 'officeaddress', 'office address', 'workaddress', 'work address']),
      joiningDate: parseExcelDate(getRaw(['joiningdate', 'joining date', 'date of joining', 'doj'])) || new Date().toISOString().split('T')[0],
      monthlySalary: getString(['monthlysalary', 'monthly salary', 'salary', 'ctc', 'costtocompany', 'cost to company']) || '',
      currency: getString(['currency']) || 'INR',
      emergencyContactName: getString(['emergencycontactname', 'emergency contact name', 'emergency name', 'guardian name']),
      emergencyContactRelationship: getString(['emergencycontactrelationship', 'emergency contact relationship', 'relationship']),
      emergencyContactPhone: getString(['emergencycontactphone', 'emergency contact phone', 'emergency phone', 'guardian phone']),
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessInfo(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setErrorMsg('The selected Excel/CSV file contains no readable data rows.');
          return;
        }

        const parsedRows: BulkEmployeeRow[] = rawJson.map((item) => ({
          id: Math.random().toString(36).substring(2, 9),
          ...normalizeRow(item),
        }));

        setRows(parsedRows);
        setCurrentPage(1);
      } catch (err: any) {
        console.error('Error parsing Excel:', err);
        setErrorMsg('Failed to parse file. Please upload a valid .xlsx, .xls, or .csv document.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleCellChange = (id: string, field: keyof BulkEmployeeRow, value: string) => {
    let processedValue = value;
    if (field === 'role') {
      processedValue = isCompanyAdmin ? (['HR', 'FINANCE', 'IT'].includes(value) ? value : 'EMPLOYEE') : 'EMPLOYEE';
    }
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: processedValue } : r))
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length === 1) {
      setRows([createEmptyRow()]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleLoadDemo = () => {
    setRows(DEMO_ROWS);
    setFileName('sample_demo_records.xlsx');
    setErrorMsg(null);
    setCurrentPage(1);
  };

  const handleClearAll = () => {
    setRows([createEmptyRow()]);
    setFileName(null);
    setErrorMsg(null);
    setSuccessInfo(null);
    setCurrentPage(1);
  };

  // Validation
  const validateRow = (r: BulkEmployeeRow) => {
    const missing: string[] = [];
    if (!r.firstName.trim()) missing.push('First Name');
    if (!r.email.trim() || !r.email.includes('@')) missing.push('Work Email');
    if (!r.personalEmail.trim() || !r.personalEmail.includes('@')) missing.push('Personal Email');
    if (!r.employeeNumber.trim()) missing.push('Employee ID');
    if (!r.dateOfBirth.trim()) missing.push('Date of Birth');
    if (!r.emergencyContactName.trim()) missing.push('Emergency Name');
    if (!r.emergencyContactRelationship.trim()) missing.push('Emergency Relationship');
    if (!r.emergencyContactPhone.trim()) missing.push('Emergency Phone');
    if (!r.workingAddress.trim()) missing.push('Working Address');
    return missing;
  };

  const rowsWithErrors = useMemo(() => {
    return rows.map((r) => {
      const missing = validateRow(r);
      return {
        ...r,
        missing,
        isValid: missing.length === 0,
      };
    });
  }, [rows]);

  const validCount = rowsWithErrors.filter((r) => r.isValid).length;
  const invalidCount = rowsWithErrors.length - validCount;

  // Filter & Paginate
  const filteredRows = useMemo(() => {
    let result = rowsWithErrors;
    if (filterMode === 'invalid') {
      result = result.filter((r) => !r.isValid);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.firstName.toLowerCase().includes(term) ||
          r.lastName.toLowerCase().includes(term) ||
          r.email.toLowerCase().includes(term) ||
          r.employeeNumber.toLowerCase().includes(term) ||
          r.jobTitle.toLowerCase().includes(term)
      );
    }
    return result;
  }, [rowsWithErrors, filterMode, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSubmitBulk = async () => {
    setErrorMsg(null);
    setSuccessInfo(null);

    // Filter out completely blank rows
    const nonBlankRows = rows.filter(
      (r) => r.firstName.trim() || r.email.trim() || r.employeeNumber.trim()
    );

    if (nonBlankRows.length === 0) {
      setErrorMsg('Please enter at least one employee row or upload an Excel file.');
      return;
    }

    // Check validity
    const firstInvalid = nonBlankRows.find((r) => validateRow(r).length > 0);
    if (firstInvalid) {
      const missingFields = validateRow(firstInvalid).join(', ');
      setErrorMsg(
        `Row for "${firstInvalid.firstName || firstInvalid.email || 'Unnamed'}" has missing required fields: ${missingFields}. Please complete all highlighted columns.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const sanitizedRows = nonBlankRows.map((r) => ({
        ...r,
        role: isCompanyAdmin ? (['HR', 'FINANCE', 'IT'].includes(r.role) ? r.role : 'EMPLOYEE') : 'EMPLOYEE',
      }));
      const res = await api.post('/employees/bulk-create', {
        employees: sanitizedRows,
      });

      setSuccessInfo(res.data);
    } catch (err: any) {
      console.error('Bulk import failed:', err);
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to import employees. Please check seat limits and duplicate emails.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ================= SUCCESS MODAL / BANNER ================= */}
      {successInfo && (
        <div className="p-6 bg-white rounded-2xl border border-emerald-200 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <IconUserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Bulk Import Completed Successfully!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="font-bold text-emerald-600">{successInfo.createdCount}</span> employees onboarded,{' '}
                  <span className="font-bold text-slate-700">{successInfo.failedCount}</span> failed.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/company/employees"
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] text-white text-xs font-bold rounded-xl shadow-xs hover:from-[#5340D4] hover:to-[#4130B4] transition-all cursor-pointer"
              >
                <span>View in Employee Directory</span>
                <IconArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Credentials Info Box */}
          {successInfo.defaultTempPassword && successInfo.createdCount > 0 && (
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 block">
                  Generated Temporary Password for All New Accounts
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono font-bold bg-white px-3 py-1 rounded-lg border border-indigo-200 text-indigo-700 select-all">
                    {successInfo.defaultTempPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(successInfo.defaultTempPassword || '');
                      setCopiedBulkPassword(true);
                      setTimeout(() => setCopiedBulkPassword(false), 2000);
                    }}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg border border-indigo-200 bg-white hover:bg-indigo-100 text-indigo-700 cursor-pointer transition-colors"
                  >
                    {copiedBulkPassword ? <IconCheck className="w-3.5 h-3.5 text-emerald-600" /> : <IconCopy className="w-3.5 h-3.5" />}
                    <span>{copiedBulkPassword ? 'Copied' : 'Copy Password'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Onboarding emails containing their user ID and this temporary password have been dispatched. Each employee must set a new password on their first login.
                </p>
              </div>
            </div>
          )}

          {/* Results table if any failures or successes */}
          <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 text-xs">
            {successInfo.results.map((res, idx) => (
              <div
                key={idx}
                className={`px-4 py-2.5 flex items-center justify-between ${
                  res.success ? 'bg-emerald-50/40 text-emerald-900' : 'bg-rose-50/60 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold">Row {res.row}:</span>
                  <span className="font-semibold">{res.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {res.success ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      <IconCheck className="w-3.5 h-3.5" /> Created & Invite Sent
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
                      <IconAlertCircle className="w-3.5 h-3.5" /> {res.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= CARD 1: UPLOAD DROPZONE & STATS ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconFileSpreadsheet className="w-5 h-5 text-[#5E4BE2]" />
              <span>Bulk Employee Excel Import & Grid Entry</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload your employee spreadsheet or edit data rows directly in the table below.
            </p>
          </div>

         
        </div>

        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-indigo-200 hover:border-[#5E4BE2] bg-indigo-50/20 hover:bg-indigo-50/40 rounded-2xl p-6 text-center cursor-pointer transition-colors relative"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-indigo-100 flex items-center justify-center mx-auto mb-2 text-[#5E4BE2]">
            <IconUpload className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-bold text-slate-800">
            {fileName ? (
              <span className="text-indigo-700">File Loaded: {fileName} ({rows.length} records parsed)</span>
            ) : (
              'Click to upload filled Excel file (.xlsx, .xls, .csv)'
            )}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Dates and headers are automatically detected and mapped into the grid
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* ================= CARD 2: EDITABLE DATA GRID ================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 bg-slate-50/80 border-b border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-800">Records Grid:</span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700">
              Total: {rows.length} rows
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              {validCount} ready
            </span>
            {invalidCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                {invalidCount} missing details
              </span>
            )}

            {/* Filter Toggle */}
            <div className="inline-flex bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] font-bold ml-1">
              <button
                type="button"
                onClick={() => { setFilterMode('all'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  filterMode === 'all' ? 'bg-[#5E4BE2] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({rows.length})
              </button>
              {invalidCount > 0 && (
                <button
                  type="button"
                  onClick={() => { setFilterMode('invalid'); setCurrentPage(1); }}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    filterMode === 'invalid' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Errors Only ({invalidCount})
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search rows..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] w-48"
              />
            </div>

            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs transition-colors cursor-pointer"
            >
              <IconPlus className="w-3.5 h-3.5 text-[#5E4BE2]" />
              <span>Add Row</span>
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              title="Reset Grid"
            >
              <IconRefresh className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Horizontal Scrollable Table */}
        <div className="overflow-x-auto max-h-[550px]">
          <table className="w-full min-w-[2500px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-3 w-12 text-center">#</th>
                <th className="px-3 py-3 w-14 text-center">STATUS</th>
                <th className="px-3 py-3 min-w-[150px]">FIRST NAME *</th>
                <th className="px-3 py-3 min-w-[150px]">LAST NAME</th>
                <th className="px-3 py-3 min-w-[200px]">WORK EMAIL *</th>
                <th className="px-3 py-3 min-w-[200px]">PERSONAL EMAIL *</th>
                <th className="px-3 py-3 min-w-[130px]">EMPLOYEE ID *</th>
                <th className="px-3 py-3 min-w-[140px]">DOB (YYYY-MM-DD) *</th>
                <th className="px-3 py-3 min-w-[140px]">WORK TYPE *</th>
                <th className="px-3 py-3 min-w-[170px]">JOB TITLE</th>
                <th className="px-3 py-3 min-w-[140px]">ROLE</th>
                <th className="px-3 py-3 min-w-[140px]">PHONE</th>
                <th className="px-3 py-3 min-w-[120px]">WORK MODE</th>
                <th className="px-3 py-3 min-w-[140px]">JOINING DATE</th>
                <th className="px-3 py-3 min-w-[200px]">SHIFT TIMING</th>
                <th className="px-3 py-3 min-w-[220px]">RESIDENTIAL ADDRESS</th>
                <th className="px-3 py-3 min-w-[220px]">WORKING ADDRESS *</th>
                <th className="px-3 py-3 min-w-[140px]">COST TO COMPANY (CTC)</th>
                <th className="px-3 py-3 min-w-[160px]">EMERGENCY NAME *</th>
                <th className="px-3 py-3 min-w-[160px]">EMERGENCY REL *</th>
                <th className="px-3 py-3 min-w-[150px]">EMERGENCY PHONE *</th>
                <th className="px-3 py-3 w-12 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pagedRows.map((r, idx) => {
                const globalIndex = (safePage - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={r.id}
                    className={`hover:bg-indigo-50/20 transition-colors ${
                      !r.isValid ? 'bg-amber-50/20' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center font-bold text-slate-400 text-xs">
                      {globalIndex}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.isValid ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700" title="All required fields valid">
                          <IconCheck className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 cursor-help"
                          title={`Missing: ${r.missing.join(', ')}`}
                        >
                          <IconAlertCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </td>
                    {/* First Name */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.firstName}
                        onChange={(e) => handleCellChange(r.id, 'firstName', e.target.value)}
                        placeholder="e.g. John"
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:bg-white focus:outline-hidden ${
                          !r.firstName.trim() ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      />
                    </td>
                    {/* Last Name */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.lastName}
                        onChange={(e) => handleCellChange(r.id, 'lastName', e.target.value)}
                        placeholder="e.g. Doe"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-hidden"
                      />
                    </td>
                    {/* Work Email */}
                    <td className="px-2 py-1.5">
                      <input
                        type="email"
                        value={r.email}
                        onChange={(e) => handleCellChange(r.id, 'email', e.target.value)}
                        placeholder="john@company.com"
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:bg-white focus:outline-hidden ${
                          !r.email.trim() ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      />
                    </td>
                    {/* Personal Email */}
                    <td className="px-2 py-1.5">
                      <input
                        type="email"
                        value={r.personalEmail}
                        onChange={(e) => handleCellChange(r.id, 'personalEmail', e.target.value)}
                        placeholder="john.personal@gmail.com"
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:bg-white focus:outline-hidden ${
                          !r.personalEmail.trim() ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      />
                    </td>
                    {/* Employee ID */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.employeeNumber}
                        onChange={(e) => handleCellChange(r.id, 'employeeNumber', e.target.value)}
                        placeholder="EMP-1001"
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:bg-white focus:outline-hidden ${
                          !r.employeeNumber.trim() ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      />
                    </td>
                    {/* Date of Birth */}
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={r.dateOfBirth}
                        onChange={(e) => handleCellChange(r.id, 'dateOfBirth', e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:bg-white focus:outline-hidden ${
                          !r.dateOfBirth.trim() ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      />
                    </td>
                    {/* Work Type */}
                    <td className="px-2 py-1.5">
                      <select
                        value={r.workType}
                        onChange={(e) => handleCellChange(r.id, 'workType', e.target.value as any)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                      >
                        <option value="PERMANENT">PERMANENT</option>
                        <option value="CONTRACT">CONTRACT</option>
                      </select>
                    </td>
                    {/* Job Title */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.jobTitle}
                        onChange={(e) => handleCellChange(r.id, 'jobTitle', e.target.value)}
                        placeholder="Software Engineer"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-hidden"
                      />
                    </td>
                    {/* Role */}
                    <td className="px-2 py-1.5">
                      <select
                        value={isHr ? 'EMPLOYEE' : (r.role === 'COMPANY_ADMIN' ? 'EMPLOYEE' : r.role)}
                        onChange={(e) => handleCellChange(r.id, 'role', e.target.value as any)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                      >
                        <option value="EMPLOYEE">Staff Employee</option>
                        {isCompanyAdmin && (
                          <>
                            <option value="HR">HR</option>
                            <option value="FINANCE">Finance</option>
                            <option value="IT">IT</option>
                          </>
                        )}
                      </select>
                    </td>
                    {/* Phone */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.phone}
                        onChange={(e) => handleCellChange(r.id, 'phone', e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-hidden"
                      />
                    </td>
                    {/* Work Mode */}
                    <td className="px-2 py-1.5">
                      <select
                        value={r.workMode}
                        onChange={(e) => handleCellChange(r.id, 'workMode', e.target.value as any)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden"
                      >
                        <option value="WFO">WFO (Office)</option>
                        <option value="WFH">WFH (Home)</option>
                      </select>
                    </td>
                    {/* Joining Date */}
                    <td className="px-2 py-1.5">
                      <input
                        type="date"
                        value={r.joiningDate}
                        onChange={(e) => handleCellChange(r.id, 'joiningDate', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-hidden"
                      />
                    </td>
                    {/* Shift Timing */}
                    <td className="px-2 py-1.5">
                      <select
                        value={r.shiftTiming}
                        onChange={(e) => handleCellChange(r.id, 'shiftTiming', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden cursor-pointer"
                      >
                        <option value="General Shift (09:30 AM - 06:30 PM)">General Shift (09:30 AM - 06:30 PM)</option>
                        <option value="Morning Shift (06:00 AM - 03:00 PM)">Morning Shift (06:00 AM - 03:00 PM)</option>
                        <option value="Afternoon Shift (02:00 PM - 11:00 PM)">Afternoon Shift (02:00 PM - 11:00 PM)</option>
                        <option value="Night Shift (10:00 PM - 07:00 AM)">Night Shift (10:00 PM - 07:00 AM)</option>
                        <option value="Flexible Shift">Flexible Shift</option>
                      </select>
                    </td>
                    {/* Residential Address */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.address}
                        onChange={(e) => handleCellChange(r.id, 'address', e.target.value)}
                        placeholder="House / Flat No., City..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-hidden"
                      />
                    </td>
                    {/* Working Address */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.workingAddress}
                        onChange={(e) => handleCellChange(r.id, 'workingAddress', e.target.value)}
                        placeholder="Office or site address..."
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:bg-white focus:outline-hidden ${
                          !r.workingAddress.trim() ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      />
                    </td>
                    {/* Cost to Company (CTC) */}
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={r.monthlySalary}
                        onChange={(e) => handleCellChange(r.id, 'monthlySalary', e.target.value)}
                        placeholder="0"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:bg-white focus:outline-hidden"
                      />
                    </td>
                    {/* Emergency Name */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.emergencyContactName}
                        onChange={(e) => handleCellChange(r.id, 'emergencyContactName', e.target.value)}
                        placeholder="Contact Name"
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:bg-white focus:outline-hidden ${
                          !r.emergencyContactName.trim() ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      />
                    </td>
                    {/* Emergency Relationship */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.emergencyContactRelationship}
                        onChange={(e) => handleCellChange(r.id, 'emergencyContactRelationship', e.target.value)}
                        placeholder="Spouse / Parent"
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:bg-white focus:outline-hidden ${
                          !r.emergencyContactRelationship.trim() ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      />
                    </td>
                    {/* Emergency Phone */}
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={r.emergencyContactPhone}
                        onChange={(e) => handleCellChange(r.id, 'emergencyContactPhone', e.target.value)}
                        placeholder="+91..."
                        className={`w-full px-2.5 py-1.5 text-xs rounded-lg border focus:bg-white focus:outline-hidden ${
                          !r.emergencyContactPhone.trim() ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      />
                    </td>
                    {/* Action */}
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(r.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove Row"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Pagination & Actions Footer */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Pagination Controls */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Showing {(safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filteredRows.length)} of {filteredRows.length} records
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer"
                title="Previous Page"
              >
                <IconChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-700 px-2">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer"
                title="Next Page"
              >
                <IconChevronRight className="w-4 h-4" />
              </button>
            </div>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
              <option value={500}>500 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <IconPlus className="w-4 h-4" />
              <span>Add Row</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitBulk}
              disabled={isSubmitting || validCount === 0}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                'Importing Employees...'
              ) : (
                <>
                  <IconCheck className="w-4 h-4" />
                  <span>Import</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEmployeeImport;
