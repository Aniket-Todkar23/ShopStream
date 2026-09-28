// src/services/ai.service.js
/**
 * AI Advisor service.
 * Primary: Gemini API (gemini-1.5-flash)
 * Fallback 1: LiteLLM
 * Fallback 2: Rule-based logic
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

function buildInventoryLowPrompt(product, categoryAvg) {
  return `Product Context:
- Name: ${product.name}
- SKU: ${product.sku}
- Category: ${product.category}
- Current Price: $${product.price}
- Current Stock: ${product.stock} units
- Reorder Threshold: ${product.reorderThreshold} units
- Demand Velocity: ${product.demandVelocity} units/day

Trigger: INVENTORY_LOW
The stock level has dropped below the reorder threshold. 

Your merchandising objective:
1. Determine if a price increase is needed to protect remaining inventory and maximize margin on scarce goods, or if price should hold.
2. Calculate the optimal reorder quantity to restore buffer stock based on demand velocity. 

Analyze the situation and recommend pricing and reorder actions.`;
}

function buildDemandSpikePrompt(product, categoryAvg) {
  return `Product Context:
- Name: ${product.name}
- SKU: ${product.sku}
- Category: ${product.category}
- Current Price: $${product.price}
- Current Stock: ${product.stock} units
- Reorder Threshold: ${product.reorderThreshold} units
- Demand Velocity: ${product.demandVelocity} units/day
- Category Avg Demand: ${categoryAvg.toFixed(2)} units/day

Trigger: DEMAND_SPIKE
This product is experiencing unusually high demand compared to its category average.

Your merchandising objective:
1. Capitalize on the spike with a modest price increase to maximize yield, unless stock is so high that clearance is a better strategy.
2. Consider if the current demand trajectory requires an early or larger reorder to prevent an impending stockout.

Analyze the situation and recommend pricing and reorder actions.`;
}

function buildManualPrompt(product, categoryAvg, triggerReason) {
  return `Product Context:
- Name: ${product.name}
- SKU: ${product.sku}
- Category: ${product.category}
- Current Price: $${product.price}
- Current Stock: ${product.stock} units
- Reorder Threshold: ${product.reorderThreshold} units
- Demand Velocity: ${product.demandVelocity} units/day
- Category Avg Demand: ${categoryAvg.toFixed(2)} units/day

Trigger: ${triggerReason}

Business Rules:
- Low stock (stock <= threshold): recommend +10% price increase
- Demand spike (velocity > 2x category avg): recommend +5% price increase  
- Reorder qty formula: max(1, threshold * 3 - current_stock)

Analyze and recommend. Consider the rules as a baseline but apply nuanced judgment.`;
}

/**
 * Parse and validate AI response JSON.
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
 * Make API call to Gemini
 */
async function callGemini(systemPrompt, userPrompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error("No Gemini API key");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  
  const response = await axios.post(url, {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.3 }
  }, { timeout: 15000 });
  
  const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

/**
 * Make API call to LiteLLM
 */
async function callLiteLLM(systemPrompt, userPrompt) {
  const response = await axios.post(
    `${config.ai.baseUrl}/chat/completions`,
    {
      model: config.ai.model,
      messages: [
        { role: "system", content: systemPrompt },
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
  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty LiteLLM response");
  return text;
}

async function callLLM(systemPrompt, userPrompt) {
  let rawContent;
  let source = "AI_GEMINI";
  
  try {
    rawContent = await callGemini(systemPrompt, userPrompt);
  } catch (err) {
    console.warn(`[AI Advisor] Gemini failed (${err.message}), falling back to LiteLLM`);
    rawContent = await callLiteLLM(systemPrompt, userPrompt);
    source = "AI_LITELLM";
  }
  
  return { rawContent, source };
}

async function getAIRecommendations(product, categoryProducts, triggerReason) {
  try {
    const categoryAvg = rulesService.getCategoryAverageDemand(categoryProducts);
    
    let userPrompt;
    if (triggerReason === "INVENTORY_LOW") {
      userPrompt = buildInventoryLowPrompt(product, categoryAvg);
    } else if (triggerReason === "DEMAND_SPIKE") {
      userPrompt = buildDemandSpikePrompt(product, categoryAvg);
    } else {
      userPrompt = buildManualPrompt(product, categoryAvg, triggerReason);
    }

    const { rawContent, source } = await callLLM(SYSTEM_PROMPT, userPrompt);
    
    const parsed = parseAIResponse(rawContent);
    if (!parsed) throw new Error("Malformed AI response JSON");

    // Ensure reorder quantity is a positive integer
    if (parsed.reorder.recommendedQty < 1) parsed.reorder.recommendedQty = 1;
    parsed.reorder.recommendedQty = Math.round(parsed.reorder.recommendedQty);

    return {
      pricing: { ...parsed.pricing, source },
      reorder: { ...parsed.reorder, source },
      source,
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
