/**
 * Cliente HTTP interno — usado pelo Express no servidor para chamar o NestJS.
 * Nunca exposto ao browser.
 */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";

async function apiFetch(endpoint, options = {}) {
  const url = `${BACKEND_URL}/api${endpoint}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[API] ${res.status} ${endpoint}: ${text}`);
  }

  return res.json();
}

module.exports = { apiFetch };
