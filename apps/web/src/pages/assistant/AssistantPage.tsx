import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/client';
import {
  IconCpu,
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
} from '@tabler/icons-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: string[];
  timestamp: string;
}

const STARTER_CARDS = [
  {
    icon: IconCalendar,
    title: 'Leave Balances & Quotas',
    prompt: 'How many leave days do I have available?',
    desc: 'Check your current leave quota balances',
  },
  {
    icon: IconHeartHandshake,
    title: 'Medical & Sick Leave',
    prompt: 'What is our medical and sick leave policy?',
    desc: 'Review company health coverage and sick leave rules',
  },
  {
    icon: IconReceipt2,
    title: 'Travel & Expense Claims',
    prompt: 'How do I claim reimbursement for business travel?',
    desc: 'Guidelines for expense filings and allowances',
  },
  {
    icon: IconClock,
    title: 'Work Hours & Attendance',
    prompt: 'What are the core working hours and attendance guidelines?',
    desc: 'Check-in rules, shifts, and regularization',
  },
];

const QUICK_PROMPTS = [
  'How many leave days do I have available?',
  'What is our medical and sick leave policy?',
  'How do I claim reimbursement for business travel?',
  'What are the core working hours and attendance guidelines?',
  'Explain the company code of conduct policy',
];

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I am your Uptrix AI HR Assistant. I have indexed your company's official policies, leave balances, and attendance rules. Ask me anything about HR policies, quotas, or benefits!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      const res = await api.post('/assistant/chat', { message: textToSend });
      const assistantMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.data?.reply || "I couldn't find specific documentation on that topic in your company policies.",
        citations: res.data?.citations || [],
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
            <IconCpu className="w-5 h-5 text-indigo-600 shrink-0" />
            <span>AI Assistant</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
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
            onClick={handleClearChat}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <IconRotateClockwise className="w-3.5 h-3.5 text-slate-500" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Chat Container Card */}
      <div className="flex-1 min-h-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
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

                  {/* Grounding Citations */}
                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-400 mb-2">
                        <IconShieldCheck className="w-3.5 h-3.5 text-[#5E4BE2]" />
                        <span>Grounded in Official Policies:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.citations.map((cite, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50/80 text-[#5E4BE2] border border-indigo-100 font-semibold text-xs"
                          >
                            <IconFileText className="w-3 h-3 text-[#5E4BE2]" />
                            {cite}
                          </span>
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
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
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
                  className={`text-[10px] text-slate-400 px-1 font-medium ${
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
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
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
                      <span className="text-[11px] font-bold text-slate-400 group-hover:text-[#5E4BE2] shrink-0">
                        Ask →
                      </span>
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
                <p className="text-[11px] text-slate-400">Grounding across company policies & quotas...</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips (when chatting) */}
        {messages.length > 1 && (
          <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
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
  );
};

export default AssistantPage;
