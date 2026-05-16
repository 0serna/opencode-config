import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { log } from "./shared/logger.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONSECUTIVE_FAILURE_THRESHOLD = 2;
const KEYWORDS = [
  "opsx-propose",
  "opsx-apply",
  "Perform a focused code review",
];
const HINT = "Use `advisor` before continuing.";

/** Regex that matches real command separators but NOT bare `&`. */
const SEPARATOR_RE = /(?:&&|\|\||;|\|&|\|)/;

/**
 * Set of simple Unix commands that produce benign failures
 * (e.g., file not found, no match, directory missing).
 * Failures from commands whose first token (in every compound segment)
 * is in this set are excluded from consecutive-failure tracking.
 */
const SIMPLE_COMMANDS = new Set([
  // Navigation
  "cd",
  "pushd",
  "popd",
  // Listing / search
  "ls",
  "find",
  "tree",
  "grep",
  "rg",
  "egrep",
  "fgrep",
  // Reading / display
  "cat",
  "head",
  "tail",
  "less",
  "more",
  "bat",
  // File operations
  "touch",
  "mkdir",
  "rmdir",
  "cp",
  "mv",
  "rm",
  "ln",
  "chmod",
  "chown",
  // Shell state / info
  "echo",
  "printf",
  "type",
  "which",
  "source",
  // Booleans
  "test",
  "true",
  "false",
  // Path utilities
  "dirname",
  "basename",
  "readlink",
  "realpath",
  // Other common
  "pwd",
  "date",
]);

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------

/** Combined regex for short flags, redirections, and dot-references. */
const IGNORED_TOKEN_RE = /^(?:-[a-zA-Z0-9]+|\d*[>&|<>]+|\.\.?)$/;

/** Returns true for tokens that should be stripped from the command signature. */
function isIgnoredToken(token: string): boolean {
  if (token.includes("/")) return true;
  return IGNORED_TOKEN_RE.test(token);
}

/**
 * Strip `--flag value` pairs (flags without `=`) from the token list.
 * The paired value is consumed so it won't appear in the result.
 */
function skipFlagValues(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] as string;
    if (token.startsWith("--") && !token.includes("=")) {
      i++;
      continue;
    }
    result.push(token);
  }
  return result;
}

function normalizeCommand(command: string): string {
  const tokens = command
    .split(/[|&;]{1,2}/)[0]
    .trim()
    .split(/\s+/);
  return skipFlagValues(tokens)
    .filter((t) => !isIgnoredToken(t))
    .join(" ");
}

/**
 * Returns `true` when every segment of a compound command starts with a
 * simple (blocklisted) command.  Compound commands use `&&`, `||`, `;`,
 * `|`, or `|&` as separators.  If ANY segment starts with a non-blocklisted
 * command the whole command is considered "trackable".
 *
 * The regex deliberately avoids matching bare `&` so that shell
 * redirections like `2>&1` are not split into phantom segments.
 */
function isSimpleCommand(command: string): boolean {
  const segments = command.split(SEPARATOR_RE);
  if (segments.length === 0) return true;
  return segments.every((segment) => {
    const trimmed = segment.trim();
    if (trimmed === "") return true;
    const firstToken = trimmed.split(/\s+/)[0];
    return firstToken !== undefined && SIMPLE_COMMANDS.has(firstToken);
  });
}

// ---------------------------------------------------------------------------
// Module-level state (reset per episode)
// ---------------------------------------------------------------------------

let lastNormalizedCommand = "";
let consecutiveFailures = 0;
let blockageSteerSent = false;
let keywordDetected = false;
let sessionId = "";

// ---------------------------------------------------------------------------
// Tool-result helpers
// ---------------------------------------------------------------------------

function getExitCode(event: {
  details?: { exitCode?: number };
  isError?: boolean;
}): number {
  return event.details?.exitCode ?? (event.isError ? 1 : 0);
}

function updateFailureState(normalized: string, exitCode: number): void {
  if (exitCode !== 0) {
    if (normalized !== "" && normalized === lastNormalizedCommand) {
      consecutiveFailures++;
    } else {
      lastNormalizedCommand = normalized;
      consecutiveFailures = 1;
    }
  } else {
    lastNormalizedCommand = "";
    consecutiveFailures = 0;
  }
}

function handleBashToolResult(event: {
  details?: { exitCode?: number };
  isError?: boolean;
  input?: { command?: string };
}): void {
  const raw = event.input?.command ?? "";
  if (isSimpleCommand(raw)) return;
  const normalized = normalizeCommand(raw);
  updateFailureState(normalized, getExitCode(event));
}

function sendBlockageSteer(api: ExtensionAPI): void {
  if (blockageSteerSent) return;
  if (consecutiveFailures < CONSECUTIVE_FAILURE_THRESHOLD) return;

  api.sendUserMessage(HINT, { deliverAs: "steer" });
  blockageSteerSent = true;
  log("advisor-hints", "blockage", {
    sessionId,
    command: lastNormalizedCommand,
    failureCount: consecutiveFailures,
  });
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    lastNormalizedCommand = "";
    consecutiveFailures = 0;
    blockageSteerSent = false;
    keywordDetected = false;

    const sessionFile = ctx.sessionManager.getSessionFile();
    const basename = (sessionFile ?? "").split("/").pop() ?? "";
    const name = basename.replace(/\.jsonl$/, "");
    const parts = name.split("_");
    sessionId = parts.length >= 2 ? parts.slice(1).join("_") : name;
  });

  pi.on("input", async (event) => {
    if (event.source === "extension") return;

    keywordDetected = false;

    for (const kw of KEYWORDS) {
      if (event.text.includes(kw)) {
        keywordDetected = true;
        log("advisor-hints", "keyword-match", { sessionId, keyword: kw });
        break;
      }
    }
  });

  pi.on("agent_start", async () => {
    blockageSteerSent = false;
  });

  pi.on("tool_result", async (event) => {
    if (event.toolName === "bash") {
      handleBashToolResult(event);

      sendBlockageSteer(pi);
    }

    if (event.toolName === "advisor") {
      log("advisor-hints", "advisor", {
        sessionId,
        hadBlockageSteer: blockageSteerSent,
      });
      lastNormalizedCommand = "";
      consecutiveFailures = 0;
      blockageSteerSent = false;
    }
  });

  pi.on("turn_end", async () => {
    sendBlockageSteer(pi);
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (keywordDetected) {
      keywordDetected = false;
      log("advisor-hints", "followup-sent", { sessionId });

      const sendWhenIdle = (): void => {
        if (ctx.isIdle()) {
          pi.sendUserMessage(HINT);
        } else {
          setTimeout(sendWhenIdle, 5);
        }
      };
      setTimeout(sendWhenIdle, 0);
    }
  });
}
