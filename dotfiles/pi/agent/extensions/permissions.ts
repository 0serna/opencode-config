import { log } from "./shared/logger.js";

import {
  isToolCallEventType,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

import {
  Key,
  matchesKey,
  truncateToWidth,
  wrapTextWithAnsi,
} from "@earendil-works/pi-tui";

type SensitiveMatch = {
  segment: string;
};

type ExtensionContext = Parameters<Parameters<ExtensionAPI["on"]>[1]>[1];

type ChoiceResult =
  | { type: "allow-once" }
  | { type: "allow-session" }
  | { type: "block" };

interface CmdInfo {
  command: string;
  scope: string;
  approvalKey: string;
}

const sessionApprovals = new Set<string>();

// ---------------------------------------------------------------------------
// Sensitive command rule sets
// ---------------------------------------------------------------------------

/** [command-regex, required-flag-regex | null] — null means any invocation. */
const SENSITIVE_GIT_RULES: Array<[RegExp | null, RegExp]> = [
  [/--delete\b/i, /\bgit\s+push\b/i],
  [/--force(?:-with-lease)?\b|-f\b/i, /\bgit\s+push\b/i],
  [null, /\bgit\s+push\b/i],
  [/--hard\b/i, /\bgit\s+reset\b/i],
  [/(?:(?:^|\s)-[^\s]*f\b)|(?:--force\b)/i, /\bgit\s+clean\b/i],
  [null, /\bgit\s+rebase\b/i],
  [/--amend\b/i, /\bgit\s+commit\b/i],
  [/(?:^|\s)-[^\s]*f\b/i, /\bgit\s+checkout\b/i],
  [/(?:^|\s)--discard-changes\b/i, /\bgit\s+switch\b/i],
  [/(?:(?:^|\s)-[^\s]*D\b)|(?:(?:^|\s)--delete\b)/i, /\bgit\s+branch\b/i],
  [/(?:^|\s)-d\b|(?:^|\s)--delete\b/i, /\bgit\s+tag\b/i],
];

const SENSITIVE_GH_PATTERNS: RegExp[] = [
  /\bgh\s+pr\s+(create|merge|close|reopen|edit|ready)\b/i,
  /\bgh\s+issue\s+(create|edit|close|reopen|delete|transfer|pin|unpin|lock|unlock)\b/i,
  /\bgh\s+repo\s+(create|delete|archive|unarchive|edit|rename|fork)\b/i,
  /\bgh\s+release\s+(create|edit|delete|upload)\b/i,
  /\bgh\s+workflow\s+(run|enable|disable)\b/i,
  /\bgh\s+run\s+(cancel|delete|rerun)\b/i,
];

const SENSITIVE_SYSTEM_PATTERNS: RegExp[] = [
  /\bdd\b/i,
  /\b(?:mkfs\.\w+|fdisk|parted)\b/i,
  /\b(?:shutdown|reboot|poweroff|halt)\b/i,
  /\b(?:chmod|chown)\s+(?:-[^\s]+\s+)?777\b/i,
  /\b(?:curl|wget)\b.*\|\s*(?:bash|sh|zsh|fish)\b/i,
  /\bsudo\b/i,
];

// ---------------------------------------------------------------------------
// Path-aware rm -rf sensitivity
// ---------------------------------------------------------------------------

/** Check whether an rm command has both -r and -f flags (any order). */
function isRmRecursiveForce(segment: string): boolean {
  const rest = segment.replace(/^rm\s+/i, "").trim();
  if (!rest) return false;

  const flags = rest.split(/\s+/).filter((a) => a.startsWith("-"));
  const hasRecursive = flags.some((a) =>
    a.startsWith("--") ? a === "--recursive" : a.slice(1).includes("r"),
  );
  const hasForce = flags.some((a) =>
    a.startsWith("--") ? a === "--force" : a.slice(1).includes("f"),
  );
  return hasRecursive && hasForce;
}

/** Extract path arguments from an rm command (skipping flags). */
function parseRmTargets(segment: string): string[] {
  const rest = segment.replace(/^rm\s+/i, "").trim();
  if (!rest) return [];

  const parts = rest.split(/\s+/);
  const dd = parts.indexOf("--");
  if (dd !== -1) return parts.slice(dd + 1);

  const start = parts.findIndex((p) => !p.startsWith("-"));
  if (start === -1) return [];
  return parts.slice(start);
}

/** Combined regex for dot-refs, wildcard, and absolute paths. */
const SENSITIVE_RM_PATH_RE = /^(?:\.\.?|\*|\/)/;

/** Return true if the rm target path should trigger a permission prompt. */
function isRmTargetSensitive(target: string): boolean {
  const clean = target.replace(/^(['"])(.*)\1$/, "$2");
  if (SENSITIVE_RM_PATH_RE.test(clean)) return true;
  return clean.replace(/\\/g, "/").split("/").includes(".git");
}

// ---------------------------------------------------------------------------
// Command parsing helpers
// ---------------------------------------------------------------------------

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

const TWO_CHAR_DELIMITERS = new Set(["&&", "||"]);
const ONE_CHAR_DELIMITERS = new Set([";", "\n", "&"]);

/** Return the length (0, 1, or 2) of the command delimiter at {@link index}. */
function commandDelimiterLength(command: string, index: number): 0 | 1 | 2 {
  if (TWO_CHAR_DELIMITERS.has(command.slice(index, index + 2))) return 2;
  if (ONE_CHAR_DELIMITERS.has(command[index])) return 1;
  return 0;
}

/**
 * Inside a quoted string, return the next index to advance to.
 * For double quotes, backslash escapes the following character.
 */
function nextQuotedIndex(
  command: string,
  index: number,
  quote: "'" | '"',
): number {
  if (quote === '"' && command[index] === "\\") return index + 2;
  return index + 1;
}

/** Return the index of the closing quote (or end of string if unterminated). */
function scanQuotedString(
  command: string,
  start: number,
  quote: "'" | '"',
): number {
  let i = start;
  while (i < command.length) {
    if (command[i] === quote) return i;
    i = nextQuotedIndex(command, i, quote);
  }
  return i;
}

/**
 * If {@link index} points to a single or double quote, return the full
 * quoted text including quotes and the end index.
 */
function readQuoted(
  command: string,
  index: number,
): { end: number; text: string } | null {
  const quote = command[index];
  if (quote !== "'" && quote !== '"') return null;
  const end = scanQuotedString(command, index + 1, quote);
  return { end, text: command.slice(index, end + 1) };
}

function pushSegment(segments: string[], buf: string): void {
  const trimmed = buf.trim();
  if (trimmed.length > 0) segments.push(trimmed);
}

function splitCommandSegments(command: string): string[] {
  const segments: string[] = [];
  let current = "";

  for (let i = 0; i < command.length; i++) {
    const quoted = readQuoted(command, i);
    if (quoted != null) {
      current += quoted.text;
      i = quoted.end;
      continue;
    }

    const delimLen = commandDelimiterLength(command, i);
    if (delimLen > 0) {
      pushSegment(segments, current);
      current = "";
      i += delimLen - 1; // for-loop i++ covers the rest
      continue;
    }

    current += command[i];
  }

  pushSegment(segments, current);
  return segments;
}

const STRIP_RE =
  /^(?:env\s+(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s+)*|(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|[^\s]+)\s+)+|(?:command|builtin|nice|nohup|time)\s+)/i;

function stripLeadingWrappers(segment: string): string {
  let current = segment.trim();
  let m: RegExpExecArray | null;
  while ((m = STRIP_RE.exec(current)) != null && m[0].length > 0) {
    current = current.slice(m[0].length).trim();
  }
  return current;
}

function extractShellWrappedCommand(segment: string): string | null {
  const PRIVILEGE_RE = /^(?:sudo|doas|pkexec)\s+/i;
  let wrapped = stripLeadingWrappers(segment);
  // Strip privilege-escalation prefixes before matching shell wrapper
  let m: RegExpExecArray | null;
  while ((m = PRIVILEGE_RE.exec(wrapped)) != null && m[0].length > 0) {
    wrapped = wrapped.slice(m[0].length).trim();
  }
  const match = wrapped.match(
    /^(?:bash|sh|zsh|fish)\s+(?:-[^\s]*c[^\s]*|-c)\s+(['"])([\s\S]*)\1$/i,
  );
  return match?.[2]?.trim() ?? null;
}

// ---------------------------------------------------------------------------
// Sensitivity detection
// ---------------------------------------------------------------------------

function isSensitiveGitSegment(segment: string): boolean {
  const candidate = stripLeadingWrappers(segment);
  if (!/^git\b/i.test(candidate)) return false;
  return SENSITIVE_GIT_RULES.some(
    ([flag, cmd]) =>
      cmd.test(candidate) && (flag == null || flag.test(candidate)),
  );
}

function checkGhMethod(candidate: string): boolean {
  const methodMatch = candidate.match(
    /(?:\s|^)(?:-X|--method)(?:\s+|=)([A-Za-z]+)/i,
  );
  if (methodMatch == null) return false;
  return methodMatch[1].toUpperCase() !== "GET";
}

function checkGhApi(candidate: string): boolean {
  if (!/\bgh\s+api\b/i.test(candidate)) return false;
  if (checkGhMethod(candidate)) return true;
  return /\s(?:-f|-F|--field|--raw-field|--input)\b/i.test(candidate);
}

function isSensitiveGhSegment(segment: string): boolean {
  const candidate = stripLeadingWrappers(segment);
  if (!/^gh\b/i.test(candidate)) return false;
  if (SENSITIVE_GH_PATTERNS.some((p) => p.test(candidate))) return true;
  return checkGhApi(candidate);
}

function isSensitiveSystemSegment(segment: string): boolean {
  let candidate = stripLeadingWrappers(segment);
  // Strip git -m/--message values (treated as plain text by git) so that
  // words like "sudo" or "dd" in commit messages don't cause false positives.
  // Do NOT strip -c values (config overrides), which git can execute as code.
  candidate = candidate.replace(/(?:^|\s)(?:-m|--message)\s+(['"]).*?\1/gi, "");

  // Check standard destructive patterns (dd, mkfs, sudo, etc.)
  if (SENSITIVE_SYSTEM_PATTERNS.some((p) => p.test(candidate))) return true;

  // Path-aware rm -rf: only flag when target is a sensitive path
  if (isRmRecursiveForce(candidate)) {
    const targets = parseRmTargets(candidate);
    return targets.some((t) => isRmTargetSensitive(t));
  }

  return false;
}

function checkWrappedOrSystem(segment: string): boolean {
  const wrappedCommand = extractShellWrappedCommand(segment);
  if (wrappedCommand != null && findSensitiveMatch(wrappedCommand) != null) {
    return true;
  }
  return isSensitiveSystemSegment(segment);
}

function maybeMatch(ok: boolean, segment: string): SensitiveMatch | null {
  return ok ? { segment } : null;
}

function checkSegment(segment: string): SensitiveMatch | null {
  // Skip fragments that clearly aren't commands
  if (!/^[a-zA-Z./]/i.test(segment)) return null;
  if (isSensitiveGitSegment(segment)) return { segment };
  return maybeMatch(
    isSensitiveGhSegment(segment) || checkWrappedOrSystem(segment),
    segment,
  );
}

function findSensitiveMatch(command: string): SensitiveMatch | null {
  for (const segment of splitCommandSegments(command)) {
    const match = checkSegment(segment);
    if (match != null) {
      return match;
    }
  }
  return null;
}

async function getApprovalScope(
  cwd: string,
  pi: ExtensionAPI,
): Promise<string> {
  try {
    const result = await pi.exec("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      timeout: 500,
    });
    if (result.code === 0) {
      const repoRoot = result.stdout.trim();
      if (repoRoot !== "") {
        return repoRoot;
      }
    }
  } catch {
    // Fall through to cwd return
  }
  return cwd;
}

// ---------------------------------------------------------------------------
// Tool call validation and UI interaction
// ---------------------------------------------------------------------------

function getCommandFromEvent(event: unknown): string | null {
  if (!isToolCallEventType("bash", event)) return null;
  const command = event.input.command;
  if (typeof command !== "string" || command.trim() === "") return null;
  return command;
}

async function buildCmdInfo(
  command: string,
  cwd: string,
  pi: ExtensionAPI,
): Promise<CmdInfo> {
  const normalizedCommand = normalizeCommand(command);
  const scope = await getApprovalScope(cwd, pi);
  const approvalKey = `${scope}\u0000${normalizedCommand}`;
  return { command, normalizedCommand, scope, approvalKey };
}

function isSessionApproved(approvalKey: string): boolean {
  return sessionApprovals.has(approvalKey);
}

// ===========================================================================
// UI interaction
// ===========================================================================

async function promptAndHandleChoice(
  ctx: ExtensionContext,
  _sensitiveMatch: SensitiveMatch,
  command: string,
  approvalKey: string,
  scope: string,
): Promise<{ block: true; reason: string } | undefined> {
  log("permissions", "prompt_shown", { cwd: ctx.cwd, scope, command });

  const choice = await ctx.ui.custom<ChoiceResult>((tui, theme, _kb, done) => {
    const state = { optionIndex: 0 };
    let cachedLines: string[] | undefined;

    return {
      render,
      invalidate: () => {
        cachedLines = undefined;
      },
      handleInput,
    };

    function refresh() {
      cachedLines = undefined;
      tui.requestRender();
    }

    function buildRenderLines(width: number): string[] {
      const optionLabels = ["Allow once", "Allow for this session", "Block"];
      const lines: string[] = [];
      lines.push(theme.fg("accent", "─".repeat(width)));
      lines.push(theme.fg("text", "Sensitive command"));
      for (const wLine of wrapTextWithAnsi(theme.fg("muted", command), width)) {
        lines.push(wLine);
      }
      lines.push("");
      for (let i = 0; i < optionLabels.length; i++) {
        const prefix =
          i === state.optionIndex
            ? theme.fg("accent", `> ${i + 1}. ${optionLabels[i]}`)
            : `  ${i + 1}. ${optionLabels[i]}`;
        lines.push(truncateToWidth(prefix, width));
      }
      lines.push("");
      lines.push(
        truncateToWidth(
          theme.fg("dim", " ↑↓ navigate • Enter to confirm • Esc to cancel"),
          width,
        ),
      );
      lines.push(theme.fg("accent", "─".repeat(width)));
      return lines;
    }

    function render(width: number): string[] {
      if (cachedLines) return cachedLines;
      cachedLines = buildRenderLines(width);
      return cachedLines;
    }

    function handleNavigation(data: string): boolean {
      if (matchesKey(data, Key.up)) {
        state.optionIndex = Math.max(0, state.optionIndex - 1);
        return true;
      }
      if (matchesKey(data, Key.down)) {
        state.optionIndex = Math.min(2, state.optionIndex + 1);
        return true;
      }
      return false;
    }

    function commitChoice(): void {
      if (state.optionIndex === 0) done({ type: "allow-once" });
      else if (state.optionIndex === 1) done({ type: "allow-session" });
      else done({ type: "block" });
    }

    function handleAction(data: string): boolean {
      if (matchesKey(data, Key.enter)) {
        commitChoice();
        return true;
      }
      if (matchesKey(data, Key.escape)) {
        done({ type: "block" });
        return true;
      }
      return false;
    }

    function handleInput(data: string) {
      if (handleNavigation(data)) {
        refresh();
        return;
      }
      handleAction(data);
    }
  });

  log("permissions", "user_choice", {
    cwd: ctx.cwd,
    scope,
    choice: choice.type,
    command,
  });

  if (choice.type === "allow-session") {
    sessionApprovals.add(approvalKey);
    log("permissions", "session_approval_stored", {
      cwd: ctx.cwd,
      scope,
      command,
    });
    return;
  }
  if (choice.type === "allow-once") {
    return;
  }
  log("permissions", "blocked_by_user", { cwd: ctx.cwd, scope, command });
  return { block: true, reason: "Blocked by user" };
}

async function handleSensitiveCommand(
  ctx: ExtensionContext,
  command: string,
  approvalKey: string,
  scope: string,
): Promise<{ block: true; reason: string } | undefined> {
  const sensitiveMatch = findSensitiveMatch(command);
  if (sensitiveMatch == null) return;

  log("permissions", "sensitive_detected", { cwd: ctx.cwd, scope, command });

  if (!ctx.hasUI) {
    log("permissions", "blocked_no_ui", { cwd: ctx.cwd, scope, command });
    return {
      block: true,
      reason: "Sensitive command blocked (no UI for confirmation)",
    };
  }

  return promptAndHandleChoice(
    ctx,
    sensitiveMatch,
    command,
    approvalKey,
    scope,
  );
}

async function handleToolCall(
  event: unknown,
  ctx: ExtensionContext,
  pi: ExtensionAPI,
): Promise<{ block: true; reason: string } | { block?: false } | undefined> {
  const command = getCommandFromEvent(event);
  if (command == null) return;

  const { scope, approvalKey } = await buildCmdInfo(command, ctx.cwd, pi);

  if (isSessionApproved(approvalKey)) {
    log("permissions", "session_approval_reused", {
      cwd: ctx.cwd,
      scope,
      command,
    });
    return;
  }

  return handleSensitiveCommand(ctx, command, approvalKey, scope);
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", (event, ctx) => handleToolCall(event, ctx, pi));
}
