import { getImages } from "../services/images.service.js";
import { parseBooleanFlag } from "../utils/queryParsers.js";

export function getImagesList(req, res, next) {
  try {
    const images = getImages();
    const full = parseBooleanFlag(req.query.full);

    // default is just the paths; ?full=true gives id/path/alt
    res.status(200).json(full ? images : images.map((img) => img.path));
  } catch (err) {
    next(err);
  }
}
