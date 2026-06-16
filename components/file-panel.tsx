'use client';

import { useMemo, useState } from 'react';
import { prettyBytes } from '@/lib/file-utils';
import type { ImportedFile } from '@/lib/types';

interface FilePanelProps {
  files: ImportedFile[];
  selectedFileId: string | null;
  pinnedFileIds: string[];
  onSelect: (fileId: string) => void;
  onTogglePin: (fileId: string) => void;
}

function typeBadge(file: ImportedFile) {
  if (file.source === 'epub') return 'EPUB';
  if (file.source === 'zip') return 'ZIP';
  return file.type.toUpperCase();
}

export function FilePanel({ files, selectedFileId, pinnedFileIds, onSelect, onTogglePin }: FilePanelProps) {
  const [query, setQuery] = useState('');

  const filteredFiles = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return files;
    return files.filter((file) => file.path.toLowerCase().includes(normalized));
  }, [files, query]);

  return (
    <section className="flex h-full min-h-[340px] flex-col overflow-hidden rounded-[28px] border border-brand-100 bg-white/85 shadow-panel backdrop-blur">
      <header className="border-b border-brand-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Project files</p>
            <h3 className="mt-1 text-lg font-semibold text-brand-950">Explorer</h3>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800">{files.length} files</span>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search files or archive paths"
          className="mt-3 w-full rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-3 text-sm outline-none placeholder:text-brand-500 focus:border-brand-400"
        />
      </header>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        {filteredFiles.length ? (
          <div className="space-y-2">
            {filteredFiles.map((file) => {
              const selected = file.id === selectedFileId;
              const pinned = pinnedFileIds.includes(file.id);

              return (
                <div
                  key={file.id}
                  className={`rounded-2xl border p-3 transition ${
                    selected ? 'border-brand-500 bg-brand-50' : 'border-brand-100 bg-white hover:border-brand-300'
                  }`}
                >
                  <button className="w-full text-left" onClick={() => onSelect(file.id)}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-medium text-brand-950">{file.name}</p>
                      <span className="rounded-full bg-brand-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-700">
                        {typeBadge(file)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-brand-700/85">{file.path}</p>
                    <p className="mt-2 text-xs text-brand-600">{prettyBytes(file.size)}</p>
                  </button>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => onTogglePin(file.id)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        pinned
                          ? 'bg-brand-700 text-white hover:bg-brand-800'
                          : 'border border-brand-200 bg-white text-brand-900 hover:border-brand-400'
                      }`}
                    >
                      {pinned ? 'Pinned' : 'Pin to context'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/40 p-5 text-sm text-brand-700">
            No matching files yet. Import a folder, ZIP, EPUB, or source files to build context.
          </div>
        )}
      </div>
    </section>
  );
}
