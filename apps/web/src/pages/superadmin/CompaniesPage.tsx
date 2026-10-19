import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconBuilding,
  IconPlus,
  IconCircleCheck,
  IconCircleX,
  IconMapPin,
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
  IconDots,
  IconEye,
  IconUserPlus,
  IconCloudUpload,
  IconEdit,
  IconTrash,
  IconX,
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconCrown,
  IconWorld,
  IconMail,
  IconUsers,
  IconChevronDown,
  IconArrowLeft,
  IconCreditCard,
  IconSparkles,
  IconClock,
} from '@tabler/icons-react';

interface CompanyAdmin {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
}

interface CompanyItem {
  id: number;
  name: string;
  code: string;
  subdomain: string;
  customDomain?: string | null;
  logo?: string | null;
  website?: string | null;
  address?: any;
  planType?: string;
  subAmount?: number;
  subStartDate?: string;
  subEndDate?: string;
  nextPaymentDate?: string;
  isActive: boolean;
  paymentStatus?: 'IN_PROCESS' | 'PAYMENT_DONE' | 'DECLINE';
  paymentLinkUrl?: string;
  adminContact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  latestOrder?: any;
  createdAt?: string;
  packageId?: number | null;
  package?: {
    id?: number;
    name: string;
    employeeLimit: number;
    currency?: string;
    priceMonthly?: number;
  } | null;
  allowedEmailDomains?: string;
  users?: CompanyAdmin[];
  _count?: { users: number };
}

export const CompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    inactiveCompanies: 0,
    locationsCount: '-',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROCESS' | 'PAYMENT_DONE' | 'DECLINE'>('ALL');
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // Modals state
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Company Contacts View state
  const [contactsCompany, setContactsCompany] = useState<CompanyItem | null>(null);
  const [contactsList, setContactsList] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsRowsPerPage, setContactsRowsPerPage] = useState(10);
  const [contactsPage, setContactsPage] = useState(1);

  // Reset Password State
  const [resetModalAdmin, setResetModalAdmin] = useState<any | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetResult, setResetResult] = useState<{ tempPassword?: string; error?: string } | null>(
    null
  );

  // Add Admin Form
  const [adminForm, setAdminForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
  });
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminResult, setAdminResult] = useState<{ tempPassword?: string; error?: string } | null>(
    null
  );

  // Deploy Domain Form
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [domainSubmitting, setDomainSubmitting] = useState(false);
  const [domainMsg, setDomainMsg] = useState<string | null>(null);

  // Edit Company Form
  const [editForm, setEditForm] = useState({
    name: '',
    subdomain: '',
    packageId: '',
    planType: 'MONTHLY',
    website: '',
    allowedEmailDomains: '',
    isActive: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [compRes, pkgRes] = await Promise.all([
        api.get('/superadmin/companies'),
        api.get('/superadmin/packages').catch(() => ({ data: { packages: [] } })),
      ]);
      const data = compRes.data || {};
      const compList = data.companies || [];
      setCompanies(compList);
      setPackages(pkgRes.data?.packages || []);

      if (data.metrics) {
        setMetrics(data.metrics);
      } else {
        const total = compList.length;
        const active = compList.filter((c: CompanyItem) => c.isActive).length;
        const inactive = total - active;
        const locations = new Set(
          compList.map((c: any) => c.address?.city || c.address?.state).filter(Boolean)
        );
        setMetrics({
          totalCompanies: total,
          activeCompanies: active,
          inactiveCompanies: inactive,
          locationsCount: locations.size > 0 ? String(locations.size) : '-',
        });
      }
    } catch (err) {
      console.error('Failed to load companies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Close action dropdown on outside click
    const handleOutsideClick = () => setOpenMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleDeleteCompany = async (company: CompanyItem) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${company.name}"?`)) return;
    try {
      await api.delete(`/superadmin/companies/${company.id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to delete company');
    }
  };

  const fetchContacts = async (companyId: number) => {
    setContactsLoading(true);
    try {
      const res = await api.get(`/superadmin/companies/${companyId}/admins`);
      setContactsList(res.data?.admins || []);
    } catch (err) {
      console.error('Failed to load company contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  const handleOpenContacts = (company: CompanyItem) => {
    setContactsCompany(company);
    setContactsSearch('');
    setContactsPage(1);
    fetchContacts(company.id);
  };

  const handleResetPassword = (admin: any) => {
    setResetModalAdmin(admin);
    setResetResult(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!contactsCompany || !resetModalAdmin) return;
    setResettingPassword(true);
    setResetResult(null);
    try {
      const res = await api.post(
        `/superadmin/companies/${contactsCompany.id}/admins/${resetModalAdmin.id}/reset-password`,
        {}
      );
      setResetResult({ tempPassword: res.data?.tempPassword });
    } catch (err: any) {
      setResetResult({
        error: err.response?.data?.error || err.response?.data?.message || 'Failed to reset password',
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleOpenAddAdmin = (company: CompanyItem) => {
    setSelectedCompany(company);
    const contact = company.adminContact || {};
    const names = (contact.name || '').split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    setAdminForm({
      email: contact.email || '',
      firstName,
      lastName,
      phone: contact.phone || '',
      password: `Admin@${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setAdminResult(null);
    setAdminModalOpen(true);
  };

  const handleMarkPayment = async (companyId: number, status: 'PAYMENT_DONE' | 'IN_PROCESS' | 'DECLINE') => {
    try {
      await api.post(`/superadmin/companies/${companyId}/mark-payment`, { status });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update payment status');
    }
  };

  const handleResendPaymentLink = async (companyId: number) => {
    try {
      const res = await api.post(`/superadmin/companies/${companyId}/resend-payment-link`, {});
      alert(res.data?.message || 'Payment link resent successfully');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resend payment link');
    }
  };

  const handleCopyPaymentLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    alert('Payment link copied to clipboard!');
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setAdminSubmitting(true);
    setAdminResult(null);
    try {
      const res = await api.post(`/superadmin/companies/${selectedCompany.id}/admin`, adminForm);
      setAdminResult({ tempPassword: res.data?.tempPassword });
      setAdminForm({ email: '', firstName: '', lastName: '', phone: '', password: '' });
      fetchData();
      if (contactsCompany && contactsCompany.id === selectedCompany.id) {
        fetchContacts(contactsCompany.id);
      }
    } catch (err: any) {
      setAdminResult({
        error: err.response?.data?.error || err.response?.data?.message || 'Failed to add admin',
      });
    } finally {
      setAdminSubmitting(false);
    }
  };

  const handleDeployDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setDomainSubmitting(true);
    setDomainMsg(null);
    try {
      await api.post(`/superadmin/companies/${selectedCompany.id}/deploy-domain`, {
        customDomain: customDomainInput,
      });
      setDomainMsg('Domain updated and configured successfully!');
      fetchData();
    } catch (err: any) {
      setDomainMsg(
        err.response?.data?.error || err.response?.data?.message || 'Failed to configure domain'
      );
    } finally {
      setDomainSubmitting(false);
    }
  };

  const handleOpenEditModal = (company: CompanyItem) => {
    setSelectedCompany(company);
    setEditForm({
      name: company.name || '',
      subdomain: company.subdomain || '',
      packageId: company.packageId ? String(company.packageId) : '',
      planType: company.planType || 'MONTHLY',
      website: company.website || '',
      allowedEmailDomains: company.allowedEmailDomains || '',
      isActive: company.isActive,
    });
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await api.patch(`/superadmin/companies/${selectedCompany.id}`, {
        name: editForm.name.trim(),
        subdomain: editForm.subdomain.trim().toLowerCase(),
        packageId: editForm.packageId ? Number(editForm.packageId) : null,
        planType: editForm.planType,
        website: editForm.website.trim() || null,
        allowedEmailDomains: editForm.allowedEmailDomains.trim(),
        isActive: editForm.isActive,
      });
      setEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      setEditError(err.response?.data?.error || err.response?.data?.message || 'Failed to update company');
    } finally {
      setEditSubmitting(false);
    }
  };

  const getCompanyAvatarColor = (name: string) => {
    const char = (name || 'C').charAt(0).toUpperCase();
    const map: Record<string, string> = {
      T: 'bg-[#8b5cf6] text-white',
      R: 'bg-[#6366f1] text-white',
      J: 'bg-[#38bdf8] text-white',
      K: 'bg-[#f472b6] text-white',
      A: 'bg-[#3b82f6] text-white',
      B: 'bg-[#10b981] text-white',
      C: 'bg-[#06b6d4] text-white',
      D: 'bg-[#ec4899] text-white',
      E: 'bg-[#14b8a6] text-white',
      F: 'bg-[#f59e0b] text-white',
      G: 'bg-[#84cc16] text-white',
      H: 'bg-[#6366f1] text-white',
      I: 'bg-[#a855f7] text-white',
      L: 'bg-[#0ea5e9] text-white',
      M: 'bg-[#e11d48] text-white',
      N: 'bg-[#4f46e5] text-white',
      O: 'bg-[#f97316] text-white',
      P: 'bg-[#9333ea] text-white',
      S: 'bg-[#0284c7] text-white',
      U: 'bg-[#7c3aed] text-white',
      V: 'bg-[#d946ef] text-white',
      W: 'bg-[#059669] text-white',
      Y: 'bg-[#eab308] text-white',
      Z: 'bg-[#64748b] text-white',
    };
    return map[char] || 'bg-[#6366f1] text-white';
  };

  const formatDetailDate = (dateVal?: string | Date | null) => {
    if (!dateVal) return '01 Sep 2026';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatDetailExpiry = (company: CompanyItem) => {
    if (company.subEndDate) return formatDetailDate(company.subEndDate);
    if (company.nextPaymentDate) return formatDetailDate(company.nextPaymentDate);
    const start = company.createdAt || company.subStartDate ? new Date(company.createdAt || company.subStartDate!) : new Date();
    const expiry = new Date(start);
    if (company.planType === 'YEARLY') {
      expiry.setFullYear(expiry.getFullYear() + 1);
    } else {
      expiry.setMonth(expiry.getMonth() + 1);
    }
    return formatDetailDate(expiry);
  };

  const formatDetailAddress = (addr: any) => {
    if (!addr) return '-';
    if (typeof addr === 'string') return addr.trim() || '-';
    const parts = [addr.street || addr.line1, addr.city, addr.state, addr.pincode || addr.zip, addr.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  // Filtered companies
  const filteredCompanies = companies.filter((c) => {
    const q = searchTerm.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const codeMatch = c.code?.toLowerCase().includes(q);
    const subMatch = c.subdomain?.toLowerCase().includes(q);
    const adminEmailMatch = c.users?.[0]?.email?.toLowerCase().includes(q);
    const contactEmailMatch = c.adminContact?.email?.toLowerCase().includes(q);
    const contactNameMatch = c.adminContact?.name?.toLowerCase().includes(q);
    const matchesSearch = nameMatch || codeMatch || subMatch || adminEmailMatch || contactEmailMatch || contactNameMatch;

    if (!matchesSearch) return false;

    const pStatus = c.paymentStatus || (c.users && c.users.length > 0 ? 'PAYMENT_DONE' : 'IN_PROCESS');
    if (statusFilter !== 'ALL' && pStatus !== statusFilter) {
      return false;
    }

    return true;
  });

  const paymentDoneCount = companies.filter(
    (c) => (c.paymentStatus || (c.users && c.users.length > 0 ? 'PAYMENT_DONE' : 'IN_PROCESS')) === 'PAYMENT_DONE'
  ).length;
  const inProcessCount = companies.filter(
    (c) => (c.paymentStatus || (c.users && c.users.length > 0 ? 'PAYMENT_DONE' : 'IN_PROCESS')) === 'IN_PROCESS'
  ).length;
  const declineCount = companies.filter(
    (c) => c.paymentStatus === 'DECLINE'
  ).length;

  const totalEntries = filteredCompanies.length;
  const totalPages = Math.ceil(totalEntries / rowsPerPage) || 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalEntries);
  const displayedCompanies = filteredCompanies.slice(startIndex, endIndex);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contactsList.filter((admin) => {
      const name = `${admin.firstName || ''} ${admin.lastName || ''} ${admin.username || ''}`.toLowerCase();
      const email = (admin.email || '').toLowerCase();
      const phone = (admin.phone || '').toLowerCase();
      const query = contactsSearch.toLowerCase();
      return name.includes(query) || email.includes(query) || phone.includes(query);
    });
  }, [contactsList, contactsSearch]);

  const totalContactsPages = Math.ceil(filteredContacts.length / contactsRowsPerPage) || 1;
  const contactsStartIndex = (contactsPage - 1) * contactsRowsPerPage;
  const contactsEndIndex = Math.min(contactsStartIndex + contactsRowsPerPage, filteredContacts.length);
  const paginatedContacts = filteredContacts.slice(
    contactsStartIndex,
    contactsStartIndex + contactsRowsPerPage
  );

  return (
    <div className="space-y-6 pb-16">
      {contactsCompany ? (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setContactsCompany(null)}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                title="Back to Companies"
              >
                <IconArrowLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {contactsCompany.name}
                </h1>
                <p className="text-xs text-slate-400 font-normal mt-0.5">
                  Contacts added by Product Super Admin
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedCompany(contactsCompany);
                setAdminResult(null);
                setAdminModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0c66e4] hover:bg-[#0052cc] text-white rounded-lg text-xs sm:text-sm font-semibold shadow-xs transition-colors self-start sm:self-center cursor-pointer"
            >
              <IconUserPlus className="w-4 h-4" />
              <span>Add Admin</span>
            </button>
          </div>

          {/* Contacts Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6 space-y-4">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-base font-bold text-slate-900">Contacts</h2>
              <span className="text-xs text-slate-400">
                Only contacts added by super admin are shown.
              </span>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <span>Row Per Page</span>
                <select
                  value={contactsRowsPerPage}
                  onChange={(e) => {
                    setContactsRowsPerPage(Number(e.target.value));
                    setContactsPage(1);
                  }}
                  className="border border-slate-200 rounded-md px-2 py-1 text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>Entries</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={contactsSearch}
                  onChange={(e) => {
                    setContactsSearch(e.target.value);
                    setContactsPage(1);
                  }}
                  className="border border-slate-200 rounded-md px-3 py-1.5 text-xs w-48 sm:w-64 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f4f5f7] text-slate-700 font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Phone</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contactsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-2" />
                        <div>Loading contacts...</div>
                      </td>
                    </tr>
                  ) : paginatedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No company admin contacts found.
                      </td>
                    </tr>
                  ) : (
                    paginatedContacts.map((admin: any) => {
                      const fullName =
                        `${admin.firstName || ''} ${admin.lastName || ''}`.trim() ||
                        admin.username ||
                        'Admin';
                      return (
                        <tr key={admin.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {fullName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {admin.email}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            Company Admin
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-semibold bg-[#e3fcef] text-[#006644]">
                              Active
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {admin.phone || '-'}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleResetPassword(admin)}
                              className="px-3 py-1 border border-blue-500/80 text-blue-600 hover:bg-blue-50 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Reset Password
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="flex items-center justify-between pt-3 text-xs text-slate-500">
              <div>
                Showing {filteredContacts.length === 0 ? '0 - 0 of 0' : `${contactsStartIndex + 1} - ${contactsEndIndex} of ${filteredContacts.length}`} entries
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={contactsPage <= 1}
                  onClick={() => setContactsPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-600 cursor-pointer"
                >
                  <IconChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalContactsPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setContactsPage(pg)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                      contactsPage === pg
                        ? 'bg-[#0052cc] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  disabled={contactsPage >= totalContactsPages}
                  onClick={() => setContactsPage((p) => Math.min(totalContactsPages, p + 1))}
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none text-slate-600 cursor-pointer"
                >
                  <IconChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tenants &amp; Companies</h1>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5 font-medium">
            <span className="text-slate-400">Application</span>
            <span className="text-slate-300">&gt;</span>
            <span className="text-slate-600 font-medium">Companies List</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <Link
            to="/super-admin/companies/add"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs shadow-xs transition-all active:scale-95"
          >
            <IconPlus className="w-4 h-4" />
            Add Company
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Tenants */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-blue-50/80 text-blue-500 border border-blue-100/60 flex items-center justify-center shrink-0">
              <IconBuilding className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total Tenants</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {companies.length}
              </p>
              <p className="text-xs font-semibold text-blue-600 mt-1">
                Registered workspaces
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 45 C 70 20, 140 55, 210 35 C 280 15, 340 45, 400 25 L 400 60 L 0 60 Z"
                fill="#3b82f6"
                fillOpacity="0.06"
              />
              <path
                d="M0 45 C 70 20, 140 55, 210 35 C 280 15, 340 45, 400 25"
                fill="none"
                stroke="#60a5fa"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Payment Done */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center z-10 shadow-2xs">
            <IconCheck className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>

          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <IconCreditCard className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Payment Done</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {paymentDoneCount}
              </p>
              <p className="text-xs font-semibold text-emerald-600 mt-1">
                Ready for Admin Setup
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 46 C 80 18, 150 54, 220 28 C 290 12, 350 40, 400 22 L 400 60 L 0 60 Z"
                fill="#10b981"
                fillOpacity="0.06"
              />
              <path
                d="M0 46 C 80 18, 150 54, 220 28 C 290 12, 350 40, 400 22"
                fill="none"
                stroke="#34d399"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </svg>
          </div>
        </div>

        {/* Card 3: In Process */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <IconClock className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">In Process</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {inProcessCount}
              </p>
              <p className="text-xs font-medium text-amber-700 mt-1">
                Payment Link Dispatched
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 40 C 90 22, 160 58, 230 30 C 300 18, 360 46, 400 32 L 400 60 L 0 60 Z"
                fill="#f59e0b"
                fillOpacity="0.06"
              />
              <path
                d="M0 40 C 90 22, 160 58, 230 30 C 300 18, 360 46, 400 32"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeOpacity="0.35"
              />
            </svg>
          </div>
        </div>

        {/* Card 4: Declined */}
        <div className="bg-white p-5 rounded-2xl border border-rose-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shrink-0">
              <IconCircleX className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Declined / Failed</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {declineCount}
              </p>
              <p className="text-xs font-medium text-rose-600 mt-1">
                Payment expired or declined
              </p>
            </div>
          </div>
          {/* Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden opacity-90">
            <svg viewBox="0 0 400 60" preserveAspectRatio="none" className="w-full h-full">
              <path
                d="M0 44 C 85 18, 150 52, 230 25 C 310 10, 360 42, 400 22 L 400 60 L 0 60 Z"
                fill="#f43f5e"
                fillOpacity="0.06"
              />
              <path
                d="M0 44 C 85 18, 150 52, 230 25 C 310 10, 360 42, 400 22"
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2"
                strokeOpacity="0.5"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Table Card: Companies List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Card Header & Controls with Status Filter Tabs */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Tenants ({companies.length})
            </button>
            <button
              onClick={() => {
                setStatusFilter('IN_PROCESS');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'IN_PROCESS'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              In Process ({inProcessCount})
            </button>
            <button
              onClick={() => {
                setStatusFilter('PAYMENT_DONE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'PAYMENT_DONE'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Payment Done ({paymentDoneCount})
            </button>
            <button
              onClick={() => {
                setStatusFilter('DECLINE');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === 'DECLINE'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Decline ({declineCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-3.5 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-blue-600 w-full placeholder:text-slate-400 text-slate-800 shadow-2xs"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-4">COMPANY NAME</th>
                <th className="px-5 py-4">EMAIL</th>
                <th className="px-5 py-4">ACCOUNT URL</th>
                <th className="px-5 py-4">PLAN</th>
                <th className="px-5 py-4">ADMIN</th>
                <th className="px-5 py-4">CREATED DATE</th>
                <th className="px-5 py-4 text-center">STATUS</th>
                <th className="px-5 py-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
                  </td>
                </tr>
              ) : displayedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400 font-medium">
                    No companies found matching current filters.
                  </td>
                </tr>
              ) : (
                displayedCompanies.map((c) => {
                  const initial = c.name ? c.name.charAt(0).toUpperCase() : 'C';
                  const primaryAdmin = c.users && c.users.length > 0 ? c.users[0] : null;
                  const emailDisplay = (c as any).email || (c.allowedEmailDomains?.includes('@') ? c.allowedEmailDomains : null) || c.adminContact?.email || primaryAdmin?.email || '-';

                  const createdStr = c.createdAt
                    ? new Date(c.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '07 Oct 2026';

                  const planName = c.package?.name || 'Basic Plan';
                  const planType = c.planType ? c.planType.toLowerCase() : 'monthly';
                  const accountUrl = `${c.subdomain}.uptrix.io`;

                  const pStatus = c.paymentStatus || (primaryAdmin ? 'PAYMENT_DONE' : 'IN_PROCESS');

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* COMPANY NAME */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {c.logo ? (
                            <img
                              src={c.logo}
                              alt={c.name}
                              className="w-10 h-10 rounded-xl object-contain border border-slate-200 bg-white p-0.5 shrink-0"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl ${getCompanyAvatarColor(c.name)} flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs`}>
                              {initial}
                            </div>
                          )}
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCompany(c);
                                setViewModalOpen(true);
                              }}
                              className="font-bold text-slate-900 leading-snug hover:text-blue-600 transition-colors text-left cursor-pointer"
                              title="Click to view company details"
                            >
                              {c.name}
                            </button>
                            <div className="text-[11px] text-slate-400">
                              Code: <span className="font-normal">{c.code.toLowerCase()}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL */}
                      <td className="px-5 py-4 text-slate-600 font-normal">{emailDisplay}</td>

                      {/* ACCOUNT URL */}
                      <td className="px-5 py-4">
                        <a
                          href={`https://${accountUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium break-all"
                        >
                          {accountUrl}
                        </a>
                      </td>

                      {/* PLAN */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900 leading-snug">{planName}</div>
                        <div className="text-[11px] text-slate-400 capitalize mt-0.5">{planType}</div>
                      </td>

                      {/* ADMIN COLUMN: Gated by Payment Status */}
                      <td className="px-5 py-4">
                        {pStatus === 'IN_PROCESS' || pStatus === 'DECLINE' ? (
                          <div className="flex items-center gap-1.5" title="Payment must be completed before Super Admin creates Company Admin">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200/80">
                              <IconClock className="w-3.5 h-3.5 text-amber-600" />
                              Awaiting Payment
                            </span>
                          </div>
                        ) : primaryAdmin ? (
                          <div className="space-y-0.5 max-w-[190px]">
                            <button
                              type="button"
                              onClick={() => handleOpenContacts(c)}
                              className="font-bold text-slate-900 hover:text-blue-600 hover:underline text-left text-xs truncate block max-w-full cursor-pointer"
                              title="View admin contacts"
                            >
                              {primaryAdmin.firstName ? `${primaryAdmin.firstName} ${primaryAdmin.lastName || ''}`.trim() : primaryAdmin.email}
                            </button>
                            <span className="text-[11px] text-slate-400 truncate block font-mono">
                              {primaryAdmin.email}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenAddAdmin(c)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                            title="Payment done! Click to set up Company Admin and send credentials"
                          >
                            <IconUserPlus className="w-3.5 h-3.5" />
                            <span>+ Create Admin</span>
                          </button>
                        )}
                      </td>

                      {/* CREATED DATE */}
                      <td className="px-5 py-4 text-slate-600 font-medium whitespace-nowrap">
                        {createdStr}
                      </td>

                      {/* STATUS COLUMN: Payment & Onboarding Status */}
                      <td className="px-5 py-4 text-center">
                        {pStatus === 'PAYMENT_DONE' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-2xs">
                            <IconCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            Payment Done
                          </span>
                        ) : pStatus === 'DECLINE' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 shadow-2xs">
                            <IconCircleX className="w-3.5 h-3.5 text-rose-600" />
                            Decline
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            In Process
                          </span>
                        )}
                      </td>

                      {/* ACTIONS: White squircle button with blue dots */}
                      <td className="px-5 py-4 text-right relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === c.id ? null : c.id);
                          }}
                          className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 flex items-center justify-center shadow-2xs transition-colors ml-auto cursor-pointer"
                          title="Actions"
                        >
                          <IconDots className="w-4 h-4" />
                        </button>

                        {/* Floating Action Dropdown Menu */}
                        {openMenuId === c.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-5 mt-1.5 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-40 text-left text-xs animate-in fade-in zoom-in-95"
                          >
                            {/* Action to Create Admin if Payment Done & No Admin yet */}
                            {pStatus === 'PAYMENT_DONE' && !primaryAdmin && (
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleOpenAddAdmin(c);
                                }}
                                className="w-full px-3.5 py-2 text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 flex items-center gap-2.5 transition-colors font-bold border-b border-blue-100"
                              >
                                <IconUserPlus className="w-4 h-4 text-blue-600" />
                                Create Company Admin
                              </button>
                            )}

                            {/* In Process Payment Options */}
                            {pStatus === 'IN_PROCESS' && (
                              <>
                                {c.paymentLinkUrl && (
                                  <button
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleCopyPaymentLink(c.paymentLinkUrl!);
                                    }}
                                    className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                                  >
                                    <IconCopy className="w-4 h-4 text-slate-500" />
                                    Copy Payment Link
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleResendPaymentLink(c.id);
                                  }}
                                  className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                                >
                                  <IconMail className="w-4 h-4 text-slate-500" />
                                  Resend Payment Link
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleMarkPayment(c.id, 'PAYMENT_DONE');
                                  }}
                                  className="w-full px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors font-bold"
                                >
                                  <IconCheck className="w-4 h-4 text-emerald-600" />
                                  Confirm Payment (Mark Done)
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                              </>
                            )}

                            {/* Declined Options */}
                            {pStatus === 'DECLINE' && (
                              <>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleResendPaymentLink(c.id);
                                  }}
                                  className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                                >
                                  <IconMail className="w-4 h-4 text-slate-500" />
                                  Resend Payment Link
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleMarkPayment(c.id, 'PAYMENT_DONE');
                                  }}
                                  className="w-full px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors font-medium"
                                >
                                  <IconCheck className="w-4 h-4 text-emerald-600" />
                                  Mark as Payment Done
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                              </>
                            )}

                            <button
                              onClick={() => {
                                setSelectedCompany(c);
                                setViewModalOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                            >
                              <IconEye className="w-4 h-4 text-slate-400" />
                              View Details
                            </button>

                            {primaryAdmin && (
                              <button
                                onClick={() => {
                                  handleOpenContacts(c);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                              >
                                <IconUsers className="w-4 h-4 text-slate-400" />
                                Admin Contacts
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedCompany(c);
                                setCustomDomainInput(c.customDomain || '');
                                setDomainMsg(null);
                                setDomainModalOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                            >
                              <IconCloudUpload className="w-4 h-4 text-slate-400" />
                              Deploy Domain
                            </button>

                            <button
                              onClick={() => {
                                handleOpenEditModal(c);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium"
                            >
                              <IconEdit className="w-4 h-4 text-slate-400" />
                              Edit Company
                            </button>

                            <div className="border-t border-slate-100 my-1" />

                            <button
                              onClick={() => {
                                handleDeleteCompany(c);
                                setOpenMenuId(null);
                              }}
                              className="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors font-medium"
                            >
                              <IconTrash className="w-4 h-4 text-rose-500" />
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {totalEntries === 0
              ? 'Showing 0 - 0 of 0 entries'
              : `Showing ${startIndex + 1} - ${endIndex} of ${totalEntries} entries`}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors ${
                  currentPage === pageNum
                    ? 'bg-blue-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pageNum}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {/* 1. VIEW COMPANY MODAL */}
      {viewModalOpen && selectedCompany && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
          onClick={() => setViewModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-[650px] w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                Company Detail
              </h2>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-500 hover:bg-slate-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                title="Close"
              >
                <IconX className="w-3.5 h-3.5" stroke={2.5} />
              </button>
            </div>

            {/* Top Company Info Box */}
            <div className="bg-[#f8fafc] rounded-xl p-4 sm:p-5 flex items-center justify-between border border-slate-100/90 mb-6">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Avatar Circle */}
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-slate-800 font-bold text-base shrink-0 uppercase overflow-hidden">
                  {selectedCompany.logo ? (
                    <img
                      src={selectedCompany.logo}
                      alt={selectedCompany.name}
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    selectedCompany.name.charAt(0) || 'C'
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-snug truncate">
                    {selectedCompany.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate font-normal">
                    {selectedCompany.users?.[0]?.email || selectedCompany.website || `${selectedCompany.subdomain}@uptrix.io`}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="shrink-0 pl-3">
                {selectedCompany.isActive ? (
                  <span className="px-3.5 py-1.5 rounded-lg bg-[#00c950] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    Active
                  </span>
                ) : (
                  <span className="px-3.5 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                    Inactive
                  </span>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-3.5">
                Basic Info
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs sm:text-sm">
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Account URL</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm break-all">
                    {selectedCompany.subdomain}.peopleplus.uptrix.io
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Website</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm truncate block">
                    {selectedCompany.website || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Allowed Domains</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm truncate block">
                    {selectedCompany.allowedEmailDomains || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Currency</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                    {(selectedCompany.package as any)?.currency || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Language</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                    -
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Address</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                    {formatDetailAddress(selectedCompany.address)}
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-b border-slate-100 my-6" />

            {/* Plan Details */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 tracking-tight mb-3.5">
                Plan Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-6 text-xs sm:text-sm">
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Plan Name</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                    {selectedCompany.package?.name || 'Enterprice'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Plan Type</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                    {selectedCompany.planType
                      ? selectedCompany.planType.charAt(0).toUpperCase() +
                        selectedCompany.planType.slice(1).toLowerCase()
                      : 'Monthly'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Price</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                    {selectedCompany.subAmount !== undefined && selectedCompany.subAmount !== null
                      ? Number(selectedCompany.subAmount).toFixed(2)
                      : selectedCompany.package && (selectedCompany.package as any).priceMonthly !== undefined
                      ? Number((selectedCompany.package as any).priceMonthly).toFixed(2)
                      : '5000.00'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Register Date</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                    {formatDetailDate(selectedCompany.subStartDate || selectedCompany.createdAt)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-normal block mb-1">Expiring On</span>
                  <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                    {formatDetailExpiry(selectedCompany)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD COMPANY ADMIN MODAL */}
      {adminModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IconUserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Company Admin</h3>
                  <p className="text-[11px] text-slate-400">{selectedCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {adminResult?.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {adminResult.error}
              </div>
            )}

            {adminResult?.tempPassword && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <IconCheck className="w-4 h-4 text-emerald-600" />
                  Admin Created Successfully!
                </div>
                <div className="text-[11px]">Temporary Password:</div>
                <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-emerald-300 font-mono font-bold text-slate-800">
                  <span>{adminResult.tempPassword}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(adminResult.tempPassword || '');
                      alert('Password copied to clipboard!');
                    }}
                    className="text-emerald-700 hover:text-emerald-900"
                    title="Copy"
                  >
                    <IconCopy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@company.com"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={adminForm.firstName}
                    onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={adminForm.lastName}
                    onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={adminForm.phone}
                  onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Password <span className="text-slate-400 font-normal">(Optional, auto-generated if blank)</span>
                </label>
                <input
                  type="password"
                  placeholder="Leave empty for auto-generated password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-50"
                >
                  {adminSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. DEPLOY DOMAIN MODAL */}
      {domainModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IconCloudUpload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Deploy Domain</h3>
                  <p className="text-[11px] text-slate-400">{selectedCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setDomainModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {domainMsg && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                {domainMsg}
              </div>
            )}

            <form onSubmit={handleDeployDomain} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-500 mb-1">Standard Subdomain</label>
                <div className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-mono">
                  {selectedCompany.subdomain}.peopleplus.uptrix.io
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Custom Domain</label>
                <input
                  type="text"
                  placeholder="e.g. hrms.mycompany.com"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600 font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Point your DNS CNAME record to <code className="bg-slate-100 px-1 py-0.5 rounded">cname.uptrix.io</code>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDomainModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={domainSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-50"
                >
                  {domainSubmitting ? 'Deploying...' : 'Save & Deploy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. EDIT COMPANY MODAL */}
      {editModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IconEdit className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Edit Company Details</h3>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Package Plan</label>
                  <select
                    value={editForm.packageId}
                    onChange={(e) => setEditForm({ ...editForm, packageId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                  >
                    <option value="">Select Package</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Plan Frequency</label>
                  <select
                    value={editForm.planType}
                    onChange={(e) => setEditForm({ ...editForm, planType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Website</label>
                <input
                  type="url"
                  placeholder="https://company.com"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={editForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'ACTIVE' })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Suspended / Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. RESET PASSWORD MODAL */}
      {resetModalAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IconCrown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Reset Admin Password</h3>
                  <p className="text-[11px] text-slate-400">{resetModalAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalAdmin(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {resetResult?.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {resetResult.error}
              </div>
            )}

            {resetResult?.tempPassword ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <IconCheck className="w-4 h-4 text-emerald-600" />
                  Password Reset Successfully!
                </div>
                <div className="text-[11px] text-slate-600">New Temporary Password:</div>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-emerald-300 font-mono font-bold text-slate-800">
                  <span className="text-sm">{resetResult.tempPassword}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resetResult.tempPassword || '');
                      alert('Password copied to clipboard!');
                    }}
                    className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer font-sans text-xs"
                    title="Copy"
                  >
                    <IconCopy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Share this password with the company administrator.
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to reset the password for <strong>{resetModalAdmin.email}</strong>? A secure temporary password will be automatically generated.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetModalAdmin(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {resetResult?.tempPassword ? 'Done' : 'Cancel'}
              </button>
              {!resetResult?.tempPassword && (
                <button
                  type="button"
                  onClick={handleConfirmResetPassword}
                  disabled={resettingPassword}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {resettingPassword ? 'Resetting...' : 'Generate Password'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default CompaniesPage;
