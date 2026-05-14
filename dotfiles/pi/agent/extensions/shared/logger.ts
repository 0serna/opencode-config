import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_DIR = join(homedir(), ".local/state/pi");
const MAX_LOG_LINES = 2000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLine(
  timestamp: string,
  source: string,
  event: string,
  data?: Record<string, unknown>,
): string {
  let line = `${timestamp} ${source} ${event}`;
  if (data !== undefined) {
    try {
      line += ` ${JSON.stringify(data)}`;
    } catch {
      // data omitted on serialization failure
    }
  }
  return `${line}\n`;
}

function truncateLines(filePath: string): void {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  if (lines.length > MAX_LOG_LINES) {
    writeFileSync(filePath, lines.slice(-MAX_LOG_LINES).join("\n"));
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Write a structured log entry to `~/.local/state/pi/<source>.log`.
 *
 * Format:
 *   ISO_TIMESTAMP SOURCE EVENT {...json}\n   (with data)
 *   ISO_TIMESTAMP SOURCE EVENT\n              (without data)
 *
 * Logging is best-effort and silent on failure — it never throws.
 *
 * @param source  Extension name (becomes the filename).
 * @param event   Short event identifier (e.g. `hint`, `fetch_succeeded`).
 * @param data    Optional structured payload serialized as JSON.
 */
export function log(
  source: string,
  event: string,
  data?: Record<string, unknown>,
): void {
  try {
    const logFile = join(BASE_DIR, `${source}.log`);
    const line = formatLine(new Date().toISOString(), source, event, data);

    mkdirSync(BASE_DIR, { recursive: true });
    appendFileSync(logFile, line);
    truncateLines(logFile);
  } catch {
    // Silent — logging must never break the extension.
  }
}
