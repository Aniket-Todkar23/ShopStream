// src/services/rules.service.js
/**
 * Rule-based commerce logic for pricing and reorder recommendations.
 * Used as fallback when AI is unavailable.
 */

const config = require("../config/env");

/**
 * Calculate category average demand velocity from a list of products.
 * @param {Array} products - All products in the same category
 * @returns {number} Average demand velocity
 */
function getCategoryAverageDemand(products) {
  if (!products || products.length === 0) return 0;
  const total = products.reduce((sum, p) => sum + p.demandVelocity, 0);
  return total / products.length;
}

/**
 * Generate a rule-based pricing recommendation.
 * Rules:
 *   - Low stock (stock <= reorderThreshold) -> +10% price (INCREASE)
 *   - Demand velocity > 2x category average -> +5% price (INCREASE)
 *   - Otherwise -> HOLD
 *
 * @param {Object} product - The product to evaluate
 * @param {Array} categoryProducts - All products in the same category (for average)
 * @returns {Object} Pricing recommendation
 */
function generatePricingRecommendation(product, categoryProducts) {
  const categoryAvgDemand = getCategoryAverageDemand(categoryProducts);
  const { lowStockPriceBump, demandSpikePriceBump, demandSpikeMultiplier } = config.thresholds;

  let recommendedPrice = product.price;
  let direction = "HOLD";
  let confidence = 0.7;
  let reasoning = "No significant demand or inventory signals detected. Maintaining current price.";

  const isLowStock = product.stock <= product.reorderThreshold;
  const isDemandSpike =
    categoryAvgDemand > 0 &&
    product.demandVelocity > categoryAvgDemand * demandSpikeMultiplier;

  if (isLowStock) {
    recommendedPrice = parseFloat((product.price * (1 + lowStockPriceBump)).toFixed(2));
    direction = "INCREASE";
    confidence = 0.85;
    reasoning = `Stock (${product.stock}) is at or below reorder threshold (${product.reorderThreshold}). ` +
      `Applying ${(lowStockPriceBump * 100).toFixed(0)}% price increase to manage demand.`;
  } else if (isDemandSpike) {
    recommendedPrice = parseFloat((product.price * (1 + demandSpikePriceBump)).toFixed(2));
    direction = "INCREASE";
    confidence = 0.8;
    reasoning = `Demand velocity (${product.demandVelocity}) exceeds ${demandSpikeMultiplier}x category average ` +
      `(${categoryAvgDemand.toFixed(2)}). Applying ${(demandSpikePriceBump * 100).toFixed(0)}% price increase.`;
  }

  return {
    currentPrice: product.price,
    recommendedPrice,
    direction,
    confidence,
    reasoning,
    source: "RULE_BASED",
  };
}

/**
 * Generate a rule-based reorder recommendation.
 * Formula: recommendedQty = max(1, (reorderThreshold * 3) - currentStock)
 *
 * @param {Object} product - The product to evaluate
 * @returns {Object} Reorder recommendation
 */
function generateReorderRecommendation(product) {
  const recommendedQty = Math.max(1, product.reorderThreshold * 3 - product.stock);
  const isUrgent = product.stock <= product.reorderThreshold;

  return {
    currentStock: product.stock,
    recommendedQty,
    confidence: isUrgent ? 0.9 : 0.7,
    reasoning: isUrgent
      ? `Stock (${product.stock}) is at or below threshold (${product.reorderThreshold}). ` +
        `Urgent reorder of ${recommendedQty} units recommended.`
      : `Proactive reorder of ${recommendedQty} units to maintain healthy stock levels ` +
        `(threshold: ${product.reorderThreshold}).`,
    source: "RULE_BASED",
  };
}

module.exports = { generatePricingRecommendation, generateReorderRecommendation, getCategoryAverageDemand };
