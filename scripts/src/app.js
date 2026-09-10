import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
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
const PROPERTY_MAP_SCRIPT = path.join(FRONTEND_DIR, "ui-scripts", "property-map.js");
const MAPS_KEY_PLACEHOLDER = "__GOOGLE_MAPS_API_KEY__";

async function getInjectedPropertyMapScript() {
  const source = await readFile(PROPERTY_MAP_SCRIPT, "utf8");
  const keyLiteral = JSON.stringify(process.env.GOOGLE_MAPS_API_KEY || "");
  return source.replaceAll(MAPS_KEY_PLACEHOLDER, keyLiteral);
}

export function createApp() {
  const app = express();

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

  // API Endpoints
  app.use(propertyRoutes);
  app.use(imagesRoutes);

  // Inject GOOGLE_MAPS_API_KEY from .env into the map script without any extra API route
  app.get("/ui-scripts/property-map.js", async (_req, res, next) => {
    try {
      const source = await getInjectedPropertyMapScript();
      res.setHeader("Cache-Control", "no-store");
      res.type("application/javascript").send(source);
    } catch (err) {
      next(err);
    }
  });

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