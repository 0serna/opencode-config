import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";

import {
  isToolCallEventType,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

type SensitiveMatch = {
  segment: string;
};

type ExtensionContext = Parameters<Parameters<ExtensionAPI["on"]>[1]>[1];

interface CmdInfo {
  command: string;
  scope: string;
  approvalKey: string;
}

const sessionApprovals = new Set<string>();
const LOG_FILE = `${process.env.HOME}/.local/state/pi/permissions.log`;

// ---------------------------------------------------------------------------
// Sensitive command rule sets
// ---------------------------------------------------------------------------

const SENSITIVE_GIT_RULES: Array<{
  when: (candidate: string) => boolean;
}> = [
  { when: (c) => /\bgit\s+push\b/i.test(c) && /--delete\b/i.test(c) },
  {
    when: (c) =>
      /\bgit\s+push\b/i.test(c) && /--force(?:-with-lease)?\b|-f\b/i.test(c),
  },
  { when: (c) => /\bgit\s+push\b/i.test(c) },
  { when: (c) => /\bgit\s+reset\b/i.test(c) && /--hard\b/i.test(c) },
  {
    when: (c) =>
      /\bgit\s+clean\b/i.test(c) &&
      /(?:(?:^|\s)-[^\s]*f\b)|(?:--force\b)/i.test(c),
  },
  { when: (c) => /\bgit\s+rebase\b/i.test(c) },
  { when: (c) => /\bgit\s+commit\b/i.test(c) && /--amend\b/i.test(c) },
  {
    when: (c) => /\bgit\s+checkout\b/i.test(c) && /(?:^|\s)-[^\s]*f\b/i.test(c),
  },
  {
    when: (c) =>
      /\bgit\s+switch\b/i.test(c) && /(?:^|\s)--discard-changes\b/i.test(c),
  },
  {
    when: (c) =>
      /\bgit\s+branch\b/i.test(c) &&
      /(?:(?:^|\s)-[^\s]*D\b)|(?:(?:^|\s)--delete\b)/i.test(c),
  },
  {
    when: (c) =>
      /\bgit\s+tag\b/i.test(c) && /(?:^|\s)-d\b|(?:^|\s)--delete\b/i.test(c),
  },
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
  /rm\s+(?:-[^\s]*r[^\s]*f\b|--recursive\b)/i,
  /\bdd\b/i,
  /\b(?:mkfs\.\w+|fdisk|parted)\b/i,
  /\b(?:shutdown|reboot|poweroff|halt)\b/i,
  /\b(?:chmod|chown)\s+(?:-[^\s]+\s+)?777\b/i,
  /\b(?:curl|wget)\b.*\|\s*(?:bash|sh|zsh|fish)\b/i,
  /\bsudo\b/i,
];

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

const MAX_LOG_BYTES = 160_000;
const MAX_LOG_LINES = 2000;

function log(msg: string): void {
  try {
    mkdirSync(dirname(LOG_FILE), { recursive: true });
    const line = `${new Date().toISOString()} ${msg}\n`;
    appendFileSync(LOG_FILE, line);
    const currentSize = statSync(LOG_FILE).size;
    if (currentSize > MAX_LOG_BYTES) {
      const content = readFileSync(LOG_FILE, "utf-8");
      const allLines = content.split("\n");
      if (allLines.length > MAX_LOG_LINES) {
        writeFileSync(LOG_FILE, allLines.slice(-MAX_LOG_LINES).join("\n"));
      }
    }
  } catch {
    // Logging must never break command handling.
  }
}

// ---------------------------------------------------------------------------
// Command parsing helpers
// ---------------------------------------------------------------------------

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function splitCommandSegments(command: string): string[] {
  return command
    .split(/(?:&&|\|\||;|\n|&(?!&))/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
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
  return SENSITIVE_GIT_RULES.some((r) => r.when(candidate));
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
  const candidate = stripLeadingWrappers(segment);
  return SENSITIVE_SYSTEM_PATTERNS.some((p) => p.test(candidate));
}

function checkWrappedOrSystem(segment: string): boolean {
  const wrappedCommand = extractShellWrappedCommand(segment);
  if (wrappedCommand != null && findSensitiveMatch(wrappedCommand) != null) {
    return true;
  }
  return isSensitiveSystemSegment(segment);
}

function checkSegment(segment: string): SensitiveMatch | null {
  if (isSensitiveGitSegment(segment)) return { segment };
  if (isSensitiveGhSegment(segment)) return { segment };
  if (checkWrappedOrSystem(segment)) return { segment };
  return null;
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

async function promptAndHandleChoice(
  ctx: ExtensionContext,
  sensitiveMatch: SensitiveMatch,
  command: string,
  approvalKey: string,
  scope: string,
): Promise<{ block: true; reason: string } | undefined> {
  const choice = await ctx.ui.select(`Allow sensitive command\n\n${command}`, [
    "Allow once",
    "Allow for this session",
    "Block",
  ]);
  log(
    `user_choice cwd="${ctx.cwd}" scope="${scope}" choice="${choice ?? "dismissed"}" command="${command}"`,
  );
  if (choice === "Allow for this session") {
    sessionApprovals.add(approvalKey);
    log(
      `session_approval_stored cwd="${ctx.cwd}" scope="${scope}" command="${command}"`,
    );
    return;
  }
  if (choice === "Allow once") {
    return;
  }
  log(`blocked_by_user cwd="${ctx.cwd}" scope="${scope}" command="${command}"`);
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

  log(
    `sensitive_detected cwd="${ctx.cwd}" scope="${scope}" command="${command}"`,
  );

  if (!ctx.hasUI) {
    log(`blocked_no_ui cwd="${ctx.cwd}" scope="${scope}" command="${command}"`);
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
    log(
      `session_approval_reused cwd="${ctx.cwd}" scope="${scope}" command="${command}"`,
    );
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
