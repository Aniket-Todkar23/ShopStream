// src/validators/product.validators.js
const { z } = require("zod");

const CreateProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  reorderThreshold: z.number().int().min(1),
  demandVelocity: z.number().min(0).optional().default(0),
  status: z.enum(["ACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]).optional().default("ACTIVE"),
});

const UpdateProductSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
  reorderThreshold: z.number().int().min(1).optional(),
  demandVelocity: z.number().min(0).optional(),
  status: z.enum(["ACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]).optional(),
});

const UpdateStockSchema = z.object({
  stock: z.number().int().min(0),
});

const TriggerAdvisorSchema = z.object({
  triggerReason: z.string().optional().default("MANUAL"),
});

module.exports = {
  CreateProductSchema,
  UpdateProductSchema,
  UpdateStockSchema,
  TriggerAdvisorSchema,
};
