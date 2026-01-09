import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const globalWithFlag = globalThis as typeof globalThis & {
  __f10EnvLoaded?: boolean;
};

if (!globalWithFlag.__f10EnvLoaded) {
  loadEnvironmentFiles();
  globalWithFlag.__f10EnvLoaded = true;
}

function loadEnvironmentFiles(): void {
  const filesToLoad: string[] = [];

  if (process.env.NODE_ENV === "production") {
    filesToLoad.push(".env.production");
  }

  filesToLoad.push(".env");

  for (const file of filesToLoad) {
    const absPath = resolve(process.cwd(), file);
    if (!existsSync(absPath)) continue;

    try {
      const raw = readFileSync(absPath, "utf8");
      applyEnvFile(raw);
    } catch (error) {
      console.error(`[env-loader] Failed to read ${absPath}:`, error);
    }
  }
}

function applyEnvFile(contents: string): void {
  const lines = contents.split(/\r?\n/);

  for (const originalLine of lines) {
    const line = originalLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^([\w.-]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, rawKey, rawValue] = match;
    const key = rawKey.trim();

    if (!key) continue;

    let value = rawValue?.trim() ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
