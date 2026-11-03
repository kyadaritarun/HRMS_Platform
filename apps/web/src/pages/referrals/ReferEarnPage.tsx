import React, { useState, useEffect } from 'react';
import {
  IconGift,
  IconArrowRight,
  IconWallet,
  IconCheck,
  IconClock,
  IconTrendingUp,
  IconBuildingSkyscraper,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconCash,
  IconUsers,
} from '@tabler/icons-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ReferLeadModal } from '../../components/referrals/ReferLeadModal';
import { WithdrawModal } from '../../components/referrals/WithdrawModal';

export const ReferEarnPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'my_referrals' | 'wallet_history' | 'withdrawals' | 'company_leads'>('my_referrals');

  const [isReferModalOpen, setIsReferModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    successful: 0,
    totalEarned: 0,
    balance: 0,
    pendingReward: 0,
  });

  const [referrals, setReferrals] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [companyLeads, setCompanyLeads] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const isHrOrAdmin = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR';

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/referrals/my');
      if (res.data?.success) {
        setStats(res.data.stats || { totalReferrals: 0, successful: 0, totalEarned: 0, balance: 0, pendingReward: 0 });
        setReferrals(res.data.referrals || []);
        setWithdrawals(res.data.withdrawals || []);
        setWalletHistory(res.data.walletHistory || []);
      }

      if (isHrOrAdmin) {
        try {
          const compRes = await api.get('/referrals/company');
          if (compRes.data?.success) {
            setCompanyLeads(compRes.data.leads || []);
          }
        } catch {
          // Graceful fallback
        }
      }
    } catch (err) {
      console.error('Failed to load referral data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (leadId: number, newStatus: string) => {
    try {
      await api.patch(`/referrals/${leadId}/status`, { status: newStatus });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update lead status');
    }
  };

  const filteredReferrals = referrals.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.businessName?.toLowerCase().includes(q) ||
      r.ownerName?.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q) ||
      r.mobileNumber?.includes(q)
    );
  });

  const filteredCompanyLeads = companyLeads.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.businessName?.toLowerCase().includes(q) ||
      r.ownerName?.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q) ||
      r.referrerName?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Won / Converted
          </span>
        );
      case 'DEMO_SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Demo Scheduled
          </span>
        );
      case 'CONTACTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Contacted
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Not Interested
          </span>
        );
      case 'NEW_LEAD':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            New Lead
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Hero Banner (Matching uploaded screenshot) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        {/* Subtle decorative glow circles */}
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-[#5E4BE2]/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-60 h-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <IconGift className="w-3.5 h-3.5 text-indigo-400" />
              <span>REFER &amp; EARN</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              You refer, They purchase.
              <br />
              <span className="text-emerald-400 font-extrabold">You get ₹ 3,000</span> in your bank.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Takes 30 seconds — just their business name and phone number.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsReferModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold text-xs sm:text-sm shadow-lg shadow-sky-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <span>Refer A Lead</span>
                <IconArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Wallet Balance Card */}
          <div className="w-full lg:w-80 p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-between shrink-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
                <IconWallet className="w-4 h-4 text-emerald-400" />
                <span>WALLET BALANCE</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                Instant Payout
              </span>
            </div>

            <div className="my-3">
              <div className="text-3xl font-extrabold text-white tracking-tight">
                ₹ {stats.balance.toLocaleString('en-IN')}.00
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                Total Earned: ₹ {stats.totalEarned.toLocaleString('en-IN')}
              </p>
            </div>

            <button
              type="button"
              disabled={stats.balance <= 0}
              onClick={() => setIsWithdrawModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <IconCash className="w-3.5 h-3.5" />
              <span>Withdraw to Bank</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <IconBuildingSkyscraper className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.totalReferrals}</div>
            <div className="text-xs text-slate-500 font-medium">Total Referrals</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <IconCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.successful}</div>
            <div className="text-xs text-slate-500 font-medium">Successful Conversions</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
            <IconTrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">
              ₹ {stats.totalEarned.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 font-medium">Total Rewards Earned</div>
          </div>
        </div>
      </div>

      {/* 3-Step Process Guide */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
          How Refer &amp; Earn Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 text-[#5E4BE2] font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-100">
              1
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">1. Share Details</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Submit business and owner contact details using the simple refer form.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 font-bold text-xs flex items-center justify-center shrink-0 border border-sky-100">
              2
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">2. Sales Demo &amp; Closes</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Our sales team calls them, provides product demo, and handles onboarding.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-100">
              3
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900">3. Earn ₹ 3,000 Direct</h3>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Reward lands in your wallet as soon as they subscribe. Withdraw anytime!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Tabs Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="px-5 pt-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('my_referrals')}
              className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'my_referrals'
                  ? 'border-[#5E4BE2] text-[#5E4BE2]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              My Referrals ({referrals.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('wallet_history')}
              className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'wallet_history'
                  ? 'border-[#5E4BE2] text-[#5E4BE2]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Wallet History
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('withdrawals')}
              className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'withdrawals'
                  ? 'border-[#5E4BE2] text-[#5E4BE2]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Withdrawal Requests ({withdrawals.length})
            </button>

            {isHrOrAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab('company_leads')}
                className={`pb-3 px-3.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'company_leads'
                    ? 'border-[#5E4BE2] text-[#5E4BE2]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                All Company Leads ({companyLeads.length})
              </button>
            )}
          </div>

          {/* Quick Action Button & Search */}
          <div className="flex items-center gap-2 pb-3">
            <div className="relative w-48 sm:w-60">
              <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={fetchData}
              title="Refresh"
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <IconRefresh className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsReferModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refer a Lead</span>
            </button>
          </div>
        </div>

        {/* Tab 1: My Referrals */}
        {activeTab === 'my_referrals' && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">Loading referrals...</div>
            ) : filteredReferrals.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] mx-auto flex items-center justify-center">
                  <IconGift className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Referrals Yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Know a company or business that could use Uptrix HRMS? Refer them and earn ₹ 3,000 once they join!
                </p>
                <button
                  type="button"
                  onClick={() => setIsReferModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0284c7] text-white text-xs font-bold hover:bg-[#0369a1] shadow-xs cursor-pointer"
                >
                  <IconPlus className="w-4 h-4" />
                  <span>Refer Your First Lead</span>
                </button>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-700 text-[11px] font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-3">Business &amp; Owner</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Submitted On</th>
                    <th className="px-4 py-3">Lead Status</th>
                    <th className="px-4 py-3 text-right">Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredReferrals.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{r.businessName}</div>
                        <div className="text-[11px] text-slate-500">{r.ownerName}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-mono">+91 {r.mobileNumber}</div>
                        <div className="text-[11px] text-slate-500">{r.email}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{r.city}</td>
                      <td className="px-4 py-3.5 text-slate-500">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3.5">{getStatusBadge(r.status)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <div className={`font-bold ${r.status === 'CONVERTED' ? 'text-emerald-600' : 'text-slate-700'}`}>
                          ₹ {Number(r.rewardAmount || 3000).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">
                          {r.rewardStatus || 'PENDING'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Wallet History */}
        {activeTab === 'wallet_history' && (
          <div className="overflow-x-auto">
            {walletHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                No wallet transactions recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-700 text-[11px] font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-4 py-3">Transaction</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {walletHistory.map((item) => {
                    const isCredit = item.type === 'CREDIT';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-500">
                          {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">{item.title}</td>
                        <td className="px-4 py-3.5 text-slate-600">{item.description}</td>
                        <td className={`px-4 py-3.5 text-right font-extrabold ${isCredit ? 'text-emerald-600' : 'text-slate-800'}`}>
                          {isCredit ? '+' : '-'} ₹ {Number(item.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.status === 'SUCCESS' || item.status === 'PROCESSED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 3: Withdrawal Requests */}
        {activeTab === 'withdrawals' && (
          <div className="overflow-x-auto">
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                No withdrawal requests made yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-700 text-[11px] font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-3">Requested On</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Bank &amp; Account</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Processed On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-500">
                        {w.createdAt ? new Date(w.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        ₹ {Number(w.amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{w.bankName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          A/C ••••{String(w.accountNumber).slice(-4)} | IFSC: {w.ifscCode}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            w.status === 'PROCESSED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : w.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right text-slate-500">
                        {w.processedAt ? new Date(w.processedAt).toLocaleDateString('en-IN') : 'Pending review'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 4: All Company Leads (for HR / Company Admin) */}
        {isHrOrAdmin && activeTab === 'company_leads' && (
          <div className="overflow-x-auto">
            {filteredCompanyLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-medium">
                No company leads recorded yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-slate-700 text-[11px] font-bold border-b border-slate-200/80">
                  <tr>
                    <th className="px-5 py-3">Business &amp; Owner</th>
                    <th className="px-4 py-3">Referrer Employee</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Current Status</th>
                    <th className="px-4 py-3 text-right">Update Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredCompanyLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{lead.businessName}</div>
                        <div className="text-[11px] text-slate-500">{lead.ownerName} ({lead.city})</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-800">{lead.referrerName}</div>
                        <div className="text-[11px] text-slate-500">{lead.referrerEmail}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-mono">+91 {lead.mobileNumber}</div>
                        <div className="text-[11px] text-slate-500">{lead.email}</div>
                      </td>
                      <td className="px-4 py-3.5">{getStatusBadge(lead.status)}</td>
                      <td className="px-4 py-3.5 text-right">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value)}
                          className="px-2.5 py-1 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="NEW_LEAD">New Lead</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="DEMO_SCHEDULED">Demo Scheduled</option>
                          <option value="CONVERTED">Won (Credit ₹3,000)</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Refer a Lead Modal */}
      <ReferLeadModal
        isOpen={isReferModalOpen}
        onClose={() => setIsReferModalOpen(false)}
        onSuccess={fetchData}
      />

      {/* Withdrawal Modal */}
      <WithdrawModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        availableBalance={stats.balance}
        onSuccess={fetchData}
      />
    </div>
  );
};

export default ReferEarnPage;

