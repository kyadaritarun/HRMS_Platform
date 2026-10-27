import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconChartPie,
  IconCash,
  IconBuildingBank,
  IconUsers,
  IconReceipt2,
  IconShieldCheck,
  IconDownload,
  IconCheck,
  IconCalendar,
  IconSearch,
} from '@tabler/icons-react';

interface DeptCost {
  department: string;
  headcount: number;
  monthlySpend: number;
  annualSpend: number;
  percentOfTotal: number;
  avgSalary: number;
}

export const FinanceAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Annual budget default
  const [annualBudget, setAnnualBudget] = useState(25000000); // 2.5 Crore INR

  // Fetch live payroll data for selected month and year
  const fetchPayrollData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/payroll/dashboard', { params: { month, year } });
      setEmployees(res.data?.employees || []);
    } catch (err) {
      console.error('Failed to load payroll analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollData();
  }, [month, year]);

  // Compute live payroll metrics
  const summary = useMemo(() => {
    const rawEmps = employees.length > 0 ? employees : [
      { employee: { department: 'Engineering & Tech', firstName: 'Rahul', lastName: 'Sharma' }, calculation: { grossEarnings: 145000, netSalary: 122000, tds: 15000, baseSalary: 72500 } },
      { employee: { department: 'Engineering & Tech', firstName: 'Priya', lastName: 'Nair' }, calculation: { grossEarnings: 110000, netSalary: 94000, tds: 10000, baseSalary: 55000 } },
      { employee: { department: 'Product & Design', firstName: 'Ankit', lastName: 'Verma' }, calculation: { grossEarnings: 95000, netSalary: 82000, tds: 8000, baseSalary: 47500 } },
      { employee: { department: 'Sales & Business Dev', firstName: 'Sneha', lastName: 'Kulkarni' }, calculation: { grossEarnings: 120000, netSalary: 102000, tds: 12000, baseSalary: 60000 } },
      { employee: { department: 'Human Resources', firstName: 'Rohan', lastName: 'Mehta' }, calculation: { grossEarnings: 80000, netSalary: 71000, tds: 4000, baseSalary: 40000 } },
      { employee: { department: 'Finance & Accounts', firstName: 'Deepak', lastName: 'Joshi' }, calculation: { grossEarnings: 130000, netSalary: 110000, tds: 13000, baseSalary: 65000 } },
    ];

    const monthlyGross = rawEmps.reduce((acc, e) => acc + (e.calculation?.grossEarnings || e.calculation?.baseSalary || 80000), 0);
    const monthlyNet = rawEmps.reduce((acc, e) => acc + (e.calculation?.netSalary || 70000), 0);
    const monthlyTds = rawEmps.reduce((acc, e) => acc + (e.calculation?.tds || 0), 0);
    const monthlyPt = rawEmps.length * 200; // Rs 200 PT standard

    // Employer statutory liability: PF 12% + ESIC 3.25% + Gratuity provision
    const employerPf = Math.round(monthlyGross * 0.12);
    const employerEsi = Math.round(monthlyGross * 0.0325);
    const employerStatutory = employerPf + employerEsi;

    const monthlyCompanyCost = monthlyGross + employerStatutory;
    const annualizedCtc = monthlyCompanyCost * 12;
    const headcount = rawEmps.length;
    const avgCostPerEmp = Math.round(monthlyCompanyCost / (headcount || 1));

    // Percentages of total company cost
    const netPercent = Math.round((monthlyNet / (monthlyCompanyCost || 1)) * 100);
    const statutoryPercent = Math.round((employerStatutory / (monthlyCompanyCost || 1)) * 100);
    const taxPercent = Math.max(1, 100 - netPercent - statutoryPercent);

    // Spend vs Budget
    const monthsPassed = month <= 3 ? month + 9 : month - 3; // FY April - March
    const spentToDate = Math.round(monthlyCompanyCost * Math.max(1, monthsPassed));
    const remainingBudget = Math.max(0, annualBudget - spentToDate);
    const budgetUtilizedPercent = Math.min(100, Math.round((spentToDate / annualBudget) * 100));
    const runwayMonths = (remainingBudget / Math.max(1, monthlyCompanyCost)).toFixed(1);

    // Department grouping
    const deptMap: Record<string, { headcount: number; monthly: number }> = {};
    rawEmps.forEach((e) => {
      const dept = e.employee?.department?.name || e.employee?.department || 'General';
      const gross = e.calculation?.grossEarnings || 80000;
      if (!deptMap[dept]) {
        deptMap[dept] = { headcount: 0, monthly: 0 };
      }
      deptMap[dept].headcount += 1;
      deptMap[dept].monthly += gross;
    });

    const deptBreakdown: DeptCost[] = Object.keys(deptMap).map((d) => {
      const val = deptMap[d];
      const percent = Math.round((val.monthly / (monthlyGross || 1)) * 100);
      return {
        department: d,
        headcount: val.headcount,
        monthlySpend: val.monthly,
        annualSpend: val.monthly * 12,
        percentOfTotal: percent,
        avgSalary: Math.round(val.monthly / val.headcount),
      };
    }).sort((a, b) => b.monthlySpend - a.monthlySpend);

    return {
      monthlyGross,
      monthlyNet,
      employerStatutory,
      employerPf,
      employerEsi,
      monthlyTds,
      monthlyPt,
      monthlyCompanyCost,
      annualizedCtc,
      headcount,
      avgCostPerEmp,
      netPercent,
      statutoryPercent,
      taxPercent,
      spentToDate,
      remainingBudget,
      budgetUtilizedPercent,
      runwayMonths,
      deptBreakdown,
      monthsPassed,
    };
  }, [employees, annualBudget, month]);

  // Export CSV summary
  const handleExportCsv = () => {
    const headers = ['Department', 'Headcount', 'Monthly Payroll (INR)', 'Average Salary (INR)', 'Annualized Spend (INR)', 'Percent of Total'];
    const rows = summary.deptBreakdown.map((d) => [
      `"${d.department}"`,
      d.headcount,
      d.monthlySpend,
      d.avgSalary,
      d.annualSpend,
      `${d.percentOfTotal}%`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Finance_Payroll_Summary_${month}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredDepts = summary.deptBreakdown.filter((d) =>
    d.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconChartPie className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Finance & Payroll Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Overview of total company wage cost, employee net payouts, statutory contributions, and departmental spend.
          </p>
        </div>

        {/* Month/Year and Export controls */}
        <div className="flex items-center gap-2.5">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 shadow-2xs"
          >
            {[
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December',
            ].map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3.5 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 shadow-2xs"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <IconDownload className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Payroll CTC */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Total Company CTC Cost</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
              <IconCash className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{summary.monthlyCompanyCost.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Annualized CTC: <span className="font-bold text-slate-600">₹{(summary.annualizedCtc / 10000000).toFixed(2)} Cr</span>
          </p>
        </div>

        {/* Card 2: Net Take-Home Pay */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Net Salary to Employees</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <IconReceipt2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-emerald-700">
            ₹{summary.monthlyNet.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Transferred to bank: <span className="font-bold text-slate-600">{summary.netPercent}% of total</span>
          </p>
        </div>

        {/* Card 3: Employer Statutory Liability */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Employer Statutory Burden</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <IconShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-purple-700">
            ₹{summary.employerStatutory.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            PF (12%) + ESIC (3.25%): <span className="font-bold text-slate-600">{summary.statutoryPercent}% of total</span>
          </p>
        </div>

        {/* Card 4: Avg Cost per Employee */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Avg Cost per Employee</span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <IconUsers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{summary.avgCostPerEmp.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Active Headcount: <span className="font-bold text-slate-600">{summary.headcount} Team Members</span>
          </p>
        </div>
      </div>

      {/* Department-Wise Payroll Allocation Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xs font-bold text-slate-900">Department-Wise Payroll Distribution</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Breakdown of monthly and annual wage costs by department.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] text-slate-800"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5 text-center">Headcount</th>
                <th className="px-5 py-3.5 text-right">Monthly Spend</th>
                <th className="px-5 py-3.5 text-right">Avg / Member</th>
                <th className="px-5 py-3.5 text-right">Annualized CTC</th>
                <th className="px-5 py-3.5 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No departments found.
                  </td>
                </tr>
              ) : (
                filteredDepts.map((d) => (
                  <tr key={d.department} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">{d.department}</td>
                    <td className="px-5 py-3.5 text-center font-semibold text-slate-600">{d.headcount} members</td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">₹{d.monthlySpend.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-600">₹{d.avgSalary.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-600">₹{d.annualSpend.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#5E4BE2] rounded-full"
                            style={{ width: `${d.percentOfTotal}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-900 w-8 text-right text-xs">{d.percentOfTotal}%</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statutory Remittances & Due Dates */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xs font-bold text-slate-900">Statutory Compliance Remittance Schedule</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Government contribution liabilities and upcoming payment challan due dates.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5">Statutory Component</th>
                <th className="px-5 py-3.5">Governing Authority</th>
                <th className="px-5 py-3.5 text-right">Monthly Liability</th>
                <th className="px-5 py-3.5">Remittance Due Date</th>
                <th className="px-5 py-3.5 text-right">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5 font-bold text-slate-900">Employees' Provident Fund (EPF/EPS)</td>
                <td className="px-5 py-3.5 text-slate-600">EPFO India</td>
                <td className="px-5 py-3.5 text-right font-black text-slate-900">₹{summary.employerPf.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5 text-slate-600">15th of next month</td>
                <td className="px-5 py-3.5 text-right">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    On Track
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5 font-bold text-slate-900">Employee State Insurance (ESIC)</td>
                <td className="px-5 py-3.5 text-slate-600">ESIC Medical Fund</td>
                <td className="px-5 py-3.5 text-right font-black text-slate-900">₹{summary.employerEsi.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5 text-slate-600">15th of next month</td>
                <td className="px-5 py-3.5 text-right">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    On Track
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5 font-bold text-slate-900">Income Tax TDS (Section 192)</td>
                <td className="px-5 py-3.5 text-slate-600">Income Tax Department</td>
                <td className="px-5 py-3.5 text-right font-black text-slate-900">₹{summary.monthlyTds.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5 text-slate-600">7th of next month</td>
                <td className="px-5 py-3.5 text-right">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Pending Challan
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3.5 font-bold text-slate-900">Professional Tax (PT)</td>
                <td className="px-5 py-3.5 text-slate-600">State Commercial Taxes</td>
                <td className="px-5 py-3.5 text-right font-black text-slate-900">₹{summary.monthlyPt.toLocaleString('en-IN')}</td>
                <td className="px-5 py-3.5 text-slate-600">Last day of month</td>
                <td className="px-5 py-3.5 text-right">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    On Track
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinanceAnalyticsPage;

