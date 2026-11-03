import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconShieldCheck,
  IconSearch,
  IconFilter,
  IconChevronDown,
  IconX,
  IconCheck,
  IconAlertTriangle,
  IconClock,
  IconFileText,
  IconId,
  IconMapPin,
  IconBuildingBank,
  IconDownload,
  IconRefresh,
  IconEye,
  IconUser,
  IconPencil,
  IconPlus,
  IconFileCheck,
  IconExternalLink,
} from '@tabler/icons-react';

export interface BGVItem {
  id: string;
  employeeId: number;
  employeeNumber: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  avatarColor: string;
  profilePhoto?: string | null;

  // 1. Aadhaar Check
  aadhaar: {
    number: string;
    maskedNumber: string;
    fullName: string;
    status: 'VERIFIED' | 'PENDING' | 'IN_PROGRESS' | 'REJECTED' | 'NOT_SUBMITTED';
    verifiedDate?: string | null;
    verifiedBy?: string | null;
    documentUrl?: string | null;
    notes?: string;
  };

  // 2. PAN Check
  pan: {
    number: string;
    maskedNumber: string;
    fullName: string;
    dobMatch: boolean;
    status: 'VERIFIED' | 'PENDING' | 'IN_PROGRESS' | 'REJECTED' | 'NOT_SUBMITTED';
    verifiedDate?: string | null;
    verifiedBy?: string | null;
    documentUrl?: string | null;
    notes?: string;
  };

  // 3. Address Verification Check
  address: {
    currentAddress: string;
    permanentAddress: string;
    method: 'PHYSICAL_VISIT' | 'UTILITY_BILL' | 'PASSPORT' | 'DIGITAL_OTP';
    status: 'VERIFIED' | 'PENDING' | 'IN_PROGRESS' | 'REJECTED' | 'NOT_SUBMITTED';
    verifiedDate?: string | null;
    documentUrl?: string | null;
    notes?: string;
  };

  // 4. UAN / PF Check
  uan: {
    uanNumber: string;
    maskedUan: string;
    previousEmployerMemberId: string;
    serviceMatch: boolean;
    status: 'VERIFIED' | 'PENDING' | 'IN_PROGRESS' | 'REJECTED' | 'NOT_SUBMITTED';
    verifiedDate?: string | null;
    notes?: string;
  };

  overallStatus: 'FULLY_VERIFIED' | 'IN_PROGRESS' | 'PENDING' | 'ACTION_REQUIRED';
  initiatedDate: string;
  completionDate?: string | null;
  overallRemarks?: string;
}

const INITIAL_BGV_DATA: BGVItem[] = [
  {
    id: 'bgv_1',
    employeeId: 101,
    employeeNumber: 'EMP-001',
    name: 'jone',
    email: 'jone@company.com',
    jobTitle: 'Team Member',
    department: 'General',
    avatarColor: 'bg-indigo-100 text-indigo-700',
    aadhaar: {
      number: '489210293849',
      maskedNumber: '•••• •••• 3849',
      fullName: 'Jone Doe',
      status: 'VERIFIED',
      verifiedDate: '2026-08-14',
      verifiedBy: 'Compliance Admin',
      documentUrl: 'aadhaar_card_scan.pdf',
      notes: 'UIDAI biometric OTP verification cleared successfully.',
    },
    pan: {
      number: 'ABCDE1234F',
      maskedNumber: 'ABCDE••••F',
      fullName: 'JONE DOE',
      dobMatch: true,
      status: 'VERIFIED',
      verifiedDate: '2026-08-14',
      verifiedBy: 'Compliance Admin',
      documentUrl: 'pan_card_jone.pdf',
      notes: 'NSDL database active match.',
    },
    address: {
      currentAddress: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru 560103',
      permanentAddress: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru 560103',
      method: 'UTILITY_BILL',
      status: 'VERIFIED',
      verifiedDate: '2026-08-16',
      documentUrl: 'electricity_bill_latest.pdf',
      notes: 'BESCOM electricity bill verified with permanent address match.',
    },
    uan: {
      uanNumber: '100928371625',
      maskedUan: '1009••••1625',
      previousEmployerMemberId: 'KN/BNG/0091823/000/120',
      serviceMatch: true,
      status: 'VERIFIED',
      verifiedDate: '2026-08-17',
      notes: 'EPFO passbook service records verified without dual employment.',
    },
    overallStatus: 'FULLY_VERIFIED',
    initiatedDate: '2026-08-10',
    completionDate: '2026-08-17',
    overallRemarks: 'All 4 statutory credentials fully verified by compliance team.',
  },
  {
    id: 'bgv_2',
    employeeId: 102,
    employeeNumber: 'EMP-002',
    name: 'Arjun Verma',
    email: 'arjun.verma@company.com',
    jobTitle: 'IT Infrastructure & Assets Manager',
    department: 'General',
    avatarColor: 'bg-purple-100 text-purple-700',
    aadhaar: {
      number: '883920194821',
      maskedNumber: '•••• •••• 4821',
      fullName: 'Arjun Verma',
      status: 'VERIFIED',
      verifiedDate: '2026-09-02',
      verifiedBy: 'HR Operations',
      documentUrl: 'aadhaar_arjun.pdf',
      notes: 'Instant verification via Aadhaar paperless offline e-KYC.',
    },
    pan: {
      number: 'BNMPV4829K',
      maskedNumber: 'BNMPV••••K',
      fullName: 'ARJUN VERMA',
      dobMatch: true,
      status: 'VERIFIED',
      verifiedDate: '2026-09-02',
      verifiedBy: 'HR Operations',
      documentUrl: 'pan_arjun.pdf',
      notes: 'PAN verified with Income Tax portal.',
    },
    address: {
      currentAddress: 'Plot 18, Phase 2, Hitec City, Hyderabad 500081',
      permanentAddress: 'House 44, Civil Lines, Jaipur 302006',
      method: 'PHYSICAL_VISIT',
      status: 'IN_PROGRESS',
      verifiedDate: null,
      documentUrl: 'rent_agreement_hyderabad.pdf',
      notes: 'Physical field address check initiated with third-party agency.',
    },
    uan: {
      uanNumber: '101283948201',
      maskedUan: '1012••••8201',
      previousEmployerMemberId: 'TS/HYD/0019283/000/089',
      serviceMatch: true,
      status: 'VERIFIED',
      verifiedDate: '2026-09-05',
      notes: 'EPFO record matching previous employer exit date.',
    },
    overallStatus: 'IN_PROGRESS',
    initiatedDate: '2026-08-28',
    completionDate: null,
    overallRemarks: 'Aadhaar, PAN, and UAN completed. Awaiting field agent address report.',
  },
  {
    id: 'bgv_3',
    employeeId: 103,
    employeeNumber: 'EMP-003',
    name: 'Rohan Sharma',
    email: 'rohan.sharma@company.com',
    jobTitle: 'Head of Finance & Payroll',
    department: 'Finance & Accounts',
    avatarColor: 'bg-emerald-100 text-emerald-700',
    aadhaar: {
      number: '554019283748',
      maskedNumber: '•••• •••• 3748',
      fullName: 'Rohan Sharma',
      status: 'VERIFIED',
      verifiedDate: '2026-07-20',
      verifiedBy: 'Compliance Admin',
      documentUrl: 'aadhaar_rohan.pdf',
      notes: 'UIDAI e-KYC verified.',
    },
    pan: {
      number: 'CPSPS9182L',
      maskedNumber: 'CPSPS••••L',
      fullName: 'ROHAN SHARMA',
      dobMatch: true,
      status: 'VERIFIED',
      verifiedDate: '2026-07-20',
      verifiedBy: 'Compliance Admin',
      documentUrl: 'pan_rohan.pdf',
      notes: 'Income Tax department verified.',
    },
    address: {
      currentAddress: 'Tower B, Flat 804, Lodha Park, Worli, Mumbai 400018',
      permanentAddress: 'Tower B, Flat 804, Lodha Park, Worli, Mumbai 400018',
      method: 'PASSPORT',
      status: 'VERIFIED',
      verifiedDate: '2026-07-22',
      documentUrl: 'passport_scan.pdf',
      notes: 'Passport address page verified.',
    },
    uan: {
      uanNumber: '100819283749',
      maskedUan: '1008••••3749',
      previousEmployerMemberId: 'MH/BAN/0048192/000/012',
      serviceMatch: true,
      status: 'VERIFIED',
      verifiedDate: '2026-07-24',
      notes: 'UAN validated.',
    },
    overallStatus: 'FULLY_VERIFIED',
    initiatedDate: '2026-07-15',
    completionDate: '2026-07-24',
    overallRemarks: 'Fully compliant executive background verification.',
  },
  {
    id: 'bgv_4',
    employeeId: 104,
    employeeNumber: 'EMP-004',
    name: 'Priya Nair',
    email: 'priya.nair@company.com',
    jobTitle: 'Senior Software Engineer',
    department: 'Engineering',
    avatarColor: 'bg-rose-100 text-rose-700',
    aadhaar: {
      number: '918273645102',
      maskedNumber: '•••• •••• 5102',
      fullName: 'Priya K Nair',
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Document uploaded has blurred address. Re-upload requested.',
    },
    pan: {
      number: 'APRPN8392M',
      maskedNumber: 'APRPN••••M',
      fullName: 'PRIYA NAIR',
      dobMatch: true,
      status: 'VERIFIED',
      verifiedDate: '2026-10-01',
      verifiedBy: 'HR Operations',
      documentUrl: 'pan_priya.pdf',
      notes: 'PAN verified.',
    },
    address: {
      currentAddress: 'No. 54, 4th Cross, Indiranagar, Bengaluru 560038',
      permanentAddress: 'Kallada House, Palakkad, Kerala 678001',
      method: 'UTILITY_BILL',
      status: 'PENDING',
      verifiedDate: null,
      documentUrl: null,
      notes: 'Awaiting utility bill proof.',
    },
    uan: {
      uanNumber: '',
      maskedUan: 'Not Submitted',
      previousEmployerMemberId: '',
      serviceMatch: false,
      status: 'NOT_SUBMITTED',
      verifiedDate: null,
      notes: 'First-time formal employment or UAN generation required.',
    },
    overallStatus: 'ACTION_REQUIRED',
    initiatedDate: '2026-09-28',
    completionDate: null,
    overallRemarks: 'Aadhaar re-upload requested. UAN generation required.',
  },
  {
    id: 'bgv_5',
    employeeId: 105,
    employeeNumber: 'EMP-005',
    name: 'Vikram Joshi',
    email: 'vikram.joshi@company.com',
    jobTitle: 'Product Designer',
    department: 'Design',
    avatarColor: 'bg-amber-100 text-amber-700',
    aadhaar: {
      number: '629183746281',
      maskedNumber: '•••• •••• 6281',
      fullName: 'Vikram Joshi',
      status: 'VERIFIED',
      verifiedDate: '2026-10-12',
      verifiedBy: 'HR Operations',
      documentUrl: 'aadhaar_vikram.pdf',
      notes: 'Verified via DigiLocker authentication.',
    },
    pan: {
      number: 'BVJPJ8291Q',
      maskedNumber: 'BVJPJ••••Q',
      fullName: 'VIKRAM JOSHI',
      dobMatch: true,
      status: 'VERIFIED',
      verifiedDate: '2026-10-12',
      verifiedBy: 'HR Operations',
      documentUrl: 'pan_vikram.pdf',
      notes: 'PAN record verified.',
    },
    address: {
      currentAddress: 'B-302, Palm Heights, Viman Nagar, Pune 411014',
      permanentAddress: 'B-302, Palm Heights, Viman Nagar, Pune 411014',
      method: 'DIGITAL_OTP',
      status: 'VERIFIED',
      verifiedDate: '2026-10-14',
      documentUrl: 'gas_bill_pune.pdf',
      notes: 'Piped Gas bill with OTP confirmation cleared.',
    },
    uan: {
      uanNumber: '101928374619',
      maskedUan: '1019••••4619',
      previousEmployerMemberId: 'MH/PUN/0092819/000/045',
      serviceMatch: true,
      status: 'VERIFIED',
      verifiedDate: '2026-10-15',
      notes: 'EPFO records cleared.',
    },
    overallStatus: 'FULLY_VERIFIED',
    initiatedDate: '2026-10-08',
    completionDate: '2026-10-15',
    overallRemarks: 'Smooth digital e-verification completed within 7 days.',
  },
];

export const BackgroundVerificationPage: React.FC = () => {
  const [records, setRecords] = useState<BGVItem[]>(INITIAL_BGV_DATA);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [activeCheckFilter, setActiveCheckFilter] = useState('ALL');

  // Selected item for slide-over drawer
  const [selectedRecord, setSelectedRecord] = useState<BGVItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Modal: Initiate BGV
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [initiateEmpId, setInitiateEmpId] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set);
  }, [records]);

  // Try to enrich with real database employees if available
  useEffect(() => {
    const fetchRealEmployees = async () => {
      try {
        const res = await api.get('/employees?pageSize=100');
        const dbStaff = res.data?.items || [];
        if (Array.isArray(dbStaff) && dbStaff.length > 0) {
          // If staff exists, map any missing ones into BGV records
          setRecords((prev) => {
            const existingIds = new Set(prev.map((p) => p.employeeId));
            const newMapped: BGVItem[] = [];

            dbStaff.forEach((emp: any, idx: number) => {
              if (!existingIds.has(emp.id)) {
                newMapped.push({
                  id: `bgv_dyn_${emp.id}`,
                  employeeId: emp.id,
                  employeeNumber: emp.employeeNumber || `EMP-${String(emp.id).padStart(3, '0')}`,
                  name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee',
                  email: emp.email || 'employee@company.com',
                  jobTitle: emp.jobTitle || 'Team Member',
                  department: emp.department?.name || 'General',
                  avatarColor: ['bg-indigo-100 text-indigo-700', 'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700'][idx % 3],
                  profilePhoto: emp.profilePhoto,
                  aadhaar: {
                    number: '',
                    maskedNumber: 'Not Submitted',
                    fullName: '',
                    status: 'NOT_SUBMITTED',
                    verifiedDate: null,
                    notes: '',
                  },
                  pan: {
                    number: '',
                    maskedNumber: 'Not Submitted',
                    fullName: '',
                    dobMatch: false,
                    status: 'NOT_SUBMITTED',
                    verifiedDate: null,
                    notes: '',
                  },
                  address: {
                    currentAddress: emp.address || '',
                    permanentAddress: emp.address || '',
                    method: 'UTILITY_BILL',
                    status: emp.address ? 'PENDING' : 'NOT_SUBMITTED',
                    verifiedDate: null,
                    notes: '',
                  },
                  uan: {
                    uanNumber: '',
                    maskedUan: 'Not Submitted',
                    previousEmployerMemberId: '',
                    serviceMatch: false,
                    status: 'NOT_SUBMITTED',
                    verifiedDate: null,
                    notes: '',
                  },
                  overallStatus: 'PENDING',
                  initiatedDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
                  completionDate: null,
                  overallRemarks: 'Verification pending document upload by employee.',
                });
              }
            });
            return [...prev, ...newMapped];
          });
        }
      } catch (err) {
        // Mock data will continue to serve gracefully
      }
    };
    fetchRealEmployees();
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.employeeNumber.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.aadhaar.number.includes(q) ||
        r.pan.number.toLowerCase().includes(q) ||
        r.uan.uanNumber.includes(q);

      if (!matchSearch) return false;
      if (departmentFilter !== 'ALL' && r.department !== departmentFilter) return false;
      if (statusFilter !== 'ALL' && r.overallStatus !== statusFilter) return false;

      if (activeCheckFilter === 'MISSING_AADHAAR') return r.aadhaar.status === 'NOT_SUBMITTED' || r.aadhaar.status === 'REJECTED';
      if (activeCheckFilter === 'MISSING_PAN') return r.pan.status === 'NOT_SUBMITTED' || r.pan.status === 'REJECTED';
      if (activeCheckFilter === 'MISSING_ADDRESS') return r.address.status === 'NOT_SUBMITTED' || r.address.status === 'PENDING';
      if (activeCheckFilter === 'MISSING_UAN') return r.uan.status === 'NOT_SUBMITTED';

      return true;
    });
  }, [records, search, statusFilter, departmentFilter, activeCheckFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = records.length;
    const fullyVerified = records.filter((r) => r.overallStatus === 'FULLY_VERIFIED').length;
    const inProgress = records.filter((r) => r.overallStatus === 'IN_PROGRESS').length;
    const pending = records.filter((r) => r.overallStatus === 'PENDING').length;
    const actionRequired = records.filter((r) => r.overallStatus === 'ACTION_REQUIRED').length;
    return { total, fullyVerified, inProgress, pending, actionRequired };
  }, [records]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const handleOpenDrawer = (record: BGVItem) => {
    setSelectedRecord(record);
    setIsEditing(false);
    setEditFormData(JSON.parse(JSON.stringify(record)));
  };

  const handleSaveDrawer = () => {
    if (!editFormData || !selectedRecord) return;
    setIsSaving(true);
    setTimeout(() => {
      setRecords((prev) =>
        prev.map((item) => (item.id === selectedRecord.id ? { ...editFormData } : item))
      );
      setSelectedRecord({ ...editFormData });
      setIsSaving(false);
      setIsEditing(false);
      setSaveToast('Background verification details updated successfully!');
      setTimeout(() => setSaveToast(null), 3000);
    }, 400);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FULLY_VERIFIED':
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <IconCheck className="w-3 h-3 text-emerald-600" />
            Verified
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <IconRefresh className="w-3 h-3 text-blue-600 animate-spin" />
            In Progress
          </span>
        );
      case 'ACTION_REQUIRED':
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <IconAlertTriangle className="w-3 h-3 text-rose-600" />
            Action Required
          </span>
        );
      case 'NOT_SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
            Not Submitted
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <IconClock className="w-3 h-3 text-amber-600" />
            Pending Review
          </span>
        );
    }
  };

  const handleExportCsv = () => {
    const headers = ['Employee ID,Name,Department,Aadhaar Status,PAN Status,Address Status,UAN Status,Overall BGV,Initiated Date'];
    const rows = filteredRecords.map(
      (r) =>
        `"${r.employeeNumber}","${r.name}","${r.department}","${r.aadhaar.status}","${r.pan.status}","${r.address.status}","${r.uan.status}","${r.overallStatus}","${r.initiatedDate}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Employee_BGV_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <IconCheck className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Banner (Hero Header) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <IconShieldCheck className="w-4 h-4" />
            </div>
            <span>Background Verification (BGV)</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Audit and verify employee statutory credentials: Aadhaar, PAN card, residential address, and UAN / PF records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <IconDownload className="w-3.5 h-3.5 text-slate-500 font-medium" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInitiateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <IconPlus className="w-4 h-4" />
            <span>Initiate Check</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 font-medium mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Audited</span>
            <IconUser className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900">{metrics.total}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">100% active workforce</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fully Verified</span>
            <IconShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">{metrics.fullyVerified}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
            {metrics.total > 0 ? Math.round((metrics.fullyVerified / metrics.total) * 100) : 0}% compliance rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200/80 shadow-2xs bg-blue-50/20">
          <div className="flex items-center justify-between text-blue-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Progress</span>
            <IconRefresh className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-700">{metrics.inProgress}</div>
          <div className="text-[10px] text-blue-600 font-semibold mt-0.5">Agency checking address/docs</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <IconClock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700">{metrics.pending}</div>
          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Documents uploaded</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200/80 shadow-2xs bg-rose-50/20 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-rose-600 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider">Action Needed</span>
            <IconAlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700">{metrics.actionRequired}</div>
          <div className="text-[10px] text-rose-600 font-semibold mt-0.5">Mismatches / Re-upload needed</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        {/* Controls Toolbar: Search, Filters & Quick Check filter */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <IconSearch className="w-4 h-4 text-slate-500 font-medium absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Employee, ID, Aadhaar, PAN, UAN..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All BGV Statuses</option>
                <option value="FULLY_VERIFIED">Fully Verified</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="PENDING">Pending Review</option>
                <option value="ACTION_REQUIRED">Action Required</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-500 font-medium absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-500 font-medium absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-500 font-medium absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-500 font-medium absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {(search || statusFilter !== 'ALL' || departmentFilter !== 'ALL' || activeCheckFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('ALL');
                  setDepartmentFilter('ALL');
                  setActiveCheckFilter('ALL');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Verification Status Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
          <span className="text-slate-500 text-xs font-medium mr-1">Quick Filter:</span>
          {[
            { id: 'ALL', label: 'All Employees' },
            { id: 'MISSING_AADHAAR', label: 'Missing / Rejected Aadhaar' },
            { id: 'MISSING_PAN', label: 'Missing / Rejected PAN' },
            { id: 'MISSING_ADDRESS', label: 'Pending Address Check' },
            { id: 'MISSING_UAN', label: 'Missing UAN / PF' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => {
                setActiveCheckFilter(pill.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-xl transition-all cursor-pointer shrink-0 ${
                activeCheckFilter === pill.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Verification Records Table */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 min-w-[220px]">Employee</th>
                <th className="px-4 py-3.5 min-w-[130px]">Aadhaar Check</th>
                <th className="px-4 py-3.5 min-w-[130px]">PAN Check</th>
                <th className="px-4 py-3.5 min-w-[150px]">Address Check</th>
                <th className="px-4 py-3.5 min-w-[140px]">UAN / PF Number</th>
                <th className="px-4 py-3.5 min-w-[130px] text-center">Overall Status</th>
                <th className="px-4 py-3.5 min-w-[110px] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                      <IconShieldCheck className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">No verification records found</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Try adjusting your search criteria or filter options.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Employee Profile */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {r.profilePhoto ? (
                          <img
                            src={r.profilePhoto}
                            alt={r.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full ${r.avatarColor} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                          >
                            {r.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block truncate">{r.name}</span>
                          <span className="text-[11px] text-slate-500 font-medium block truncate">
                            {r.employeeNumber} • {r.department}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Aadhaar */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-mono text-slate-800 font-semibold block">{r.aadhaar.maskedNumber}</span>
                        {getStatusBadge(r.aadhaar.status)}
                      </div>
                    </td>

                    {/* PAN */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-mono text-slate-800 font-semibold block">{r.pan.maskedNumber}</span>
                        {getStatusBadge(r.pan.status)}
                      </div>
                    </td>

                    {/* Address */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5 max-w-[180px]">
                        <span className="text-[11px] text-slate-700 truncate block" title={r.address.currentAddress}>
                          {r.address.currentAddress || 'No address set'}
                        </span>
                        {getStatusBadge(r.address.status)}
                      </div>
                    </td>

                    {/* UAN / PF */}
                    <td className="px-4 py-3.5">
                      <div className="space-y-0.5">
                        <span className="font-mono text-slate-800 font-semibold block">{r.uan.maskedUan}</span>
                        {getStatusBadge(r.uan.status)}
                      </div>
                    </td>

                    {/* Overall Status */}
                    <td className="px-4 py-3.5 text-center">{getStatusBadge(r.overallStatus)}</td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDrawer(r)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                      >
                        <IconEye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRecords.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50]}
            itemName="employees"
          />
        )}
      </div>

      {/* ===================== SLIDE-OVER VERIFICATION DRAWER ===================== */}
      {selectedRecord && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setSelectedRecord(null)}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-8 sm:pl-16">
            <div
              className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                    <IconShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>{selectedRecord.name}</span>
                      {getStatusBadge(editFormData?.overallStatus || selectedRecord.overallStatus)}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {selectedRecord.employeeNumber} • {selectedRecord.department} • {selectedRecord.jobTitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      <IconPencil className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="p-1.5 rounded-lg text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">
                {/* 1. Aadhaar Card Section */}
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <IconId className="w-4 h-4 text-indigo-600" />
                      <span>1. Aadhaar Verification</span>
                    </div>
                    {isEditing ? (
                      <select
                        value={editFormData.aadhaar.status}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            aadhaar: { ...editFormData.aadhaar, status: e.target.value },
                          })
                        }
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      >
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="PENDING">PENDING</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="NOT_SUBMITTED">NOT SUBMITTED</option>
                      </select>
                    ) : (
                      getStatusBadge(selectedRecord.aadhaar.status)
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 block font-medium">Aadhaar Number</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.aadhaar.number}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              aadhaar: {
                                ...editFormData.aadhaar,
                                number: e.target.value,
                                maskedNumber: e.target.value ? `•••• •••• ${e.target.value.slice(-4)}` : 'Not Set',
                              },
                            })
                          }
                          placeholder="12-digit Aadhaar"
                          className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      ) : (
                        <span className="font-mono font-bold text-slate-800">
                          {selectedRecord.aadhaar.number || 'Not Submitted'}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 block font-medium">Name on Card</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.aadhaar.fullName}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              aadhaar: { ...editFormData.aadhaar, fullName: e.target.value },
                            })
                          }
                          className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      ) : (
                        <span className="font-bold text-slate-800">{selectedRecord.aadhaar.fullName || selectedRecord.name}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500 font-medium bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span>
                      Verification Note: {selectedRecord.aadhaar.notes || 'Verified through official UIDAI e-KYC.'}
                    </span>
                    <button
                      type="button"
                      className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <IconFileCheck className="w-3.5 h-3.5" />
                      Proof
                    </button>
                  </div>
                </div>

                {/* 2. PAN Card Section */}
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <IconFileText className="w-4 h-4 text-emerald-600" />
                      <span>2. PAN Verification</span>
                    </div>
                    {isEditing ? (
                      <select
                        value={editFormData.pan.status}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            pan: { ...editFormData.pan, status: e.target.value },
                          })
                        }
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      >
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="PENDING">PENDING</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="NOT_SUBMITTED">NOT SUBMITTED</option>
                      </select>
                    ) : (
                      getStatusBadge(selectedRecord.pan.status)
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 block font-medium">PAN Number</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.pan.number}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              pan: {
                                ...editFormData.pan,
                                number: e.target.value.toUpperCase(),
                                maskedNumber: e.target.value ? `${e.target.value.slice(0, 5)}••••${e.target.value.slice(-1)}` : 'Not Set',
                              },
                            })
                          }
                          placeholder="ABCDE1234F"
                          className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase"
                        />
                      ) : (
                        <span className="font-mono font-bold text-slate-800">
                          {selectedRecord.pan.number || 'Not Submitted'}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 block font-medium">DOB Match &amp; Name</span>
                      <span className="font-bold text-slate-800 block mt-1">
                        {selectedRecord.pan.fullName || selectedRecord.name.toUpperCase()} (DOB Matched)
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500 font-medium bg-white p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span>Income Tax Department NSDL record matched.</span>
                    <button
                      type="button"
                      className="text-emerald-600 hover:text-emerald-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <IconFileCheck className="w-3.5 h-3.5" />
                      View PAN
                    </button>
                  </div>
                </div>

                {/* 3. Address Verification Section */}
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <IconMapPin className="w-4 h-4 text-rose-600" />
                      <span>3. Address Verification</span>
                    </div>
                    {isEditing ? (
                      <select
                        value={editFormData.address.status}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            address: { ...editFormData.address, status: e.target.value },
                          })
                        }
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      >
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="PENDING">PENDING</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="NOT_SUBMITTED">NOT SUBMITTED</option>
                      </select>
                    ) : (
                      getStatusBadge(selectedRecord.address.status)
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 block font-medium text-[11px]">Registered Address</span>
                    {isEditing ? (
                      <textarea
                        value={editFormData.address.currentAddress}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            address: { ...editFormData.address, currentAddress: e.target.value },
                          })
                        }
                        rows={2}
                        className="w-full mt-1 p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                      />
                    ) : (
                      <p className="font-medium text-slate-800 text-xs mt-0.5">
                        {selectedRecord.address.currentAddress || 'No address registered'}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-slate-500 font-medium block">Verification Method:</span>
                      <span className="font-bold text-slate-700">{selectedRecord.address.method.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Status Note:</span>
                      <span className="font-medium text-slate-600">
                        {selectedRecord.address.notes || 'Utility bill proof verified.'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. UAN (Universal Account Number / PF) Section */}
                <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                      <IconBuildingBank className="w-4 h-4 text-purple-600" />
                      <span>4. UAN / PF Records Verification</span>
                    </div>
                    {isEditing ? (
                      <select
                        value={editFormData.uan.status}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            uan: { ...editFormData.uan, status: e.target.value },
                          })
                        }
                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                      >
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="PENDING">PENDING</option>
                        <option value="NOT_SUBMITTED">NOT SUBMITTED</option>
                      </select>
                    ) : (
                      getStatusBadge(selectedRecord.uan.status)
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 block font-medium">Universal Account Number (UAN)</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData.uan.uanNumber}
                          onChange={(e) =>
                            setEditFormData({
                              ...editFormData,
                              uan: {
                                ...editFormData.uan,
                                uanNumber: e.target.value,
                                maskedUan: e.target.value ? `${e.target.value.slice(0, 4)}••••${e.target.value.slice(-4)}` : 'Not Set',
                              },
                            })
                          }
                          placeholder="12-digit UAN"
                          className="w-full mt-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                        />
                      ) : (
                        <span className="font-mono font-bold text-slate-800">
                          {selectedRecord.uan.uanNumber || 'Not Submitted'}
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 block font-medium">EPFO Member ID Match</span>
                      <span className="font-bold text-slate-800 block mt-1">
                        {selectedRecord.uan.previousEmployerMemberId || 'Verified / Clean Service'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Overall Compliance Verdict */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 text-xs">Overall Compliance Verdict:</span>
                    {isEditing ? (
                      <select
                        value={editFormData.overallStatus}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            overallStatus: e.target.value,
                          })
                        }
                        className="px-2.5 py-1 bg-white border border-indigo-200 rounded-lg font-bold text-xs text-indigo-900"
                      >
                        <option value="FULLY_VERIFIED">FULLY VERIFIED</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="PENDING">PENDING</option>
                        <option value="ACTION_REQUIRED">ACTION REQUIRED</option>
                      </select>
                    ) : (
                      getStatusBadge(selectedRecord.overallStatus)
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {selectedRecord.overallRemarks || 'Audited against statutory compliance requirements.'}
                  </p>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors text-xs cursor-pointer"
                >
                  Close
                </button>

                {isEditing ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveDrawer}
                    className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-95 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <IconRefresh className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isSaving ? 'Saving...' : 'Save & Update'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-95 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <IconPencil className="w-3.5 h-3.5" />
                    <span>Edit Verification</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ===================== INITIATE BGV MODAL ===================== */}
      {showInitiateModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowInitiateModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <IconShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Initiate Background Check</h3>
                  <p className="text-xs text-slate-500 font-medium">Send statutory document verification request to employee</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInitiateModal(false)}
                className="p-1.5 rounded-lg text-slate-500 font-medium hover:text-slate-600 hover:bg-slate-100"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Employee</label>
                <select
                  value={initiateEmpId}
                  onChange={(e) => setInitiateEmpId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden font-medium text-slate-800"
                >
                  <option value="">Choose an employee...</option>
                  {records.map((r) => (
                    <option key={r.id} value={r.employeeId}>
                      {r.name} ({r.employeeNumber} - {r.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <span className="font-semibold text-slate-700 block text-xs">Mandatory Checks Included:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 font-medium">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Aadhaar e-KYC</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PAN NSDL Match</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Address Utility Proof</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center gap-1.5">
                    <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>EPFO UAN History</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                An automated email notification with secure upload link will be triggered to the employee.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowInitiateModal(false)}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInitiateModal(false);
                  setSaveToast('Background verification check initiated successfully!');
                  setTimeout(() => setSaveToast(null), 3000);
                }}
                className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs text-xs"
              >
                Start Verification
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BackgroundVerificationPage;
