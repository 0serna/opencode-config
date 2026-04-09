import { promises as fs } from "node:fs";
import * as path from "node:path";

import type { DotfileEntry } from "./manifest.ts";
import { resolveSource, resolveTarget } from "./paths.ts";

export async function linkEntry(
  repoDir: string,
  homeDir: string,
  entry: DotfileEntry,
): Promise<void> {
  const sourcePath = resolveSource(repoDir, entry.source);
  const targetPath = resolveTarget(repoDir, homeDir, entry.target);
  const sourceStat = await fs.lstat(sourcePath).catch(() => {
    throw new Error(`Source not found: ${entry.source}`);
  });

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.rm(targetPath, { recursive: true, force: true });
  await fs.symlink(
    sourcePath,
    targetPath,
    sourceStat.isDirectory() ? "dir" : "file",
  );

  const entryType = sourceStat.isDirectory()
    ? "dir"
    : sourceStat.isFile()
      ? "file"
      : "entry";
  console.log(`Linked ${entryType}: ${entry.source} -> ${entry.target}`);
}
