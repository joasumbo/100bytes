/**
 * Cliente HTTP centralizado para o NestJS Backend.
 * Todas as chamadas à API passam por aqui.
 *
 * No browser: usa credenciais (cookie admin_token enviado automaticamente).
 * No servidor (SSR/Server Actions): reencaminha cookies manualmente se necessário.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  // Em produção (Vercel) sem variável explícita: usa rewrites do next.config.ts.
  // Em desenvolvimento: aponta directamente para o NestJS local.
  (process.env.NODE_ENV === "production" ? "/api" : "http://localhost:3001/api");

/**
 * Substituto drop-in para `fetch` que:
 * - Prefixe o caminho com o URL do Backend NestJS
 * - Envia cookies automaticamente (`credentials: "include"`)
 *
 * Uso: substituir `fetch("/api/xyz", init)` por `fetchAPI("/xyz", init)`
 * O código existente (res.ok, res.json(), etc.) funciona sem alterações.
 */
export function fetchAPI(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, { credentials: "include", ...init });
}

type FetchOptions = RequestInit & {
  /** Corpo JSON — serializado automaticamente */
  json?: unknown;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, headers, ...rest } = options;

  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include", // envia o cookie admin_token
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(json !== undefined ? { body: JSON.stringify(json) } : {}),
    ...rest,
  });

  if (!res.ok) {
    let msg = `API error ${res.status}`;
    try {
      const data = await res.json();
      msg = data.message ?? data.error ?? msg;
    } catch {}
    throw new ApiError(msg, res.status);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Atalhos ────────────────────────────────────────────────────────────────
export const api = {
  get: <T = unknown>(path: string, init?: RequestInit) =>
    apiFetch<T>(path, { method: "GET", ...init }),

  post: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { method: "POST", json: body, ...init }),

  put: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { method: "PUT", json: body, ...init }),

  delete: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
    apiFetch<T>(path, { method: "DELETE", json: body, ...init }),

  /** Upload multipart/form-data (imagens, avatares, etc.) */
  upload: <T = unknown>(path: string, formData: FormData, init?: RequestInit) =>
    apiFetch<T>(path, { method: "POST", body: formData, ...init }),
};
