// src/config/swagger.js
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ShopStream AI Pricing Advisor API",
      version: "1.0.0",
      description:
        "REST API for ShopStream - AI-powered inventory and dynamic pricing advisor. " +
        "Manages products, generates AI pricing/reorder recommendations, and provides human-approval workflow.",
      contact: { name: "ShopStream Team" },
    },
    servers: [{ url: "http://localhost:4000/api", description: "Local Dev Server" }],
    tags: [
      { name: "Products", description: "Product & Inventory management" },
      { name: "Suggestions", description: "Pricing & Reorder recommendations" },
      { name: "AI", description: "AI advisor triggers" },
    ],
    components: {
      schemas: {
        Product: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            sku: { type: "string", example: "ELEC-001" },
            name: { type: "string", example: "Wireless Headphones Pro" },
            category: { type: "string", example: "Electronics" },
            price: { type: "number", format: "float", example: 129.99 },
            stock: { type: "integer", example: 8 },
            reorderThreshold: { type: "integer", example: 10 },
            demandVelocity: { type: "number", format: "float", example: 4.5 },
            status: { type: "string", enum: ["ACTIVE", "DISCONTINUED", "OUT_OF_STOCK"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Suggestion: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            productId: { type: "string", format: "uuid" },
            type: { type: "string", enum: ["PRICING", "REORDER"] },
            status: { type: "string", enum: ["PENDING", "ACCEPTED", "REJECTED"] },
            triggerReason: { type: "string" },
            source: { type: "string", enum: ["AI", "RULE_BASED"] },
            currentPrice: { type: "number", nullable: true },
            recommendedPrice: { type: "number", nullable: true },
            direction: { type: "string", enum: ["INCREASE", "DECREASE", "HOLD"], nullable: true },
            pricingConfidence: { type: "number", nullable: true },
            pricingReasoning: { type: "string", nullable: true },
            currentStock: { type: "integer", nullable: true },
            recommendedQty: { type: "integer", nullable: true },
            reorderConfidence: { type: "number", nullable: true },
            reorderReasoning: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            details: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
