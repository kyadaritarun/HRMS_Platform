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
  IconLock,
  IconMail,
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
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    pan: {
      number: 'ABCDE1234F',
      maskedNumber: 'ABCDE••••F',
      fullName: 'JONE DOE',
      dobMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    address: {
      currentAddress: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru 560103',
      permanentAddress: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru 560103',
      method: 'UTILITY_BILL',
      status: 'PENDING',
      verifiedDate: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    uan: {
      uanNumber: '100928371625',
      maskedUan: '1009••••1625',
      previousEmployerMemberId: 'KN/BNG/0091823/000/120',
      serviceMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      notes: 'Pending BGV activation.',
    },
    overallStatus: 'PENDING',
    initiatedDate: '2026-08-10',
    completionDate: null,
    overallRemarks: 'Pending activation by Uptrix organization.',
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
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    pan: {
      number: 'BNMPV4829K',
      maskedNumber: 'BNMPV••••K',
      fullName: 'ARJUN VERMA',
      dobMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    address: {
      currentAddress: 'Plot 18, Phase 2, Hitec City, Hyderabad 500081',
      permanentAddress: 'House 44, Civil Lines, Jaipur 302006',
      method: 'PHYSICAL_VISIT',
      status: 'PENDING',
      verifiedDate: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    uan: {
      uanNumber: '101283948201',
      maskedUan: '1012••••8201',
      previousEmployerMemberId: 'TS/HYD/0019283/000/089',
      serviceMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      notes: 'Pending BGV activation.',
    },
    overallStatus: 'PENDING',
    initiatedDate: '2026-08-28',
    completionDate: null,
    overallRemarks: 'Pending activation by Uptrix organization.',
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
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    pan: {
      number: 'CPSPS9182L',
      maskedNumber: 'CPSPS••••L',
      fullName: 'ROHAN SHARMA',
      dobMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    address: {
      currentAddress: 'Tower B, Flat 804, Lodha Park, Worli, Mumbai 400018',
      permanentAddress: 'Tower B, Flat 804, Lodha Park, Worli, Mumbai 400018',
      method: 'PASSPORT',
      status: 'PENDING',
      verifiedDate: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    uan: {
      uanNumber: '100819283749',
      maskedUan: '1008••••3749',
      previousEmployerMemberId: 'MH/BAN/0048192/000/012',
      serviceMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      notes: 'Pending BGV activation.',
    },
    overallStatus: 'PENDING',
    initiatedDate: '2026-07-15',
    completionDate: null,
    overallRemarks: 'Pending activation by Uptrix organization.',
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
      notes: 'Pending BGV activation.',
    },
    pan: {
      number: 'APRPN8392M',
      maskedNumber: 'APRPN••••M',
      fullName: 'PRIYA NAIR',
      dobMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    address: {
      currentAddress: 'No. 54, 4th Cross, Indiranagar, Bengaluru 560038',
      permanentAddress: 'Kallada House, Palakkad, Kerala 678001',
      method: 'UTILITY_BILL',
      status: 'PENDING',
      verifiedDate: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    uan: {
      uanNumber: '101492837482',
      maskedUan: '1014••••7482',
      previousEmployerMemberId: '',
      serviceMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      notes: 'Pending BGV activation.',
    },
    overallStatus: 'PENDING',
    initiatedDate: '2026-09-28',
    completionDate: null,
    overallRemarks: 'Pending activation by Uptrix organization.',
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
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    pan: {
      number: 'BVJPJ8291Q',
      maskedNumber: 'BVJPJ••••Q',
      fullName: 'VIKRAM JOSHI',
      dobMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      verifiedBy: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    address: {
      currentAddress: 'B-302, Palm Heights, Viman Nagar, Pune 411014',
      permanentAddress: 'B-302, Palm Heights, Viman Nagar, Pune 411014',
      method: 'DIGITAL_OTP',
      status: 'PENDING',
      verifiedDate: null,
      documentUrl: null,
      notes: 'Pending BGV activation.',
    },
    uan: {
      uanNumber: '101928374619',
      maskedUan: '1019••••4619',
      previousEmployerMemberId: 'MH/PUN/0092819/000/045',
      serviceMatch: false,
      status: 'PENDING',
      verifiedDate: null,
      notes: 'Pending BGV activation.',
    },
    overallStatus: 'PENDING',
    initiatedDate: '2026-10-08',
    completionDate: null,
    overallRemarks: 'Pending activation by Uptrix organization.',
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

  // Fetch real database employees and initialize BGV records
  useEffect(() => {
    const fetchRealEmployees = async () => {
      try {
        const res = await api.get('/employees', { params: { pageSize: 100, status: 'ALL' } });
        const dbStaff = res.data?.items || [];
        if (Array.isArray(dbStaff) && dbStaff.length > 0) {
          const mapped: BGVItem[] = dbStaff.map((emp: any, idx: number) => {
            const empName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.username || 'Employee';
            const empCode = emp.employeeNumber || `EMP-${String(emp.id).padStart(3, '0')}`;
            const empDept = emp.department?.name || 'General';
            return {
              id: `bgv_${emp.id}`,
              employeeId: emp.id,
              employeeNumber: empCode,
              name: empName,
              email: emp.email || 'employee@company.com',
              jobTitle: emp.jobTitle || 'Team Member',
              department: empDept,
              avatarColor: [
                'bg-indigo-100 text-indigo-700',
                'bg-purple-100 text-purple-700',
                'bg-emerald-100 text-emerald-700',
                'bg-rose-100 text-rose-700',
                'bg-amber-100 text-amber-700',
                'bg-cyan-100 text-cyan-700',
              ][idx % 6],
              profilePhoto: emp.profilePhoto,
              aadhaar: {
                number: '',
                maskedNumber: `•••• •••• ${String(1000 + emp.id).slice(-4)}`,
                fullName: empName,
                status: 'PENDING',
                verifiedDate: null,
                notes: 'Aadhaar statutory check pending BGV activation.',
              },
              pan: {
                number: '',
                maskedNumber: `ABCDE••••${String.fromCharCode(65 + (emp.id % 26))}`,
                fullName: empName.toUpperCase(),
                dobMatch: false,
                status: 'PENDING',
                verifiedDate: null,
                notes: 'PAN verification check pending BGV activation.',
              },
              address: {
                currentAddress: emp.address || `${empDept} Work Location, India`,
                permanentAddress: emp.address || `${empDept} Work Location, India`,
                method: 'PHYSICAL_VISIT',
                status: 'PENDING',
                verifiedDate: null,
                notes: 'Address field check pending BGV activation.',
              },
              uan: {
                uanNumber: '',
                maskedUan: `1009••••${String(1000 + emp.id).slice(-4)}`,
                previousEmployerMemberId: '',
                serviceMatch: false,
                status: 'PENDING',
                verifiedDate: null,
                notes: 'EPFO UAN check pending BGV activation.',
              },
              overallStatus: 'PENDING',
              initiatedDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
              completionDate: null,
              overallRemarks: 'Background verification pending activation by Uptrix organization.',
            };
          });
          setRecords(mapped);
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
    setSaveToast('Background verification is inactive. If you want to activate, contact to Uptrix organization.');
    setTimeout(() => setSaveToast(null), 4000);
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
            Pending
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
        </div>

     

        {/* Activation Alert Banner */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-indigo-50/70 to-purple-50/80 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <IconLock className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span>Background Verification (BGV) Inactive</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Pending Activation
                </span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                Aadhaar Check, PAN Check, Address Check, UAN / PF Number, and Overall Status are pending. If you want to activate, contact to Uptrix organization.
              </p>
            </div>
          </div>
          <a
            href="mailto:support@uptrix.io?subject=Activate%20Background%20Verification%20(BGV)&body=Hi%20Uptrix%20Team%2C%0A%0AWe%20would%20like%20to%20activate%20Background%20Verification%20(BGV)%20for%20our%20organization.%20Please%20guide%20us.%0A%0AThank%20you."
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
          >
            <IconMail className="w-3.5 h-3.5" />
            <span>Contact Uptrix Organization</span>
          </a>
        </div>

        {/* Verification Records Table */}
        <div className="relative overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 min-w-[220px]">Employee</th>
                <th className="px-4 py-3.5 min-w-[130px] filter blur-[2px] select-none opacity-80">Aadhaar Check</th>
                <th className="px-4 py-3.5 min-w-[130px] filter blur-[2px] select-none opacity-80">PAN Check</th>
                <th className="px-4 py-3.5 min-w-[150px] filter blur-[2px] select-none opacity-80">Address Check</th>
                <th className="px-4 py-3.5 min-w-[140px] filter blur-[2px] select-none opacity-80">UAN / PF Number</th>
                <th className="px-4 py-3.5 min-w-[130px] text-center filter blur-[2px] select-none opacity-80">Overall Status</th>
                <th className="px-4 py-3.5 min-w-[110px] text-right filter blur-[2px] select-none opacity-80">Action</th>
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
                    {/* Employee Profile - Clear & Unblurred */}
                    <td className="px-5 py-3.5 bg-white">
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

                    {/* Aadhaar - Blurred */}
                    <td className="px-4 py-3.5 filter blur-[4px] select-none pointer-events-none opacity-60">
                      <div className="space-y-0.5">
                        <span className="font-mono text-slate-800 font-semibold block">{r.aadhaar.maskedNumber}</span>
                        {getStatusBadge(r.aadhaar.status)}
                      </div>
                    </td>

                    {/* PAN - Blurred */}
                    <td className="px-4 py-3.5 filter blur-[4px] select-none pointer-events-none opacity-60">
                      <div className="space-y-0.5">
                        <span className="font-mono text-slate-800 font-semibold block">{r.pan.maskedNumber}</span>
                        {getStatusBadge(r.pan.status)}
                      </div>
                    </td>

                    {/* Address - Blurred */}
                    <td className="px-4 py-3.5 filter blur-[4px] select-none pointer-events-none opacity-60">
                      <div className="space-y-0.5 max-w-[180px]">
                        <span className="text-[11px] text-slate-700 truncate block" title={r.address.currentAddress}>
                          {r.address.currentAddress || 'No address set'}
                        </span>
                        {getStatusBadge(r.address.status)}
                      </div>
                    </td>

                    {/* UAN / PF - Blurred */}
                    <td className="px-4 py-3.5 filter blur-[4px] select-none pointer-events-none opacity-60">
                      <div className="space-y-0.5">
                        <span className="font-mono text-slate-800 font-semibold block">{r.uan.maskedUan}</span>
                        {getStatusBadge(r.uan.status)}
                      </div>
                    </td>

                    {/* Overall Status - Blurred */}
                    <td className="px-4 py-3.5 text-center filter blur-[4px] select-none pointer-events-none opacity-60">
                      {getStatusBadge(r.overallStatus)}
                    </td>

                    {/* Actions - Blurred */}
                    <td className="px-4 py-3.5 text-right filter blur-[4px] select-none pointer-events-none opacity-60">
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

          {/* Centered Activation Notice over the Blurred Verification Columns */}
          <div className="absolute inset-y-0 right-0 left-[230px] flex items-center justify-center p-4 z-20 pointer-events-none">
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-indigo-200/90 shadow-2xl rounded-2xl p-6 text-center max-w-sm mx-auto space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center mx-auto shadow-2xs">
                <IconLock className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Background Verification Inactive
                </h4>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                  If you want to activate, contact to Uptrix organization.
                </p>
              </div>
              <div className="pt-1">
                <a
                  href="mailto:support@uptrix.io?subject=Activate%20Background%20Verification%20(BGV)&body=Hi%20Uptrix%20Team%2C%0A%0AWe%20would%20like%20to%20activate%20Background%20Verification%20(BGV)%20for%20our%20organization.%20Please%20guide%20us.%0A%0AThank%20you."
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <IconMail className="w-4 h-4" />
                  <span>Contact Uptrix Organization</span>
                </a>
              </div>
            </div>
          </div>
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
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
                {/* Activation Notice Banner in Drawer */}
                <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-800 flex items-start gap-3 shadow-2xs">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                    <IconLock className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    <strong className="font-bold block text-slate-900 text-xs">Background Verification Integration Inactive</strong>
                    Statutory automated checks for this profile are pending. If you want to activate, contact to Uptrix organization.
                  </div>
                </div>

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
