import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import TablePagination from '../../components/common/TablePagination';
import {
  IconPlus,
  IconX,
  IconSend,
  IconMessageCircle,
  IconHeadset,
  IconSearch,
} from '@tabler/icons-react';

interface TicketComment {
  id: number;
  userId: number;
  userName: string;
  userRole?: string;
  message: string;
  createdAt: string;
}

interface Ticket {
  id: number;
  code?: string;
  title?: string;
  subject?: string;
  description: string;
  department?: any;
  category?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  requester?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  assignee?: {
    firstName?: string;
    lastName?: string;
  } | null;
  comments?: TicketComment[];
}

export const TicketsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isManager = Boolean(user?.isManager || (user as any)?._count?.reports > 0);
  const isAdminOrHr = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR';

  const getInitialScope = () => {
    if (location.pathname.includes('/assigned')) return 'assigned';
    if (location.pathname.includes('/manage')) return 'company';
    return 'mine';
  };

  const [scope, setScope] = useState<string>(getInitialScope);

  useEffect(() => {
    if (location.pathname.includes('/assigned')) setScope('assigned');
    else if (location.pathname.includes('/manage')) setScope('company');
  }, [location.pathname]);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    department: 'HARDWARE',
    priority: 'MEDIUM',
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tickets', { params: { scope } });
      const fetchedTickets = res.data?.tickets || [];
      setTickets(fetchedTickets);

      // Auto-select first ticket if none selected or if selected ticket needs refresh
      if (fetchedTickets.length > 0) {
        setSelectedTicket((prev) => {
          if (prev) {
            const match = fetchedTickets.find((t: Ticket) => t.id === prev.id);
            return match || fetchedTickets[0];
          }
          return fetchedTickets[0];
        });
      } else {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [scope]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim()) return;
    setIsCreating(true);
    try {
      await api.post('/tickets', {
        ...createForm,
        subject: createForm.title,
        category: createForm.department,
      });
      setIsCreateModalOpen(false);
      setCreateForm({
        title: '',
        description: '',
        department: 'HARDWARE',
        priority: 'MEDIUM',
      });
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      await api.post(`/tickets/${selectedTicket.id}/comments`, {
        body: newComment.trim(),
        message: newComment.trim(),
      });
      setNewComment('');
      // Reload ticket detail
      const res = await api.get(`/tickets/${selectedTicket.id}`);
      setSelectedTicket(res.data?.ticket);
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/tickets/${selectedTicket.id}/status`, { status: newStatus });
      const res = await api.get(`/tickets/${selectedTicket.id}`);
      setSelectedTicket(res.data?.ticket);
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update ticket status');
    }
  };


  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'OPEN' && t.status !== 'OPEN') return false;
        if (statusFilter === 'IN_PROGRESS' && t.status !== 'IN_PROGRESS') return false;
        if (statusFilter === 'RESOLVED' && t.status !== 'RESOLVED' && t.status !== 'CLOSED') return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const title = (t.title || t.subject || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const code = (t.code || '').toLowerCase();
        const requester = (
          `${t.requester?.firstName || t.user?.firstName || ''} ${
            t.requester?.lastName || t.user?.lastName || ''
          }`
        ).toLowerCase();

        if (
          !title.includes(q) &&
          !desc.includes(q) &&
          !code.includes(q) &&
          !requester.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, statusFilter, search]);

  // Paginated tickets for current page
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
      case 'URGENT':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
            Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            High
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
            Low
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
            Medium
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            Resolved
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
            In Progress
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70 shadow-2xs">
            Open
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconHeadset className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Tickets
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {scope === 'assigned'
              ? 'View, reply to, and resolve support tickets submitted by your team members or assigned to you.'
              : scope === 'company'
              ? 'Manage organization-wide employee support requests, IT issues, and facility inquiries.'
              : 'Submit IT tickets, HR inquiries, facility requests, and track threaded discussions.'}
          </p>
        </div>

        {/* Right CTA Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer self-stretch sm:self-auto justify-center"
        >
          <IconPlus className="w-4 h-4" />
          <span>Create Ticket</span>
        </button>
      </div>

      {/* ===================== ROW 2: SEARCH & STATUS FILTER TOOLBAR ===================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Scope Tabs (My Tickets / Team Tickets / Company) */}
        {(isManager || isAdminOrHr) && (
          <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => {
                setScope('mine');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scope === 'mine'
                  ? 'bg-white text-[#5E4BE2] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              My Tickets
            </button>
            <button
              type="button"
              onClick={() => {
                setScope('assigned');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scope === 'assigned'
                  ? 'bg-white text-[#5E4BE2] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isManager ? 'Team Tickets' : 'Assigned to Me'}
            </button>
            {isAdminOrHr && (
              <button
                type="button"
                onClick={() => {
                  setScope('company');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scope === 'company'
                    ? 'bg-white text-[#5E4BE2] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Company
              </button>
            )}
          </div>
        )}

        {/* Search Input */}
        <div className="relative flex-1">
          <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tickets by subject, code, or requester..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-10 py-2.5 text-xs font-medium bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all placeholder:text-slate-400 text-slate-800"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <IconX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Toggle Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-50/80 border border-slate-200/70 p-1 rounded-xl">
            {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((mode) => {
              const label =
                mode === 'ALL'
                  ? 'All'
                  : mode === 'OPEN'
                  ? 'Open'
                  : mode === 'IN_PROGRESS'
                  ? 'In Progress'
                  : 'Resolved';
              const isActive = statusFilter === mode;
              return (
                <button
                  key={mode}
                  onClick={() => {
                    setStatusFilter(mode);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#5E4BE2] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Ticket Count Badge */}
          <span className="hidden sm:inline-flex px-3 py-2 rounded-xl bg-indigo-50/70 text-[#5E4BE2] text-xs font-bold border border-indigo-100/60 shrink-0">
            {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
          </span>
        </div>
      </div>

      {/* ===================== ROW 3: MASTER-DETAIL 2-COLUMN VIEW ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Ticket Feed */}
        <div className="lg:col-span-5 space-y-3 overflow-y-auto max-h-[calc(100vh-230px)] min-h-[500px] pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs animate-pulse space-y-2.5"
              >
                <div className="flex justify-between">
                  <div className="w-28 h-3.5 bg-slate-200 rounded-sm" />
                  <div className="w-16 h-3.5 bg-slate-200 rounded-full" />
                </div>
                <div className="w-48 h-4 bg-slate-200 rounded-sm" />
                <div className="w-full h-3 bg-slate-100 rounded-sm" />
              </div>
            ))
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <IconHeadset className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No support tickets found</p>
              <p className="text-xs text-slate-500 mt-1">
                {search || statusFilter !== 'ALL'
                  ? 'Try clearing your search query or status filter.'
                  : 'Submit a ticket using the "Create Support Ticket" button above.'}
              </p>
              {(search || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  className="mt-3 text-xs font-bold text-[#5E4BE2] hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            paginatedTickets.map((t) => {
              const ticketCode =
                t.code ||
                `#TIC-MUX${t.id.toString(36).toUpperCase()}${t.id * 17}-${Math.floor(
                  100 + (t.id * 73) % 900
                )}`;
              const deptName =
                typeof t.department === 'object'
                  ? (t.department as any)?.name
                  : t.department || t.category || 'HARDWARE';
              const requesterName =
                t.requester?.firstName || t.user?.firstName
                  ? `${t.requester?.firstName || t.user?.firstName || ''} ${
                      t.requester?.lastName || t.user?.lastName || ''
                    }`.trim()
                  : 'Sarah Connor';
              const commentsCount = t.comments?.length || 0;
              const isSelected = selectedTicket?.id === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`bg-white p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#5E4BE2] ring-2 ring-[#5E4BE2]/15 shadow-sm bg-indigo-50/20'
                      : 'border-slate-200/70 hover:border-indigo-200/80 hover:shadow-xs'
                  }`}
                >
                  {/* Top row: Code & Dept + Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[200px]">
                      {ticketCode} • {deptName.toUpperCase()}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getPriorityBadge(t.priority)}
                      {getStatusBadge(t.status)}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3
                    className={`font-bold text-xs sm:text-sm line-clamp-1 mt-1 transition-colors ${
                      isSelected ? 'text-[#5E4BE2]' : 'text-slate-900'
                    }`}
                  >
                    {t.title || t.subject || `Ticket #${t.id}`}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                    {t.description}
                  </p>

                  {/* Bottom Row: Requester & Messages Count */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="w-4 h-4 rounded-full bg-indigo-100 text-[#5E4BE2] font-bold text-[9px] flex items-center justify-center shrink-0">
                        {requesterName.charAt(0)}
                      </div>
                      <span className="truncate text-slate-600 font-medium">From: {requesterName}</span>
                    </div>
                    <span className="flex items-center gap-1 shrink-0 text-slate-400">
                      <IconMessageCircle className="w-3.5 h-3.5" />
                      <span>{commentsCount}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination Bar for Tickets Feed */}
          {filteredTickets.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredTickets.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 8, 15, 25]}
                itemName="tickets"
              />
            </div>
          )}
        </div>

        {/* Right Column: Ticket Conversation & Detail */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs flex flex-col h-[calc(100vh-230px)] min-h-[500px] overflow-hidden">
              {/* Header & Status Control */}
              <div className="p-5 border-b border-slate-100 shrink-0 bg-slate-50/30">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-[#5E4BE2] bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                      TICKET #{selectedTicket.id}
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {(
                        typeof selectedTicket.department === 'object'
                          ? (selectedTicket.department as any)?.name
                          : selectedTicket.department || selectedTicket.category || 'HARDWARE'
                      ).toUpperCase()}
                    </span>
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedTicket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] cursor-pointer uppercase"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Close preview"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {selectedTicket.title || selectedTicket.subject || `Ticket #${selectedTicket.id}`}
                </h2>

                {/* Primary Description Bubble */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-700 mt-3 leading-relaxed">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Threaded Discussion Messages */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
                {!selectedTicket.comments || selectedTicket.comments.length === 0 ? (
                  <div className="py-14 text-center text-xs text-slate-400">
                    <IconMessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No replies yet</p>
                    <p className="mt-0.5">Post an update below to start the thread discussion.</p>
                  </div>
                ) : (
                  selectedTicket.comments.map((c) => (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <span className="font-bold text-slate-700">
                          {c.userName || (c as any).authorName || 'Sarah Connor'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-400">
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3 text-xs sm:text-sm text-slate-700 max-w-xl inline-block shadow-2xs leading-relaxed">
                        {c.message || (c as any).body || ''}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Input Footer */}
              <form
                onSubmit={handleAddComment}
                className="p-3.5 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Type your reply to this ticket..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white shadow-sm shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                  title="Send reply"
                >
                  <IconSend className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-xs h-[calc(100vh-230px)] min-h-[500px] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mb-3 shadow-2xs">
                <IconHeadset className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">Select a ticket</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Choose a ticket from the left list to view conversation threads and status actions.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===================== CREATE TICKET MODAL ===================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center">
                  <IconHeadset className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Raise Support Ticket
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Subject / Issue Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Need Second Monitor for Development"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
                  >
                    <option value="HARDWARE">Hardware</option>
                    <option value="IT">IT Support</option>
                    <option value="HR">Human Resources</option>
                    <option value="FINANCE">Finance</option>
                    <option value="FACILITIES">Facilities</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your issue or request in detail..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all resize-none text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white shadow-sm shadow-indigo-600/25 disabled:opacity-50 cursor-pointer active:scale-98 transition-all"
                >
                  {isCreating ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketsPage;
