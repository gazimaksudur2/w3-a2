import { createApp } from "./app.js";
import { warmPropertyCache } from "./services/property.service.js";
import { warmImagesCache } from "./services/images.service.js";

const PORT = Number(process.env.PORT) || 3000;

async function main() {
  try {
    await Promise.all([warmPropertyCache(), warmImagesCache()]);

    const app = createApp();

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    const shutdown = (signal) => {
      console.log(`\nGot ${signal}, closing server...`);
      server.close(() => {
        console.log("Server closed.");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

main();
