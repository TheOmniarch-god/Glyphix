'use client';

import JSZip from 'jszip';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChatPanel } from '@/components/chat-panel';
import { FilePanel } from '@/components/file-panel';
import { PreviewPanel } from '@/components/preview-panel';
import { Sidebar } from '@/components/sidebar';
import { getExtension, importBrowserFiles, inferFileType, truncateContent } from '@/lib/file-utils';
import type { ChatMessage, ImportedFile, ImportedFileContext, ModelMode } from '@/lib/types';

const WORKSPACE_STORAGE_KEY = 'glyphix-workspace-v1';

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function basename(path: string) {
  return path.split('/').filter(Boolean).pop() || path;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createStarterContent(path: string) {
  const ext = getExtension(path);

  if (ext === 'html') {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>New Glyphix Page</title>
    <style>
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        display: grid;
        place-items: center;
        min-height: 100vh;
        background: linear-gradient(180deg, #f0fdf4, #dcfce7);
        color: #052e16;
      }
      .card {
        width: min(680px, 92%);
        background: white;
        border: 1px solid #bbf7d0;
        border-radius: 28px;
        padding: 32px;
        box-shadow: 0 20px 50px rgba(20, 83, 45, 0.10);
      }
    </style>
  </head>
  <body>
    <section class="card">
      <h1>New Glyphix artifact</h1>
      <p>Edit this file in the workspace and watch the preview update live.</p>
    </section>
  </body>
</html>`;
  }

  if (ext === 'md') {
    return `# New workspace note

Start writing your project brief, tasks, or prompt notes here.
`;
  }

  if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
    return `export function starter() {
  return 'Glyphix is ready';
}
`;
  }

  if (ext === 'json') {
    return JSON.stringify(
      {
        app: 'glyphix',
        ready: true,
      },
      null,
      2
    );
  }

  return '';
}

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Glyphix Preview</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
        color: #052e16;
      }
      .hero {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 48px 20px;
      }
      .card {
        width: min(720px, 100%);
        background: rgba(255,255,255,0.92);
        border: 1px solid #bbf7d0;
        border-radius: 28px;
        padding: 36px;
        box-shadow: 0 20px 50px rgba(22, 101, 52, 0.12);
      }
      .pill {
        display: inline-block;
        border-radius: 999px;
        background: #166534;
        color: white;
        padding: 8px 14px;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h1 { font-size: clamp(2rem, 5vw, 4rem); margin: 18px 0 12px; }
      p { font-size: 1.05rem; line-height: 1.8; color: #14532d; }
      .grid {
        display: grid;
        gap: 14px;
        margin-top: 22px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .tile {
        border-radius: 20px;
        border: 1px solid #dcfce7;
        background: #f7fee7;
        padding: 16px;
      }
    </style>
  </head>
  <body>
    <main class="hero">
      <section class="card">
        <span class="pill">Glyphix</span>
        <h1>Build with Gemini + Grok</h1>
        <p>
          This sandbox preview shows how generated HTML can be rendered safely inside the app while source files remain visible in the code panel.
        </p>
        <div class="grid">
          <div class="tile"><strong>Chat-first UX</strong><br />Claude-style conversations for coding workflows.</div>
          <div class="tile"><strong>File context</strong><br />Import projects, ZIP archives, and EPUB content.</div>
          <div class="tile"><strong>Preview-ready</strong><br />Render HTML safely before exporting artifacts.</div>
        </div>
      </section>
    </main>
  </body>
</html>`;

const SAMPLE_FILES: ImportedFile[] = [
  {
    id: 'sample-html',
    name: 'index.html',
    path: 'samples/landing/index.html',
    ext: 'html',
    type: 'html',
    source: 'local',
    content: SAMPLE_HTML,
    size: SAMPLE_HTML.length,
  },
  {
    id: 'sample-readme',
    name: 'README.md',
    path: 'samples/README.md',
    ext: 'md',
    type: 'markdown',
    source: 'local',
    content: `# Glyphix starter\n\nThis starter workspace demonstrates:\n- three-panel Claude-style layout\n- Gemini and Grok mode switching\n- local import for files, folders, ZIP, and EPUB\n- preview support for HTML, markdown, and code files\n- browser persistence and ZIP export\n`,
    size: 265,
  },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-message',
    role: 'assistant',
    model: 'glyphix',
    createdAt: new Date().toISOString(),
    content:
      'Welcome to Glyphix. This version is built to run freely: import local files, edit artifacts, preview HTML, export ZIPs, and optionally connect Gemini, Grok, or Ollama later.',
  },
];

export function AppShell() {
  const [mode, setMode] = useState<ModelMode>('gemini');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [prompt, setPrompt] = useState(
    'Build a Claude-style coding app with a premium green theme, file explorer, artifact panel, and compare mode for Gemini vs Grok.'
  );
  const [files, setFiles] = useState<ImportedFile[]>(SAMPLE_FILES);
  const [selectedFileId, setSelectedFileId] = useState<string | null>('sample-html');
  const [pinnedFileIds, setPinnedFileIds] = useState<string[]>(['sample-readme']);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedWorkspace, setHasLoadedWorkspace] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (!raw) {
        setHasLoadedWorkspace(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<{
        mode: ModelMode;
        messages: ChatMessage[];
        prompt: string;
        files: ImportedFile[];
        selectedFileId: string | null;
        pinnedFileIds: string[];
      }>;

      if (parsed.mode) setMode(parsed.mode);
      if (Array.isArray(parsed.messages) && parsed.messages.length) setMessages(parsed.messages);
      if (typeof parsed.prompt === 'string') setPrompt(parsed.prompt);
      if (Array.isArray(parsed.files) && parsed.files.length) setFiles(parsed.files);
      if (typeof parsed.selectedFileId === 'string' || parsed.selectedFileId === null) {
        setSelectedFileId(parsed.selectedFileId);
      }
      if (Array.isArray(parsed.pinnedFileIds)) setPinnedFileIds(parsed.pinnedFileIds);
    } catch {
      // ignore malformed local workspace data
    } finally {
      setHasLoadedWorkspace(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedWorkspace) return;

    window.localStorage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        mode,
        messages,
        prompt,
        files,
        selectedFileId,
        pinnedFileIds,
      })
    );
  }, [files, hasLoadedWorkspace, messages, mode, pinnedFileIds, prompt, selectedFileId]);

  const selectedFile = useMemo(
    () => files.find((file) => file.id === selectedFileId) || null,
    [files, selectedFileId]
  );

  const pinnedFiles = useMemo(
    () => files.filter((file) => pinnedFileIds.includes(file.id)),
    [files, pinnedFileIds]
  );

  const contextFiles = useMemo(() => {
    const selected = selectedFile ? [selectedFile] : [];
    const merged = [...selected, ...pinnedFiles];
    const deduped = new Map<string, ImportedFile>();

    merged.forEach((file) => {
      deduped.set(file.path, file);
    });

    return Array.from(deduped.values()).slice(0, 6);
  }, [pinnedFiles, selectedFile]);

  async function handleImport(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const imported = await importBrowserFiles(fileList);

    setFiles((current) => {
      const next = new Map<string, ImportedFile>();
      [...current, ...imported].forEach((file) => next.set(file.path, file));
      return Array.from(next.values()).sort((a, b) => a.path.localeCompare(b.path));
    });

    if (imported[0]) {
      setSelectedFileId(imported[0].id);
    }
  }

  async function streamAssistantReply(userMessages: ChatMessage[]) {
    const assistantId = createId('assistant');
    const placeholder: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      model: mode,
      createdAt: new Date().toISOString(),
      content: '',
    };

    setMessages((current) => [...current, placeholder]);

    try {
      const payload = {
        mode,
        messages: userMessages.map(({ role, content }) => ({ role, content })).slice(-10),
        files: contextFiles.map<ImportedFileContext>((file) => ({
          path: file.path,
          type: file.type,
          content: truncateContent(file.content, 2500),
        })),
      };

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const reader = response.body?.getReader();

      if (!reader) {
        const finalText = await response.text();
        setMessages((current) =>
          current.map((message) => (message.id === assistantId ? { ...message, content: finalText } : message))
        );
        return;
      }

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages((current) =>
          current.map((message) => (message.id === assistantId ? { ...message, content: fullText } : message))
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to reach the model route.';
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId ? { ...message, content: `Error: ${errorMessage}`, model: 'system' } : message
        )
      );
      throw error;
    }
  }

  async function handleSend() {
    if (isLoading || !prompt.trim()) return;

    const userMessage: ChatMessage = {
      id: createId('user'),
      role: 'user',
      content: prompt.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt('');
    setIsLoading(true);

    try {
      await streamAssistantReply(nextMessages);
    } finally {
      setIsLoading(false);
    }
  }

  function handleResetChat() {
    setMessages(INITIAL_MESSAGES);
    setPrompt('');
    setIsLoading(false);
  }

  function handleResetWorkspace() {
    setMode('gemini');
    setMessages(INITIAL_MESSAGES);
    setPrompt('');
    setFiles(SAMPLE_FILES);
    setSelectedFileId('sample-html');
    setPinnedFileIds(['sample-readme']);
    setIsLoading(false);
  }

  function togglePin(fileId: string) {
    setPinnedFileIds((current) =>
      current.includes(fileId) ? current.filter((id) => id !== fileId) : [...current, fileId]
    );
  }

  function updateSelectedFileContent(content: string) {
    if (!selectedFileId) return;

    setFiles((current) =>
      current.map((file) => (file.id === selectedFileId ? { ...file, content, size: content.length } : file))
    );
  }

  function createNewFile() {
    const path = window.prompt('Enter a new file path', 'workspace/index.html')?.trim();
    if (!path) return;

    const existing = files.find((file) => file.path === path);
    if (existing) {
      setSelectedFileId(existing.id);
      return;
    }

    const content = createStarterContent(path);
    const file: ImportedFile = {
      id: createId('file'),
      name: basename(path),
      path,
      ext: getExtension(path),
      type: inferFileType(path),
      source: 'local',
      content,
      size: content.length,
    };

    setFiles((current) => [...current, file].sort((a, b) => a.path.localeCompare(b.path)));
    setSelectedFileId(file.id);
    setPinnedFileIds((current) => (current.includes(file.id) ? current : [file.id, ...current]));
  }

  function downloadSelectedFile() {
    if (!selectedFile) return;
    downloadBlob(new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' }), selectedFile.name);
  }

  async function exportWorkspaceZip() {
    const zip = new JSZip();

    files.forEach((file) => {
      zip.file(file.path, file.content);
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'glyphix-workspace.zip');
  }

  function exportWorkspaceJson() {
    downloadBlob(
      new Blob(
        [
          JSON.stringify(
            {
              mode,
              messages,
              prompt,
              files,
              selectedFileId,
              pinnedFileIds,
            },
            null,
            2
          ),
        ],
        {
          type: 'application/json;charset=utf-8',
        }
      ),
      'glyphix-workspace.json'
    );
  }

  const folderInputProps = { webkitdirectory: '', directory: '' } as Record<string, string>;

  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto mb-4 max-w-[1800px] rounded-[28px] border border-brand-100 bg-white/60 px-5 py-4 shadow-panel backdrop-blur">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Free-run local workspace
              </span>
              <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Gemini + Grok ready
              </span>
              <span className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                Optional Ollama fallback
              </span>
            </div>
            <h2 className="text-xl font-semibold text-brand-950 md:text-2xl">
              Claude-inspired AI coding app that already runs locally without paid setup
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-brand-800/90">
              Import folders, read ZIP/EPUB contents, edit files in-browser, preview HTML live, and export the whole workspace as a ZIP. Add provider keys later when you want live AI.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 xl:max-w-[520px] xl:justify-end">
            <button
              onClick={createNewFile}
              className="rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-900 transition hover:border-brand-400"
            >
              New file
            </button>
            <button
              onClick={exportWorkspaceZip}
              className="rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-900 transition hover:border-brand-400"
            >
              Export ZIP
            </button>
            <button
              onClick={exportWorkspaceJson}
              className="rounded-2xl border border-brand-200 bg-white px-4 py-3 text-sm font-semibold text-brand-900 transition hover:border-brand-400"
            >
              Download JSON
            </button>
            <button
              onClick={handleResetWorkspace}
              className="rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              Reset workspace
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1800px] gap-4 xl:grid-cols-[280px,minmax(0,1fr),420px]">
        <Sidebar
          mode={mode}
          onModeChange={setMode}
          onReset={handleResetChat}
          fileCount={files.length}
          pinnedCount={pinnedFileIds.length}
          messageCount={messages.length}
        />

        <ChatPanel
          mode={mode}
          messages={messages}
          prompt={prompt}
          isLoading={isLoading}
          onPromptChange={setPrompt}
          onSend={handleSend}
          onOpenFiles={() => fileInputRef.current?.click()}
          onOpenFolder={() => folderInputRef.current?.click()}
        />

        <div className="grid gap-4 xl:grid-rows-[minmax(320px,0.95fr),minmax(360px,1.05fr)]">
          <FilePanel
            files={files}
            selectedFileId={selectedFileId}
            pinnedFileIds={pinnedFileIds}
            onSelect={setSelectedFileId}
            onTogglePin={togglePin}
          />
          <PreviewPanel
            file={selectedFile}
            onContentChange={updateSelectedFileContent}
            onDownloadFile={downloadSelectedFile}
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleImport(event.target.files);
          event.currentTarget.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        {...folderInputProps}
        onChange={(event) => {
          void handleImport(event.target.files);
          event.currentTarget.value = '';
        }}
      />
    </main>
  );
}
