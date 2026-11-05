import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconSend,
  IconSparkles,
  IconFileText,
  IconCheck,
  IconCopy,
  IconRotateClockwise,
  IconCalendar,
  IconReceipt2,
  IconClock,
  IconHeartHandshake,
  IconShieldCheck,
  IconHelpCircle,
  IconX,
  IconLoader2,
  IconBolt,
  IconPlus,
  IconTrash,
  IconMessageDots,
  IconLayoutSidebar,
  IconUserCheck,
} from '@tabler/icons-react';

export interface PendingApprovalItem {
  id: number;
  requesterName: string;
  jobTitle: string;
  type: string;
  leaveTypeName: string;
  startDate?: string | null;
  endDate?: string | null;
  days?: number;
  amount?: number | null;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface AttendanceTimelineData {
  status: 'NOT_CLOCKED_IN' | 'CLOCKED_IN' | 'CLOCKED_OUT';
  workMode: string;
  checkIn?: string | null;
  checkOut?: string | null;
  shiftTiming: string;
  duration?: string;
  canPunchOut: boolean;
  canPunchIn: boolean;
}

export interface LeaveQuotaBarItem {
  id: number;
  name: string;
  code: string;
  color?: string;
  balance: number;
  total: number;
  used: number;
  percent: number;
}

export interface AssistantWidget {
  type: 'PENDING_APPROVALS' | 'ATTENDANCE_TIMELINE' | 'LEAVE_QUOTA_BARS';
  title?: string;
  items?: any[];
  data?: any;
}

export interface AgentActionCard {
  type: 'CONFIRM_ACTION' | 'ACTION_EXECUTED' | 'ACTION_FAILED';
  tool: 'apply_leave' | 'punch_attendance' | 'create_ticket' | 'decide_request';
  status: 'PROPOSED' | 'EXECUTED' | 'CANCELLED';
  title: string;
  subtitle: string;
  summary: { label: string; value: string; highlight?: boolean }[];
  payload: Record<string, any>;
  meta?: {
    currentBalance?: number;
    days?: number;
    balanceAfter?: number;
    leaveTypeName?: string;
    [key: string]: any;
  };
  confirmLabel?: string;
  cancelLabel?: string;
  executionResult?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: string[];
  action?: AgentActionCard | null;
  widget?: AssistantWidget | null;
  timestamp: string;
}

const STARTER_CARDS = [
  {
    icon: IconCalendar,
    title: 'Apply Sick Leave (Action)',
    prompt: 'Apply sick leave for tomorrow due to fever',
    desc: 'Autonomous agent drafts and files your leave request',
    isAction: true,
  },
  {
    icon: IconClock,
    title: 'Punch In / Out (Action)',
    prompt: 'Punch me in as WFH today',
    desc: 'Instant attendance clock-in directly from chat',
    isAction: true,
  },
  {
    icon: IconHelpCircle,
    title: 'Raise Support Ticket (Action)',
    prompt: 'Raise an IT ticket for broken mouse',
    desc: 'Auto-routes a support ticket to IT or HR desk',
    isAction: true,
  },
  {
    icon: IconReceipt2,
    title: 'Leave & Quota Inquiries',
    prompt: 'How many leave days do I have available?',
    desc: 'Check live remaining balances across all categories',
  },
];

const QUICK_PROMPTS = [
  'Apply sick leave for tomorrow due to fever',
  'What approvals are pending?',
  'What is my attendance status today?',
  'How many leave days do I have available?',
  'Punch me in as WFH today',
  'When is the next official holiday?',
];

export interface SessionSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessageSnippet: string;
  createdAt: string;
  updatedAt: string;
}

const PendingApprovalsWidget: React.FC<{
  items: PendingApprovalItem[];
  onDecision: (id: number, status: 'APPROVED' | 'REJECTED') => Promise<void>;
  decidingId: number | null;
}> = ({ items, onDecision, decidingId }) => {
  if (!items || items.length === 0) {
    return (
      <div className="mt-3.5 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
        <IconCheck className="w-4 h-4 text-emerald-600" />
        <span>No pending approvals awaiting your decision. All requests are up to date!</span>
      </div>
    );
  }

  return (
    <div className="mt-3.5 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
        <span className="flex items-center gap-1.5 text-indigo-700">
          <IconUserCheck className="w-4 h-4 text-[#5E4BE2]" />
          <span>Pending Approvals ({items.filter((i) => i.status === 'PENDING').length} awaiting decision)</span>
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          const isPending = item.status === 'PENDING';
          const isDeciding = decidingId === item.id;

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-all ${
                item.status === 'APPROVED'
                  ? 'border-emerald-200 bg-emerald-50/40'
                  : item.status === 'REJECTED'
                  ? 'border-rose-200 bg-rose-50/40'
                  : 'border-slate-200/90 bg-white shadow-2xs hover:shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                    {item.requesterName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {item.requesterName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium truncate">
                        ({item.jobTitle})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Requested <span className="font-semibold text-slate-900">{item.days ? `${item.days} Day(s)` : ''} {item.leaveTypeName}</span>
                      {item.startDate && (
                        <span className="text-slate-500"> • {item.startDate}{item.endDate && item.endDate !== item.startDate ? ` to ${item.endDate}` : ''}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                {item.status === 'APPROVED' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <IconCheck className="w-3 h-3 stroke-[3]" /> Approved
                  </span>
                ) : item.status === 'REJECTED' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    <IconX className="w-3 h-3 stroke-[3]" /> Rejected
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    Pending
                  </span>
                )}
              </div>

              {/* Reason */}
              {item.reason && (
                <div className="mt-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600 italic">
                  "{item.reason}"
                </div>
              )}

              {/* Action Buttons for Manager */}
              {isPending && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isDeciding}
                    onClick={() => onDecision(item.id, 'REJECTED')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <IconX className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDeciding}
                    onClick={() => onDecision(item.id, 'APPROVED')}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    {isDeciding ? (
                      <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <IconCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    <span>Approve</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AttendanceTimelineWidget: React.FC<{
  data: AttendanceTimelineData;
  onPunchOut: () => Promise<void>;
  onPunchIn: (mode: 'WFO' | 'WFH') => Promise<void>;
  isPunching: boolean;
}> = ({ data, onPunchOut, onPunchIn, isPunching }) => {
  const isClockedIn = data.status === 'CLOCKED_IN';
  const isClockedOut = data.status === 'CLOCKED_OUT';
  const isNotStarted = data.status === 'NOT_CLOCKED_IN';

  return (
    <div className="mt-3.5 overflow-hidden rounded-xl border border-indigo-200/90 bg-white shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50/90 to-purple-50/70 p-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shadow-2xs">
            <IconClock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Today's Attendance Timeline</h4>
            <p className="text-[10px] text-slate-500 font-medium">Shift: {data.shiftTiming}</p>
          </div>
        </div>

        {isClockedIn ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Punched In ({data.workMode})
          </span>
        ) : isClockedOut ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <IconCheck className="w-3 h-3 stroke-[3]" /> Concluded
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
            Not Punched In
          </span>
        )}
      </div>

      {/* Clock Timeline Steps */}
      <div className="p-3.5 bg-slate-50/50">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-400">Punch In</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              {data.checkIn || '--:--'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-400">Working Time</div>
            <div className="text-xs font-bold text-indigo-700 mt-0.5">
              {data.duration || '0h 0m'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
            <div className="text-[10px] uppercase font-bold text-slate-400">Punch Out</div>
            <div className="text-xs font-bold text-slate-800 mt-0.5">
              {data.checkOut || (isClockedIn ? 'In Progress' : '--:--')}
            </div>
          </div>
        </div>
      </div>

      {/* Footer 1-Click Action Buttons */}
      <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-end gap-2">
        {isClockedIn && (
          <button
            type="button"
            disabled={isPunching}
            onClick={onPunchOut}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isPunching ? <IconLoader2 className="w-3.5 h-3.5 animate-spin" /> : <IconClock className="w-3.5 h-3.5" />}
            <span>Punch Out Now</span>
          </button>
        )}

        {isNotStarted && (
          <>
            <button
              type="button"
              disabled={isPunching}
              onClick={() => onPunchIn('WFO')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isPunching ? <IconLoader2 className="w-3.5 h-3.5 animate-spin" /> : <IconCheck className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>Punch In (WFO)</span>
            </button>
            <button
              type="button"
              disabled={isPunching}
              onClick={() => onPunchIn('WFH')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#5E4BE2] hover:bg-[#4d3bcb] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <span>Punch In (WFH)</span>
            </button>
          </>
        )}

        {isClockedOut && (
          <span className="text-xs font-medium text-slate-500 italic">
            Shift completed. See you tomorrow!
          </span>
        )}
      </div>
    </div>
  );
};

const LeaveQuotaBarsWidget: React.FC<{
  items: LeaveQuotaBarItem[];
  onQuickApply: (name: string) => void;
}> = ({ items, onQuickApply }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-3.5 space-y-2.5">
      <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
        <span className="flex items-center gap-1.5 text-indigo-700">
          <IconReceipt2 className="w-4 h-4 text-[#5E4BE2]" />
          <span>Leave Balances & Quota Overview</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl border border-slate-200/90 bg-white shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-2.5"
          >
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">{item.name}</span>
                <span className="font-bold text-[#5E4BE2]">
                  {item.balance} <span className="text-[10px] text-slate-400 font-semibold">/ {item.total} days</span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mt-2 w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${item.percent}%`,
                    backgroundColor: item.color || '#5E4BE2',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
              <span className="text-slate-400 font-medium">Used: {item.used} days</span>
              <button
                type="button"
                onClick={() => onQuickApply(item.name)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5E4BE2] hover:text-[#4938CA] hover:underline cursor-pointer"
              >
                <span>Apply {item.name.replace(/ leave/i, '')}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your Uptrix AI HR Assistant. I have indexed your company's official policies, leave balances, and attendance rules. Ask me anything about HR policies, quotas, or benefits!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [executingToolId, setExecutingToolId] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [isPunching, setIsPunching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try {
      const res = await api.get('/assistant/sessions');
      if (res?.data?.sessions) {
        setSessions(res.data.sessions);
      }
    } catch {
      // Safe fallback
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSelectSession = async (targetSessionId: string) => {
    try {
      const res = await api.get(`/assistant/sessions/${targetSessionId}`);
      if (res?.data?.session) {
        setSessionId(targetSessionId);
        setMessages(
          res.data.session.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            action: m.action || null,
            widget: m.widget || null,
            citations: m.citations || [],
            timestamp: m.timestamp || new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
      }
    } catch {
      // Safe fallback
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Hello! I am your Uptrix AI HR Assistant. I have indexed your company's official policies, leave balances, and attendance rules. Ask me anything about HR policies, quotas, or benefits!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleDeleteSession = async (targetSessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/assistant/sessions/${targetSessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== targetSessionId));
      if (sessionId === targetSessionId) {
        handleNewChat();
      }
    } catch {
      // Safe fallback
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const postData: any = { message: textToSend };
      if (sessionId) postData.sessionId = sessionId;

      const res = await api.post('/assistant/chat', postData);
      if (res?.data?.sessionId) {
        setSessionId(res.data.sessionId);
        loadSessions();
      }

      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res?.data?.reply || "I couldn't find specific documentation on that topic in your company policies.",
        citations: res?.data?.citations || [],
        action: res?.data?.action || null,
        widget: res?.data?.widget || null,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Assistant error:', err);
      const errMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: 'Sorry, I encountered an issue retrieving policy context. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecision = async (requestId: number, status: 'APPROVED' | 'REJECTED') => {
    setDecidingId(requestId);
    try {
      await api.patch(`/requests/${requestId}/decision`, {
        status,
        note: `Decided via AI Assistant`,
      });

      // Update in-place in messages
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.widget && msg.widget.type === 'PENDING_APPROVALS' && Array.isArray(msg.widget.items)) {
            return {
              ...msg,
              widget: {
                ...msg.widget,
                items: msg.widget.items.map((item: any) =>
                  item.id === requestId ? { ...item, status } : item
                ),
              },
            };
          }
          return msg;
        })
      );

      // Append confirmation bot message
      const confirmReply: ChatMessage = {
        id: String(Date.now()),
        sender: 'assistant',
        text: `✅ **Decision Recorded:** Request #${requestId} has been **${status.toLowerCase()}** successfully.`,
        citations: ['Workforce Approvals Desk'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, confirmReply]);
      loadSessions();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to record decision');
    } finally {
      setDecidingId(null);
    }
  };

  const handleWidgetPunchOut = async () => {
    setIsPunching(true);
    try {
      await api.post('/attendance/check-out', {
        latitude: 0,
        longitude: 0,
        note: 'Punched out via AI Assistant widget',
      });

      const outTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Update in-place in messages
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.widget && msg.widget.type === 'ATTENDANCE_TIMELINE') {
            return {
              ...msg,
              widget: {
                ...msg.widget,
                data: {
                  ...msg.widget.data,
                  status: 'CLOCKED_OUT',
                  checkOut: outTime,
                  canPunchOut: false,
                  canPunchIn: false,
                },
              },
            };
          }
          return msg;
        })
      );

      // Append confirmation bot message
      const confirmReply: ChatMessage = {
        id: String(Date.now()),
        sender: 'assistant',
        text: `🔴 **Punched Out:** Your punch-out at **${outTime}** has been registered. Shift concluded!`,
        citations: ['Daily Time & Attendance Log'],
        timestamp: outTime,
      };
      setMessages((prev) => [...prev, confirmReply]);
      loadSessions();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to punch out');
    } finally {
      setIsPunching(false);
    }
  };

  const handleWidgetPunchIn = async (workMode: 'WFO' | 'WFH') => {
    setIsPunching(true);
    try {
      await api.post('/attendance/check-in', {
        workMode,
        latitude: 0,
        longitude: 0,
        note: 'Punched in via AI Assistant widget',
      });

      const inTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Update in-place in messages
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.widget && msg.widget.type === 'ATTENDANCE_TIMELINE') {
            return {
              ...msg,
              widget: {
                ...msg.widget,
                data: {
                  ...msg.widget.data,
                  status: 'CLOCKED_IN',
                  workMode,
                  checkIn: inTime,
                  canPunchOut: true,
                  canPunchIn: false,
                },
              },
            };
          }
          return msg;
        })
      );

      // Append confirmation bot message
      const confirmReply: ChatMessage = {
        id: String(Date.now()),
        sender: 'assistant',
        text: `🟢 **Punched In (${workMode}):** You clocked in successfully at **${inTime}**. Have a productive day!`,
        citations: ['Daily Time & Attendance Log'],
        timestamp: inTime,
      };
      setMessages((prev) => [...prev, confirmReply]);
      loadSessions();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to punch in');
    } finally {
      setIsPunching(false);
    }
  };

  const handleQuickApply = (leaveTypeName: string) => {
    handleSend(`Apply ${leaveTypeName} for tomorrow due to personal work`);
  };

  const handleConfirmAction = async (msgId: string, action: AgentActionCard) => {
    setExecutingToolId(msgId);
    try {
      const postData: any = {
        tool: action.tool,
        payload: action.payload,
      };
      if (sessionId) postData.sessionId = sessionId;

      const res = await api.post('/assistant/execute-tool', postData);

      // Update message card state to EXECUTED
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === msgId && msg.action) {
            return {
              ...msg,
              action: {
                ...msg.action,
                status: 'EXECUTED',
                executionResult: res.data.message || 'Action executed successfully.',
              },
            };
          }
          return msg;
        })
      );

      // Append confirmation bot message
      const confirmReply: ChatMessage = {
        id: String(Date.now()),
        sender: 'assistant',
        text: `✅ **Action Confirmed:** ${res.data.message}`,
        citations: ['Autonomous Action Engine'],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, confirmReply]);
      loadSessions();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.message || 'Failed to execute autonomous action');
    } finally {
      setExecutingToolId(null);
    }
  };

  const handleDismissAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === msgId && msg.action) {
          return {
            ...msg,
            action: {
              ...msg.action,
              status: 'CANCELLED',
            },
          };
        }
        return msg;
      })
    );
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: "Hello! I am your Uptrix AI HR Assistant. I have indexed your company's official policies, leave balances, and attendance rules. Ask me anything about HR policies, quotas, or benefits!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const renderFormattedText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const content = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-slate-700 my-0.5">
            {content}
          </li>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="leading-relaxed">
          {content}
        </p>
      );
    });
  };

  useEffect(() => {
    // Lock outer page scroll on assistant page so user cannot scroll up/down
    const mainEl = document.querySelector('main');
    if (mainEl) {
      const originalOverflow = mainEl.style.overflow;
      mainEl.style.overflow = 'hidden';
      return () => {
        mainEl.style.overflow = originalOverflow;
      };
    }
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-6xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 shrink-0">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconSparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>AI Assistant</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Context-aware answers grounded directly in official signed policies & guidelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            RAG Engine Online
          </span>

          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <IconPlus className="w-3.5 h-3.5 text-slate-500 font-medium" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Chat Container Card (Split: Sidebar + Chat) */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex overflow-hidden">
        {/* Collapsible Session Threads Sidebar */}
        {isSidebarOpen && (
          <aside className="w-60 sm:w-64 border-r border-slate-200/80 bg-slate-50/70 flex flex-col shrink-0 overflow-hidden">
            {/* New Chat Button */}
            <div className="p-3 border-b border-slate-200/70">
              <button
                type="button"
                onClick={handleNewChat}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#5E4BE2] hover:bg-[#4d3bcb] text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <IconPlus className="w-4 h-4" />
                <span>New Conversation</span>
              </button>
            </div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Recent Chats
              </div>
              {sessions.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-slate-400 font-medium">
                  No previous conversations
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = sess.id === sessionId;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleSelectSession(sess.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                        isActive
                          ? 'bg-white text-[#5E4BE2] font-semibold border border-indigo-100 shadow-2xs'
                          : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <IconMessageDots className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#5E4BE2]' : 'text-slate-400'}`} />
                        <span className="truncate">{sess.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(sess.id, e)}
                        title="Delete chat"
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 p-1 rounded-md transition-opacity cursor-pointer"
                      >
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}

        {/* Right Chat Column */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white">
          {/* Top Bar with Sidebar Toggle */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between bg-white/90 shrink-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium p-1 px-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title={isSidebarOpen ? 'Hide History' : 'Show History'}
            >
              <IconLayoutSidebar className="w-4 h-4 text-slate-500" />
              <span className="text-[11px] font-semibold">{isSidebarOpen ? 'Hide History' : 'History'}</span>
            </button>
            <div className="text-xs text-slate-400 font-medium truncate max-w-xs">
              {sessionId ? sessions.find((s) => s.id === sessionId)?.title || 'Active Conversation' : 'New Chat Session'}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/40">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <IconSparkles className="w-4 h-4" />
                </div>
              )}

              <div className={`space-y-1.5 max-w-2xl ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] text-white rounded-tr-xs shadow-xs'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-xs relative group'
                  }`}
                >
                  {m.sender === 'assistant' ? renderFormattedText(m.text) : m.text}

                  {/* Autonomous Agent Interactive Action Card */}
                  {m.action && (
                    <div className="mt-3.5 overflow-hidden rounded-xl border border-indigo-200/90 bg-gradient-to-b from-indigo-50/50 via-white to-white shadow-2xs">
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50/90 to-purple-50/70 p-3 sm:p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shadow-2xs shrink-0">
                            {m.action.tool === 'apply_leave' ? (
                              <IconCalendar className="w-4 h-4" />
                            ) : m.action.tool === 'punch_attendance' ? (
                              <IconClock className="w-4 h-4" />
                            ) : (
                              <IconHelpCircle className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight">
                              {m.action.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {m.action.subtitle}
                            </p>
                          </div>
                        </div>

                        {m.action.status === 'EXECUTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                            <IconCheck className="w-3 h-3 stroke-[3]" /> Executed
                          </span>
                        ) : m.action.status === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <IconX className="w-3 h-3" /> Dismissed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 animate-pulse">
                            Action Prepared
                          </span>
                        )}
                      </div>

                      {/* Leave Application Card: Remaining Days Before & After Submission */}
                      {m.action.tool === 'apply_leave' && (
                        <div className="mx-3.5 mt-3 mb-1 p-3 rounded-xl bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 border border-indigo-100 flex items-center justify-between text-center">
                          <div className="flex-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Current Balance</div>
                            <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                              {m.action.meta?.currentBalance ?? (m.action.summary.find((s) => s.label === 'Quota Breakdown')?.value.split(' ')[0] || '-')} <span className="text-[10px] font-semibold text-slate-500">days</span>
                            </div>
                          </div>

                          <div className="px-2 text-rose-500 font-bold flex items-center gap-1 text-xs shrink-0">
                            <span>- {m.action.payload.days || 1} d</span>
                            <span>→</span>
                          </div>

                          <div className="flex-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">After Submission</div>
                            <div className="text-sm font-extrabold text-[#5E4BE2] mt-0.5">
                              {m.action.meta?.balanceAfter ?? (m.action.summary.find((s) => s.label === 'Quota Breakdown')?.value.split('→ ')[1]?.split(' ')[0] || '-')} <span className="text-[10px] font-semibold text-slate-500">days</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Summary Table */}
                      <div className="p-3.5 space-y-2 text-xs">
                        {m.action.summary.map((item, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-3">
                            <span className="text-[11px] font-medium text-slate-500 shrink-0">
                              {item.label}:
                            </span>
                            <span className={`text-right font-semibold ${item.highlight ? 'text-[#5E4BE2]' : 'text-slate-800'}`}>
                              {item.value}
                            </span>
                          </div>
                        ))}

                        {m.action.executionResult && (
                          <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-2">
                            <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{m.action.executionResult}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Footer Button */}
                      {m.action.status === 'PROPOSED' && (
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
                          <button
                            type="button"
                            onClick={() => handleDismissAction(m.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                          >
                            {m.action.cancelLabel || 'Dismiss'}
                          </button>
                          <button
                            type="button"
                            disabled={executingToolId === m.id}
                            onClick={() => handleConfirmAction(m.id, m.action!)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] shadow-2xs hover:shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                          >
                            {executingToolId === m.id ? (
                              <>
                                <IconLoader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Executing...</span>
                              </>
                            ) : (
                              <>
                                <IconCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>{m.action.confirmLabel || 'Confirm & Apply'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pillar 4: Generative UI Widgets */}
                  {m.widget?.type === 'PENDING_APPROVALS' && (
                    <PendingApprovalsWidget
                      items={m.widget.items || []}
                      onDecision={handleDecision}
                      decidingId={decidingId}
                    />
                  )}

                  {m.widget?.type === 'ATTENDANCE_TIMELINE' && m.widget.data && (
                    <AttendanceTimelineWidget
                      data={m.widget.data}
                      onPunchOut={handleWidgetPunchOut}
                      onPunchIn={handleWidgetPunchIn}
                      isPunching={isPunching}
                    />
                  )}

                  {m.widget?.type === 'LEAVE_QUOTA_BARS' && (
                    <LeaveQuotaBarsWidget
                      items={m.widget.items || []}
                      onQuickApply={handleQuickApply}
                    />
                  )}

                  {/* Grounding Citations */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-500 mb-2">
                        <IconShieldCheck className="w-3.5 h-3.5 text-[#5E4BE2]" />
                        <span>Grounded in Official Policies:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.citations.map((cite, idx) => (
                          <Link
                            key={idx}
                            to="/policies"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 text-[#5E4BE2] hover:text-[#4938CA] border border-indigo-100 font-semibold text-xs transition-colors cursor-pointer group"
                            title="View full policy document in company repository"
                          >
                            <IconFileText className="w-3 h-3 text-[#5E4BE2]" />
                            <span>{cite}</span>
                            <span className="text-[10px] text-indigo-400 group-hover:translate-x-0.5 transition-transform">→</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Copy Action Button */}
                  {m.sender === 'assistant' && m.id !== 'welcome' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100/70 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.text)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        {copiedId === m.id ? (
                          <>
                            <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <IconCopy className="w-3.5 h-3.5" />
                            <span>Copy answer</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div
                  className={`text-[10px] text-slate-500 px-1 font-medium ${
                    m.sender === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Quick Starter (shown when chat is new) */}
          {messages.length === 1 && (
            <div className="pt-1 pb-3 max-w-xl">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                Suggested Questions:
              </div>
              <div className="space-y-2">
                {STARTER_CARDS.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(card.prompt)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-indigo-50/60 hover:border-indigo-200 text-left transition-all shadow-2xs group cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-indigo-50 text-[#5E4BE2] group-hover:bg-[#5E4BE2] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-[#5E4BE2] transition-colors truncate">
                          {card.prompt}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(card as any).isAction && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-[#5E4BE2] border border-indigo-200/60 hidden xs:inline">
                            Action
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-slate-500 group-hover:text-[#5E4BE2]">
                          {(card as any).isAction ? 'Execute →' : 'Ask →'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Synthesizing / Loading State */}
          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-slate-600 font-medium bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs max-w-md animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center shrink-0">
                <IconSparkles className="w-4 h-4 animate-spin text-[#5E4BE2]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800">Synthesizing Answer</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#5E4BE2] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-[#5E4BE2] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-[#5E4BE2] rounded-full animate-bounce" />
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">Grounding across company policies & quotas...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips (when chatting) */}
        {messages.length > 1 && (
          <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
              Suggestions:
            </span>
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p)}
                disabled={isLoading}
                className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-indigo-50 hover:text-[#5E4BE2] hover:border-indigo-200 border border-slate-200 text-slate-600 whitespace-nowrap transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 sm:p-4 bg-white border-t border-slate-100 flex items-center gap-2.5 shrink-0"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ask about leaves, travel claims, attendance, or benefits..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-3 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] text-slate-800 placeholder-slate-400 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white font-bold text-xs shadow-xs disabled:opacity-40 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <IconSend className="w-4 h-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
        </div>
      </div>
    </div>
  );
};

export default AssistantPage;
