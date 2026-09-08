/**
 * Reporta um erro ao Painel VPS (vercel.100bytes.co.ao) via /api/ingest.
 * Não lança nem bloqueia — falha em silêncio se o painel não estiver configurado.
 */
export interface ErrorReport {
  source: string;
  level?: 'error' | 'warn' | 'fatal';
  message: string;
  stack?: string;
  url?: string;
  meta?: Record<string, unknown>;
}

export function reportError(payload: ErrorReport): void {
  const url = process.env.PANEL_INGEST_URL;
  const token = process.env.INGEST_TOKEN;
  if (!url || !token) return;
  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ingest-token': token },
      body: JSON.stringify({ level: 'error', ...payload }),
    }).catch(() => {});
  } catch {
    /* nunca propagar erros do reporter */
  }
}
