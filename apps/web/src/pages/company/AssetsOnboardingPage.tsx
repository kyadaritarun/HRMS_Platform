import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import TablePagination from '../../components/common/TablePagination';
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
  IconTrash,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconPencil,
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
  category: 'IT' | 'HR' | 'FINANCE' | 'FACILITIES' | 'GENERAL';
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

export interface AssetsOnboardingPageProps {
  initialTab?: 'ASSETS' | 'ONBOARDING';
}

export const AssetsOnboardingPage: React.FC<AssetsOnboardingPageProps> = ({ initialTab }) => {
  const { company } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'ONBOARDING'>(() => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('/onboarding')) return 'ONBOARDING';
    return 'ASSETS';
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (location.pathname.includes('/onboarding')) {
      setActiveTab('ONBOARDING');
    } else if (location.pathname.includes('/assets')) {
      setActiveTab('ASSETS');
    }
  }, [initialTab, location.pathname]);

  // Asset Inventory State from PostgreSQL
  const [assets, setAssets] = useState<CompanyAsset[]>([]);
  // Onboarding Progress Map from PostgreSQL: `empId_taskId` -> boolean
  const [onboardingMap, setOnboardingMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchAssets = async () => {
    try {
      const res = await api.get('/company/assets');
      setAssets(res.data?.assets || []);
    } catch (err) {
      console.error('Failed to load assets:', err);
    }
  };

  // Dynamic Onboarding Tasks for this Organization
  const [onboardingTasks, setOnboardingTasks] = useState<OnboardingChecklistItem[]>(DEFAULT_ONBOARDING_TASKS);
  const [showManageTasksModal, setShowManageTasksModal] = useState(false);
  const [editingTask, setEditingTask] = useState<OnboardingChecklistItem | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    category: 'HR' as OnboardingChecklistItem['category'],
  });
  const [taskActionError, setTaskActionError] = useState('');
  const [isSavingTasks, setIsSavingTasks] = useState(false);

  const fetchOnboarding = async () => {
    try {
      const res = await api.get('/company/onboarding-progress');
      setOnboardingMap(res.data?.progressMap || {});
      if (res.data?.tasks && Array.isArray(res.data.tasks) && res.data.tasks.length > 0) {
        setOnboardingTasks(res.data.tasks);
      }
    } catch (err) {
      console.error('Failed to load onboarding progress:', err);
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) {
      setTaskActionError('Milestone title is required');
      return;
    }
    setTaskActionError('');
    setIsSavingTasks(true);
    try {
      let updatedTasks: OnboardingChecklistItem[];
      if (editingTask) {
        updatedTasks = onboardingTasks.map((t) =>
          t.id === editingTask.id
            ? {
                ...t,
                title: newTaskForm.title.trim(),
                description: newTaskForm.description.trim(),
                category: newTaskForm.category,
              }
            : t
        );
      } else {
        const newId = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const taskToAdd: OnboardingChecklistItem = {
          id: newId,
          title: newTaskForm.title.trim(),
          description: newTaskForm.description.trim(),
          category: newTaskForm.category,
        };
        updatedTasks = [...onboardingTasks, taskToAdd];
      }

      const res = await api.put('/company/onboarding-tasks', { tasks: updatedTasks });
      setOnboardingTasks(res.data?.tasks || updatedTasks);
      setNewTaskForm({ title: '', description: '', category: 'HR' });
      setEditingTask(null);
    } catch (err: any) {
      setTaskActionError(err.response?.data?.message || 'Failed to save milestone');
    } finally {
      setIsSavingTasks(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (onboardingTasks.length <= 1) {
      alert('At least one onboarding milestone is required.');
      return;
    }
    const updatedTasks = onboardingTasks.filter((t) => t.id !== taskId);
    try {
      const res = await api.put('/company/onboarding-tasks', { tasks: updatedTasks });
      setOnboardingTasks(res.data?.tasks || updatedTasks);
      if (editingTask?.id === taskId) {
        setEditingTask(null);
        setNewTaskForm({ title: '', description: '', category: 'HR' });
      }
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
  };

  const handleResetTasksToDefault = async () => {
    if (!window.confirm('Reset all milestones to the standard default 7 templates?')) return;
    try {
      const res = await api.put('/company/onboarding-tasks', { tasks: DEFAULT_ONBOARDING_TASKS });
      setOnboardingTasks(res.data?.tasks || DEFAULT_ONBOARDING_TASKS);
      setEditingTask(null);
      setNewTaskForm({ title: '', description: '', category: 'HR' });
    } catch (err) {
      console.error('Failed to reset milestones:', err);
    }
  };

  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Onboarding Table State
  const [onboardingSearch, setOnboardingSearch] = useState('');
  const [onboardingStatusFilter, setOnboardingStatusFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'>('ALL');
  const [onboardingPage, setOnboardingPage] = useState(1);
  const [onboardingPageSize, setOnboardingPageSize] = useState(10);
  const [selectedOnboardingEmp, setSelectedOnboardingEmp] = useState<any | null>(null);
  const [expandedEmpId, setExpandedEmpId] = useState<number | null>(null);

  useEffect(() => {
    setOnboardingPage(1);
  }, [onboardingSearch, onboardingStatusFilter]);

  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    tag: `AST-${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    category: 'LAPTOP' as CompanyAsset['category'],
    serialNumber: '',
    condition: 'NEW' as CompanyAsset['condition'],
    assignedToEmployeeId: '',
  });

  // Assign Asset Modal
  const [selectedAssetForAssign, setSelectedAssetForAssign] = useState<CompanyAsset | null>(null);
  const [assignEmpId, setAssignEmpId] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await api.get('/employees?pageSize=100');
        setEmployees(res.data?.employees || res.data?.items || []);
      } catch (err) {
        console.error('Failed to load employees for assets/onboarding:', err);
      }
    };
    fetchStaff();
    fetchAssets();
    fetchOnboarding();
  }, []);

  const handleToggleTask = async (empId: number, taskId: string) => {
    const key = `${empId}_${taskId}`;
    const nextVal = !onboardingMap[key];
    setOnboardingMap((prev) => ({
      ...prev,
      [key]: nextVal,
    }));
    try {
      await api.post('/company/onboarding-progress/toggle', {
        employeeId: empId,
        taskId,
        completed: nextVal,
      });
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedEmp = newAsset.assignedToEmployeeId
        ? employees.find((e) => String(e.id) === String(newAsset.assignedToEmployeeId))
        : null;

      const payload = {
        tag: newAsset.tag,
        name: newAsset.name,
        category: newAsset.category,
        serialNumber: newAsset.serialNumber,
        condition: newAsset.condition,
        assignedToEmployeeId: selectedEmp ? selectedEmp.id : null,
        assignedToName: selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}`.trim() : null,
        assignedDate: selectedEmp ? new Date().toISOString().split('T')[0] : null,
        status: selectedEmp ? 'ASSIGNED' : 'IN_STOCK',
      };

      const res = await api.post('/company/assets', payload);
      if (res.data?.asset) {
        setAssets((prev) => [res.data.asset, ...prev]);
      } else {
        await fetchAssets();
      }
      setShowAddAssetModal(false);
      setNewAsset({
        tag: `AST-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        category: 'LAPTOP',
        serialNumber: '',
        condition: 'NEW',
        assignedToEmployeeId: '',
      });
    } catch (err: any) {
      console.error('Failed to create asset:', err);
      alert(err.response?.data?.error?.message || 'Failed to create asset');
    }
  };

  const handleAssignAsset = async () => {
    if (!selectedAssetForAssign || !assignEmpId) return;
    const emp = employees.find((e) => String(e.id) === String(assignEmpId));
    if (!emp) return;

    try {
      await api.patch(`/company/assets/${selectedAssetForAssign.id}`, {
        status: 'ASSIGNED',
        assignedToEmployeeId: emp.id,
        assignedToName: `${emp.firstName} ${emp.lastName}`.trim(),
        assignedDate: new Date().toISOString().split('T')[0],
      });
      await fetchAssets();
      setSelectedAssetForAssign(null);
      setAssignEmpId('');
    } catch (err) {
      console.error('Failed to assign asset:', err);
    }
  };

  const handleReturnAsset = async (assetId: string) => {
    if (!window.confirm('Confirm hardware asset return to company IT inventory?')) return;
    try {
      await api.patch(`/company/assets/${assetId}`, {
        status: 'IN_STOCK',
        assignedToEmployeeId: null,
        assignedToName: null,
        assignedDate: null,
      });
      await fetchAssets();
    } catch (err) {
      console.error('Failed to return asset:', err);
    }
  };

  const handleDeleteAsset = async (assetId: string, assetName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete asset "${assetName}"?`)) return;
    try {
      await api.delete(`/company/assets/${assetId}`);
      setAssets((prev) => prev.filter((a) => a.id !== assetId));
    } catch (err: any) {
      console.error('Failed to delete asset:', err);
      alert(err.response?.data?.message || 'Failed to delete asset');
    }
  };

  // Metrics
  const totalAssets = assets.length;
  const assignedCount = assets.filter((a) => a.status === 'ASSIGNED').length;
  const inStockCount = assets.filter((a) => a.status === 'IN_STOCK').length;

  const filteredAssets = useMemo(() => {
    return assets.filter(
      (a) =>
        a.tag.toLowerCase().includes(search.toLowerCase()) ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        (a.assignedToName || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [assets, search]);

  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAssets.slice(start, start + pageSize);
  }, [filteredAssets, currentPage, pageSize]);

  const avatarColorList = [
    'bg-blue-600 text-white',
    'bg-teal-600 text-white',
    'bg-purple-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-indigo-600 text-white',
  ];

  const filteredOnboardingEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = onboardingSearch.toLowerCase().trim();
      const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const dept = (emp.department?.name || '').toLowerCase();
      const title = (emp.jobTitle || '').toLowerCase();
      const matchesSearch = !q || fullName.includes(q) || email.includes(q) || dept.includes(q) || title.includes(q);

      if (!matchesSearch) return false;

      const completedCount = onboardingTasks.filter(
        (t) => onboardingMap[`${emp.id}_${t.id}`]
      ).length;

      if (onboardingStatusFilter === 'COMPLETED') {
        return completedCount === onboardingTasks.length;
      }
      if (onboardingStatusFilter === 'IN_PROGRESS') {
        return completedCount > 0 && completedCount < onboardingTasks.length;
      }
      if (onboardingStatusFilter === 'PENDING') {
        return completedCount === 0;
      }
      return true;
    });
  }, [employees, onboardingSearch, onboardingStatusFilter, onboardingMap, onboardingTasks]);

  const paginatedOnboardingEmployees = useMemo(() => {
    const start = (onboardingPage - 1) * onboardingPageSize;
    return filteredOnboardingEmployees.slice(start, start + onboardingPageSize);
  }, [filteredOnboardingEmployees, onboardingPage, onboardingPageSize]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            {activeTab === 'ASSETS' ? (
              <>
                <IconDevices className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>Company Hardware & IT Assets</span>
              </>
            ) : (
              <>
                <IconChecklist className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>Employee Onboarding Checklists</span>
              </>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeTab === 'ASSETS'
              ? 'Track enterprise hardware inventory (laptops, monitors, SIMs, keycards) and manage employee allocations.'
              : 'Monitor newly joined employee onboarding milestones, IT equipment handover, and document verification.'}
          </p>
        </div>

        {activeTab === 'ASSETS' && (
          <button
            onClick={() => setShowAddAssetModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <IconPlus className="w-4 h-4" />
            <span>Add New Asset</span>
          </button>
        )}
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

              <div className="text-xs font-semibold text-slate-500">
                Total: <strong className="text-slate-800">{totalAssets}</strong> assets • <strong className="text-indigo-600">{assignedCount}</strong> assigned • <strong className="text-emerald-600">{inStockCount}</strong> in stock
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
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
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        No assets found matching your search.
                      </td>
                    </tr>
                  ) : (
                    paginatedAssets.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{item.tag}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <span className="text-[10px] text-slate-400 font-semibold">{item.category}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500">{item.serialNumber}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
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
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'ASSIGNED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === 'IN_STOCK' ? (
                              <button
                                type="button"
                                onClick={() => setSelectedAssetForAssign(item)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                              >
                                Assign
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReturnAsset(item.id)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="Return hardware to inventory"
                              >
                                <IconArrowBackUp className="w-3.5 h-3.5" />
                                Return
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteAsset(item.id, item.name || item.tag)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-lg transition-colors cursor-pointer"
                              title={`Delete ${item.name || item.tag}`}
                            >
                              <IconTrash className="w-4 h-4 text-rose-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TablePagination
              currentPage={currentPage}
              totalItems={filteredAssets.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              itemName="assets"
            />
          </div>
        </div>
      ) : (
        /* Onboarding Checklists View - Table Format matching DepartmentsPage */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <IconChecklist className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">New Hire Onboarding Tracker</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ensure each joined employee completes all {onboardingTasks.length} compliance and orientation milestones.
                </p>
              </div>
            </div>

            {/* Right Controls: Search, Filter, & Manage Milestones */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-60">
                <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search employee, dept, role..."
                  value={onboardingSearch}
                  onChange={(e) => setOnboardingSearch(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={onboardingStatusFilter}
                  onChange={(e) => setOnboardingStatusFilter(e.target.value as any)}
                  className="appearance-none pl-8 pr-7 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-700 cursor-pointer"
                >
                  <option value="ALL">All Status</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed (100%)</option>
                  <option value="PENDING">Pending (0%)</option>
                </select>
                <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Manage Milestones Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setNewTaskForm({ title: '', description: '', category: 'HR' });
                  setTaskActionError('');
                  setShowManageTasksModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#5E4BE2] rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
                title="Add or Customize Organization Milestones"
              >
                <IconPlus className="w-3.5 h-3.5 text-[#5E4BE2]" />
                <span>Milestones ({onboardingTasks.length})</span>
              </button>
            </div>
          </div>

          {/* Table Structure */}
          <div className="overflow-x-auto border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Department & Role</th>
                  <th className="px-5 py-3.5">Joining Date</th>
                  <th className="px-5 py-3.5">Onboarding Progress</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOnboardingEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                        <IconChecklist className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">No onboarding records found</h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {onboardingSearch || onboardingStatusFilter !== 'ALL'
                          ? 'Try modifying your search or filter.'
                          : 'No employees currently in the onboarding pipeline.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedOnboardingEmployees.map((emp, idx) => {
                    const completedCount = onboardingTasks.filter(
                      (t) => onboardingMap[`${emp.id}_${t.id}`]
                    ).length;
                    const totalTasks = onboardingTasks.length || 1;
                    const percent = Math.round((completedCount / totalTasks) * 100);
                    const isCompleted = percent === 100;
                    const isExpanded = expandedEmpId === emp.id;
                    const initials = `${(emp.firstName?.[0] || 'U')}${(emp.lastName?.[0] || '')}`.toUpperCase();
                    const avatarBg = avatarColorList[idx % avatarColorList.length];

                    return (
                      <React.Fragment key={emp.id}>
                        <tr className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              {emp.profilePhoto ? (
                                <img
                                  src={emp.profilePhoto}
                                  alt={`${emp.firstName} ${emp.lastName}`}
                                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                                />
                              ) : (
                                <div
                                  className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs`}
                                >
                                  {initials}
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate">
                                  {emp.firstName} {emp.lastName}
                                </span>
                                <span className="text-[11px] text-slate-400 block truncate">
                                  {emp.email || 'No email registered'}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-800 block">
                              {emp.department?.name || 'General'}
                            </span>
                            <span className="text-[11px] text-slate-400 block">
                              {emp.jobTitle || 'Team Member'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-slate-600 font-medium">
                            {emp.joiningDate ? emp.joiningDate.split('T')[0] : 'Recent'}
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-28 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80">
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ${
                                    isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700 min-w-[70px]">
                                {completedCount}/{onboardingTasks.length} ({percent}%)
                              </span>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Completed
                              </span>
                            ) : completedCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                In Progress
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Pending
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setExpandedEmpId(isExpanded ? null : emp.id)}
                                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                                  isExpanded
                                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                                }`}
                                title={isExpanded ? 'Collapse Checklist' : 'Expand Checklist Inline'}
                              >
                                {isExpanded ? (
                                  <IconChevronUp className="w-4 h-4" />
                                ) : (
                                  <IconChevronDown className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedOnboardingEmp(emp)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-[#F0EEFF] hover:border-indigo-300 text-slate-700 hover:text-[#5E4BE2] shadow-2xs transition-all cursor-pointer font-bold text-xs"
                                title="Open Full Checklist Drawer"
                              >
                                <IconChecklist className="w-4 h-4 text-indigo-600" />
                                <span>Checklist</span>
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline Quick Checklist view when expanded */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 border-b border-slate-200/60">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                                  <span>Checklist Milestones for {emp.firstName} {emp.lastName}</span>
                                  <span className="text-[11px] text-slate-400">Click any milestone to toggle status</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                                  {onboardingTasks.map((task) => {
                                    const isDone = Boolean(onboardingMap[`${emp.id}_${task.id}`]);
                                    return (
                                      <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => handleToggleTask(emp.id, task.id)}
                                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                                          isDone
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-2xs'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                      >
                                        <div
                                          className={`w-4 h-4 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                                            isDone
                                              ? 'bg-emerald-600 border-emerald-600 text-white'
                                              : 'border-slate-300 bg-white'
                                          }`}
                                        >
                                          {isDone && <IconCheck className="w-3 h-3 stroke-[3]" />}
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-xs font-bold block leading-tight truncate">{task.title}</span>
                                          <span className="text-[10px] text-slate-400 block mt-0.5 leading-tight truncate">
                                            {task.description}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination matching DepartmentsPage */}
          <TablePagination
            currentPage={onboardingPage}
            totalItems={filteredOnboardingEmployees.length}
            pageSize={onboardingPageSize}
            onPageChange={setOnboardingPage}
            onPageSizeChange={(newSize) => {
              setOnboardingPageSize(newSize);
              setOnboardingPage(1);
            }}
            pageSizeOptions={[5, 10, 20, 50]}
            itemName="employees"
          />
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

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Assign to Employee <span className="text-[11px] font-normal text-slate-400">(Optional - can be allocated now)</span>
                </label>
                <select
                  value={newAsset.assignedToEmployeeId}
                  onChange={(e) => setNewAsset({ ...newAsset, assignedToEmployeeId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium cursor-pointer"
                >
                  <option value="">-- Keep in Stock (Unassigned) --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.department?.name || 'General'} • {e.jobTitle})
                    </option>
                  ))}
                </select>
                {newAsset.assignedToEmployeeId && (
                  <p className="text-[11px] text-indigo-600 font-semibold mt-1">
                    ✓ Device will be marked as Assigned immediately upon registration.
                  </p>
                )}
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

      {/* ===================== ONBOARDING CHECKLIST RIGHT SIDEBAR DRAWER ===================== */}
      {selectedOnboardingEmp && typeof document !== 'undefined' && createPortal((() => {
        const emp = selectedOnboardingEmp;
        const completedCount = onboardingTasks.filter(
          (t) => onboardingMap[`${emp.id}_${t.id}`]
        ).length;
        const totalTasks = onboardingTasks.length || 1;
        const percent = Math.round((completedCount / totalTasks) * 100);
        const initials = `${(emp.firstName?.[0] || 'U')}${(emp.lastName?.[0] || '')}`.toUpperCase();

        const handleToggleAll = async (completed: boolean) => {
          for (const task of onboardingTasks) {
            const key = `${emp.id}_${task.id}`;
            if (Boolean(onboardingMap[key]) !== completed) {
              handleToggleTask(emp.id, task.id);
            }
          }
        };

        return (
          <div
            className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedOnboardingEmp(null)}
          >
            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <div
                className="w-screen max-w-lg bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="relative bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] p-6 text-white shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedOnboardingEmp(null)}
                    className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                    title="Close panel"
                  >
                    <IconX className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-3.5 pr-8">
                    {emp.profilePhoto ? (
                      <img
                        src={emp.profilePhoto}
                        alt={`${emp.firstName} ${emp.lastName}`}
                        className="w-12 h-12 rounded-2xl object-cover shrink-0 ring-2 ring-white/30 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm">
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight leading-tight truncate">
                          {emp.firstName} {emp.lastName}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 shrink-0">
                          {completedCount}/{onboardingTasks.length} ({percent}%)
                        </span>
                      </div>
                      <p className="text-xs text-white/80 font-medium mt-0.5 truncate">
                        {emp.department?.name || 'General'} • {emp.jobTitle || 'Team Member'}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar in Header */}
                  <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Quick Actions Sub-bar */}
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3 shrink-0">
                  <div className="text-xs font-semibold text-slate-600">
                    Joined: <span className="text-slate-800 font-bold">{emp.joiningDate ? emp.joiningDate.split('T')[0] : 'Recent'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleAll(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Mark All Done
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleAll(false)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset All
                    </button>
                  </div>
                </div>

                {/* Checklist Items */}
                <div className="p-6 overflow-y-auto space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Onboarding Milestones & Compliance ({onboardingTasks.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowManageTasksModal(true)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      + Customize Milestones
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {onboardingTasks.map((task) => {
                      const isDone = Boolean(onboardingMap[`${emp.id}_${task.id}`]);
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => handleToggleTask(emp.id, task.id)}
                          className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                            isDone
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                              isDone
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isDone && <IconCheck className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-xs font-bold block ${isDone ? 'text-emerald-900' : 'text-slate-800'}`}>
                                {task.title}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                  task.category === 'IT'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : task.category === 'HR'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : task.category === 'FINANCE'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : task.category === 'FACILITIES'
                                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                }`}
                              >
                                {task.category}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Auto-saved to employee profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedOnboardingEmp(null)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })(), document.body)}

      {/* ===================== RIGHT SIDEBAR DRAWER: CUSTOMIZE ORGANIZATION ONBOARDING MILESTONES ===================== */}
      {showManageTasksModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-hidden bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          onClick={() => setShowManageTasksModal(false)}
        >
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div
              className="w-screen max-w-xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300 border-l border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="relative bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] p-6 text-white shrink-0">
                <button
                  type="button"
                  onClick={() => setShowManageTasksModal(false)}
                  className="absolute top-5 right-5 p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="Close panel"
                >
                  <IconX className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3.5 pr-8">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <IconChecklist className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black tracking-tight leading-tight truncate">
                        Onboarding Milestones
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white border border-white/30 shrink-0">
                        {onboardingTasks.length} milestones
                      </span>
                    </div>
                    <p className="text-xs text-white/80 font-medium mt-0.5 truncate">
                      Customize the onboarding checklist required for new hires joining your organization.
                    </p>
                  </div>
                </div>
              </div>

              {/* Drawer Body - Scrollable */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* Form: Add or Edit Milestone */}
                <form onSubmit={handleSaveTask} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      {editingTask ? `✏️ Edit Milestone: "${editingTask.title}"` : '➕ Add New Organization Milestone'}
                    </span>
                    {editingTask && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(null);
                          setNewTaskForm({ title: '', description: '', category: 'HR' });
                        }}
                        className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>

                  {taskActionError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                      <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{taskActionError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Milestone Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sign NDA & Company Policy"
                        value={newTaskForm.title}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800 font-medium"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Category
                      </label>
                      <select
                        value={newTaskForm.category}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value as any })}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl font-bold cursor-pointer focus:outline-hidden focus:border-indigo-500 text-slate-700"
                      >
                        <option value="HR">HR</option>
                        <option value="IT">IT</option>
                        <option value="FINANCE">Finance</option>
                        <option value="FACILITIES">Facilities</option>
                        <option value="GENERAL">General</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Description / Verification Details
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Digital handbook acknowledged and agreement signed"
                      value={newTaskForm.description}
                      onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSavingTasks}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <IconCheck className="w-3.5 h-3.5" />
                      <span>{editingTask ? 'Update Milestone' : 'Save Milestone'}</span>
                    </button>
                  </div>
                </form>

                {/* List of Configured Milestones */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Configured Milestones ({onboardingTasks.length})</span>
                    <button
                      type="button"
                      onClick={handleResetTasksToDefault}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      Reset to Standard 7 Defaults
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {onboardingTasks.map((task, idx) => (
                      <div
                        key={task.id}
                        className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          editingTask?.id === task.id
                            ? 'bg-indigo-50/70 border-indigo-300'
                            : 'bg-white border-slate-200/90 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {task.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                task.category === 'IT'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : task.category === 'HR'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : task.category === 'FINANCE'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : task.category === 'FACILITIES'
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {task.category}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask(task);
                              setNewTaskForm({
                                title: task.title,
                                description: task.description,
                                category: task.category,
                              });
                              setTaskActionError('');
                            }}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Milestone"
                          >
                            <IconPencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Milestone"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500">
                  Saved to organization profile
                </span>
                <button
                  type="button"
                  onClick={() => setShowManageTasksModal(false)}
                  className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AssetsOnboardingPage;
