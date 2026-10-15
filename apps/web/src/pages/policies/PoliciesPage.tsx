import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/client';
import {
  IconFileText,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconShieldCheck,
  IconEye,
  IconClock,
  IconSearch,
} from '@tabler/icons-react';

interface PolicyItem {
  id: number;
  title: string;
  category: string;
  content: string;
  version: string;
  isMandatory: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
}

export const PoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingPolicy, setViewingPolicy] = useState<PolicyItem | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'SIGNED'>('ALL');

  const fetchPolicies = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/policies');
      setPolicies(res.data?.policies || []);
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleAcknowledge = async (id: number) => {
    setAcknowledgingId(id);
    try {
      await api.post(`/policies/${id}/acknowledge`);
      fetchPolicies();
      if (viewingPolicy && viewingPolicy.id === id) {
        setViewingPolicy({ ...viewingPolicy, acknowledged: true, acknowledgedAt: new Date().toISOString() });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to acknowledge policy');
    } finally {
      setAcknowledgingId(null);
    }
  };

  // KPI Calculations
  const totalCount = policies.length;
  const signedCount = policies.filter((p) => p.acknowledged).length;
  const pendingCount = policies.filter((p) => !p.acknowledged).length;
  const complianceRate = totalCount > 0 ? Math.round((signedCount / totalCount) * 100) : 100;

  // Filtered policies
  const filteredPolicies = useMemo(() => {
    return policies.filter((pol) => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || pol.title.toLowerCase().includes(q) || pol.content.toLowerCase().includes(q) || pol.category.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (filterStatus === 'PENDING') return !pol.acknowledged;
      if (filterStatus === 'SIGNED') return pol.acknowledged;
      return true;
    });
  }, [policies, search, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconFileText className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Policies
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review mandatory corporate governance, workplace safety guidelines, and statutory compliance documents.
          </p>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Total Policies</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {totalCount}
            </div>
            <div className="text-[11px] font-bold text-indigo-600 mt-2">
              Corporate frameworks
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2]">
            <IconFileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Signed & Verified</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {signedCount}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 mt-2">
              Acknowledged documents
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <IconShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Action Required</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {pendingCount}
            </div>
            <div className="text-[11px] font-bold text-amber-600 mt-2">
              Pending your signature
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <IconAlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-xs font-bold text-slate-500">Compliance Rate</span>
            <div className="text-2xl font-black text-slate-900 mt-1 leading-none tracking-tight">
              {complianceRate}%
            </div>
            <div className="text-[11px] font-bold text-blue-600 mt-2">
              Overall adherence score
            </div>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <IconCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search policies by title or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50/80 border border-slate-200/90 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-[#5E4BE2] focus:bg-white transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
          {(['ALL', 'PENDING', 'SIGNED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                filterStatus === tab
                  ? 'bg-white text-[#5E4BE2] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'ALL'
                ? 'All Policies'
                : tab === 'PENDING'
                ? `Action Required (${pendingCount})`
                : 'Signed'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-3">
              <div className="w-20 h-5 bg-slate-200 rounded-md" />
              <div className="w-48 h-5 bg-slate-200 rounded-sm" />
              <div className="w-full h-12 bg-slate-100 rounded-xl" />
            </div>
          ))
        ) : filteredPolicies.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3">
              <IconFileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No policies found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try adjusting your search criteria.' : 'Corporate compliance policies will appear here once published.'}
            </p>
          </div>
        ) : (
          filteredPolicies.map((pol) => (
            <div
              key={pol.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200/70 px-2.5 py-0.5 rounded-full">
                    {pol.category} • v{pol.version}
                  </span>
                  {pol.acknowledged ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <IconCheck className="w-3 h-3" />
                      Signed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <IconAlertCircle className="w-3 h-3" />
                      Action Required
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-900 text-sm leading-snug">{pol.title}</h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                  {pol.content}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setViewingPolicy(pol)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <IconEye className="w-4 h-4 text-slate-400" />
                  <span>Read Full Text</span>
                </button>

                {!pol.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(pol.id)}
                    disabled={acknowledgingId === pol.id}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white shadow-sm shadow-indigo-600/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {acknowledgingId === pol.id ? 'Signing...' : 'Acknowledge'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Policy Reader Modal */}
      {viewingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                  <IconFileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#5E4BE2] uppercase tracking-wider">
                    {viewingPolicy.category} • Version {viewingPolicy.version}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{viewingPolicy.title}</h3>
                </div>
              </div>
              <button
                onClick={() => setViewingPolicy(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {viewingPolicy.content}
            </div>

            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                {viewingPolicy.acknowledged ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <IconShieldCheck className="w-4 h-4" />
                    Signed on {new Date(viewingPolicy.acknowledgedAt || '').toLocaleDateString()}
                  </span>
                ) : (
                  <span>By clicking acknowledge, you certify that you have read and agree to comply.</span>
                )}
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => setViewingPolicy(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
                {!viewingPolicy.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(viewingPolicy.id)}
                    disabled={acknowledgingId === viewingPolicy.id}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white shadow-sm shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer"
                  >
                    <IconCheck className="w-4 h-4" />
                    I Agree & Acknowledge
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoliciesPage;
