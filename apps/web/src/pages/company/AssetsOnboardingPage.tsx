import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconDevices,
  IconChecklist,
  IconPlus,
  IconSearch,
  IconCheck,
  IconX,
  IconUserCheck,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconScreenShare,
  IconKey,
  IconUser,
  IconAlertCircle,
  IconArrowBackUp,
} from '@tabler/icons-react';

export interface CompanyAsset {
  id: string;
  tag: string;
  name: string;
  category: 'LAPTOP' | 'MONITOR' | 'MOBILE' | 'ACCESSORY' | 'KEYCARD';
  serialNumber: string;
  assignedToEmployeeId?: number;
  assignedToName?: string;
  assignedDate?: string;
  condition: 'NEW' | 'EXCELLENT' | 'GOOD' | 'NEEDS_REPAIR';
  status: 'ASSIGNED' | 'IN_STOCK' | 'MAINTENANCE' | 'RETIRED';
}

export interface OnboardingChecklistItem {
  id: string;
  title: string;
  description: string;
  category: 'IT' | 'HR' | 'FINANCE' | 'FACILITIES';
}

const DEFAULT_ONBOARDING_TASKS: OnboardingChecklistItem[] = [
  { id: 't1', title: 'Work Email & Workspace Invites', description: 'GSuite/Office365 account created and Slack invite sent', category: 'IT' },
  { id: 't2', title: 'Government ID & Address Verification', description: 'PAN, Aadhaar or Passport copy verified by HR', category: 'HR' },
  { id: 't3', title: 'Bank Account & PF Registration', description: 'Cancelled cheque / passbook copy for direct payroll deposit', category: 'FINANCE' },
  { id: 't4', title: 'Sign NDA & Company Policy', description: 'Handbook acknowledged and signed digital agreement', category: 'HR' },
  { id: 't5', title: 'Hardware Asset Handover', description: 'Laptop, charger, monitor, and security badge allocated', category: 'IT' },
  { id: 't6', title: 'Team & Manager Welcome Sync', description: 'Orientation call and first week task roadmap review', category: 'HR' },
  { id: 't7', title: 'HRMS Portal Walkthrough', description: 'Self-service training for leaves, attendance and claims', category: 'HR' },
];

const ASSETS_STORAGE_KEY = 'uptrix_company_assets';
const ONBOARDING_STORAGE_KEY = 'uptrix_onboarding_progress';

export const AssetsOnboardingPage: React.FC = () => {
  const { company } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'ONBOARDING'>('ASSETS');

  // Asset Inventory State
  const [assets, setAssets] = useState<CompanyAsset[]>(() => {
    try {
      const saved = localStorage.getItem(ASSETS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        id: 'ast-1',
        tag: 'AST-LPT-101',
        name: 'Apple MacBook Pro M3 (16GB, 512GB)',
        category: 'LAPTOP',
        serialNumber: 'C02G80XZMD6R',
        assignedToEmployeeId: 1,
        assignedToName: 'Aarav Sharma',
        assignedDate: '2026-08-10',
        condition: 'EXCELLENT',
        status: 'ASSIGNED',
      },
      {
        id: 'ast-2',
        tag: 'AST-LPT-102',
        name: 'Dell XPS 15 (32GB, 1TB SSD)',
        category: 'LAPTOP',
        serialNumber: '8X92M01',
        assignedToEmployeeId: 2,
        assignedToName: 'Priya Patel',
        assignedDate: '2026-09-01',
        condition: 'NEW',
        status: 'ASSIGNED',
      },
      {
        id: 'ast-3',
        tag: 'AST-MON-201',
        name: 'Dell UltraSharp 27" 4K Monitor',
        category: 'MONITOR',
        serialNumber: 'CN-0X8231-742',
        condition: 'GOOD',
        status: 'IN_STOCK',
      },
      {
        id: 'ast-4',
        tag: 'AST-MOB-301',
        name: 'iPhone 15 (Work Dedicated SIM)',
        category: 'MOBILE',
        serialNumber: 'F2LX902MZ',
        condition: 'NEW',
        status: 'IN_STOCK',
      },
    ];
  });

  // Onboarding Progress Map: `empId_taskId` -> boolean
  const [onboardingMap, setOnboardingMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return {
      '1_t1': true,
      '1_t2': true,
      '1_t3': true,
      '1_t4': true,
      '1_t5': true,
      '2_t1': true,
      '2_t2': true,
    };
  });

  const [search, setSearch] = useState('');
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    tag: `AST-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    category: 'LAPTOP' as CompanyAsset['category'],
    serialNumber: '',
    condition: 'NEW' as CompanyAsset['condition'],
  });

  // Assign Asset Modal
  const [selectedAssetForAssign, setSelectedAssetForAssign] = useState<CompanyAsset | null>(null);
  const [assignEmpId, setAssignEmpId] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/employees?pageSize=100');
        setEmployees(res.data?.items || []);
      } catch (err) {
        console.error('Failed to load employees for assets/onboarding:', err);
      }
    };
    fetchStaff();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
    } catch (_) {}
  }, [assets]);

  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingMap));
    } catch (_) {}
  }, [onboardingMap]);

  const handleToggleTask = (empId: number, taskId: string) => {
    const key = `${empId}_${taskId}`;
    setOnboardingMap((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const created: CompanyAsset = {
      id: `ast-${Date.now()}`,
      tag: newAsset.tag,
      name: newAsset.name,
      category: newAsset.category,
      serialNumber: newAsset.serialNumber,
      condition: newAsset.condition,
      status: 'IN_STOCK',
    };
    setAssets([created, ...assets]);
    setShowAddAssetModal(false);
    setNewAsset({
      tag: `AST-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: 'LAPTOP',
      serialNumber: '',
      condition: 'NEW',
    });
  };

  const handleAssignAsset = () => {
    if (!selectedAssetForAssign || !assignEmpId) return;
    const emp = employees.find((e) => String(e.id) === String(assignEmpId));
    if (!emp) return;

    const updated = assets.map((a) => {
      if (a.id === selectedAssetForAssign.id) {
        return {
          ...a,
          status: 'ASSIGNED' as const,
          assignedToEmployeeId: emp.id,
          assignedToName: `${emp.firstName} ${emp.lastName}`.trim(),
          assignedDate: new Date().toISOString().split('T')[0],
        };
      }
      return a;
    });

    setAssets(updated);
    setSelectedAssetForAssign(null);
    setAssignEmpId('');
  };

  const handleReturnAsset = (assetId: string) => {
    if (!window.confirm('Confirm hardware asset return to company IT inventory?')) return;
    const updated = assets.map((a) => {
      if (a.id === assetId) {
        return {
          ...a,
          status: 'IN_STOCK' as const,
          assignedToEmployeeId: undefined,
          assignedToName: undefined,
          assignedDate: undefined,
        };
      }
      return a;
    });
    setAssets(updated);
  };

  // Metrics
  const totalAssets = assets.length;
  const assignedCount = assets.filter((a) => a.status === 'ASSIGNED').length;
  const inStockCount = assets.filter((a) => a.status === 'IN_STOCK').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconDevices className="w-7 h-7 text-indigo-600" />
            Company Assets & Onboarding Workflows
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track enterprise hardware inventory (laptops, monitors, SIMs) and monitor newly joined employee onboarding milestones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ASSETS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ASSETS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Hardware Assets ({totalAssets})
          </button>
          <button
            onClick={() => setActiveTab('ONBOARDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'ONBOARDING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Onboarding Checklists
          </button>
        </div>
      </div>

      {activeTab === 'ASSETS' ? (
        <div className="space-y-4">
          {/* Table Header / Action */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search asset tag, brand, employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <button
                onClick={() => setShowAddAssetModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <IconPlus className="w-4 h-4" />
                Add New Asset
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Asset Tag</th>
                    <th className="px-6 py-3.5">Device Description</th>
                    <th className="px-6 py-3.5">Serial Number</th>
                    <th className="px-6 py-3.5">Condition</th>
                    <th className="px-6 py-3.5">Assigned To</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets
                    .filter(
                      (a) =>
                        a.tag.toLowerCase().includes(search.toLowerCase()) ||
                        a.name.toLowerCase().includes(search.toLowerCase()) ||
                        (a.assignedToName || '').toLowerCase().includes(search.toLowerCase())
                    )
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{item.tag}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.category}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500">{item.serialNumber}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {item.condition}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.assignedToName ? (
                            <div>
                              <span className="font-bold text-slate-900">{item.assignedToName}</span>
                              <span className="block text-[10px] text-slate-400">Since {item.assignedDate}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'ASSIGNED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {item.status === 'IN_STOCK' ? (
                            <button
                              onClick={() => setSelectedAssetForAssign(item)}
                              className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs"
                            >
                              Assign
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReturnAsset(item.id)}
                              className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold text-xs inline-flex items-center gap-1"
                            >
                              <IconArrowBackUp className="w-3.5 h-3.5" />
                              Return
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Onboarding Checklists View */
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">New Hire Onboarding Tracker</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ensure each joined employee completes all 7 compliance and orientation milestones.
              </p>
            </div>

            <div className="space-y-6">
              {employees.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  No employees found to track.
                </div>
              ) : (
                employees.map((emp) => {
                  const completedCount = DEFAULT_ONBOARDING_TASKS.filter(
                    (t) => onboardingMap[`${emp.id}_${t.id}`]
                  ).length;
                  const percent = Math.round((completedCount / DEFAULT_ONBOARDING_TASKS.length) * 100);

                  return (
                    <div
                      key={emp.id}
                      className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {emp.firstName} {emp.lastName}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({emp.department?.name || 'General'} - {emp.jobTitle})
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Joined: {emp.joiningDate ? emp.joiningDate.split('T')[0] : 'Recent'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700 min-w-[50px] text-right">
                            {completedCount}/{DEFAULT_ONBOARDING_TASKS.length} ({percent}%)
                          </span>
                        </div>
                      </div>

                      {/* 7 Task Pills */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                        {DEFAULT_ONBOARDING_TASKS.map((task) => {
                          const isDone = Boolean(onboardingMap[`${emp.id}_${task.id}`]);
                          return (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => handleToggleTask(emp.id, task.id)}
                              className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                                isDone
                                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 border ${
                                  isDone
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isDone && <IconCheck className="w-3 h-3" />}
                              </div>
                              <div>
                                <span className="text-xs font-bold block leading-tight">{task.title}</span>
                                <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight">
                                  {task.description}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Hardware Asset */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconDeviceLaptop className="w-5 h-5 text-indigo-600" />
              Register New Hardware Asset
            </h2>

            <form onSubmit={handleCreateAsset} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Asset Tag</label>
                <input
                  type="text"
                  required
                  value={newAsset.tag}
                  onChange={(e) => setNewAsset({ ...newAsset, tag: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Device Name / Model</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MacBook Air M2 16GB"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="LAPTOP">Laptop</option>
                    <option value="MONITOR">Monitor</option>
                    <option value="MOBILE">Mobile Phone</option>
                    <option value="ACCESSORY">Peripheral / Accessory</option>
                    <option value="KEYCARD">Access Keycard</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Condition</label>
                  <select
                    value={newAsset.condition}
                    onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="NEW">Brand New</option>
                    <option value="EXCELLENT">Excellent</option>
                    <option value="GOOD">Good</option>
                    <option value="NEEDS_REPAIR">Needs Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Serial Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. C02G89X0..."
                  value={newAsset.serialNumber}
                  onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                >
                  Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Asset */}
      {selectedAssetForAssign && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <IconUserCheck className="w-5 h-5 text-indigo-600" />
              Assign Hardware to Employee
            </h2>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block">{selectedAssetForAssign.name}</span>
              <span className="text-slate-400 block font-mono">
                {selectedAssetForAssign.tag} • S/N: {selectedAssetForAssign.serialNumber}
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Select Employee Custodian
              </label>
              <select
                value={assignEmpId}
                onChange={(e) => setAssignEmpId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName} ({e.department?.name || 'General'} - {e.jobTitle})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedAssetForAssign(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!assignEmpId}
                onClick={handleAssignAsset}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs"
              >
                Confirm Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsOnboardingPage;
