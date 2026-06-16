'use client';

import type { ImportedFile } from '@/lib/types';

interface PreviewPanelProps {
  file: ImportedFile | null;
  onContentChange: (value: string) => void;
  onDownloadFile: () => void;
}

function prettyJson(content: string) {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

export function PreviewPanel({ file, onContentChange, onDownloadFile }: PreviewPanelProps) {
  if (!file) {
    return (
      <section className="flex h-full min-h-[340px] items-center justify-center rounded-[28px] border border-brand-100 bg-white/85 p-6 text-center text-sm text-brand-700 shadow-panel backdrop-blur">
        Select a file to inspect its source, edit its contents, read extracted EPUB/ZIP entries, or preview generated HTML safely.
      </section>
    );
  }

  const isHtml = file.type === 'html';
  const isMarkdown = file.type === 'markdown';
  const jsonPreview = file.type === 'json' ? prettyJson(file.content) : file.content;

  return (
    <section className="flex h-full min-h-[340px] flex-col overflow-hidden rounded-[28px] border border-brand-100 bg-white/85 shadow-panel backdrop-blur">
      <header className="border-b border-brand-100 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Artifact editor</p>
            <h3 className="mt-1 text-lg font-semibold text-brand-950">{file.name}</h3>
            <p className="mt-1 text-xs text-brand-700/80">{file.path}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
              {file.source}
            </span>
            <button
              onClick={onDownloadFile}
              className="rounded-2xl border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-900 transition hover:border-brand-400"
            >
              Download file
            </button>
          </div>
        </div>
      </header>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
        {isHtml ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border border-brand-100 bg-brand-50/50">
              <div className="border-b border-brand-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
                Live HTML preview
              </div>
              <iframe
                title="html-preview"
                sandbox="allow-scripts"
                srcDoc={file.content}
                className="h-[260px] w-full border-0 bg-white"
              />
            </div>

            <div className="overflow-hidden rounded-3xl border border-brand-100 bg-brand-950 text-brand-50">
              <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
                Editable source
              </div>
              <textarea
                value={file.content}
                onChange={(event) => onContentChange(event.target.value)}
                className="scrollbar-thin min-h-[260px] w-full resize-y border-0 bg-transparent p-4 font-mono text-sm leading-6 text-brand-50 outline-none"
                spellCheck={false}
              />
            </div>
          </div>
        ) : isMarkdown ? (
          <div className="space-y-4">
            <div className="rounded-3xl border border-brand-100 bg-brand-50/50 p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">Rendered preview</div>
              <div className="whitespace-pre-wrap text-sm leading-7 text-brand-950">{file.content}</div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-brand-100 bg-brand-950 text-brand-50">
              <div className="border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
                Editable markdown
              </div>
              <textarea
                value={file.content}
                onChange={(event) => onContentChange(event.target.value)}
                className="scrollbar-thin min-h-[260px] w-full resize-y border-0 bg-transparent p-4 font-mono text-sm leading-6 text-brand-50 outline-none"
                spellCheck={false}
              />
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-brand-100 bg-brand-950 text-brand-50">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
              <span>Editable source</span>
              <span className="text-[10px] tracking-[0.18em] text-brand-300">Auto-saved in browser</span>
            </div>
            <textarea
              value={file.type === 'json' ? jsonPreview : file.content}
              onChange={(event) => onContentChange(event.target.value)}
              className="scrollbar-thin min-h-[380px] w-full resize-y border-0 bg-transparent p-4 font-mono text-sm leading-6 text-brand-50 outline-none"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </section>
  );
}
