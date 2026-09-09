import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadJsonFile } from "../utils/loadJson.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_JSON_PATH = path.join(__dirname, "..", "data", "images.json");

let cachedImages = null;

export async function warmImagesCache() {
  const data = await loadJsonFile(IMAGES_JSON_PATH);

  if (!Array.isArray(data?.images)) {
    throw new Error('images.json is missing the expected "images" array.');
  }

  cachedImages = data;
}

export function getImages() {
  if (!cachedImages) {
    throw new Error("images.json was requested before it was loaded.");
  }
  return cachedImages.images;
}
