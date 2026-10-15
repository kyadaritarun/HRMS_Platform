import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/client';
import {
  IconCpu,
  IconSend,
  IconSparkles,
  IconFileText,
  IconUser,
  IconCheck,
  IconHelpCircle,
} from '@tabler/icons-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  citations?: string[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  'How many leave days do I have available?',
  'What is our medical and sick leave policy?',
  'How do I claim reimbursement for business travel?',
  'What are the core working hours and attendance guidelines?',
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconCpu className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              AI Assistant
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Context-aware answers grounded directly in official signed policies & guidelines.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          RAG Engine Online
        </span>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[650px] overflow-hidden">
        {/* Messages Feed */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <IconSparkles className="w-4 h-4" />
                </div>
              )}

              <div className={`space-y-1 max-w-xl ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] text-white rounded-tr-xs shadow-sm shadow-indigo-600/20'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs shadow-2xs'
                  }`}
                >
                  {m.text}

                  {m.citations && m.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                      <span className="font-bold text-slate-400 block mb-1.5 text-[10px] uppercase tracking-wider">
                        Grounding Citations:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {m.citations.map((cite, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-[#5E4BE2] border border-indigo-100 font-semibold text-[11px]"
                          >
                            <IconFileText className="w-3 h-3 text-[#5E4BE2]" />
                            {cite}
                          </span>
                        ))}
                      </div>
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

          {isLoading && (
            <div className="flex gap-3 items-center text-xs text-slate-500 font-medium">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-[#5E4BE2] flex items-center justify-center">
                <IconSparkles className="w-4 h-4 animate-spin" />
              </div>
              <span>Searching company policies and synthesizing answer...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-2">
            Suggested:
          </span>
          {QUICK_PROMPTS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-indigo-50 hover:text-[#5E4BE2] hover:border-indigo-200 border border-slate-200/80 text-slate-600 whitespace-nowrap transition-all shrink-0 cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3.5 sm:p-4 bg-white border-t border-slate-100 flex items-center gap-2.5"
        >
          <input
            type="text"
            placeholder="Ask about leaves, travel reimbursements, company rules..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-[#5E4BE2] transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white font-bold text-xs shadow-sm shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <IconSend className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssistantPage;
