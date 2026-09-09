import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import propertyRoutes from "./routes/property.routes.js";
import imagesRoutes from "./routes/images.routes.js";
import { notFoundHandler } from "./middlewares/notFound.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths to static folders
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const FRONTEND_DIR = path.join(__dirname, "..", ".."); // Root directory with index.html & style.css

export function createApp() {
  const app = express();

  // Helmet relaxed for cross-origin resources (images, Google Maps iframe)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(cors());
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(express.json());

  // Health check
  app.get("/health", (req, res) => {
    res.status(200).json({ success: true, status: "ok" });
  });

  // 1. API Endpoints
  app.use(propertyRoutes);
  app.use(imagesRoutes);

  // 2. Static image serving for the API dataset
  app.use(express.static(PUBLIC_DIR));

  // 3. Serve Frontend (index.html, style.css, assets/)
  app.use(express.static(FRONTEND_DIR));

  // Fallback to index.html for root path
  app.get("/", (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, "index.html"));
  });

  // 4. Error handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}