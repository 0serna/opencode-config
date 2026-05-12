import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth } from "@earendil-works/pi-tui";

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
  let requestRender: (() => void) | null = null;

  pi.on("model_select", () => {
    requestRender?.();
  });

  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      requestRender = () => tui.requestRender();

      const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsubscribe,
        invalidate() {},
        render(width: number): string[] {
          const cwd = formatCwd(ctx.cwd);
          const branch = footerData.getGitBranch();
          const thinking = pi.getThinkingLevel();
          const modelId = ctx.model?.id;

          const separator = theme.fg("dim", " | ");
          const sections = [
            theme.fg("dim", branch ? `${cwd} (${branch})` : cwd),
            theme.fg(
              "dim",
              modelId ? `${modelId} · ${thinking}` : `${thinking}`,
            ),
            ...Array.from(footerData.getExtensionStatuses().values()).filter(
              Boolean,
            ),
          ];

          return [truncateToWidth(sections.join(separator), width)];
        },
      };
    });
  });
}
