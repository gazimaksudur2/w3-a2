import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadJsonFile } from "../utils/loadJson.js";
import { normalizePropertyItems } from "../utils/normalizeProperty.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

const DATASET_FILES = {
  "most-popular": path.join(DATA_DIR, "most_popular.json"),
  "highest-price": path.join(DATA_DIR, "highest_price.json"),
  "lowest-price": path.join(DATA_DIR, "lowest_price.json"),
};

const cache = new Map();

export async function warmPropertyCache() {
  const keys = Object.keys(DATASET_FILES);

  await Promise.all(
    keys.map(async (key) => {
      const dataset = await loadJsonFile(DATASET_FILES[key]);

      if (!dataset?.Result || !Array.isArray(dataset.Result.Items)) {
        throw new Error(
          `Dataset "${key}" is missing the expected Result.Items array.`
        );
      }

      cache.set(key, dataset);
    })
  );
}

export function getDataset(key, limit) {
  const dataset = cache.get(key);

  if (!dataset) {
    throw new Error(`Dataset "${key}" was requested before it was loaded.`);
  }

  const items = normalizePropertyItems(dataset.Result.Items);
  const slicedItems = typeof limit === "number" ? items.slice(0, limit) : items;

  return {
    ...dataset,
    Result: {
      ...dataset.Result,
      Count: dataset.Result.Count,
      ReturnedCount: slicedItems.length,
      Items: slicedItems,
    },
  };
}
