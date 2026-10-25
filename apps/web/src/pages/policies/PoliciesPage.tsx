import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  IconExternalLink,
  IconFileTypePdf,
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
  documentUrl?: string | null;
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

  const pendingCount = policies.filter((p) => !p.acknowledged).length;

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

  const getDocumentPreviewUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.includes('amazonaws.com')) {
      const filename = url.split('/uploads/').pop() || url.split('/').pop();
      return `/uploads/${filename}`;
    }
    if (url.startsWith('/uploads/')) {
      return url;
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `/uploads/${url.replace(/^\/+/, '')}`;
  };

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



      {/* Table Form Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
        {/* Search & Filter Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search policies by title, category, or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status Segmented Buttons */}
          <div className="flex items-center bg-slate-50 border border-slate-200 p-1 rounded-xl shrink-0">
            {(['ALL', 'PENDING', 'SIGNED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === tab
                    ? 'bg-white text-[#5E4BE2] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
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

        {/* Table Content */}
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Policy Title</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Version</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Signed Date</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="w-48 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-12 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-24 h-4 bg-slate-200 rounded-sm" /></td>
                    <td className="px-5 py-4"><div className="w-20 h-4 bg-slate-100 rounded-sm" /></td>
                    <td className="px-5 py-4 text-right"><div className="w-28 h-7 bg-slate-100 rounded-xl ml-auto" /></td>
                  </tr>
                ))
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 text-[#5E4BE2] mx-auto flex items-center justify-center mb-3">
                      <IconFileText className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">No policies found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {search ? 'Try adjusting your search criteria.' : 'Corporate compliance policies will appear here once published.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((pol) => (
                  <tr key={pol.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                          <IconFileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-xs block truncate max-w-sm">
                            {pol.title}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate max-w-sm mt-0.5">
                            {pol.content}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-600">
                      v{pol.version}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {pol.acknowledged ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <IconCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                          <span>Signed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <IconAlertCircle className="w-3.5 h-3.5 text-amber-600 stroke-[2.5]" />
                          <span>Action Required</span>
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-500 font-medium">
                      {pol.acknowledgedAt ? new Date(pol.acknowledgedAt).toLocaleDateString() : '—'}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingPolicy(pol)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#5E4BE2] font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <IconEye className="w-3.5 h-3.5" />
                          <span>Read Full Text</span>
                        </button>
                        {!pol.acknowledged && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledge(pol.id)}
                            disabled={acknowledgingId === pol.id}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            {acknowledgingId === pol.id ? 'Signing...' : 'Acknowledge'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Reader Right-Side Slide-Over Drawer */}
      {viewingPolicy && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setViewingPolicy(null)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
                    <IconFileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#5E4BE2] uppercase tracking-wider">
                      {viewingPolicy.category} • Version {viewingPolicy.version}
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {viewingPolicy.title}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={() => setViewingPolicy(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {viewingPolicy.documentUrl && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 to-purple-50/50 border border-indigo-100 shadow-2xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white text-[#5E4BE2] shadow-2xs border border-indigo-100 flex items-center justify-center shrink-0">
                        {viewingPolicy.documentUrl.toLowerCase().includes('.pdf') ? (
                          <IconFileTypePdf className="w-5 h-5 text-rose-600" />
                        ) : (
                          <IconFileText className="w-5 h-5 text-[#5E4BE2]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                          Official Attached Document
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                          {viewingPolicy.title}
                        </h4>
                      </div>
                    </div>

                    <a
                      href={getDocumentPreviewUrl(viewingPolicy.documentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3cc9] text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <IconExternalLink className="w-3.5 h-3.5" />
                      <span>Open Document</span>
                    </a>
                  </div>
                )}

                {viewingPolicy.content ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">
                    {viewingPolicy.content}
                  </div>
                ) : !viewingPolicy.documentUrl ? (
                  <div className="text-slate-400 text-xs">No document or text content available.</div>
                ) : null}
              </div>

              {/* Drawer Footer */}
              <div className="p-5 px-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0">
                <div className="text-xs text-slate-500">
                  {viewingPolicy.acknowledged ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <IconShieldCheck className="w-4 h-4 text-emerald-600" />
                      Signed on {new Date(viewingPolicy.acknowledgedAt || '').toLocaleDateString()}
                    </span>
                  ) : (
                    <span>By clicking acknowledge, you certify that you have read and agree to comply.</span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    onClick={() => setViewingPolicy(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                  {!viewingPolicy.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(viewingPolicy.id)}
                      disabled={acknowledgingId === viewingPolicy.id}
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <IconCheck className="w-4 h-4" />
                      {acknowledgingId === viewingPolicy.id ? 'Signing...' : 'I Agree & Acknowledge'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PoliciesPage;
