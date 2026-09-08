/**
 * Reporta erros da loja ao Painel VPS (/api/ingest). Falha em silêncio.
 */
function reportError(payload) {
  const url = process.env.PANEL_INGEST_URL;
  const token = process.env.INGEST_TOKEN;
  if (!url || !token) return;
  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ingest-token": token },
      body: JSON.stringify({ source: "frontend", level: "error", ...payload }),
    }).catch(() => {});
  } catch {
    /* nunca propagar */
  }
}

module.exports = { reportError };
