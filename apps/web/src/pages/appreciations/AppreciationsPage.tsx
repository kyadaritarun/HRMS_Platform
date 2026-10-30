import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconHeartHandshake,
  IconX,
  IconTrophy,
  IconSparkles,
  IconFlame,
  IconBulb,
  IconSearch,
  IconFilter,
  IconChevronDown,
  IconCheck,
  IconPlus,
} from '@tabler/icons-react';

interface AppreciationUser {
  id?: number;
  firstName?: string;
  lastName?: string;
  name?: string;
  jobTitle?: string;
  email?: string;
  department?: { name: string } | null;
}

interface Appreciation {
  id: number;
  badge?: string;
  message?: string;
  title?: string;
  createdAt: string;
  payload?: any;
  user?: AppreciationUser;
  receiver?: AppreciationUser;
  recipient?: AppreciationUser;
  sender?: AppreciationUser;
}

const BADGES = [
  { key: 'ROCKSTAR', label: 'Rockstar Delivery', icon: IconFlame, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { key: 'TEAM_PLAYER', label: 'Ultimate Team Player', icon: IconHeartHandshake, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { key: 'INNOVATOR', label: 'Innovative Thinker', icon: IconBulb, color: 'text-purple-700 bg-purple-50 border-purple-200' },
  { key: 'LIFESAVER', label: 'Lifesaver Under Pressure', icon: IconSparkles, color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { key: 'LEADERSHIP', label: 'Inspiring Leadership', icon: IconTrophy, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
];

export const AppreciationsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [appreciations, setAppreciations] = useState<Appreciation[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<string>('ALL');
  const [badgeMode, setBadgeMode] = useState<'preset' | 'custom'>('preset');
  const [form, setForm] = useState({
    receiverId: '',
    badge: 'Rockstar Delivery',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [appRes, empRes] = await Promise.all([
        api.get('/appreciations'),
        api.get('/employees?pageSize=100'),
      ]);
      setAppreciations(appRes.data?.appreciations || []);
      setEmployees(empRes.data?.items || []);
    } catch (err) {
      console.error('Failed to load appreciations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGiveKudos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.receiverId || !form.badge.trim() || !form.message.trim()) {
      alert('Please select a teammate, provide a badge, and write an appreciation message.');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/appreciations', {
        recipientId: Number(form.receiverId),
        receiverId: Number(form.receiverId),
        badge: form.badge.trim(),
        message: form.message.trim(),
      });
      setIsModalOpen(false);
      setForm({ receiverId: '', badge: 'Rockstar Delivery', message: '' });
      setBadgeMode('preset');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to send kudos');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsePayload = (payload: any) => {
    if (!payload) return {};
    if (typeof payload === 'object') return payload;
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch {
        return {};
      }
    }
    return {};
  };

  const getBadgeMeta = (badgeKey?: string, payload?: any) => {
    const rawKey = (badgeKey || parsePayload(payload).badge || 'Rockstar Delivery').trim();
    const found = BADGES.find(
      (b) =>
        b.key.toLowerCase() === rawKey.toLowerCase() ||
        b.label.toLowerCase() === rawKey.toLowerCase() ||
        rawKey.toLowerCase().includes(b.key.toLowerCase())
    );
    if (found) return found;
    return {
      key: rawKey,
      label: rawKey,
      icon: IconSparkles,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    };
  };

  const getReceiverName = (app: Appreciation): string => {
    const r = app.receiver || app.user || app.recipient;
    if (r) {
      const fullName = `${r.firstName || ''} ${r.lastName || ''}`.trim();
      if (fullName) return fullName;
      if (r.name) return r.name;
      if (r.email) return r.email;
    }
    return 'Colleague';
  };

  const getReceiverJobTitle = (app: Appreciation): string => {
    const r = app.receiver || app.user || app.recipient;
    return r?.jobTitle || 'Team Member';
  };

  const getSenderName = (app: Appreciation): string => {
    if (app.sender) {
      const fullName = `${app.sender.firstName || ''} ${app.sender.lastName || ''}`.trim();
      if (fullName) return fullName;
      if (app.sender.name) return app.sender.name;
    }
    const p = parsePayload(app.payload);
    if (p.senderName) return p.senderName;
    if (p.sender?.firstName) {
      return `${p.sender.firstName || ''} ${p.sender.lastName || ''}`.trim();
    }
    if (app.title && typeof app.title === 'string' && app.title.toLowerCase().startsWith('kudos from ')) {
      return app.title.replace(/^kudos from\s*/i, '').trim();
    }
    return 'Teammate';
  };

  const getMessage = (app: Appreciation): string => {
    const p = parsePayload(app.payload);
    if (p.message && typeof p.message === 'string' && p.message.trim()) {
      return p.message.trim();
    }
    if (app.message && typeof app.message === 'string' && app.message.trim()) {
      return app.message.trim();
    }
    return 'Recognized for outstanding work and valuable team contribution!';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
  };

  // Collect all unique badge labels for filter
  const allFilterBadges = useMemo(() => {
    const list: { key: string; label: string }[] = BADGES.map((b) => ({
      key: b.label,
      label: b.label,
    }));
    appreciations.forEach((app) => {
      const meta = getBadgeMeta(app.badge, app.payload);
      if (meta?.label && !list.some((item) => item.label.toLowerCase() === meta.label.toLowerCase())) {
        list.push({ key: meta.label, label: meta.label });
      }
    });
    return list;
  }, [appreciations]);

  // Filter appreciations
  const filteredAppreciations = appreciations.filter((app) => {
    const recName = getReceiverName(app).toLowerCase();
    const sendName = getSenderName(app).toLowerCase();
    const msg = getMessage(app).toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || recName.includes(q) || sendName.includes(q) || msg.includes(q);

    if (badgeFilter === 'ALL') return matchesSearch;
    const badgeLabel = getBadgeMeta(app.badge, app.payload).label;
    return matchesSearch && badgeLabel.toLowerCase() === badgeFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconHeartHandshake className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Appreciations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Celebrate colleagues, foster positive company culture, and recognize outstanding contributions.
          </p>
        </div>

        <button
          onClick={() => {
            setBadgeMode('preset');
            setForm({ receiverId: '', badge: 'Rockstar Delivery', message: '' });
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconSparkles className="w-4 h-4" />
          <span>Give Kudos</span>
        </button>
      </div>

      {/* Table Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by colleague, sender or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <IconX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <label htmlFor="badge-filter" className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
              <IconFilter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter:</span>
            </label>
            <div className="relative min-w-[200px]">
              <select
                id="badge-filter"
                value={badgeFilter}
                onChange={(e) => setBadgeFilter(e.target.value)}
                className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors cursor-pointer"
              >
                <option value="ALL">All Badges</option>
                {allFilterBadges.map((b) => (
                  <option key={b.key} value={b.label}>
                    {b.label}
                  </option>
                ))}
              </select>
              <IconChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full min-w-[850px] text-left text-xs">
            <thead className="bg-[#e5e7eb] text-xs font-bold text-slate-900 border-b border-slate-300">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Recipient</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Badge</th>
                <th className="px-5 py-3.5">Recognition Message</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Given By</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200" />
                        <div className="space-y-1.5">
                          <div className="w-24 h-3.5 bg-slate-200 rounded" />
                          <div className="w-16 h-2.5 bg-slate-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-28 h-6 bg-slate-100 rounded-full" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-3/4 h-4 bg-slate-100 rounded" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="w-20 h-4 bg-slate-100 rounded" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="w-16 h-4 bg-slate-100 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredAppreciations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <IconHeartHandshake className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">
                      {searchQuery || badgeFilter !== 'ALL'
                        ? 'No matching appreciations found.'
                        : 'No kudos sent yet. Be the first to recognize a teammate!'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click the "Give Kudos" button above to send instant recognition.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAppreciations.map((app) => {
                  const b = getBadgeMeta(app.badge, app.payload);
                  const Icon = b.icon;
                  const receiverName = getReceiverName(app);
                  const receiverTitle = getReceiverJobTitle(app);
                  const senderName = getSenderName(app);
                  const message = getMessage(app);

                  return (
                    <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Recipient */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 text-[#5E4BE2] font-bold flex items-center justify-center text-xs shrink-0">
                            {getInitials(receiverName)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{receiverName}</div>
                            <div className="text-[11px] text-slate-500 font-medium">{receiverTitle}</div>
                          </div>
                        </div>
                      </td>

                      {/* Badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${b.color}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          {b.label}
                        </span>
                      </td>

                      {/* Recognition Message */}
                      <td className="px-5 py-4">
                        <p className="text-xs text-slate-700 leading-relaxed font-normal max-w-lg italic line-clamp-2">
                          &ldquo;{message}&rdquo;
                        </p>
                      </td>

                      {/* Given By */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-semibold flex items-center justify-center text-[10px] shrink-0">
                            {getInitials(senderName)}
                          </div>
                          <span className="text-xs font-semibold text-slate-800">{senderName}</span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-500">
                          {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Give Kudos Right-Side Slide-Over Drawer */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
            <div
              className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-200 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <IconSparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      Employee Recognition
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      Recognize a Colleague
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleGiveKudos} className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Teammate <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={form.receiverId}
                      onChange={(e) => setForm({ ...form, receiverId: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] font-medium text-slate-800"
                    >
                      <option value="">Choose colleague...</option>
                      {employees
                        .filter((e) => !currentUser?.id || e.id !== currentUser.id)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.firstName} {e.lastName} ({e.jobTitle || 'Team'})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700">
                        Appreciation Badge <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            setBadgeMode('preset');
                            if (!BADGES.some((b) => b.label === form.badge)) {
                              setForm({ ...form, badge: 'Rockstar Delivery' });
                            }
                          }}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            badgeMode === 'preset'
                              ? 'bg-white text-[#5E4BE2] shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Presets
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBadgeMode('custom');
                            if (BADGES.some((b) => b.label === form.badge)) {
                              setForm({ ...form, badge: '' });
                            }
                          }}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            badgeMode === 'custom'
                              ? 'bg-white text-[#5E4BE2] shadow-2xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Custom Badge
                        </button>
                      </div>
                    </div>

                    {badgeMode === 'preset' ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2">
                          {BADGES.map((b) => {
                            const Icon = b.icon;
                            const isSelected = form.badge === b.label || form.badge === b.key;
                            return (
                              <button
                                key={b.key}
                                type="button"
                                onClick={() => setForm({ ...form, badge: b.label })}
                                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all text-xs font-bold cursor-pointer ${
                                  isSelected
                                    ? 'border-[#5E4BE2] bg-indigo-50/60 text-[#5E4BE2] ring-1 ring-[#5E4BE2] shadow-xs'
                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <span className="flex items-center gap-2.5">
                                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#5E4BE2]' : 'text-amber-500'}`} />
                                  <span>{b.label}</span>
                                </span>
                                <span
                                  className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold transition-all ${
                                    isSelected
                                      ? 'bg-[#5E4BE2] text-white border-[#5E4BE2]'
                                      : b.color
                                  }`}
                                >
                                  {isSelected ? 'Selected ✓' : 'Select'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBadgeMode('custom');
                            setForm({ ...form, badge: '' });
                          }}
                          className="w-full py-2 px-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/40 hover:bg-indigo-50 text-[#5E4BE2] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <IconPlus className="w-3.5 h-3.5" />
                          <span>Give Custom Badge Instead</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                            Custom Badge Title <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <IconSparkles className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                            <input
                              type="text"
                              required
                              autoFocus
                              placeholder="Type your own badge (e.g. Bug Hunter, Problem Solver...)"
                              value={form.badge}
                              onChange={(e) => setForm({ ...form, badge: e.target.value })}
                              className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-[#5E4BE2] font-semibold text-slate-800 placeholder-slate-400"
                            />
                          </div>
                        </div>

                        {/* Live Pill Preview */}
                        {form.badge.trim() && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preview:</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border text-indigo-700 bg-indigo-50 border-indigo-200">
                              <IconSparkles className="w-3.5 h-3.5" />
                              {form.badge.trim()}
                            </span>
                          </div>
                        )}

                        {/* Quick Suggestions */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Quick suggestions:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              'Problem Solver',
                              'Bug Hunter',
                              'Customer Champion',
                              'Design Wizard',
                              'Code Ninja',
                              'Culture Hero',
                            ].map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => setForm({ ...form, badge: sug })}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                  form.badge.trim().toLowerCase() === sug.toLowerCase()
                                    ? 'bg-[#5E4BE2] text-white border-[#5E4BE2] shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                              >
                                + {sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Recognition Message <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Share what makes their effort awesome..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 resize-none placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {isSubmitting ? 'Posting...' : 'Send Kudos'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AppreciationsPage;
