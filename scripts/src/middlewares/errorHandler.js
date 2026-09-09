import { ApiError } from "../utils/ApiError.js";

export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  console.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" ? { debug: message } : {}),
  });
}
