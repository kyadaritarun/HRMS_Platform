import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  IconEye,
  IconExternalLink,
  IconCheck,
  IconChevronDown,
  IconFilter,
  IconBuildingSkyscraper,
  IconFileText,
} from '@tabler/icons-react';
import { getAvatarColor } from '../../utils/avatarColors';

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
    id?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  requester?: {
    id?: number;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  assignee?: {
    id?: number;
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
  const isItOrFinance = user?.role === 'IT' || user?.role === 'FINANCE';

  const getInitialScope = () => {
    if (location.pathname.includes('/assigned')) return 'assigned';
    if (location.pathname.includes('/manage')) return 'company';
    if (isItOrFinance) return 'assigned';
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

  // Dismiss right sidebar drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTicket(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    department: 'IT',
    priority: 'MEDIUM',
  });
  const [isCreating, setIsCreating] = useState(false);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/tickets', { params: { scope } });
      const fetchedTickets = res.data?.tickets || [];
      setTickets(fetchedTickets);

      // Keep active ticket in sync if one is currently open
      if (fetchedTickets.length > 0) {
        setSelectedTicket((prev) => {
          if (prev) {
            const match = fetchedTickets.find((t: Ticket) => t.id === prev.id);
            return match || null;
          }
          return null;
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

  const [employees, setEmployees] = useState<{ id: number; firstName: string; lastName: string; role: string; jobTitle?: string; email: string }[]>([]);

  useEffect(() => {
    if (isAdminOrHr || isItOrFinance || isManager) {
      api.get('/employees', { params: { pageSize: 100, status: 'ACTIVE' } })
        .then((res) => {
          setEmployees(res.data?.items || []);
        })
        .catch((e) => console.error('Failed to load employees for assignment:', e));
    }
  }, [isAdminOrHr, isItOrFinance, isManager]);

  const handleAssigneeChange = async (newAssigneeId: number | null) => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/tickets/${selectedTicket.id}`, { assigneeId: newAssigneeId });
      const res = await api.get(`/tickets/${selectedTicket.id}`);
      setSelectedTicket(res.data?.ticket);
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reassign ticket');
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

  // Live real-time sync: Auto-poll ticket updates while the drawer is open
  useEffect(() => {
    if (!selectedTicket?.id) return;
    const ticketId = selectedTicket.id;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/tickets/${ticketId}`);
        const fresh = res.data?.ticket;
        if (fresh) {
          setSelectedTicket((prev) => {
            if (!prev || prev.id !== ticketId) return prev;
            const commentsChanged = (prev.comments?.length || 0) !== (fresh.comments?.length || 0);
            const statusChanged = prev.status !== fresh.status;
            const assigneeChanged = prev.assignee?.id !== fresh.assignee?.id;
            if (commentsChanged || statusChanged || assigneeChanged) {
              return fresh;
            }
            return prev;
          });
        }
      } catch (err) {
        // Silent failure in background live polling
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [selectedTicket?.id]);


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
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconHeadset className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>Tickets</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
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
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <IconPlus className="w-4 h-4" />
          <span>Create Ticket</span>
        </button>
      </div>

      {/* ===================== ROW 2: SEARCH & STATUS FILTER TOOLBAR ===================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input on the Left */}
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

        {/* Right Controls: Scope Dropdown, Status Filter Dropdown & Ticket Count */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scope Dropdown */}
          {(isManager || isAdminOrHr || isItOrFinance) && (
            <div className="relative shrink-0">
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="appearance-none pl-8 pr-8 py-2.5 text-xs font-bold bg-white border border-slate-200/80 rounded-xl text-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all cursor-pointer"
              >
                <option value="mine">My Tickets</option>
                <option value="assigned">
                  {isItOrFinance
                    ? user?.role === 'IT'
                      ? 'IT Queue'
                      : 'Finance Queue'
                    : isManager
                    ? 'Team Tickets'
                    : 'Assigned to Me'}
                </option>
                {isAdminOrHr && <option value="company">All Company</option>}
              </select>
              <IconBuildingSkyscraper className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* Status Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none pl-8 pr-8 py-2.5 text-xs font-bold bg-white border border-slate-200/80 rounded-xl text-slate-700 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <IconFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <IconChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Ticket Count Badge */}
          <span className="hidden sm:inline-flex px-3 py-2.5 rounded-xl bg-indigo-50/70 text-[#5E4BE2] text-xs font-bold border border-indigo-100/60 shrink-0">
            {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
          </span>
        </div>
      </div>

      {/* ===================== TICKETS TABLE VIEW ===================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <IconHeadset className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No support tickets found</p>
            <p className="text-xs text-slate-500 mt-1">
              {search || statusFilter !== 'ALL'
                ? 'Try clearing your search query or status filter.'
                : 'Submit a ticket using the "Create Ticket" button above.'}
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
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 whitespace-nowrap">Ticket ID</th>
                    <th className="py-3.5 px-4 min-w-[260px]">Subject & Details</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Category</th>
                    <th className="py-3.5 px-4 min-w-[170px]">Raised By</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Priority</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Assigned To</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedTickets.map((t) => {
                    const ticketCode =
                      t.code ||
                      `#TCK-${new Date(t.createdAt).getFullYear()}-${String(t.id).padStart(3, '0')}`;
                    const deptName =
                      typeof t.department === 'object'
                        ? (t.department as any)?.name
                        : t.department || t.category || 'SUPPORT';
                    const requesterName =
                      t.requester?.firstName || t.user?.firstName
                        ? `${t.requester?.firstName || t.user?.firstName || ''} ${
                            t.requester?.lastName || t.user?.lastName || ''
                          }`.trim()
                        : 'Employee';
                    const requesterEmail = t.requester?.email || t.user?.email || '';
                    const isSelected = selectedTicket?.id === t.id;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicket(t)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-indigo-50/70 ring-1 ring-inset ring-[#5E4BE2]/25'
                            : 'hover:bg-indigo-50/40'
                        }`}
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-[11px] text-[#5E4BE2] bg-indigo-50/80 border border-indigo-100/80 px-2 py-1 rounded-lg">
                            {ticketCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 group-hover:text-[#5E4BE2] transition-colors line-clamp-1 text-xs sm:text-sm">
                            {t.title || t.subject || `Ticket #${t.id}`}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {t.description}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {deptName.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 text-[#5E4BE2] font-bold text-[10px] flex items-center justify-center shrink-0">
                              {requesterName.charAt(0)}
                            </div>
                            <div className="truncate max-w-[150px]">
                              <div className="font-bold text-slate-800 truncate">{requesterName}</div>
                              {requesterEmail && (
                                <div className="text-[10px] text-slate-400 truncate">{requesterEmail}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getPriorityBadge(t.priority)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {getStatusBadge(t.status)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {t.assignee ? (
                            <span className="font-bold text-slate-700">
                              {t.assignee.firstName} {t.assignee.lastName}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-medium">
                          {new Date(t.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(t);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#5E4BE2] text-white shadow-xs'
                                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-[#5E4BE2] hover:border-indigo-200 shadow-2xs'
                            }`}
                            title="Open ticket in right sidebar"
                          >
                            <IconEye className="w-3.5 h-3.5" />
                            <span>{isSelected ? 'Viewing' : 'Open'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Bar */}
            <div className="border-t border-slate-100">
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredTickets.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[5, 8, 15, 25, 50]}
                itemName="tickets"
              />
            </div>
          </>
        )}
      </div>

      {/* ===================== RIGHT SIDE BAR / SLIDE-OVER DRAWER FOR TICKET DETAILS ===================== */}
      {selectedTicket && typeof document !== 'undefined' ? (() => {
        const t = selectedTicket;
        const requesterName = t.requester
          ? `${t.requester.firstName || ''} ${t.requester.lastName || ''}`.trim()
          : t.user
          ? `${t.user.firstName || ''} ${t.user.lastName || ''}`.trim()
          : 'Employee';
        const requesterEmail = t.requester?.email || t.user?.email || '';
        const assigneeName = t.assignee
          ? `${t.assignee.firstName || ''} ${t.assignee.lastName || ''}`.trim()
          : '';
        const canManageTicket =
          isAdminOrHr ||
          (user?.role === 'IT' && ['IT', 'HARDWARE'].includes((t.category || '').toUpperCase())) ||
          (user?.role === 'FINANCE' && (t.category || '').toUpperCase() === 'FINANCE') ||
          t.assignee?.id === user?.id ||
          isManager;
        const deptLabel = (
          typeof t.department === 'object'
            ? (t.department as any)?.name
            : t.department || t.category || 'Support'
        ).toUpperCase();

        return createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
              onClick={() => setSelectedTicket(null)}
            />

            {/* Slide-over Right Sidebar Panel (Compact & balanced max-w-lg) */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
              <div
                className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header & Status Control */}
                <div className="p-5 border-b border-slate-100 shrink-0 bg-white">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span className="text-xs font-mono font-bold text-[#5E4BE2] bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-lg shrink-0">
                        #{t.id}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[140px]">
                        {deptLabel}
                      </span>
                      {getPriorityBadge(t.priority)}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status Dropdown / Action */}
                      {canManageTicket ? (
                        <div className="relative">
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            className={`appearance-none pl-6 pr-6 py-1 text-xs font-bold rounded-xl border cursor-pointer shadow-2xs transition-all ${
                              t.status === 'RESOLVED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                : t.status === 'CLOSED'
                                ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                          <span
                            className={`w-2 h-2 rounded-full absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                              t.status === 'RESOLVED'
                                ? 'bg-emerald-500'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-blue-500'
                                : t.status === 'CLOSED'
                                ? 'bg-slate-400'
                                : 'bg-amber-500'
                            }`}
                          />
                          <IconChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(t.status)}
                          {t.status === 'RESOLVED' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStatusChange('CLOSED')}
                                className="px-2 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                Close
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange('OPEN')}
                                className="px-2 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                Reopen
                              </button>
                            </>
                          )}
                          {t.status === 'CLOSED' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange('OPEN')}
                              className="px-2 py-1 text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      )}

                      {/* Close Drawer Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        title="Close panel"
                      >
                        <IconX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {t.title || t.subject || `Ticket #${t.id}`}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    Created on {new Date(t.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>

                  {/* Neatly Styled 2-Column Meta Cards */}
                  <div className="grid grid-cols-2 gap-2.5 mt-3 pt-3 border-t border-slate-100">
                    {/* Requester Card */}
                    <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/60 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Raised By
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg ${getAvatarColor(requesterName)} font-bold text-xs flex items-center justify-center shrink-0`}>
                          {requesterName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-800 truncate" title={requesterName}>
                            {requesterName}
                          </div>
                          {requesterEmail && (
                            <div className="text-[10px] text-slate-400 truncate" title={requesterEmail}>
                              {requesterEmail}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Assignee Card */}
                    <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/60 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Assigned To
                      </span>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg ${getAvatarColor(assigneeName || 'Unassigned')} font-bold text-xs flex items-center justify-center shrink-0`}>
                          {(assigneeName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          {canManageTicket ? (
                            <select
                              value={t.assignee?.id || ''}
                              onChange={(e) => handleAssigneeChange(e.target.value ? Number(e.target.value) : null)}
                              className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none cursor-pointer truncate shadow-2xs"
                              title="Reassign ticket"
                            >
                              <option value="">Unassigned</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.firstName} {emp.lastName}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-xs font-bold text-slate-800 truncate" title={assigneeName || 'Unassigned'}>
                              {assigneeName || 'Unassigned'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrollable Body: Description + Discussion */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                  {/* Description Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
                      <IconFileText className="w-3.5 h-3.5 text-[#5E4BE2]" />
                      <span>Ticket Details</span>
                    </div>
                    <p className="whitespace-pre-line text-slate-800 text-xs sm:text-sm font-normal leading-relaxed pl-5">
                      {t.description}
                    </p>
                  </div>

                  {/* Discussion Thread Header */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <IconMessageCircle className="w-4 h-4 text-[#5E4BE2]" />
                      <span>Discussion Thread</span>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200" title="Auto-sync active">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {t.comments?.length || 0} {t.comments?.length === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>

                  {/* Threaded Discussion Messages */}
                  <div className="space-y-3">
                    {!t.comments || t.comments.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                          <IconMessageCircle className="w-4 h-4" />
                        </div>
                        <p className="font-bold text-slate-700 text-xs">No replies yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Post an update below to start the thread discussion.</p>
                      </div>
                    ) : (
                      t.comments.map((c) => {
                        const author = c.userName || (c as any).authorName || 'Staff';
                        return (
                          <div key={c.id} className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                              <div className={`w-5 h-5 rounded-full ${getAvatarColor(author)} font-bold text-[10px] flex items-center justify-center shrink-0`}>
                                {author.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-bold text-slate-800">{author}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 text-[11px]">
                                {new Date(c.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="ml-6 bg-slate-50 border border-slate-200/70 rounded-2xl p-3 text-xs sm:text-sm text-slate-700 max-w-xl shadow-2xs leading-relaxed">
                              {c.message || (c as any).body || ''}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Reply Input Footer */}
                <form
                  onSubmit={handleAddComment}
                  className="p-3.5 px-4 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0 shadow-lg"
                >
                  <input
                    type="text"
                    placeholder="Write a reply to this ticket..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 px-4 py-2.5 text-xs bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="p-2.5 rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white shadow-xs transition-colors disabled:opacity-40 cursor-pointer shrink-0 flex items-center justify-center"
                    title="Send reply"
                  >
                    <IconSend className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body
        );
      })() : null}

      {/* ===================== CREATE TICKET RIGHT-SIDE DRAWER ===================== */}
      {isCreateModalOpen && typeof document !== 'undefined' ? (
        createPortal(
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in cursor-pointer"
              onClick={() => setIsCreateModalOpen(false)}
            />

            {/* Slide-over Right Sidebar Panel */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
              <div
                className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 pointer-events-auto animate-in slide-in-from-right duration-300 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0 shadow-2xs">
                      <IconHeadset className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        Raise Support Ticket
                      </h3>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        Submit a request or report an issue to support teams
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Close panel"
                  >
                    <IconX className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body - scrollable */}
                <form onSubmit={handleCreateTicket} className="flex flex-col flex-1 min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Subject / Title */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Subject / Issue Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Need Second Monitor for Development"
                        value={createForm.title}
                        onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-800 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Department Category & Priority Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Department / Category <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={createForm.department}
                          onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all text-slate-700 cursor-pointer"
                        >
                          <optgroup label="💻 IT & Infrastructure">
                            <option value="IT">💻 IT Support (Software, Accounts, Email)</option>
                            <option value="HARDWARE">🖥️ Hardware (Laptop, Monitor, Devices)</option>
                          </optgroup>
                          <optgroup label="💰 Finance & Payroll">
                            <option value="FINANCE_SALARY">💵 Salary & Payslip Discrepancy</option>
                            <option value="FINANCE_CLAIM">💳 Expense Claims & Reimbursements</option>
                            <option value="FINANCE_TAX">📑 Tax Declarations & Form 16</option>
                            <option value="FINANCE_BANK">🏦 Bank Details & Payout Update</option>
                            <option value="FINANCE_PF">🛡️ Provident Fund (PF) & Gratuity</option>
                          </optgroup>
                          <optgroup label="📋 HR & Facilities">
                            <option value="HR">📋 Human Resources (Leaves, Policies, Letters)</option>
                            <option value="FACILITIES">🏢 Facilities & Office Management</option>
                          </optgroup>
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

                    {/* Detailed Description */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Detailed Description <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={5}
                        placeholder="Describe your issue or request in detail..."
                        value={createForm.description}
                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#5E4BE2]/20 focus:border-[#5E4BE2] transition-all resize-none text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <IconSend className="w-4 h-4" />
                      <span>{isCreating ? 'Submitting...' : 'Submit Ticket'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
};

export default TicketsPage;
