'use client';

import type { ChatMessage, ModelMode } from '@/lib/types';

interface ChatPanelProps {
  mode: ModelMode;
  messages: ChatMessage[];
  prompt: string;
  isLoading: boolean;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  onOpenFiles: () => void;
  onOpenFolder: () => void;
}

function modeLabel(mode: ModelMode) {
  if (mode === 'draft-review') return 'Draft + Review';
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function ChatPanel({
  mode,
  messages,
  prompt,
  isLoading,
  onPromptChange,
  onSend,
  onOpenFiles,
  onOpenFolder,
}: ChatPanelProps) {
  return (
    <section className="flex h-full min-h-[70vh] flex-col overflow-hidden rounded-[28px] border border-brand-100 bg-white/85 shadow-panel backdrop-blur">
      <header className="flex items-center justify-between gap-4 border-b border-brand-100 px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Workspace chat</p>
          <h2 className="mt-1 text-xl font-semibold text-brand-950">Coding conversation</h2>
        </div>
        <div className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800">
          {modeLabel(mode)} mode
        </div>
      </header>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {messages.map((message) => {
          const isAssistant = message.role === 'assistant';
          const badge = isAssistant ? message.model || 'assistant' : message.role;

          return (
            <article
              key={message.id}
              className={`max-w-[92%] rounded-3xl border px-4 py-3 ${
                isAssistant
                  ? 'border-brand-100 bg-brand-50/70 text-brand-950'
                  : 'ml-auto border-brand-200 bg-white text-brand-900'
              }`}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[11px] ${
                    isAssistant ? 'bg-brand-700 text-white' : 'bg-brand-100 text-brand-900'
                  }`}
                >
                  {isAssistant ? 'AI' : 'You'}
                </span>
                <span>{badge}</span>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-7">{message.content}</div>
            </article>
          );
        })}

        {isLoading ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-700">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-brand-600" />
            Thinking…
          </div>
        ) : null}
      </div>

      <div className="border-t border-brand-100 px-6 py-5">
        <div className="rounded-[24px] border border-brand-200 bg-brand-50/60 p-3">
          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask Glyphix to build, debug, refactor, or explain..."
            className="min-h-[120px] w-full resize-none border-0 bg-transparent p-2 text-sm text-brand-950 outline-none placeholder:text-brand-500"
          />

          <div className="mt-3 flex flex-col gap-3 border-t border-brand-100 pt-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onOpenFiles}
                className="rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-900 transition hover:border-brand-400"
              >
                Attach files
              </button>
              <button
                onClick={onOpenFolder}
                className="rounded-2xl border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-900 transition hover:border-brand-400"
              >
                Import folder
              </button>
              <span className="rounded-2xl bg-white px-3 py-2 text-sm text-brand-700">
                Enter to send · Shift+Enter for newline
              </span>
            </div>

            <button
              onClick={onSend}
              disabled={isLoading || !prompt.trim()}
              className="rounded-2xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send prompt
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
