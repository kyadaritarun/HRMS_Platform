import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  IconFilter,
  IconExternalLink,
  IconFileCertificate,
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
  workingDays?: string;
  timezone?: string;
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
  statutory?: {
    pan?: string;
    tan?: string;
    gstin?: string;
    cin?: string;
    pfEstablishmentCode?: string;
    esicRegistrationNumber?: string;
    ptrcNumber?: string;
  };
  settings?: any;
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

  // Floating action dropdown menu state
  const [activeMenu, setActiveMenu] = useState<{
    company: CompanyItem;
    rect: DOMRect;
  } | null>(null);

  // Close floating dropdown on scroll, resize, or Escape key
  useEffect(() => {
    if (!activeMenu) return;
    const handleScroll = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.('.company-dropdown-menu')) return;
      setActiveMenu(null);
    };
    const handleResize = () => setActiveMenu(null);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveMenu(null);
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenu]);

  // Modals state
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
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

  // Edit Company Form
  const [editForm, setEditForm] = useState({
    name: '',
    subdomain: '',
    packageId: '',
    planType: 'MONTHLY',
    website: '',
    allowedEmailDomains: '',
    isActive: true,
    // Registered Headquarters Address
    street: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    // Statutory, Tax & Compliance Registrations
    pan: '',
    tan: '',
    gstin: '',
    cin: '',
    pfEstablishmentCode: '',
    esicRegistrationNumber: '',
    ptrcNumber: '',
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

  const handleOpenEditModal = (company: CompanyItem) => {
    setSelectedCompany(company);
    const addr = (typeof company.address === 'string'
      ? (() => { try { return JSON.parse(company.address); } catch { return {}; } })()
      : (company.address || {})) as any;
    const settings = (typeof company.settings === 'string'
      ? (() => { try { return JSON.parse(company.settings); } catch { return {}; } })()
      : (company.settings || {})) as any;
    const stat = (company.statutory || settings.statutory || (company as any).statutory || {}) as any;

    setEditForm({
      name: company.name || '',
      subdomain: company.subdomain || '',
      packageId: company.packageId ? String(company.packageId) : '',
      planType: company.planType || 'MONTHLY',
      website: company.website || '',
      allowedEmailDomains: company.allowedEmailDomains || '',
      isActive: company.isActive,
      // Headquarters Address
      street: addr.street || addr.line1 || '',
      addressLine2: addr.addressLine2 || addr.line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pinCode: addr.pinCode || addr.pincode || addr.zip || '',
      // Statutory
      pan: stat.pan || (company as any).pan || '',
      tan: stat.tan || (company as any).tan || '',
      gstin: stat.gstin || (company as any).gstin || '',
      cin: stat.cin || (company as any).cin || '',
      pfEstablishmentCode: stat.pfEstablishmentCode || (company as any).pfEstablishmentCode || '',
      esicRegistrationNumber: stat.esicRegistrationNumber || (company as any).esicRegistrationNumber || '',
      ptrcNumber: stat.ptrcNumber || (company as any).ptrcNumber || '',
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
      const res = await api.patch(`/superadmin/companies/${selectedCompany.id}`, {
        name: editForm.name.trim(),
        subdomain: editForm.subdomain.trim().toLowerCase(),
        packageId: editForm.packageId ? Number(editForm.packageId) : null,
        planType: editForm.planType,
        website: editForm.website.trim() || null,
        allowedEmailDomains: editForm.allowedEmailDomains.trim(),
        isActive: editForm.isActive,
        address: {
          street: editForm.street.trim(),
          addressLine2: editForm.addressLine2.trim(),
          city: editForm.city.trim(),
          state: editForm.state.trim(),
          pinCode: editForm.pinCode.trim(),
          country: 'India',
        },
        pan: editForm.pan.trim().toUpperCase(),
        tan: editForm.tan.trim().toUpperCase(),
        gstin: editForm.gstin.trim().toUpperCase(),
        cin: editForm.cin.trim().toUpperCase(),
        pfEstablishmentCode: editForm.pfEstablishmentCode.trim().toUpperCase(),
        esicRegistrationNumber: editForm.esicRegistrationNumber.trim(),
        ptrcNumber: editForm.ptrcNumber.trim().toUpperCase(),
      });
      if (res.data?.company) {
        setSelectedCompany(res.data.company);
      }
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
    const parts = [
      addr.street || addr.line1,
      addr.addressLine2 || addr.line2,
      addr.city,
      addr.state,
      addr.pinCode || addr.pincode || addr.zip,
      addr.country,
    ].filter(Boolean);
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
                <p className="text-xs text-slate-500 font-normal mt-0.5">
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
              <span className="text-xs text-slate-500 font-medium">
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
                  className="border border-slate-200 rounded-md px-3 py-1.5 text-xs w-48 sm:w-64 placeholder:text-slate-500 font-medium focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
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
                      <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                        <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-2" />
                        <div>Loading contacts...</div>
                      </td>
                    </tr>
                  ) : paginatedContacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500 font-medium">
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
                          <td className="py-3.5 px-4 text-slate-500 font-medium">
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
            <div className="flex items-center justify-between pt-3 text-xs text-slate-500 font-medium">
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <IconBuilding className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>Tenants &amp; Companies</span>
              </h1>
             
            </div>

            <Link
              to="/super-admin/companies/add"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer shrink-0"
            >
              <IconPlus className="w-4 h-4" />
              <span>Add Company</span>
            </Link>
          </div>

          {/* Toolbar: Search on Left & Status Dropdown Filter on Right */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search on the Left */}
            <div className="relative flex-1 max-w-md">
              <IconSearch className="w-4 h-4 text-slate-400 font-medium absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by company name, code, domain, or admin..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all text-slate-800"
              />
            </div>

            {/* Dropdown Filter on the Right */}
            <div className="relative min-w-[210px] shrink-0">
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
              >
                <option value="ALL">All Tenants ({companies.length})</option>
                <option value="IN_PROCESS">In Process ({inProcessCount})</option>
                <option value="PAYMENT_DONE">Payment Done ({paymentDoneCount})</option>
                <option value="DECLINE">Declined ({declineCount})</option>
              </select>
              <IconFilter className="w-3.5 h-3.5 text-slate-400 font-medium absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 font-medium absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Main Table Card: Companies List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Table View */}
            <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5">Company Name</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Plan</th>
                <th className="px-5 py-3.5">Admin</th>
                <th className="px-5 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500 font-medium">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
                  </td>
                </tr>
              ) : displayedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500 font-medium">
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
                            <div className="text-[11px] text-slate-500 font-medium">
                              Code: <span className="font-normal">{c.code.toLowerCase()}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL */}
                      <td className="px-5 py-4 text-slate-600 font-normal">{emailDisplay}</td>

                      {/* PLAN */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900 leading-snug">{planName}</div>
                        <div className="text-[11px] text-slate-500 font-medium capitalize mt-0.5">{planType}</div>
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
                            <span className="text-[11px] text-slate-500 truncate block font-mono">
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
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeMenu?.company.id === c.id) {
                              setActiveMenu(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActiveMenu({ company: c, rect });
                            }
                          }}
                          className={`w-8 h-8 rounded-xl border ${
                            activeMenu?.company.id === c.id
                              ? 'border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-blue-600'
                          } flex items-center justify-center shadow-2xs transition-colors ml-auto cursor-pointer`}
                          title="Actions"
                        >
                          <IconDots className="w-4 h-4" />
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
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <span>
            {totalEntries === 0
              ? 'Showing 0 - 0 of 0 entries'
              : `Showing ${startIndex + 1} - ${endIndex} of ${totalEntries} entries`}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || totalPages === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Previous page"
            >
              <IconChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <span className="px-3 py-1 rounded-lg bg-[#5E4BE2] text-white font-bold text-xs shadow-2xs">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              title="Next page"
            >
              <span>Next</span>
              <IconChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      {/* 1. VIEW COMPANY RIGHT-SIDE DRAWER */}
      {viewModalOpen && selectedCompany && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setViewModalOpen(false)}
          />

          {/* Slide-over Drawer Container Flush to the Right */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-2xl sm:max-w-3xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Top Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 bg-white flex items-center justify-between shrink-0 gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl ${getCompanyAvatarColor(selectedCompany.name)} flex items-center justify-center font-bold text-lg text-white shadow-sm shrink-0 uppercase overflow-hidden`}>
                    {selectedCompany.logo ? (
                      <img
                        src={selectedCompany.logo}
                        alt={selectedCompany.name}
                        className="w-full h-full object-contain p-1 bg-white"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      selectedCompany.name.charAt(0) || 'C'
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug truncate">
                        {selectedCompany.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                        {selectedCompany.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <IconWorld className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="font-mono">{selectedCompany.subdomain}.uptrix.io</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Status Badge */}
                  {selectedCompany.paymentStatus === 'IN_PROCESS' || (!selectedCompany.isActive && !selectedCompany.users?.length) ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      In Process
                    </span>
                  ) : selectedCompany.isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Inactive
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewModalOpen(false)}
                    className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Close"
                  >
                    <IconX className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs bg-slate-50/50">
                {/* 1. Primary Admin & Contact Person Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                        <IconUsers className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                        Primary Administrator &amp; Account Contact
                      </h3>
                    </div>
                    {selectedCompany.users && selectedCompany.users.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleOpenContacts(selectedCompany);
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                      >
                        <span>View All Admins</span>
                        <span>({selectedCompany.users.length})</span>
                      </button>
                    ) : (
                      selectedCompany.paymentStatus === 'PAYMENT_DONE' && (
                        <button
                          type="button"
                          onClick={() => {
                            handleOpenAddAdmin(selectedCompany);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          + Create Admin
                        </button>
                      )
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Admin Name</span>
                      <span className="font-bold text-slate-800 text-xs block">
                        {selectedCompany.adminContact?.name ||
                          (selectedCompany.users?.[0]?.firstName
                            ? `${selectedCompany.users[0].firstName} ${selectedCompany.users[0].lastName || ''}`.trim()
                            : selectedCompany.name + ' Admin')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Work Email</span>
                      <span className="font-mono text-slate-800 text-xs block truncate" title={selectedCompany.adminContact?.email || selectedCompany.users?.[0]?.email || '-'}>
                        {selectedCompany.adminContact?.email || selectedCompany.users?.[0]?.email || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Phone Number</span>
                      <span className="font-mono text-slate-800 text-xs block">
                        {selectedCompany.adminContact?.phone || selectedCompany.users?.[0]?.phone || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Subscription, Plan & Payment Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <IconCreditCard className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                        Subscription Plan &amp; Billing
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-[#5E4BE2] text-[10px] font-bold">
                      {selectedCompany.planType || 'MONTHLY'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Plan Name</span>
                      <span className="font-bold text-slate-800 text-xs block">
                        {selectedCompany.package?.name || 'Standard Plan'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Capacity: Up to {selectedCompany.package?.employeeLimit || 10} seats
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Subscription Amount</span>
                      <span className="text-sm font-black text-[#5E4BE2] block">
                        ₹{Number(selectedCompany.subAmount || selectedCompany.package?.priceMonthly || 0).toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Incl. 18% GST
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Registration &amp; Expiry</span>
                      <span className="font-medium text-slate-800 text-xs block">
                        Started: {formatDetailDate(selectedCompany.subStartDate || selectedCompany.createdAt)}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Expires: {formatDetailExpiry(selectedCompany)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Status & Link Bar */}
                  {selectedCompany.paymentStatus === 'IN_PROCESS' && (
                    <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                          Payment Proposal Sent • Awaiting Payment
                        </span>
                        {selectedCompany.paymentLinkUrl && (
                          <span className="font-mono text-amber-900 truncate block text-[11px] mt-0.5">
                            {selectedCompany.paymentLinkUrl}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {selectedCompany.paymentLinkUrl && (
                          <button
                            type="button"
                            onClick={() => handleCopyPaymentLink(selectedCompany.paymentLinkUrl!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60 font-bold text-[11px] cursor-pointer"
                          >
                            <IconCopy className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResendPaymentLink(selectedCompany.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/60 font-bold text-[11px] cursor-pointer"
                        >
                          <IconMail className="w-3.5 h-3.5" />
                          <span>Resend</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleMarkPayment(selectedCompany.id, 'PAYMENT_DONE');
                            setViewModalOpen(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-2xs"
                        >
                          <IconCheck className="w-3.5 h-3.5" />
                          <span>Confirm Payment</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Registered Headquarters Address Card */}
                {(() => {
                  const addr = (typeof selectedCompany.address === 'string'
                    ? (() => { try { return JSON.parse(selectedCompany.address); } catch { return {}; } })()
                    : (selectedCompany.address || {})) as any;
                  const street = addr.street || addr.line1 || '';
                  const suite = addr.addressLine2 || addr.line2 || '';
                  const city = addr.city || '';
                  const state = addr.state || '';
                  const pin = addr.pinCode || addr.pincode || addr.zip || '';
                  const country = addr.country || 'India';
                  const hasAddress = Boolean(street || city || state || pin);

                  return (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                            <IconMapPin className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                            Registered Headquarters Address
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(selectedCompany)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                        >
                          {hasAddress ? 'Edit Address' : '+ Add Address'}
                        </button>
                      </div>

                      {hasAddress ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[11px] text-slate-500 block mb-0.5">Street Address</span>
                            <span className="font-medium text-slate-800 text-xs block">
                              {street || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block mb-0.5">Suite / Landmark</span>
                            <span className="font-medium text-slate-800 text-xs block">
                              {suite || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block mb-0.5">City &amp; State</span>
                            <span className="font-medium text-slate-800 text-xs block">
                              {[city, state].filter(Boolean).join(', ') || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-500 block mb-0.5">PIN Code &amp; Country</span>
                            <span className="font-medium text-slate-800 text-xs block">
                              {[pin, country].filter(Boolean).join(', ') || '-'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-3 px-4 rounded-xl bg-slate-50/80 border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="text-xs text-slate-600">
                            No registered headquarters address entered yet for this tenant.
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(selectedCompany)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                          >
                            + Enter Address
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 4. Statutory, Tax & Compliance Registrations Card */}
                {(() => {
                  const settings = (typeof selectedCompany.settings === 'string'
                    ? (() => { try { return JSON.parse(selectedCompany.settings); } catch { return {}; } })()
                    : (selectedCompany.settings || {})) as any;
                  const statutory = (selectedCompany.statutory || settings.statutory || (selectedCompany as any).statutory || {}) as any;

                  const pan = statutory.pan || (selectedCompany as any).pan || '';
                  const tan = statutory.tan || (selectedCompany as any).tan || '';
                  const gstin = statutory.gstin || (selectedCompany as any).gstin || '';
                  const cin = statutory.cin || (selectedCompany as any).cin || '';
                  const pfEstablishmentCode = statutory.pfEstablishmentCode || (selectedCompany as any).pfEstablishmentCode || '';
                  const esicRegistrationNumber = statutory.esicRegistrationNumber || (selectedCompany as any).esicRegistrationNumber || '';
                  const ptrcNumber = statutory.ptrcNumber || (selectedCompany as any).ptrcNumber || '';

                  const hasStatutory = Boolean(pan || tan || gstin || cin || pfEstablishmentCode || esicRegistrationNumber || ptrcNumber);

                  return (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                            <IconFileCertificate className="w-4 h-4" />
                          </div>
                          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                            Statutory, Tax &amp; Compliance Registrations
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(selectedCompany)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline cursor-pointer"
                        >
                          {hasStatutory ? 'Edit Statutory Details' : '+ Add Statutory Details'}
                        </button>
                      </div>

                      {hasStatutory ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Company PAN</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {pan || '-'}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Company TAN</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {tan || '-'}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Company GSTIN</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {gstin || '-'}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">CIN (Corp ID)</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {cin || '-'}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">PF Code</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {pfEstablishmentCode || '-'}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">ESIC Reg. No.</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {esicRegistrationNumber || '-'}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">PTRC Number</span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {ptrcNumber || '-'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              Statutory registrations not yet recorded
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5">
                              This tenant was created without PAN, TAN, GSTIN, CIN, PF or ESIC codes. Enter them to generate valid payslips &amp; tax filings.
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(selectedCompany)}
                            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs whitespace-nowrap"
                          >
                            + Configure Registrations
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 5. Workspace Identity & System Configuration Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <IconBuilding className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Workspace Identity &amp; System Configuration
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Tenant Subdomain</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {selectedCompany.subdomain}.uptrix.io
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Allowed Email Domains</span>
                      <span className="font-mono text-slate-800 text-xs">
                        {selectedCompany.allowedEmailDomains || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Official Website</span>
                      {selectedCompany.website ? (
                        <a
                          href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline flex items-center gap-1 text-xs"
                        >
                          <span className="truncate">{selectedCompany.website}</span>
                          <IconExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Working Days</span>
                      <span className="font-medium text-slate-800 text-xs capitalize">
                        {selectedCompany.workingDays || 'Mon - Fri'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Timezone</span>
                      <span className="font-mono text-slate-800 text-xs">
                        {selectedCompany.timezone || 'Asia/Kolkata'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block mb-0.5">Total Users / Employees</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {selectedCompany._count?.users ?? selectedCompany.users?.length ?? 0} active
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Sticky Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Close Drawer
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewModalOpen(false);
                      handleOpenEditModal(selectedCompany);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <IconEdit className="w-3.5 h-3.5" />
                    <span>Edit Company</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
                  <p className="text-[11px] text-slate-500 font-medium">{selectedCompany.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAdminModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 font-medium hover:text-slate-700 flex items-center justify-center"
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
                <label className="block font-medium text-slate-700 mb-1">Email Address <span className="text-rose-500">*</span></label>
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
                  Password <span className="text-slate-500 font-normal">(Optional, auto-generated if blank)</span>
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

      {/* 3. EDIT COMPANY MODAL */}
      {editModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 my-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IconEdit className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Company Details</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{selectedCompany.name} ({selectedCompany.code})</p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 font-medium hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs shrink-0">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-5 text-xs overflow-y-auto pr-1 flex-1">
              {/* SECTION A: Basic & Subscription */}
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-indigo-700">
                  <IconBuilding className="w-3.5 h-3.5" />
                  <span>Company Profile &amp; Plan</span>
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Company Name <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Subdomain <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={editForm.subdomain}
                        onChange={(e) => setEditForm({ ...editForm, subdomain: e.target.value.toLowerCase() })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Package Plan</label>
                      <select
                        value={editForm.packageId}
                        onChange={(e) => setEditForm({ ...editForm, packageId: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600 bg-white"
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
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600 bg-white"
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Website</label>
                      <input
                        type="url"
                        placeholder="https://company.com"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Status</label>
                      <select
                        value={editForm.isActive ? 'ACTIVE' : 'INACTIVE'}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'ACTIVE' })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600 bg-white"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Suspended / Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION B: Headquarters Address */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-rose-700">
                  <IconMapPin className="w-3.5 h-3.5" />
                  <span>Registered Headquarters Address</span>
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        placeholder="e.g. 101, Business Towers"
                        value={editForm.street}
                        onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Suite / Floor / Landmark</label>
                      <input
                        type="text"
                        placeholder="e.g. 4th Floor, Sector 62"
                        value={editForm.addressLine2}
                        onChange={(e) => setEditForm({ ...editForm, addressLine2: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        placeholder="e.g. Karnataka"
                        value={editForm.state}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">PIN Code</label>
                      <input
                        type="text"
                        placeholder="6 digits"
                        maxLength={6}
                        value={editForm.pinCode}
                        onChange={(e) => setEditForm({ ...editForm, pinCode: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-indigo-600 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C: Statutory, Tax & Compliance Registrations */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5 text-purple-700">
                  <IconFileCertificate className="w-3.5 h-3.5" />
                  <span>Statutory, Tax &amp; Compliance Registrations</span>
                </h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Company PAN (10 chars)</label>
                      <input
                        type="text"
                        placeholder="e.g. ABCDE1234F"
                        maxLength={10}
                        value={editForm.pan}
                        onChange={(e) => setEditForm({ ...editForm, pan: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Company TAN (10 chars)</label>
                      <input
                        type="text"
                        placeholder="e.g. BLRA12345C"
                        maxLength={10}
                        value={editForm.tan}
                        onChange={(e) => setEditForm({ ...editForm, tan: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono focus:outline-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">GSTIN (15 chars)</label>
                      <input
                        type="text"
                        placeholder="e.g. 29ABCDE1234F1Z5"
                        maxLength={15}
                        value={editForm.gstin}
                        onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">CIN (Corp ID, 21 chars)</label>
                      <input
                        type="text"
                        placeholder="e.g. U72200KA2020PTC123456"
                        maxLength={21}
                        value={editForm.cin}
                        onChange={(e) => setEditForm({ ...editForm, cin: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono focus:outline-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">PF Code</label>
                      <input
                        type="text"
                        placeholder="e.g. KN/BLR/0012345/000"
                        value={editForm.pfEstablishmentCode}
                        onChange={(e) => setEditForm({ ...editForm, pfEstablishmentCode: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">ESIC Reg. No. (17 digits)</label>
                      <input
                        type="text"
                        placeholder="17 digits"
                        maxLength={17}
                        value={editForm.esicRegistrationNumber}
                        onChange={(e) => setEditForm({ ...editForm, esicRegistrationNumber: e.target.value.replace(/\D/g, '') })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">PTRC Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 27000000000P"
                        value={editForm.ptrcNumber}
                        onChange={(e) => setEditForm({ ...editForm, ptrcNumber: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono focus:outline-indigo-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
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
                  <p className="text-[11px] text-slate-500 font-medium">{resetModalAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setResetModalAdmin(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 font-medium hover:text-slate-700 flex items-center justify-center cursor-pointer"
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
                <div className="text-[10px] text-slate-500 font-medium pt-1">
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

      {/* ===================== FLOATING ROW ACTION DROPDOWN PORTAL ===================== */}
      {activeMenu && typeof document !== 'undefined' && createPortal(
        (() => {
          const c = activeMenu.company;
          const primaryAdmin = c.users && c.users.length > 0 ? c.users[0] : null;
          const pStatus = c.paymentStatus || (primaryAdmin ? 'PAYMENT_DONE' : 'IN_PROCESS');

          const rect = activeMenu.rect;
          const menuWidth = 224;
          const spaceBelow = window.innerHeight - rect.bottom;
          const spaceAbove = rect.top;
          // If less than 320px below and there's more space above, open upward
          const openUpward = spaceBelow < 320 && spaceAbove > spaceBelow;

          // Align right edge with the button's right edge
          let left = rect.right - menuWidth;
          if (left + menuWidth > window.innerWidth - 12) {
            left = window.innerWidth - menuWidth - 12;
          }
          if (left < 12) left = 12;

          const maxMenuHeight = openUpward
            ? Math.max(spaceAbove - 16, 180)
            : Math.max(spaceBelow - 16, 180);

          const cardStyle: React.CSSProperties = {
            position: 'fixed',
            left: `${left}px`,
            width: `${menuWidth}px`,
            maxHeight: `${maxMenuHeight}px`,
            overflowY: 'auto',
            zIndex: 99999,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            ...(openUpward
              ? { bottom: `${window.innerHeight - rect.top + 6}px` }
              : { top: `${rect.bottom + 6}px` }),
          };

          return (
            <div className="fixed inset-0 z-[99999]">
              {/* Invisible Backdrop to close on click outside */}
              <div
                className="fixed inset-0 bg-transparent"
                onClick={() => setActiveMenu(null)}
              />

              {/* Floating Action Dropdown Menu */}
              <div
                style={cardStyle}
                onClick={(e) => e.stopPropagation()}
                className="company-dropdown-menu bg-white rounded-2xl border border-slate-200/90 py-1.5 text-left text-xs animate-in fade-in zoom-in-95"
              >
                {/* Action to Create Admin if Payment Done & No Admin yet */}
                {pStatus === 'PAYMENT_DONE' && !primaryAdmin && (
                  <button
                    onClick={() => {
                      setActiveMenu(null);
                      handleOpenAddAdmin(c);
                    }}
                    className="w-full px-3.5 py-2 text-blue-700 bg-blue-50/70 hover:bg-blue-100/70 flex items-center gap-2.5 transition-colors font-bold border-b border-blue-100 cursor-pointer"
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
                          setActiveMenu(null);
                          handleCopyPaymentLink(c.paymentLinkUrl!);
                        }}
                        className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                      >
                        <IconCopy className="w-4 h-4 text-slate-500 font-medium" />
                        Copy Payment Link
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        handleResendPaymentLink(c.id);
                      }}
                      className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                    >
                      <IconMail className="w-4 h-4 text-slate-500 font-medium" />
                      Resend Payment Link
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        handleMarkPayment(c.id, 'PAYMENT_DONE');
                      }}
                      className="w-full px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors font-bold cursor-pointer"
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
                        setActiveMenu(null);
                        handleResendPaymentLink(c.id);
                      }}
                      className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                    >
                      <IconMail className="w-4 h-4 text-slate-500 font-medium" />
                      Resend Payment Link
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenu(null);
                        handleMarkPayment(c.id, 'PAYMENT_DONE');
                      }}
                      className="w-full px-3.5 py-2 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
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
                    setActiveMenu(null);
                  }}
                  className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                >
                  <IconEye className="w-4 h-4 text-slate-500 font-medium" />
                  View Details
                </button>

                {primaryAdmin && (
                  <button
                    onClick={() => {
                      handleOpenContacts(c);
                      setActiveMenu(null);
                    }}
                    className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                  >
                    <IconUsers className="w-4 h-4 text-slate-500 font-medium" />
                    Admin Contacts
                  </button>
                )}

                <button
                  onClick={() => {
                    handleOpenEditModal(c);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3.5 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                >
                  <IconEdit className="w-4 h-4 text-slate-500 font-medium" />
                  Edit Company
                </button>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    handleDeleteCompany(c);
                    setActiveMenu(null);
                  }}
                  className="w-full px-3.5 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors font-medium cursor-pointer"
                >
                  <IconTrash className="w-4 h-4 text-rose-500" />
                  Delete
                </button>
              </div>
            </div>
          );
        })(),
        document.body
      )}


    </div>
  );
};

export default CompaniesPage;
