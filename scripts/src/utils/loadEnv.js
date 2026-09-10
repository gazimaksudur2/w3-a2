import { readFileSync } from "node:fs";

function parseEnvValue(raw) {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

/**
 * Loads KEY=VALUE pairs from .env files without overwriting existing process.env.
 */
export function loadEnvFiles(filePaths) {
  for (const filePath of filePaths) {
    let text;
    try {
      text = readFileSync(filePath, "utf-8");
    } catch (err) {
      if (err?.code === "ENOENT") continue;
      throw err;
    }

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const withoutExport = line.startsWith("export ") ? line.slice(7).trim() : line;
      const eq = withoutExport.indexOf("=");
      if (eq <= 0) continue;

      const key = withoutExport.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;

      process.env[key] = parseEnvValue(withoutExport.slice(eq + 1));
    }
  }
}
