/**
 * Reporta erros do Admin (Next.js) ao Painel VPS via /api/ingest.
 * onRequestError é chamado pelo Next em erros de servidor (RSC, route handlers, SSR).
 */
export async function onRequestError(
  err: unknown,
  request: { path?: string; method?: string }
) {
  const url = process.env.PANEL_INGEST_URL;
  const token = process.env.INGEST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ingest-token": token },
      body: JSON.stringify({
        source: "admin",
        level: "error",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        url: request?.path,
        meta: { method: request?.method },
      }),
    }).catch(() => {});
  } catch {
    /* nunca propagar */
  }
}
