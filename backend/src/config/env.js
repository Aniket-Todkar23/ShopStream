// src/config/env.js
require("dotenv").config();

const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  ai: {
    baseUrl: process.env.LITELLM_BASE_URL || "https://litellm-qc.zycus.net/v1",
    apiKey: process.env.LITELLM_API_KEY || "",
    model: process.env.LITELLM_MODEL || "qwen-cursor",
    timeoutMs: parseInt(process.env.LITELLM_TIMEOUT_MS || "15000", 10),
    productHeader: process.env.LITELLM_PRODUCT_HEADER || "PC1",
  },
  thresholds: {
    demandSpikeMultiplier: parseFloat(process.env.DEMAND_SPIKE_MULTIPLIER || "2"),
    lowStockPriceBump: parseFloat(process.env.LOW_STOCK_PRICE_BUMP || "0.10"),
    demandSpikePriceBump: parseFloat(process.env.DEMAND_SPIKE_PRICE_BUMP || "0.05"),
  },
};

module.exports = config;
