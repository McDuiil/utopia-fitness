import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection] at:', promise, 'reason:', reason);
  });

  // API routes can go here
  app.get("/api/health", (req, res) => {
    console.log(`[Health Check] Hit at ${new Date().toISOString()}`);
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === "production";
  console.log(`[Server] Detected Mode: ${isProd ? 'Production' : 'Development'}`);

  if (!isProd) {
    console.log("Starting in development mode with Vite middleware...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("[Vite] Middleware integrated successfully.");
    } catch (e) {
      console.error("[Vite] Failed to start Vite server:", e);
      app.get("*", (req, res) => {
        res.status(500).send("Vite initialization failed. Check server logs.");
      });
    }
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(__dirname, 'dist');
    
    // Ensure dist exists
    if (!fs.existsSync(distPath)) {
      console.error("Dist folder not found! Please run npm run build first.");
    }

    app.use(express.static(distPath));
    
    // Fallback for SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Started successfully at ${new Date().toISOString()}`);
    console.log(`[Server] Running on http://0.0.0.0:${PORT}`);
    console.log(`[Server] NODE_ENV: ${process.env.NODE_ENV}`);
    
    // Heartbeat log every 30 seconds to confirm process is alive
    setInterval(() => {
      console.log(`[Server] Heartbeat: ${new Date().toISOString()} - Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
    }, 30000);
  });
}

startServer();
