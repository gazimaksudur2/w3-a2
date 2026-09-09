import { readFile } from "node:fs/promises";

export async function loadJsonFile(filePath) {
  let raw;

  try {
    raw = await readFile(filePath, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(`Data file not found: ${filePath}`);
    }
    throw new Error(`Unable to read data file "${filePath}": ${err.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(`Data file "${filePath}" contains invalid JSON: ${err.message}`);
  }
}
