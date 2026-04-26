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
  const isDirectory = sourceStat.isDirectory();
  const isFile = sourceStat.isFile();

  await ensureRealDirectory(path.dirname(targetPath));
  await fs.rm(targetPath, { recursive: true, force: true });
  await fs.symlink(sourcePath, targetPath, isDirectory ? "dir" : "file");

  let entryType = "entry";
  if (isDirectory) {
    entryType = "dir";
  } else if (isFile) {
    entryType = "file";
  }

  console.log(`Linked ${entryType}: ${entry.source} -> ${entry.target}`);
}

async function ensureRealDirectory(directoryPath: string): Promise<void> {
  const parentPath = path.dirname(directoryPath);
  if (parentPath !== directoryPath) {
    await ensureRealDirectory(parentPath);
  }

  const directoryStat = await fs.lstat(directoryPath).catch(() => undefined);
  if (directoryStat?.isSymbolicLink()) {
    await fs.rm(directoryPath, { recursive: true, force: true });
  }

  await fs.mkdir(directoryPath, { recursive: true });
}
