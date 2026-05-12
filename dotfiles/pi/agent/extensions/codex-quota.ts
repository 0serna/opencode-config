import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendFileSync, writeFileSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

// fallow-ignore-file complexity

type OpenAIOAuthEntry = {
  type?: string;
  access?: string;
  refresh?: string;
  expires?: number;
  accountId?: string;
};

type CodexAuthFile = {
  openai?: OpenAIOAuthEntry;
  codex?: OpenAIOAuthEntry;
  chatgpt?: OpenAIOAuthEntry;
  opencode?: OpenAIOAuthEntry;
};

type CodexUsageWindow = {
  used_percent?: number;
  remaining_percent?: number;
};

type CodexUsageResponse = {
  rate_limit?: {
    primary_window?: CodexUsageWindow;
    secondary_window?: CodexUsageWindow;
  };
  rate_limits?: {
    primary_window?: CodexUsageWindow;
    secondary_window?: CodexUsageWindow;
  };
  credits?: {
    has_credits?: boolean;
    unlimited?: boolean;
    balance?: number | string;
  };
};

type CodexQuotaStatus = {
  remaining5h?: number;
  remaining7d?: number;
  remainingCredits?: number;
};

const CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const REQUEST_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const STATUS_KEY = "codex-quota";
const LOG_FILE = "/tmp/pi-codex-quota.log";
const CACHE_FILE = "/tmp/pi-codex-quota-cache.json";
const OPENAI_AUTH_SOURCE_KEYS = [
  "openai",
  "codex",
  "chatgpt",
  "opencode",
] as const;

function logEvent(eventName: string, details: Record<string, unknown>): void {
  const line = [
    new Date().toISOString(),
    eventName,
    JSON.stringify(details),
  ].join(" ");

  try {
    appendFileSync(LOG_FILE, `${line}\n`);
  } catch {
    return;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readCache(): Promise<CodexQuotaStatus | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    return JSON.parse(raw) as CodexQuotaStatus;
  } catch {
    return null;
  }
}

function writeCache(status: CodexQuotaStatus): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(status), "utf8");
  } catch {
    return;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// fallow-ignore-next-line complexity
async function findCodexAuthPath(): Promise<string | null> {
  const home = homedir();
  const candidates = [join(home, ".local/share/opencode/auth.json")];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

// fallow-ignore-next-line complexity
function toRemainingPercent(
  window: CodexUsageWindow | undefined,
): number | undefined {
  const remaining = window?.remaining_percent;
  if (typeof remaining === "number") {
    return clampPercent(remaining);
  }
  const used = window?.used_percent;
  if (typeof used === "number") {
    return clampPercent(100 - used);
  }
  return undefined;
}

// fallow-ignore-next-line complexity
function parseCredits(
  balance: number | string | undefined,
  unlimited: boolean | undefined,
): number | undefined {
  if (unlimited) {
    return undefined;
  }

  const value = typeof balance === "number" ? balance : Number(balance ?? "");
  if (!Number.isFinite(value)) {
    return undefined;
  }

  return Math.max(0, Math.floor(value));
}

type ExtensionContext = Parameters<Parameters<ExtensionAPI["on"]>[1]>[1];

function formatCodexQuotaSegment(
  label: string,
  value: number,
  threshold: number,
  ctx: ExtensionContext,
  suffix = "%",
): string {
  const segment = `${label} ${value}${suffix}`;
  return value < threshold
    ? ctx.ui.theme.fg("mdHeading", segment)
    : ctx.ui.theme.fg("dim", segment);
}

// fallow-ignore-next-line complexity
function formatCodexQuotaStatus(
  status: CodexQuotaStatus,
  ctx: ExtensionContext,
): string | null {
  const parts: string[] = [];
  if (status.remaining5h != null)
    parts.push(formatCodexQuotaSegment("5h", status.remaining5h, 25, ctx));
  if (status.remaining7d != null)
    parts.push(formatCodexQuotaSegment("7d", status.remaining7d, 25, ctx));
  if (status.remainingCredits != null)
    parts.push(
      formatCodexQuotaSegment("cr", status.remainingCredits, 100, ctx, ""),
    );
  return parts.length ? parts.join(ctx.ui.theme.fg("dim", " · ")) : null;
}

// fallow-ignore-next-line complexity
function getOpenAIAuthEntry(
  auth: CodexAuthFile,
): { sourceKey: string; entry: OpenAIOAuthEntry; accessToken: string } | null {
  for (const sourceKey of OPENAI_AUTH_SOURCE_KEYS) {
    const entry = auth[sourceKey];
    if (!entry || entry.type !== "oauth") {
      continue;
    }

    const accessToken =
      typeof entry.access === "string" ? entry.access.trim() : "";
    if (accessToken) {
      return { sourceKey, entry, accessToken };
    }
  }

  return null;
}

// fallow-ignore-next-line complexity size
async function fetchCodexQuotaStatus(): Promise<CodexQuotaStatus | null> {
  const authPath = await findCodexAuthPath();
  if (!authPath) {
    logEvent("auth_missing", {});
    return null;
  }

  const auth = JSON.parse(await readFile(authPath, "utf8")) as CodexAuthFile;
  const resolvedAuth = getOpenAIAuthEntry(auth);

  logEvent("auth_loaded", {
    authPath,
    keys: Object.keys(auth),
    sourceKey: resolvedAuth?.sourceKey,
  });

  if (!resolvedAuth) {
    logEvent("auth_unusable", { authPath });
    return null;
  }

  const response = await fetch(CODEX_USAGE_URL, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${resolvedAuth.accessToken}`,
      ...(resolvedAuth.entry.accountId
        ? { "ChatGPT-Account-Id": resolvedAuth.entry.accountId }
        : {}),
      Origin: "https://chatgpt.com",
      Referer: "https://chatgpt.com/",
      "User-Agent": "pi-codex-footer",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    logEvent("fetch_failed", { status: response.status, authPath });
    return null;
  }

  const usage = (await response.json()) as CodexUsageResponse;
  const rateLimit = usage.rate_limit ?? usage.rate_limits;

  const status = {
    remaining5h: toRemainingPercent(rateLimit?.primary_window),
    remaining7d: toRemainingPercent(rateLimit?.secondary_window),
    remainingCredits: parseCredits(
      usage.credits?.has_credits ? usage.credits.balance : undefined,
      usage.credits?.unlimited,
    ),
  };

  logEvent("fetch_succeeded", {
    sourceKey: resolvedAuth.sourceKey,
    has5h: status.remaining5h != null,
    has7d: status.remaining7d != null,
    hasCredits: status.remainingCredits != null,
  });

  return status;
}

// fallow-ignore-next-line size
export default function (pi: ExtensionAPI) {
  let lastStatus: CodexQuotaStatus | null = null;
  let lastCtx: ExtensionContext | null = null;
  let poller: ReturnType<typeof setInterval> | null = null;

  function getStatusText(ctx: ExtensionContext): string | undefined {
    if (!lastStatus) {
      return undefined;
    }

    return formatCodexQuotaStatus(lastStatus, ctx) ?? undefined;
  }

  function setStatusSafely(
    ctx: ExtensionContext,
    reason: string,
    statusText: string | undefined,
  ): void {
    try {
      ctx.ui.setStatus(STATUS_KEY, statusText);
    } catch (error) {
      logEvent("status_publish_error", {
        reason,
        message: getErrorMessage(error),
      });
    }
  }

  function publishStatus(ctx: ExtensionContext, reason: string): void {
    if (!lastStatus) {
      logEvent("status_skipped", { reason });
      return;
    }

    const statusText = getStatusText(ctx);
    logEvent("status_published", { reason, status: statusText });
    setStatusSafely(ctx, reason, statusText);
  }

  function publishLatest(reason: string): void {
    if (lastCtx) publishStatus(lastCtx, reason);
  }

  function applyStatus(status: CodexQuotaStatus | null): void {
    if (status) {
      lastStatus = status;
      writeCache(status);
      publishLatest("fetch_refreshed");
    }
    // On fetch failure: keep lastStatus as-is (don't clear it)
  }

  const refreshStatus = async (reason: string): Promise<void> => {
    try {
      const status = await fetchCodexQuotaStatus();
      logEvent("status_resolved", {
        reason,
        status,
      });
      applyStatus(status);
    } catch (error) {
      logEvent("status_error", {
        reason,
        message: getErrorMessage(error),
      });
      // Keep existing lastStatus on error
    }
  };

  function ensurePoller(): void {
    if (poller) {
      return;
    }

    poller = setInterval(() => {
      void refreshStatus("poll");
    }, POLL_INTERVAL_MS);
    poller.unref?.();
  }

  pi.on("session_start", (_event, ctx) => {
    lastCtx = ctx;

    logEvent("extension_loaded", {
      cwd: ctx.cwd,
      model: ctx.model?.id ?? null,
    });

    // Show cached data immediately while fetch is in flight
    void readCache().then((cached) => {
      if (cached) {
        lastStatus = cached;
        publishStatus(ctx, "session_start_cached");
      }
    });

    void refreshStatus("session_start");
    ensurePoller();
  });

  pi.on("turn_start", (_event, ctx) => {
    lastCtx = ctx;
    publishStatus(ctx, "turn_start");
  });

  pi.on("turn_end", (_event, ctx) => {
    lastCtx = ctx;
    publishStatus(ctx, "turn_end");
  });

  pi.on("session_shutdown", () => {
    if (poller) {
      clearInterval(poller);
      poller = null;
    }
    lastCtx = null;
  });
}
