function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Drops image entries that have no usable path and fills missing alt text.
 */
export function normalizeImageEntries(images) {
  if (!Array.isArray(images)) return [];

  const usable = [];

  for (const image of images) {
    if (typeof image === "string") {
      const path = image.trim();
      if (!path) continue;
      usable.push({ path, alt: "" });
      continue;
    }

    if (image === null || typeof image !== "object") continue;

    const path = asString(image.path);
    if (!path) continue;

    usable.push({
      ...image,
      path,
      alt: asString(image.alt),
    });
  }

  return usable.map((image, index) => ({
    ...image,
    id: image.id ?? index + 1,
    alt: image.alt || `Golf course image ${index + 1}`,
  }));
}
