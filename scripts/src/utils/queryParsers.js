import { ApiError } from "./ApiError.js";

function toSingleString(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
}

// only the string "true" counts, so ?most-popular=1 doesn't sneak through
export function parseBooleanFlag(value) {
  const str = toSingleString(value);
  return str?.toLowerCase() === "true";
}

export function parseLimit(value) {
  const str = toSingleString(value);
  if (str === undefined || str === "") return undefined;

  const num = Number(str);

  if (!Number.isInteger(num) || num <= 0) {
    throw ApiError.badRequest(
      `Invalid "limit" query parameter: "${str}". It must be a positive integer.`
    );
  }

  return num;
}
