// src/services/ai.service.js
/**
 * AI Advisor service using LiteLLM → qwen-cursor.
 * Falls back to rule-based logic on timeout, error, quota exceeded, or malformed response.
 */

const axios = require("axios");
const config = require("../config/env");
const rulesService = require("./rules.service");

const SYSTEM_PROMPT = `You are ShopStream's AI pricing and inventory advisor.
Your role is to analyze product data and generate actionable pricing and reorder recommendations.
Always respond with a single valid JSON object. No markdown, no explanation outside JSON.

Response schema:
{
  "pricing": {
    "recommendedPrice": <number>,
    "direction": "INCREASE" | "DECREASE" | "HOLD",
    "confidence": <0.0-1.0>,
    "reasoning": "<concise explanation>"
  },
  "reorder": {
    "recommendedQty": <positive integer>,
    "confidence": <0.0-1.0>,
    "reasoning": "<concise explanation>"
  }
}`;

/**
 * Build the user prompt for the AI advisor.
 */
function buildUserPrompt(product, categoryProducts, triggerReason) {
  const categoryAvg = rulesService.getCategoryAverageDemand(categoryProducts);
  return `Product Context:
- Name: ${product.name}
- SKU: ${product.sku}
- Category: ${product.category}
- Current Price: $${product.price}
- Current Stock: ${product.stock} units
- Reorder Threshold: ${product.reorderThreshold} units
- Demand Velocity: ${product.demandVelocity} units/day
- Category Avg Demand: ${categoryAvg.toFixed(2)} units/day
- Status: ${product.status}

Trigger: ${triggerReason}

Business Rules:
- Low stock (stock <= threshold): recommend +10% price increase
- Demand spike (velocity > 2x category avg): recommend +5% price increase  
- Reorder qty formula: max(1, threshold * 3 - current_stock)

Analyze and recommend. Consider the rules as a baseline but apply nuanced judgment.`;
}

/**
 * Parse and validate AI response JSON.
 * Returns null if invalid.
 */
function parseAIResponse(rawContent) {
  try {
    const cleaned = rawContent.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);

    const { pricing, reorder } = parsed;
    if (
      !pricing ||
      typeof pricing.recommendedPrice !== "number" ||
      !["INCREASE", "DECREASE", "HOLD"].includes(pricing.direction) ||
      typeof pricing.confidence !== "number" ||
      typeof pricing.reasoning !== "string"
    ) {
      return null;
    }
    if (
      !reorder ||
      typeof reorder.recommendedQty !== "number" ||
      typeof reorder.confidence !== "number" ||
      typeof reorder.reasoning !== "string"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Call LiteLLM to get AI recommendations.
 * Falls back to rule-based on any failure.
 *
 * @param {Object} product - Product data
 * @param {Array} categoryProducts - Products in same category
 * @param {string} triggerReason - Why this was triggered
 * @returns {{ pricing: Object, reorder: Object, source: string }}
 */
async function getAIRecommendations(product, categoryProducts, triggerReason) {
  try {
    const userPrompt = buildUserPrompt(product, categoryProducts, triggerReason);

    const response = await axios.post(
      `${config.ai.baseUrl}/chat/completions`,
      {
        model: config.ai.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
      },
      {
        timeout: config.ai.timeoutMs,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.ai.apiKey}`,
          product: config.ai.productHeader,
        },
      }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Empty AI response");

    const parsed = parseAIResponse(rawContent);
    if (!parsed) throw new Error("Malformed AI response JSON");

    return {
      pricing: { ...parsed.pricing, source: "AI" },
      reorder: { ...parsed.reorder, source: "AI" },
      source: "AI",
    };
  } catch (err) {
    const reason = err.code === "ECONNABORTED"
      ? "AI timeout"
      : err.response?.status === 429
      ? "AI quota exceeded"
      : err.message?.includes("Malformed")
      ? "Malformed AI response"
      : `AI error: ${err.message}`;

    console.warn(`[AI Advisor] Falling back to rules. Reason: ${reason}`);

    const pricingFallback = rulesService.generatePricingRecommendation(product, categoryProducts);
    const reorderFallback = rulesService.generateReorderRecommendation(product);

    return {
      pricing: pricingFallback,
      reorder: reorderFallback,
      source: "RULE_BASED",
      fallbackReason: reason,
    };
  }
}

module.exports = { getAIRecommendations };
