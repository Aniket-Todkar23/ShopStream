// src/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const config = require("./config/env");
const swaggerSpec = require("./config/swagger");
const prisma = require("./config/prisma");
const errorHandler = require("./middleware/errorHandler");

const productRoutes = require("./routes/products.routes");
const suggestionRoutes = require("./routes/suggestions.routes");
const pricingSuggestionRoutes = require("./routes/pricing-suggestions.routes");
const reorderSuggestionRoutes = require("./routes/reorder-suggestions.routes");
const chatRoutes = require("./routes/chat.routes");

const app = express();

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.frontendUrl,
    credentials: true,
  })
);
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", env: config.nodeEnv, timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/products", productRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/pricing-suggestions", pricingSuggestionRoutes);
app.use("/api/reorder-suggestions", reorderSuggestionRoutes);
app.use("/api/chat", chatRoutes);

// ─── Swagger Docs ─────────────────────────────────────────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
async function start() {
  try {
    // Verify DB connection before booting
    await prisma.$connect();
    console.log("✅  Database connected (PostgreSQL)");

    app.listen(config.port, () => {
      console.log(`🚀  ShopStream API running on http://localhost:${config.port}`);
      console.log(`📖  Swagger docs at   http://localhost:${config.port}/api/docs`);
    });
  } catch (err) {
    console.error("❌  Failed to start server:", err.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("\n👋  Server shut down gracefully");
  process.exit(0);
});

start();
