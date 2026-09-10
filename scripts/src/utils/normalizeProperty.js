function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asObject(value) {
  return isPlainObject(value) ? value : {};
}

function asString(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asFiniteNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asInteger(value) {
  const parsed = asFiniteNumber(value);
  return parsed === null ? null : Math.round(parsed);
}

function asHttpUrl(value) {
  const raw = asString(value);
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return "";
  }

  return "";
}

function normalizeCategories(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!isPlainObject(entry)) return null;
      const Name = asString(entry.Name);
      if (!Name) return null;
      return { ...entry, Name, Type: asString(entry.Type) };
    })
    .filter(Boolean);
}

function normalizeTopAmenities(raw) {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!isPlainObject(entry)) return null;
      const Name = asString(entry.Name);
      if (!Name) return null;
      const ID = asString(entry.ID);
      return ID ? { ...entry, ID, Name } : { ...entry, Name };
    })
    .filter(Boolean);
}

function normalizeCounts(raw) {
  const counts = asObject(raw);
  return {
    ...counts,
    Bedroom: asInteger(counts.Bedroom),
    Bathroom: asInteger(counts.Bathroom),
    Reviews: asInteger(counts.Reviews),
    Occupancy: asInteger(counts.Occupancy),
  };
}

/**
 * Returns a stable property record, or null when the item cannot be listed.
 * Items without an ID are dropped. Missing nested fields are filled with safe empties.
 */
export function normalizePropertyItem(item) {
  if (!isPlainObject(item)) return null;

  const ID = asString(item.ID);
  if (!ID) return null;

  const geoRaw = asObject(item.GeoInfo);
  const propertyRaw = asObject(item.Property);
  const partnerRaw = asObject(item.Partner);

  const lat = asFiniteNumber(geoRaw.Lat);
  const lng = asFiniteNumber(geoRaw.Lng);

  return {
    ...item,
    ID,
    GeoInfo: {
      ...geoRaw,
      City: asString(geoRaw.City),
      Country: asString(geoRaw.Country),
      Display: asString(geoRaw.Display),
      Categories: normalizeCategories(geoRaw.Categories),
      Lat: lat === null ? null : geoRaw.Lat,
      Lng: lng === null ? null : geoRaw.Lng,
    },
    Property: {
      ...propertyRaw,
      PropertyName: asString(propertyRaw.PropertyName),
      PropertyType: asString(propertyRaw.PropertyType),
      FeatureImage: asString(propertyRaw.FeatureImage),
      Price: asFiniteNumber(propertyRaw.Price),
      ReviewScore: asFiniteNumber(propertyRaw.ReviewScore),
      TopAmenities: normalizeTopAmenities(propertyRaw.TopAmenities),
      Counts: normalizeCounts(propertyRaw.Counts),
    },
    Partner: {
      ...partnerRaw,
      URL: asHttpUrl(partnerRaw.URL) || asHttpUrl(partnerRaw.CacheURL),
    },
  };
}

export function normalizePropertyItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(normalizePropertyItem).filter(Boolean);
}
