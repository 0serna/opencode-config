import * as path from "node:path";

export function resolveSource(repoDir: string, source: string): string {
  if (path.isAbsolute(source)) {
    throw new Error(`Source must be relative: ${source}`);
  }

  const repoRoot = path.resolve(repoDir);
  const resolved = path.resolve(repoDir, source);

  if (resolved !== repoRoot && !resolved.startsWith(`${repoRoot}${path.sep}`)) {
    throw new Error(`Source escapes repository: ${source}`);
  }

  return resolved;
}

export function resolveTarget(
  repoDir: string,
  homeDir: string,
  target: string,
): string {
  const expandedTarget =
    target === "~"
      ? homeDir
      : target.startsWith("~/")
        ? path.join(homeDir, target.slice(2))
        : target;

  if (!path.isAbsolute(expandedTarget)) {
    throw new Error(`Target must be absolute: ${target}`);
  }

  const normalizedTarget = path.resolve(expandedTarget);
  const normalizedHome = path.resolve(homeDir);
  if (normalizedTarget === normalizedHome) {
    throw new Error(`Target resolves to the home directory root: ${target}`);
  }

  const normalizedRepo = path.resolve(repoDir);
  if (
    normalizedTarget === normalizedRepo ||
    normalizedTarget.startsWith(`${normalizedRepo}${path.sep}`)
  ) {
    throw new Error(`Target resolves inside the repository: ${target}`);
  }

  return normalizedTarget;
}
