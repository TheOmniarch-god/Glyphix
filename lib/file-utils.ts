import JSZip from 'jszip';
import type { ImportedFile, ImportedFileType } from '@/lib/types';

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'yml',
  'yaml',
  'csv',
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'css',
  'scss',
  'html',
  'htm',
  'xml',
  'svg',
  'py',
  'java',
  'go',
  'rs',
  'php',
  'rb',
  'c',
  'cpp',
  'h',
  'hpp',
  'sh',
  'sql',
  'toml',
  'ini',
  'env',
  'lock'
]);

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getExtension(fileName: string) {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function inferFileType(fileName: string): ImportedFileType {
  const ext = getExtension(fileName);

  if (ext === 'zip') return 'archive';
  if (ext === 'epub') return 'epub';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'md' || ext === 'markdown') return 'markdown';
  if (ext === 'json') return 'json';
  if (TEXT_EXTENSIONS.has(ext)) return 'code';
  if (!ext) return 'text';
  return 'binary';
}

function basename(input: string) {
  return input.split('/').filter(Boolean).pop() || input;
}

function normalizePath(file: File) {
  const maybeRelative = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return maybeRelative && maybeRelative.length > 0 ? maybeRelative : file.name;
}

async function readFileContent(file: File, type: ImportedFileType) {
  if (type === 'binary') {
    return '[Binary file omitted from inline preview]';
  }

  try {
    return await file.text();
  } catch {
    return '[Unable to read file as text]';
  }
}

async function convertPlainFile(file: File): Promise<ImportedFile> {
  const type = inferFileType(file.name);

  return {
    id: createId('file'),
    name: basename(file.name),
    path: normalizePath(file),
    ext: getExtension(file.name),
    type,
    source: 'local',
    content: await readFileContent(file, type),
    size: file.size,
  };
}

async function expandArchive(file: File): Promise<ImportedFile[]> {
  const archiveType = inferFileType(file.name);
  const source = archiveType === 'epub' ? 'epub' : 'zip';
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .sort((a, b) => a.name.localeCompare(b.name));

  const expanded: ImportedFile[] = [];

  for (const entry of entries) {
    const innerName = basename(entry.name);
    const innerType = inferFileType(innerName);
    const isTextLike = innerType !== 'binary' && innerType !== 'archive' && innerType !== 'epub';
    const content = isTextLike
      ? await entry.async('string').catch(() => '[Unable to read archived file as text]')
      : '[Binary or unsupported archived file]';

    expanded.push({
      id: createId(source),
      name: innerName,
      path: `${file.name}/${entry.name}`,
      ext: getExtension(innerName),
      type: innerType,
      source,
      content,
      size: content.length,
    });
  }

  return expanded;
}

export async function importBrowserFiles(input: FileList | File[]) {
  const files = Array.from(input);
  const imported: ImportedFile[] = [];

  for (const file of files) {
    const type = inferFileType(file.name);

    if (type === 'archive' || type === 'epub') {
      imported.push(...(await expandArchive(file)));
    } else {
      imported.push(await convertPlainFile(file));
    }
  }

  return imported.sort((a, b) => a.path.localeCompare(b.path));
}

export function prettyBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncateContent(content: string, max = 5000) {
  return content.length > max ? `${content.slice(0, max)}\n\n[truncated]` : content;
}
