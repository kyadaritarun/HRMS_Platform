import React, { useState, useEffect } from 'react';
import api from '../../api/client';
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
  const [appreciations, setAppreciations] = useState<Appreciation[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<string>('ALL');
  const [form, setForm] = useState({
    receiverId: '',
    badge: 'ROCKSTAR',
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
    if (!form.receiverId || !form.message.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/appreciations', {
        recipientId: Number(form.receiverId),
        receiverId: Number(form.receiverId),
        badge: form.badge,
        message: form.message.trim(),
      });
      setIsModalOpen(false);
      setForm({ receiverId: '', badge: 'ROCKSTAR', message: '' });
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
    const rawKey = badgeKey || parsePayload(payload).badge || 'ROCKSTAR';
    const found = BADGES.find((b) => b.key === rawKey || rawKey.includes(b.key));
    return found || BADGES[0];
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

  // Filter appreciations
  const filteredAppreciations = appreciations.filter((app) => {
    const recName = getReceiverName(app).toLowerCase();
    const sendName = getSenderName(app).toLowerCase();
    const msg = getMessage(app).toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || recName.includes(q) || sendName.includes(q) || msg.includes(q);

    if (badgeFilter === 'ALL') return matchesSearch;
    const badge = getBadgeMeta(app.badge, app.payload).key;
    return matchesSearch && badge === badgeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <IconHeartHandshake className="w-7 h-7 text-brand-600" />
            Appreciations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Celebrate colleagues, foster positive company culture, and recognize outstanding contributions.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-600 hover:from-amber-600 hover:to-brand-700 text-white font-bold text-sm shadow-sm transition-all shadow-amber-500/20 active:scale-95 cursor-pointer"
        >
          <IconSparkles className="w-4 h-4" />
          Give Kudos
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <IconSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by colleague, sender or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <label htmlFor="badge-filter" className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 shrink-0">
            <IconFilter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </label>
          <div className="relative w-full md:w-56">
            <select
              id="badge-filter"
              value={badgeFilter}
              onChange={(e) => setBadgeFilter(e.target.value)}
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:bg-white focus:outline-hidden focus:border-brand-500 transition-colors cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {BADGES.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
            <IconChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Wall Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="w-28 h-6 bg-slate-200 rounded-full" />
                <div className="w-16 h-4 bg-slate-100 rounded-md" />
              </div>
              <div className="w-full h-16 bg-slate-100 rounded-2xl" />
              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <div className="w-24 h-8 bg-slate-200 rounded-lg" />
                <div className="w-20 h-8 bg-slate-100 rounded-lg" />
              </div>
            </div>
          ))
        ) : filteredAppreciations.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-slate-200/80 shadow-xs">
            <IconHeartHandshake className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              {searchQuery || badgeFilter !== 'ALL'
                ? 'No matching appreciations found.'
                : 'No kudos sent yet. Be the first to recognize a teammate!'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click the "Give Kudos" button above to send instant recognition.
            </p>
          </div>
        ) : (
          filteredAppreciations.map((app) => {
            const b = getBadgeMeta(app.badge, app.payload);
            const Icon = b.icon;
            const receiverName = getReceiverName(app);
            const receiverTitle = getReceiverJobTitle(app);
            const senderName = getSenderName(app);
            const message = getMessage(app);

            return (
              <div
                key={app.id}
                className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${b.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {b.label}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400">
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed font-medium bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                    "{message}"
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-200 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0">
                      {getInitials(receiverName)}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kudos to</span>
                      <span className="font-bold text-slate-900 block leading-tight">
                        {receiverName}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {receiverTitle}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">From</span>
                    <span className="font-semibold text-slate-700 block">
                      {senderName}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Give Kudos Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <IconSparkles className="w-5 h-5 text-amber-500" />
                Recognize a Colleague
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGiveKudos} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Teammate *</label>
                <select
                  required
                  value={form.receiverId}
                  onChange={(e) => setForm({ ...form, receiverId: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 font-medium text-slate-800"
                >
                  <option value="">Choose colleague...</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.jobTitle || 'Team'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Appreciation Badge</label>
                <div className="grid grid-cols-1 gap-2">
                  {BADGES.map((b) => {
                    const Icon = b.icon;
                    const isSelected = form.badge === b.key;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => setForm({ ...form, badge: b.key })}
                        className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all text-xs font-bold cursor-pointer ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/50 text-brand-900'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0 text-amber-500" />
                        {b.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recognition Message *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Share what makes their effort awesome..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Posting...' : 'Send Kudos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppreciationsPage;
