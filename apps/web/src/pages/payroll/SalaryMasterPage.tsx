import React, { useState, useEffect } from 'react';
import api from '../../api/client';
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
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
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
                filtered.map((emp) => {
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
                        {emp.currency || 'INR'} {Number(emp.monthlySalary || 0).toLocaleString()}
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
      </div>

      {/* Edit Modal */}
      {selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Configure Salary & Statutory Components
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedEmp.firstName} {selectedEmp.lastName} • {selectedEmp.jobTitle}
                </p>
              </div>
              <button
                onClick={() => setSelectedEmp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              {/* UNIFIED SINGLE SALARY & TAX BREAKDOWN BOX */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                {/* Box Top Bar: Total CTC, Currency & Auto-Split */}
                <div className="p-3.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">Monthly Base CTC *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={editForm.monthlySalary}
                        onChange={(e) => setEditForm({ ...editForm, monthlySalary: e.target.value })}
                        placeholder="50000"
                        className="w-36 sm:w-44 px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 font-black text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">Currency</label>
                      <select
                        value={editForm.currency}
                        onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                        className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoSplit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs transition-colors shrink-0 self-start sm:self-auto"
                    title="Calculate standard 50% Basic, 20% HRA, remainder Special, and statutory PT"
                  >
                    <IconSparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Auto-Split Standard Breakdown
                  </button>
                </div>

                {/* Unified Components Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/70 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Salary / Tax Component</th>
                        <th className="px-3 py-2.5">Type</th>
                        <th className="px-4 py-2.5 text-right">Amount ({editForm.currency})</th>
                        <th className="w-10 px-2 py-2.5 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 bg-white">
                      {/* Basic Salary */}
                      <tr>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          Basic Salary
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Earning (+)
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={editForm.basicSalary}
                            onChange={(e) => setEditForm({ ...editForm, basicSalary: e.target.value })}
                            className="w-28 px-2 py-1 text-xs text-right bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white"
                          />
                        </td>
                        <td></td>
                      </tr>

                      {/* HRA */}
                      <tr>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          House Rent Allowance (HRA)
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Earning (+)
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={editForm.hra}
                            onChange={(e) => setEditForm({ ...editForm, hra: e.target.value })}
                            className="w-28 px-2 py-1 text-xs text-right bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white"
                          />
                        </td>
                        <td></td>
                      </tr>

                      {/* Special Allowance */}
                      <tr>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          Special Allowance
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Earning (+)
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={editForm.specialAllowance}
                            onChange={(e) => setEditForm({ ...editForm, specialAllowance: e.target.value })}
                            className="w-28 px-2 py-1 text-xs text-right bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white"
                          />
                        </td>
                        <td></td>
                      </tr>

                      {/* Provident Fund */}
                      <tr>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          Provident Fund (PF)
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Deduction (-)
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={editForm.pf}
                            onChange={(e) => setEditForm({ ...editForm, pf: e.target.value })}
                            placeholder="0"
                            className="w-28 px-2 py-1 text-xs text-right bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white"
                          />
                        </td>
                        <td></td>
                      </tr>

                      {/* Professional Tax */}
                      <tr>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          Professional Tax (PT)
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Deduction (-)
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={editForm.pt}
                            onChange={(e) => setEditForm({ ...editForm, pt: e.target.value })}
                            placeholder="200"
                            className="w-28 px-2 py-1 text-xs text-right bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white"
                          />
                        </td>
                        <td></td>
                      </tr>

                      {/* Income Tax (TDS) */}
                      <tr>
                        <td className="px-4 py-2 font-medium text-slate-900">
                          Income Tax (TDS)
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Deduction (-)
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={editForm.tds}
                            onChange={(e) => setEditForm({ ...editForm, tds: e.target.value })}
                            placeholder="0"
                            className="w-28 px-2 py-1 text-xs text-right bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:bg-white"
                          />
                        </td>
                        <td></td>
                      </tr>

                      {/* Dynamic Custom Components Rows */}
                      {editForm.customComponents.map((item) => (
                        <tr key={item.id} className="bg-indigo-50/20">
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateCustomComponent(item.id, 'name', e.target.value)}
                              placeholder="e.g. Medical Allowance / NPS"
                              className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg font-medium focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={item.type}
                              onChange={(e) => handleUpdateCustomComponent(item.id, 'type', e.target.value as any)}
                              className="px-2 py-1 text-[11px] font-bold bg-white border border-slate-200 rounded-lg"
                            >
                              <option value="EARNING">Earning (+)</option>
                              <option value="DEDUCTION">Deduction (-)</option>
                            </select>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.amount}
                              onChange={(e) => handleUpdateCustomComponent(item.id, 'amount', e.target.value)}
                              className="w-28 px-2 py-1 text-xs text-right bg-white border border-slate-200 rounded-lg font-semibold"
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomComponent(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Remove component"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer: Add Button + Dynamic Live Summary */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleAddCustomComponent}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 shadow-2xs transition-colors self-start sm:self-auto"
                  >
                    <IconPlus className="w-4 h-4 text-indigo-600" />
                    <span>Add Custom Component</span>
                  </button>

                  {/* Live CTC Cluster Calculation */}
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
                          Gross: <strong className="text-slate-900">₹{grossEarnings.toLocaleString()}</strong>
                        </span>
                        <span className="text-slate-600">
                          Deductions: <strong className="text-rose-600">-₹{totalDeductions.toLocaleString()}</strong>
                        </span>
                        <span className="font-bold text-slate-900">
                          Net Take-Home: <strong className="text-emerald-700 text-sm">₹{netPayable.toLocaleString()}</strong>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Banking Coordinates */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Banking & Payment Coordinates</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Mode</label>
                    <select
                      value={editForm.paymentMode}
                      onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-brand-500"
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
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="1234567890"
                      value={editForm.accountNumber}
                      onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-brand-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">IFSC / Routing Code</label>
                    <input
                      type="text"
                      placeholder="HDFC0001234"
                      value={editForm.ifscCode}
                      onChange={(e) => setEditForm({ ...editForm, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-brand-500 font-mono"
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
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-brand-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedEmp(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Salary Configuration'}
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
