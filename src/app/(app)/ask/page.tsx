'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, User, Bot, ShieldCheck } from 'lucide-react';
import { APP_NAME } from '@/config/app';
import { MarkdownContent } from '@/components/ui/MarkdownContent';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SAMPLE_QUESTIONS = [
  'What should I apply to this week?',
  'Which opportunity has the highest upside for me?',
  'What are my biggest profile gaps and how do I fix them?',
  'What should I do over the next 60 days to become stronger for AI fellowships?',
  'What am I currently underqualified for?',
];

export default function AskPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Hello! I am your AI Opportunity Agent inside ${APP_NAME}. I can help you choose a next step using your saved profile facts, active applications, cataloged opportunities, and requirement-level eligibility.\n\nAsk me anything about your opportunity pipeline, what to prioritize, or what profile gaps are holding you back.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [providerNotice, setProviderNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend(textToSend?: string) {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: query }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        setProviderNotice(data.warning || '');
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Apologies, I encountered an issue retrieving that context. Please try again.',
          },
        ]);
      }
    } catch (err) {
      console.error('Ask error:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Connection issue. Please check your network and try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-frame max-w-4xl mx-auto flex flex-col min-h-[calc(100vh-140px)]">
      {/* Top Header Card */}
      <section className="card p-6 border-2 border-[var(--line)] rounded-2xl shadow-[0_4px_0_#E3E7EA] bg-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#58CC02] shrink-0 shadow-[0_2px_0_#46A302]">
            <Bot size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-[var(--ink)]">Ask {APP_NAME} Agent</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-[#DDF4FF] text-[#0E74A6] border border-[#99DAFC]">
                Profile & Catalogue
              </span>
            </div>
            <p className="text-xs font-semibold text-[var(--muted)] mt-0.5">
              Grounded in verified profile facts and indexed program requirements.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)] bg-[var(--canvas)] border-2 border-[var(--line)] px-3 py-1.5 rounded-xl">
          <ShieldCheck size={16} className="text-[#58CC02]" />
          <span>Objective Guidance</span>
        </div>
      </section>

      {providerNotice && (
        <p className="alert alert-warning my-2" role="status">
          {providerNotice}
        </p>
      )}

      {/* Messages Feed */}
      <div className="flex-1 w-full space-y-4 py-6">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {m.role === 'assistant' && (
              <div className="w-9 h-9 rounded-xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#287300] shrink-0 mt-1 shadow-[0_2px_0_#58CC02]">
                <Sparkles size={16} strokeWidth={2.5} />
              </div>
            )}

            <div
              className={`rounded-2xl p-4 sm:p-5 max-w-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#58CC02] text-white border-2 border-[#58CC02] shadow-[0_3px_0_#46A302] font-bold whitespace-pre-line'
                  : 'card p-5 border-2 border-[var(--line)] text-[var(--ink)] bg-white shadow-[0_3px_0_#E3E7EA] font-semibold'
              }`}
            >
              {m.role === 'assistant' ? (
                <MarkdownContent content={m.content} />
              ) : (
                m.content
              )}
            </div>

            {m.role === 'user' && (
              <div className="w-9 h-9 rounded-xl bg-white border-2 border-[var(--line)] flex items-center justify-center text-[var(--muted)] shrink-0 mt-1 shadow-[0_2px_0_#E3E7EA]">
                <User size={16} strokeWidth={2.5} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEFFD9] border-2 border-[#58CC02] flex items-center justify-center text-[#287300] shrink-0 mt-1 shadow-[0_2px_0_#58CC02]">
              <Sparkles size={16} className="animate-spin" />
            </div>
            <div className="rounded-2xl p-4 card border-2 border-[var(--line)] bg-white shadow-[0_3px_0_#E3E7EA] text-[var(--muted)] text-xs font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#58CC02] animate-pulse" />
              <span>Reviewing your profile facts and catalogue data…</span>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Sticky Bottom Input & Suggestion Chips */}
      <div className="sticky bottom-0 bg-[var(--canvas)] pt-3 pb-2 border-t-2 border-[var(--line)]">
        <div className="space-y-3">
          {/* Quick Suggestions Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-black text-[var(--muted)] uppercase tracking-wider mr-1">
              Suggestions:
            </span>
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="px-3 py-1 rounded-full bg-white border-2 border-[var(--line)] shadow-[0_2px_0_#E3E7EA] hover:border-[#1CB0F6] hover:bg-[#DDF4FF] text-[var(--ink)] hover:text-[#0E74A6] text-xs font-bold transition-all cursor-pointer active:translate-y-[1px]"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your eligibility, deadlines, or profile gaps…"
              className="input flex-1 py-3 text-sm font-bold"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary px-6 flex items-center justify-center gap-2"
            >
              <Send size={16} />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>

          <p className="text-[11px] text-center font-semibold text-[var(--subtle)]">
            Guidance does not guarantee opportunity admission or replace official application deadlines.
          </p>
        </div>
      </div>
    </div>
  );
}
