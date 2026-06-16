import { runOrchestration } from '@/lib/orchestrator';
import type { ChatRequestPayload } from '@/lib/types';

export const runtime = 'nodejs';

function chunkText(input: string, size = 28) {
  const chunks: string[] = [];
  for (let index = 0; index < input.length; index += size) {
    chunks.push(input.slice(index, index + size));
  }
  return chunks;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ChatRequestPayload;

    const result = await runOrchestration(payload);
    const encoder = new TextEncoder();
    const chunks = chunkText(result.text);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
          await new Promise((resolve) => setTimeout(resolve, 12));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return new Response(`Glyphix error: ${message}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }
}
