import { providers } from '@/lib/providers';
import type { ChatRequestPayload, ModelRunResult } from '@/lib/types';

export async function runOrchestration(payload: ChatRequestPayload): Promise<ModelRunResult> {
  if (payload.mode === 'gemini') {
    return providers.gemini.generate({
      messages: payload.messages,
      files: payload.files,
    });
  }

  if (payload.mode === 'grok') {
    return providers.grok.generate({
      messages: payload.messages,
      files: payload.files,
    });
  }

  if (payload.mode === 'compare') {
    const [gemini, grok] = await Promise.all([
      providers.gemini.generate({ messages: payload.messages, files: payload.files }),
      providers.grok.generate({ messages: payload.messages, files: payload.files }),
    ]);

    return {
      provider: 'combined',
      model: 'gemini+grok:compare',
      text: [
        '# Compare Mode',
        '',
        `## Gemini — ${gemini.model}`,
        gemini.text,
        '',
        '---',
        '',
        `## Grok — ${grok.model}`,
        grok.text,
        '',
        '### Suggested next step',
        'Pick the stronger answer, or ask the app to synthesize both into a final implementation plan.',
      ].join('\n'),
    };
  }

  const draft = await providers.gemini.generate({
    messages: payload.messages,
    files: payload.files,
    instruction: 'Produce a strong first-draft coding answer with implementation steps and any relevant code.',
  });

  const final = await providers.grok.generate({
    messages: [
      ...payload.messages,
      {
        role: 'assistant',
        content: draft.text,
      },
      {
        role: 'user',
        content:
          'Review the draft above, correct weak spots, tighten reasoning, and return a final improved answer for the user.',
      },
    ],
    files: payload.files,
  });

  return {
    provider: 'combined',
    model: 'gemini->grok:draft-review',
    text: [
      '# Draft + Review Mode',
      '',
      `### Draft by Gemini (${draft.model})`,
      draft.text,
      '',
      '---',
      '',
      `### Final refined answer by Grok (${final.model})`,
      final.text,
    ].join('\n'),
  };
}
