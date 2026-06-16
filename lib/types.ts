export type ModelMode = 'gemini' | 'grok' | 'compare' | 'draft-review';
export type ChatRole = 'user' | 'assistant' | 'system';
export type ImportedFileType =
  | 'code'
  | 'text'
  | 'markdown'
  | 'html'
  | 'json'
  | 'archive'
  | 'epub'
  | 'binary';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  model?: string;
  createdAt: string;
}

export interface ImportedFile {
  id: string;
  name: string;
  path: string;
  ext: string;
  type: ImportedFileType;
  source: 'local' | 'zip' | 'epub';
  content: string;
  size: number;
}

export interface ImportedFileContext {
  path: string;
  type: ImportedFileType;
  content: string;
}

export interface ChatRequestPayload {
  mode: ModelMode;
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>;
  files: ImportedFileContext[];
}

export interface ProviderInput {
  messages: Array<Pick<ChatMessage, 'role' | 'content'>>;
  files: ImportedFileContext[];
  instruction?: string;
}

export interface ModelRunResult {
  provider: 'gemini' | 'grok' | 'combined';
  model: string;
  text: string;
}
