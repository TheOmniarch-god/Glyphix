import type { ImportedFileContext, ModelRunResult, ProviderInput } from '@/lib/types';

export interface LLMProvider {
  name: 'gemini' | 'grok';
  model: string;
  generate(input: ProviderInput): Promise<ModelRunResult>;
}

const SYSTEM_PROMPT = `You are Green Coder, a collaborative coding assistant for a Claude-style coding workspace.

Rules:
- Help with coding, architecture, debugging, refactors, and project planning.
- Use project file context when provided.
- If the file context is partial, state assumptions clearly.
- Prefer practical implementation details over generic advice.
- When useful, structure answers with small headings and code blocks.
- Keep responses focused, clear, and builder-friendly.`;

function buildFileContext(files: ImportedFileContext[]) {
  if (!files.length) return 'No project files were pinned for this request.';

  let total = 0;

  const sections = files.map((file) => {
    const budget = Math.max(0, 7000 - total);
    const snippet = file.content.slice(0, budget || 0);
    total += snippet.length;
    return `FILE: ${file.path}\nTYPE: ${file.type}\n---\n${snippet}`;
  });

  return sections.join('\n\n');
}

function buildConversation(messages: ProviderInput['messages']) {
  return messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join('\n\n');
}

function buildPrompt(input: ProviderInput) {
  return [
    SYSTEM_PROMPT,
    input.instruction ? `Additional instruction: ${input.instruction}` : '',
    'PROJECT CONTEXT:',
    buildFileContext(input.files),
    'CONVERSATION:',
    buildConversation(input.messages),
    'Return the best possible answer for a coding assistant workspace.',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function normalizeOpenAIStyleContent(content: unknown): string {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: unknown }).text ?? '');
        }
        return '';
      })
      .join('');
  }

  return '';
}

function latestUserRequest(messages: ProviderInput['messages']) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content || 'No user request found.';
}

function summarizeFiles(files: ImportedFileContext[]) {
  if (!files.length) return ['- No pinned files'];
  return files.slice(0, 6).map((file) => `- ${file.path} (${file.type})`);
}

function buildOfflineResponse(providerName: 'gemini' | 'grok', input: ProviderInput): string {
  const latestPrompt = latestUserRequest(input.messages);
  const providerTitle = providerName === 'gemini' ? 'Gemini-style' : 'Grok-style';
  const implementationFocus =
    providerName === 'gemini'
      ? [
          'Map the UI into reusable panels and shared state.',
          'Keep provider calls behind a single abstraction layer.',
          'Use safe preview boundaries for HTML and future app runtimes.',
        ]
      : [
          'Tighten the MVP around the most visible user workflow first.',
          'Prefer simple exports, editable artifacts, and local persistence.',
          'Reduce friction so the project runs even before API keys are added.',
        ];

  return [
    `# ${providerTitle} local demo mode`,
    '',
    'No live provider key was found, so Glyphix is running in zero-cost local mode.',
    'You can still import files, edit artifacts, preview HTML, export ZIPs, and test the full app shell immediately.',
    '',
    '## Your request',
    latestPrompt,
    '',
    '## Files currently in context',
    ...summarizeFiles(input.files),
    '',
    '## Recommended implementation focus',
    ...implementationFocus.map((step, index) => `${index + 1}. ${step}`),
    '',
    '## Practical next move',
    'Keep building the local-first workspace now, then attach Gemini, Grok, or a local Ollama model when you want live AI responses.',
  ].join('\n');
}

async function generateWithOllama(
  providerName: 'gemini' | 'grok',
  input: ProviderInput
): Promise<ModelRunResult | null> {
  const host = process.env.OLLAMA_HOST?.trim();

  if (!host) return null;

  const model = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
  const response = await fetch(`${host.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        {
          role: 'system',
          content:
            providerName === 'gemini'
              ? `${SYSTEM_PROMPT}\n\nAdopt a structured, implementation-focused tone.`
              : `${SYSTEM_PROMPT}\n\nAdopt a sharp, direct, coding-first tone.`,
        },
        {
          role: 'user',
          content: buildPrompt(input),
        },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  }).catch(() => null);

  if (!response || !response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    message?: {
      content?: string;
    };
  };

  const text = data.message?.content?.trim();
  if (!text) return null;

  return {
    provider: providerName,
    model: `ollama/${model}`,
    text,
  };
}

class GeminiProvider implements LLMProvider {
  name = 'gemini' as const;
  model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

  async generate(input: ProviderInput): Promise<ModelRunResult> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const ollamaResult = await generateWithOllama(this.name, input);
      if (ollamaResult) return ollamaResult;

      return {
        provider: this.name,
        model: 'local-demo',
        text: buildOfflineResponse(this.name, input),
      };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildPrompt(input) }],
            },
          ],
          generationConfig: {
            temperature: 0.25,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const text =
      data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') ||
      'Gemini returned no text.';

    return {
      provider: this.name,
      model: this.model,
      text,
    };
  }
}

class GrokProvider implements LLMProvider {
  name = 'grok' as const;
  model = process.env.XAI_MODEL || 'grok-4';

  async generate(input: ProviderInput): Promise<ModelRunResult> {
    const apiKey = process.env.XAI_API_KEY;

    if (!apiKey) {
      const ollamaResult = await generateWithOllama(this.name, input);
      if (ollamaResult) return ollamaResult;

      return {
        provider: this.name,
        model: 'local-demo',
        text: buildOfflineResponse(this.name, input),
      };
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.25,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: buildPrompt(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok request failed: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: unknown;
        };
      }>;
    };

    const text = normalizeOpenAIStyleContent(data.choices?.[0]?.message?.content) || 'Grok returned no text.';

    return {
      provider: this.name,
      model: this.model,
      text,
    };
  }
}

export const providers = {
  gemini: new GeminiProvider(),
  grok: new GrokProvider(),
};
