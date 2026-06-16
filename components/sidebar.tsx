'use client';

import type { ModelMode } from '@/lib/types';

const MODES: Array<{
  id: ModelMode;
  title: string;
  description: string;
}> = [
  {
    id: 'gemini',
    title: 'Gemini',
    description: 'Fast single-model drafting for code, plans, and summaries.',
  },
  {
    id: 'grok',
    title: 'Grok',
    description: 'Single-model mode with xAI as the active coding assistant.',
  },
  {
    id: 'compare',
    title: 'Compare',
    description: 'Run Gemini and Grok in parallel and inspect both answers.',
  },
  {
    id: 'draft-review',
    title: 'Draft + Review',
    description: 'Gemini drafts first, then Grok reviews and sharpens the answer.',
  },
];

interface SidebarProps {
  mode: ModelMode;
  onModeChange: (mode: ModelMode) => void;
  onReset: () => void;
  fileCount: number;
  pinnedCount: number;
  messageCount: number;
}

export function Sidebar({ mode, onModeChange, onReset, fileCount, pinnedCount, messageCount }: SidebarProps) {
  return (
    <aside className="flex h-full flex-col gap-4 rounded-[28px] border border-brand-100 bg-white/85 p-4 shadow-panel backdrop-blur">
      <div className="rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-5 text-white">
        <div className="mb-3 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]">
          Glyphix
        </div>
        <h1 className="text-2xl font-semibold leading-tight">Claude-style coding workspace, built in green.</h1>
        <p className="mt-3 text-sm text-emerald-50/90">
          Gemini and Grok can work solo, side-by-side, or in a draft-review loop.
        </p>
        <button
          onClick={onReset}
          className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-brand-900 transition hover:bg-brand-50"
        >
          + New chat
        </button>
      </div>

      <section className="rounded-3xl border border-brand-100 bg-brand-50/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Model modes</p>
        <div className="mt-3 space-y-2">
          {MODES.map((item) => {
            const active = item.id === mode;
            return (
              <button
                key={item.id}
                onClick={() => onModeChange(item.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  active
                    ? 'border-brand-500 bg-white text-brand-950 shadow-sm'
                    : 'border-brand-100 bg-white/70 text-brand-800 hover:border-brand-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.title}</span>
                  {active ? (
                    <span className="rounded-full bg-brand-600 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-brand-700/85">{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <div className="rounded-3xl border border-brand-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Messages</p>
          <p className="mt-2 text-2xl font-semibold text-brand-950">{messageCount}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Imported files</p>
          <p className="mt-2 text-2xl font-semibold text-brand-950">{fileCount}</p>
        </div>
        <div className="rounded-3xl border border-brand-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Pinned context</p>
          <p className="mt-2 text-2xl font-semibold text-brand-950">{pinnedCount}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-brand-200 bg-white/70 p-4 text-sm text-brand-800">
        <p className="font-semibold text-brand-950">MVP notes</p>
        <ul className="mt-3 space-y-2 pl-5 text-brand-800/90">
          <li className="list-disc">Runs immediately in free local mode, even without API keys.</li>
          <li className="list-disc">Reads imported files, folders, ZIP, and EPUB locally in the browser.</li>
          <li className="list-disc">Supports editable artifacts, ZIP export, and safe HTML preview.</li>
        </ul>
      </section>
    </aside>
  );
}
