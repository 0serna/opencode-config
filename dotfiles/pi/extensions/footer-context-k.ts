import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

function formatK(value: number): string {
  if (value < 1000) {
    return `${value}`;
  }

  return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) {
    return "?%";
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

type ContextUsage = {
  tokens: number | null;
  contextWindow: number;
  percent: number | null;
};

function formatContextUsage(usage: ContextUsage | undefined): string {
  if (usage?.tokens == null) {
    return `?/${formatK(usage?.contextWindow ?? 0)}`;
  }

  return `${formatK(usage.tokens)}/${formatK(usage.contextWindow)} (${formatPercent(usage.percent)})`;
}

function formatCwd(cwd: string): string {
  const home = process.env.HOME;
  if (!home) {
    return cwd;
  }

  if (cwd === home) {
    return "~";
  }

  if (cwd.startsWith(`${home}/`)) {
    return `~${cwd.slice(home.length)}`;
  }

  return cwd;
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsubscribe,
        invalidate() {},
        render(width: number): string[] {
          try {
            const usage = ctx.getContextUsage?.();
            const cwd = formatCwd(ctx.cwd);
            const branch = footerData.getGitBranch();
            const thinking = pi.getThinkingLevel();
            const model = ctx.model?.id;

            const sections = [
              branch ? `${cwd} (${branch})` : cwd,
              formatContextUsage(usage),
              model ? `${model} (${thinking})` : `(${thinking})`,
            ];

            return [
              truncateToWidth(theme.fg("dim", sections.join(" | ")), width),
            ];
          } catch {
            return [
              truncateToWidth(theme.fg("dim", "footer unavailable"), width),
            ];
          }
        },
      };
    });
  });
}
