export const runtime = 'nodejs';

export async function POST() {
  return Response.json({
    ok: true,
    message:
      'Server-side uploads are scaffolded but not implemented yet. The current MVP reads imported files locally in the browser.',
  });
}
