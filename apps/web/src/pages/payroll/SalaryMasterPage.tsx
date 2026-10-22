import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
import {
  IconReceipt2,
  IconEdit,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconCash,
  IconBuilding,
  IconSearch,
  IconSparkles,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';

interface CustomComponentItem {
  id: string;
  name: string;
  type: 'EARNING' | 'DEDUCTION';
  amount: string;
}

interface EmployeeSalary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  monthlySalary: number;
  currency: string;
  bankDetails: any;
  department?: { name: string } | null;
}

export const SalaryMasterPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeSalary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeSalary | null>(null);
  const [editForm, setEditForm] = useState<{
    monthlySalary: string;
    currency: string;
    basicSalary: string;
    hra: string;
    specialAllowance: string;
    pf: string;
    pt: string;
    tds: string;
    customComponents: CustomComponentItem[];
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    panNumber: string;
    paymentMode: string;
  }>({
    monthlySalary: '',
    currency: 'INR',
    basicSalary: '',
    hra: '',
    specialAllowance: '',
    pf: '',
    pt: '',
    tds: '',
    customComponents: [],
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    panNumber: '',
    paymentMode: 'BANK_TRANSFER',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/employees?pageSize=100');
      setEmployees(res.data?.items || []);
    } catch (err) {
      console.error('Failed to load salaries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openEditModal = (emp: EmployeeSalary) => {
    setSelectedEmp(emp);
    const bank = emp.bankDetails || {};
    const struct = bank.salaryStructure || {};
    const ctc = emp.monthlySalary || 0;

    const savedCustom: any[] = struct.customComponents || [];
    const customList: CustomComponentItem[] = savedCustom.map((c, idx) => ({
      id: c.id || `custom-${idx}-${Date.now()}`,
      name: c.name || '',
      type: c.type || 'EARNING',
      amount: String(c.amount || 0),
    }));

    const customEarnings = customList
      .filter((c) => c.type === 'EARNING')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const defaultBasic = struct.basicSalary !== undefined ? String(struct.basicSalary) : String(Math.round(ctc * 0.5));
    const defaultHra = struct.hra !== undefined ? String(struct.hra) : String(Math.round(ctc * 0.2));
    const defaultSpecial = struct.specialAllowance !== undefined
      ? String(struct.specialAllowance)
      : String(Math.max(0, ctc - Math.round(ctc * 0.5) - Math.round(ctc * 0.2) - customEarnings));
    const defaultPf = struct.pf !== undefined ? String(struct.pf) : (bank.pf !== undefined ? String(bank.pf) : '0');
    const defaultPt = struct.pt !== undefined ? String(struct.pt) : (bank.pt !== undefined ? String(bank.pt) : '200');
    const defaultTds = struct.tds !== undefined ? String(struct.tds) : (bank.tds !== undefined ? String(bank.tds) : '0');

    setEditForm({
      monthlySalary: String(ctc),
      currency: emp.currency || 'INR',
      basicSalary: defaultBasic,
      hra: defaultHra,
      specialAllowance: defaultSpecial,
      pf: defaultPf,
      pt: defaultPt,
      tds: defaultTds,
      customComponents: customList,
      bankName: bank.bankName || '',
      accountNumber: bank.accountNumber || '',
      ifscCode: bank.ifscCode || '',
      panNumber: bank.panNumber || '',
      paymentMode: bank.paymentMode || 'BANK_TRANSFER',
    });
  };

  const handleAddCustomComponent = () => {
    setEditForm((prev) => ({
      ...prev,
      customComponents: [
        ...prev.customComponents,
        {
          id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: '',
          type: 'EARNING',
          amount: '0',
        },
      ],
    }));
  };

  const handleUpdateCustomComponent = (id: string, field: 'name' | 'type' | 'amount', value: string) => {
    setEditForm((prev) => ({
      ...prev,
      customComponents: prev.customComponents.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
  };

  const handleRemoveCustomComponent = (id: string) => {
    setEditForm((prev) => ({
      ...prev,
      customComponents: prev.customComponents.filter((c) => c.id !== id),
    }));
  };

  const handleAutoSplit = () => {
    const ctc = Number(editForm.monthlySalary) || 0;
    const basic = Math.round(ctc * 0.5);
    const hra = Math.round(ctc * 0.2);
    const customEarnings = editForm.customComponents
      .filter((c) => c.type === 'EARNING')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const special = Math.max(0, ctc - basic - hra - customEarnings);
    const pt = 200;
    const pf = Math.min(1800, Math.round(basic * 0.12));
    setEditForm((prev) => ({
      ...prev,
      basicSalary: String(basic),
      hra: String(hra),
      specialAllowance: String(special),
      pf: String(pf),
      pt: String(pt),
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await api.put(`/payroll/salaries/${selectedEmp.id}`, {
        monthlySalary: Number(editForm.monthlySalary) || 0,
        currency: editForm.currency,
        basicSalary: Number(editForm.basicSalary) || 0,
        hra: Number(editForm.hra) || 0,
        specialAllowance: Number(editForm.specialAllowance) || 0,
        pf: Number(editForm.pf) || 0,
        pt: Number(editForm.pt) || 0,
        tds: Number(editForm.tds) || 0,
        customComponents: editForm.customComponents
          .filter((c) => c.name.trim())
          .map((c) => ({
            id: c.id,
            name: c.name.trim(),
            type: c.type,
            amount: Number(c.amount) || 0,
          })),
        bankDetails: {
          bankName: editForm.bankName,
          accountNumber: editForm.accountNumber,
          ifscCode: editForm.ifscCode,
          panNumber: editForm.panNumber,
          paymentMode: editForm.paymentMode,
        },
      });
      setSelectedEmp(null);
      fetchEmployees();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update salary');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = employees.filter((e) => {
    if (!search) return true;
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
  });

  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconReceipt2 className="w-7 h-7 text-brand-600" />
            Salary Master Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain base CTC compensation packages, banking coordinates, and payment modes.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-6 py-3.5">Employee</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Monthly Base CTC</th>
                <th className="px-6 py-3.5">Structure Components</th>
                <th className="px-6 py-3.5">Payment Mode</th>
                <th className="px-6 py-3.5">Bank Account</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="w-32 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-20 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-24 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-36 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-20 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="w-28 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-6 py-4 text-right"><div className="w-6 h-6 bg-slate-200 rounded-sm ml-auto" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No employees found.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const struct = emp.bankDetails?.salaryStructure || {};
                  const basic = struct.basicSalary !== undefined ? struct.basicSalary : Math.round((emp.monthlySalary || 0) * 0.5);
                  const hra = struct.hra !== undefined ? struct.hra : Math.round((emp.monthlySalary || 0) * 0.2);
                  const pf = struct.pf !== undefined ? struct.pf : 0;
                  const pt = struct.pt !== undefined ? struct.pt : 200;
                  const tds = struct.tds !== undefined ? struct.tds : 0;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{emp.firstName} {emp.lastName}</div>
                        <div className="text-xs text-slate-400">{emp.jobTitle}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                          {emp.department?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        ₹{Number(emp.monthlySalary || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                            Basic: ₹{Number(basic).toLocaleString()}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700">
                            HRA: ₹{Number(hra).toLocaleString()}
                          </span>
                          {pf > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 font-semibold text-indigo-700">
                              PF: ₹{Number(pf).toLocaleString()}
                            </span>
                          )}
                          {pt > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 font-semibold text-amber-700">
                              PT: ₹{Number(pt).toLocaleString()}
                            </span>
                          )}
                          {tds > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-50 font-semibold text-rose-700">
                              TDS: ₹{Number(tds).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                          {emp.bankDetails?.paymentMode || 'BANK_TRANSFER'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {emp.bankDetails?.accountNumber || '—'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Update Salary & Bank"
                        >
                          <IconEdit className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20, 50]}
          itemName="employee records"
        />
      </div>

      {/* Edit Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl p-5 sm:p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shadow-2xs">
                  {selectedEmp.firstName?.[0]?.toUpperCase()}{selectedEmp.lastName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Configure Salary & Statutory Components
                    </h3>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      CTC Master
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-semibold text-slate-700">{selectedEmp.firstName} {selectedEmp.lastName}</span>
                    {selectedEmp.jobTitle && ` • ${selectedEmp.jobTitle}`}
                    {selectedEmp.department?.name && ` • ${selectedEmp.department.name}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmp(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              {/* UNIFIED SINGLE SALARY & TAX BREAKDOWN CONTAINER */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                {/* Box Top Bar: Total CTC & Auto-Split */}
                <div className="p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 max-w-[220px]">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Monthly Base CTC *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editForm.monthlySalary}
                        onChange={(e) => setEditForm({ ...editForm, monthlySalary: e.target.value })}
                        placeholder="30000"
                        className="w-full pl-7 pr-3 py-1.5 text-sm font-bold font-mono bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoSplit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs hover:shadow-xs transition-all shrink-0 self-start sm:self-auto active:scale-95"
                    title="Calculate standard 50% Basic, 20% HRA, remainder Special, and statutory deductions"
                  >
                    <IconSparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Auto-Split Standard Breakdown</span>
                  </button>
                </div>

                {/* Unified Components Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                      <tr>
                        <th className="px-4 py-2.5">Salary / Tax Component</th>
                        <th className="px-3 py-2.5">Type</th>
                        <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                        <th className="w-10 px-2 py-2.5 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {/* SECTION 1: EARNINGS & ALLOWANCES */}
                      <tr className="bg-slate-50/70">
                        <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Earnings & Allowances
                          </span>
                        </td>
                      </tr>

                      {/* Basic Salary */}
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900">Basic Salary</div>
                          <div className="text-[10px] text-slate-400">Core base wage component (typically 50% of CTC)</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Earning
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="relative w-32 ml-auto">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.basicSalary}
                              onChange={(e) => setEditForm({ ...editForm, basicSalary: e.target.value })}
                              className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                            />
                          </div>
                        </td>
                        <td></td>
                      </tr>

                      {/* HRA */}
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900">House Rent Allowance (HRA)</div>
                          <div className="text-[10px] text-slate-400">Tax-exempt accommodation benefit (typically 20% of CTC)</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Earning
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="relative w-32 ml-auto">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.hra}
                              onChange={(e) => setEditForm({ ...editForm, hra: e.target.value })}
                              className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                            />
                          </div>
                        </td>
                        <td></td>
                      </tr>

                      {/* Special Allowance */}
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900">Special Allowance</div>
                          <div className="text-[10px] text-slate-400">Flexible balancing figure to match gross CTC</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Earning
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="relative w-32 ml-auto">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.specialAllowance}
                              onChange={(e) => setEditForm({ ...editForm, specialAllowance: e.target.value })}
                              className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                            />
                          </div>
                        </td>
                        <td></td>
                      </tr>

                      {/* Dynamic Custom Earnings */}
                      {editForm.customComponents
                        .filter((c) => c.type === 'EARNING')
                        .map((item) => (
                          <tr key={item.id} className="bg-emerald-50/20 hover:bg-emerald-50/30 transition-colors">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateCustomComponent(item.id, 'name', e.target.value)}
                                placeholder="Allowance name (e.g. Medical, Transport)"
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:border-indigo-500 focus:outline-hidden"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={item.type}
                                onChange={(e) => handleUpdateCustomComponent(item.id, 'type', e.target.value as any)}
                                className="px-2 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                              >
                                <option value="EARNING">Earning (+)</option>
                                <option value="DEDUCTION">Deduction (-)</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="relative w-32 ml-auto">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.amount}
                                  onChange={(e) => handleUpdateCustomComponent(item.id, 'amount', e.target.value)}
                                  className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomComponent(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Remove allowance"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}

                      {/* SECTION 2: DEDUCTIONS & STATUTORY TAXES */}
                      <tr className="bg-slate-50/70">
                        <td colSpan={4} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Deductions & Statutory Taxes
                          </span>
                        </td>
                      </tr>

                      {/* Provident Fund */}
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900">Provident Fund (PF)</div>
                          <div className="text-[10px] text-slate-400">Employee retirement contribution (12% of basic, capped at ₹1,800)</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Deduction
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="relative w-32 ml-auto">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.pf}
                              onChange={(e) => setEditForm({ ...editForm, pf: e.target.value })}
                              placeholder="0"
                              className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                            />
                          </div>
                        </td>
                        <td></td>
                      </tr>

                      {/* Professional Tax */}
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900">Professional Tax (PT)</div>
                          <div className="text-[10px] text-slate-400">State statutory professional tax (standard ₹200)</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Deduction
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="relative w-32 ml-auto">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.pt}
                              onChange={(e) => setEditForm({ ...editForm, pt: e.target.value })}
                              placeholder="200"
                              className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                            />
                          </div>
                        </td>
                        <td></td>
                      </tr>

                      {/* Income Tax (TDS) */}
                      <tr className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900">Income Tax (TDS)</div>
                          <div className="text-[10px] text-slate-400">Estimated monthly tax deducted at source under IT rules</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Deduction
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="relative w-32 ml-auto">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                            <input
                              type="number"
                              min="0"
                              value={editForm.tds}
                              onChange={(e) => setEditForm({ ...editForm, tds: e.target.value })}
                              placeholder="0"
                              className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-900 transition-colors"
                            />
                          </div>
                        </td>
                        <td></td>
                      </tr>

                      {/* Dynamic Custom Deductions */}
                      {editForm.customComponents
                        .filter((c) => c.type === 'DEDUCTION')
                        .map((item) => (
                          <tr key={item.id} className="bg-rose-50/20 hover:bg-rose-50/30 transition-colors">
                            <td className="px-4 py-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => handleUpdateCustomComponent(item.id, 'name', e.target.value)}
                                placeholder="Deduction name (e.g. NPS, Canteen, Insurance)"
                                className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:border-indigo-500 focus:outline-hidden"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={item.type}
                                onChange={(e) => handleUpdateCustomComponent(item.id, 'type', e.target.value as any)}
                                className="px-2 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                              >
                                <option value="EARNING">Earning (+)</option>
                                <option value="DEDUCTION">Deduction (-)</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="relative w-32 ml-auto">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 select-none">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.amount}
                                  onChange={(e) => handleUpdateCustomComponent(item.id, 'amount', e.target.value)}
                                  className="w-full pl-6 pr-2.5 py-1 text-xs text-right font-mono font-semibold bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomComponent(item.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Remove deduction"
                              >
                                <IconTrash className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer: Add Button + Live Clean Summary in ONE clean row */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleAddCustomComponent}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-colors self-start sm:self-auto"
                  >
                    <IconPlus className="w-3.5 h-3.5 text-slate-600" />
                    <span>Add Custom Component</span>
                  </button>

                  {/* Clean Single-Row Financial Summary */}
                  {(() => {
                    const basic = Number(editForm.basicSalary) || 0;
                    const hra = Number(editForm.hra) || 0;
                    const special = Number(editForm.specialAllowance) || 0;
                    const customEarn = editForm.customComponents
                      .filter((c) => c.type === 'EARNING')
                      .reduce((s, c) => s + (Number(c.amount) || 0), 0);
                    const grossEarnings = basic + hra + special + customEarn;

                    const pf = Number(editForm.pf) || 0;
                    const pt = Number(editForm.pt) || 0;
                    const tds = Number(editForm.tds) || 0;
                    const customDed = editForm.customComponents
                      .filter((c) => c.type === 'DEDUCTION')
                      .reduce((s, c) => s + (Number(c.amount) || 0), 0);
                    const totalDeductions = pf + pt + tds + customDed;
                    const netPayable = Math.max(0, grossEarnings - totalDeductions);

                    return (
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-slate-600">
                          Gross: <strong className="text-slate-900 font-mono">₹{grossEarnings.toLocaleString()}</strong>
                        </span>
                        <span className="text-slate-600">
                          Deductions: <strong className="text-rose-600 font-mono">-₹{totalDeductions.toLocaleString()}</strong>
                        </span>
                        <span className="font-bold text-slate-900">
                          Net Take-Home: <strong className="text-emerald-700 font-mono text-sm">₹{netPayable.toLocaleString()}</strong>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Banking Coordinates */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <IconBuilding className="w-4 h-4 text-slate-500" />
                    Banking & Disbursement Coordinates
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Used for direct monthly payroll transfers</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Mode</label>
                    <select
                      value={editForm.paymentMode}
                      onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 font-medium"
                    >
                      <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={editForm.bankName}
                      onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="1234567890"
                      value={editForm.accountNumber}
                      onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">IFSC / Routing Code</label>
                    <input
                      type="text"
                      placeholder="HDFC0001234"
                      value={editForm.ifscCode}
                      onChange={(e) => setEditForm({ ...editForm, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono text-slate-800 font-medium uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">PAN Number</label>
                  <input
                    type="text"
                    placeholder="ABCDE1234F"
                    value={editForm.panNumber}
                    onChange={(e) => setEditForm({ ...editForm, panNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 font-mono text-slate-800 font-medium uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedEmp(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Configuration...' : 'Save Salary Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryMasterPage;
