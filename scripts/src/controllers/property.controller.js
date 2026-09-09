import { getDataset } from "../services/property.service.js";
import { parseBooleanFlag, parseLimit } from "../utils/queryParsers.js";
import { ApiError } from "../utils/ApiError.js";

export function getProperty(req, res, next) {
  try {
    const mostPopular = parseBooleanFlag(req.query["most-popular"]);
    const highestPrice = parseBooleanFlag(req.query["highest-price"]);
    const lowestPrice = parseBooleanFlag(req.query["lowest-price"]);

    const selected = [];
    if (mostPopular) selected.push("most-popular");
    if (highestPrice) selected.push("highest-price");
    if (lowestPrice) selected.push("lowest-price");

    if (selected.length === 0) {
      throw ApiError.badRequest(
        'Missing dataset selector. Provide one of: "most-popular=true", "highest-price=true", "lowest-price=true".'
      );
    }

    if (selected.length > 1) {
      throw ApiError.badRequest(
        `Only one dataset selector may be true at a time. Received: ${selected.join(", ")}.`
      );
    }

    const limit = parseLimit(req.query.limit);
    const dataset = getDataset(selected[0], limit);

    res.status(200).json(dataset);
  } catch (err) {
    next(err);
  }
}
