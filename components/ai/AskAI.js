'use client';
import { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useGame } from '@/lib/store';
import { buildAiContext } from '@/lib/ai/context';

/** Compact question box. The API key lives on the server; this component never sees it. */
export default function AskAI({ extra, placeholder = 'Ask about this place…' }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState(null); // { kind: 'answer' | 'notice' | 'error', text }

  async function submit(e) {
    e.preventDefault();
    const question = q.trim();
    if (!question || busy) return;
    setBusy(true);
    setReply(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: buildAiContext(useGame.getState(), extra) }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.configured === false) setReply({ kind: 'notice', text: data.message });
      else if (!res.ok) setReply({ kind: 'error', text: data.message || 'The assistant could not answer just now.' });
      else setReply({ kind: 'answer', text: data.answer });
    } catch (err) {
      setReply({ kind: 'notice', text: 'The assistant needs a network connection. Everything else in MarsWalk works offline.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <Sparkles size={13} className="shrink-0 text-ice-300" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          maxLength={500}
          placeholder={placeholder}
          aria-label="Ask the science assistant"
          className="min-w-0 flex-1 rounded border border-mars-200/20 bg-coal-950/60 px-2.5 py-1.5 text-xs text-mars-50 placeholder:text-mars-200/40 focus:border-ice-400 focus:outline-none"
        />
        <button type="submit" disabled={busy || !q.trim()} className="btn !px-2" aria-label="Send question">
          <Send size={12} />
        </button>
      </form>
      {busy && <div className="mt-2 text-[11px] text-mars-200/60">Thinking…</div>}
      {reply && (
        <div className={`thin-scroll mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded border p-2 text-[12px] leading-relaxed ${reply.kind === 'answer' ? 'border-ice-500/30 bg-coal-950/50 text-mars-50' : 'border-mars-200/20 text-mars-100/80'}`}>
          {reply.text}
          {reply.kind === 'answer' && <div className="mt-1.5 text-[10px] text-mars-200/50">AI-generated from the app&apos;s mission notes. Check the cited sources before relying on it.</div>}
        </div>
      )}
    </div>
  );
}
