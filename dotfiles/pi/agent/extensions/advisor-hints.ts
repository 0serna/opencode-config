import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { log } from "./shared/logger.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tool call count that triggers a hint at each turn_end multiple. */
const TOOL_CALL_THRESHOLD = 10;

/** Tools that count toward the threshold. */
const COUNTED_TOOLS = new Set(["bash", "read", "edit", "write"]);

// ---------------------------------------------------------------------------
// Hint texts
// ---------------------------------------------------------------------------

const PASSIVE_GUIDELINE =
  "If you're having difficulty, use `advisor` to escalate. Before responding to the user, always consider whether the work is important enough to validate with `advisor` first.";

function ordinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0]!;
}

function buildTurnHintText(hintsSinceAdvisor: number): string {
  if (hintsSinceAdvisor === 1) {
    return "Before responding to the user, consider using `advisor` to validate this work.";
  }
  if (hintsSinceAdvisor === 2) {
    return (
      `This is the ${hintsSinceAdvisor}${ordinalSuffix(hintsSinceAdvisor)} suggestion. ` +
      "This work should be validated with `advisor` before responding."
    );
  }
  return (
    `This is the ${hintsSinceAdvisor}${ordinalSuffix(hintsSinceAdvisor)} suggestion. ` +
    "Do not respond without using `advisor` to validate this work. MANDATORY."
  );
}

// ---------------------------------------------------------------------------
// Module-level state (reset per session)
// ---------------------------------------------------------------------------

let toolCalls = 0;
let nextHintAt = TOOL_CALL_THRESHOLD;
let advisorCalledThisTurn = false;
let hintsSinceAdvisor = 0;
let sessionId = "";

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

function resetHintProgress(): void {
  toolCalls = 0;
  nextHintAt = TOOL_CALL_THRESHOLD;
  hintsSinceAdvisor = 0;
}

function resetAllState(): void {
  resetHintProgress();
  advisorCalledThisTurn = false;
  sessionId = "";
}

// ---------------------------------------------------------------------------
// Hint injection
// ---------------------------------------------------------------------------

function injectTurnHint(pi: ExtensionAPI, ctx: ExtensionContext): void {
  hintsSinceAdvisor++;
  const hintText = buildTurnHintText(hintsSinceAdvisor);
  ctx.ui.notify("[advisor-hint] " + hintText, "warning");
  pi.sendMessage(
    { customType: "advisor-hint", content: hintText, display: false },
    { deliverAs: "steer" },
  );
  log("advisor-hints", "hint", { sessionId, toolCalls });
  while (nextHintAt <= toolCalls) nextHintAt += TOOL_CALL_THRESHOLD;
}

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, ctx) => {
    resetAllState();
    const sessionFile = ctx.sessionManager.getSessionFile();
    const basename = (sessionFile ?? "").split("/").pop() ?? "";
    const name = basename.replace(/\.jsonl$/, "");
    const parts = name.split("_");
    sessionId = parts.length >= 2 ? parts.slice(1).join("_") : name;
  });

  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt: event.systemPrompt
        ? `${event.systemPrompt}\n\n${PASSIVE_GUIDELINE}`
        : PASSIVE_GUIDELINE,
    };
  });

  pi.on("agent_start", async () => {
    resetHintProgress();
  });

  pi.on("turn_start", async () => {
    advisorCalledThisTurn = false;
  });

  pi.on("tool_result", async (event) => {
    if (COUNTED_TOOLS.has(event.toolName)) {
      toolCalls++;
    }

    if (event.toolName === "advisor") {
      advisorCalledThisTurn = true;
      log("advisor-hints", "advisor", { sessionId, toolCalls });
      resetHintProgress();
    }
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (!advisorCalledThisTurn && toolCalls >= nextHintAt)
      injectTurnHint(pi, ctx);
  });
}
