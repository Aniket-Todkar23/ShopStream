// src/services/advisor.service.js
/**
 * Agentic/Reactive advisor loop.
 * Handles asynchronous suggestion generation, deduplication, and product event processing.
 */

const prisma = require("../config/prisma");
const aiService = require("./ai.service");

/**
 * Check if a PENDING suggestion already exists for this product + type.
 * Prevents duplicate pending suggestions.
 */
async function hasPendingSuggestion(productId, type) {
  const existing = await prisma.suggestion.findFirst({
    where: { productId, type, status: "PENDING" },
  });
  return !!existing;
}

/**
 * Core: generate and persist pricing + reorder suggestions for a product.
 * Skips if a pending suggestion of the same type already exists.
 *
 * @param {string} productId
 * @param {string} triggerReason - e.g. "LOW_INVENTORY" | "DEMAND_SPIKE" | "MANUAL"
 * @returns {Object} Created suggestions
 */
async function generateSuggestions(productId, triggerReason) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error(`Product ${productId} not found`);

  const categoryProducts = await prisma.product.findMany({
    where: { category: product.category, status: "ACTIVE" },
  });

  // Get AI (or fallback) recommendations
  const recommendations = await aiService.getAIRecommendations(
    product,
    categoryProducts,
    triggerReason
  );

  const { pricing, reorder, source } = recommendations;
  const createdSuggestions = [];

  // Create pricing suggestion if no pending one exists
  const hasPendingPricing = await hasPendingSuggestion(productId, "PRICING");
  if (!hasPendingPricing) {
    const pricingSuggestion = await prisma.suggestion.create({
      data: {
        productId,
        type: "PRICING",
        status: "PENDING",
        triggerReason,
        source,
        currentPrice: product.price,
        recommendedPrice: pricing.recommendedPrice,
        direction: pricing.direction,
        pricingConfidence: pricing.confidence,
        pricingReasoning: pricing.reasoning,
      },
      include: { product: true },
    });
    createdSuggestions.push(pricingSuggestion);
  }

  // Create reorder suggestion if no pending one exists
  const hasPendingReorder = await hasPendingSuggestion(productId, "REORDER");
  if (!hasPendingReorder) {
    const reorderSuggestion = await prisma.suggestion.create({
      data: {
        productId,
        type: "REORDER",
        status: "PENDING",
        triggerReason,
        source,
        currentStock: product.stock,
        recommendedQty: reorder.recommendedQty,
        reorderConfidence: reorder.confidence,
        reorderReasoning: reorder.reasoning,
      },
      include: { product: true },
    });
    createdSuggestions.push(reorderSuggestion);
  }

  return {
    suggestions: createdSuggestions,
    skippedDuplicates: 2 - createdSuggestions.length,
    fallbackReason: recommendations.fallbackReason || null,
  };
}

/**
 * Reactive event handler — called when inventory or demand events occur.
 * Fires asynchronously (non-blocking to the caller).
 *
 * Triggers:
 *  - LOW_INVENTORY: stock <= reorderThreshold
 *  - DEMAND_SPIKE: demandVelocity updated
 */
async function handleProductEvent(productId, eventType) {
  try {
    await generateSuggestions(productId, eventType);
    console.log(`[Advisor] Generated suggestions for product ${productId} (event: ${eventType})`);
  } catch (err) {
    console.error(`[Advisor] Failed to handle event ${eventType} for product ${productId}:`, err.message);
  }
}

/**
 * Accept a PRICING suggestion: update product price.
 */
async function acceptPricingSuggestion(suggestion) {
  const { productId, recommendedPrice, currentPrice, pricingReasoning } = suggestion;

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { price: recommendedPrice },
    }),
    prisma.priceHistory.create({
      data: {
        productId,
        oldPrice: currentPrice,
        newPrice: recommendedPrice,
        reason: `Suggestion accepted: ${pricingReasoning?.substring(0, 200) || "AI recommendation"}`,
      },
    }),
    prisma.suggestion.update({
      where: { id: suggestion.id },
      data: { status: "ACCEPTED" },
    }),
  ]);
}

/**
 * Accept a REORDER suggestion: increase product stock.
 */
async function acceptReorderSuggestion(suggestion) {
  const { productId, recommendedQty } = suggestion;
  const product = await prisma.product.findUnique({ where: { id: productId } });

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { stock: product.stock + recommendedQty },
    }),
    prisma.suggestion.update({
      where: { id: suggestion.id },
      data: { status: "ACCEPTED" },
    }),
  ]);
}

module.exports = { generateSuggestions, handleProductEvent, acceptPricingSuggestion, acceptReorderSuggestion };
