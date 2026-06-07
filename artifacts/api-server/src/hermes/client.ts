/**
 * Hermes Bridge Client — Hermes Starter Kit
 *
 * Connects to the Hermes Bridge running on your VPS.
 * Configuration via environment variables:
 *   HERMES_BRIDGE_URL   — e.g. https://hermes.yourdomain.com
 *   HERMES_BRIDGE_TOKEN — secret bearer token (keep in Replit Secrets)
 *
 * Security:
 *   - Token is never logged, returned to callers, or included in errors.
 *   - Only calls two fixed endpoints: GET /health and POST /message.
 *   - No arbitrary path or shell execution.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

export interface HermesConfig {
  url: string;
  token: string;
}

export interface HermesResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

export interface HermesHealth {
  status?: string;
  [key: string]: unknown;
}

export interface HermesMessageInput {
  message: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

export interface HermesMessageReply {
  reply?: string;
  [key: string]: unknown;
}

export function getHermesConfig(): HermesConfig | null {
  const rawUrl = process.env.HERMES_BRIDGE_URL?.trim();
  const token = process.env.HERMES_BRIDGE_TOKEN?.trim();
  if (!rawUrl || !token) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    console.warn("[hermes] HERMES_BRIDGE_URL is not a valid URL; bridge disabled.");
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    console.warn(`[hermes] Unsupported protocol "${parsed.protocol}"; bridge disabled.`);
    return null;
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    console.warn("[hermes] HERMES_BRIDGE_URL must use https in production; bridge disabled.");
    return null;
  }

  return { url: rawUrl.replace(/\/+$/, ""), token };
}

export function isHermesConfigured(): boolean {
  return getHermesConfig() !== null;
}

async function hermesFetch<T>(
  path: `/${string}`,
  init: RequestInit,
  timeoutMs: number,
): Promise<HermesResult<T>> {
  const config = getHermesConfig();
  if (!config) {
    return {
      ok: false,
      status: 0,
      error: "Hermes bridge not configured. Set HERMES_BRIDGE_URL and HERMES_BRIDGE_TOKEN.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${config.url}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });

    const raw = await res.text();
    let data: unknown = undefined;
    if (raw) {
      try { data = JSON.parse(raw); } catch { data = raw; }
    }

    if (!res.ok) {
      const message =
        (data && typeof data === "object" && "error" in (data as any) && (data as any).error) ||
        (data && typeof data === "object" && "message" in (data as any) && (data as any).message) ||
        (typeof data === "string" && data) ||
        `Hermes bridge returned HTTP ${res.status}`;
      return { ok: false, status: res.status, error: String(message).slice(0, 300) };
    }

    return { ok: true, status: res.status, data: data as T };
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (e?.name === "AbortError") {
      return { ok: false, status: 0, error: `Hermes bridge timed out after ${timeoutMs}ms` };
    }
    return { ok: false, status: 0, error: e?.message || "Hermes bridge request failed" };
  } finally {
    clearTimeout(timer);
  }
}

export function checkHealth(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<HermesResult<HermesHealth>> {
  return hermesFetch<HermesHealth>("/health", { method: "GET" }, timeoutMs);
}

export function sendMessage(
  input: HermesMessageInput,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<HermesResult<HermesMessageReply>> {
  return hermesFetch<HermesMessageReply>(
    "/message",
    { method: "POST", body: JSON.stringify(input) },
    timeoutMs,
  );
}
