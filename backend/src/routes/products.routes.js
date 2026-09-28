// src/routes/products.routes.js
const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const advisorService = require("../services/advisor.service");
const {
  CreateProductSchema,
  UpdateProductSchema,
  UpdateStockSchema,
  TriggerAdvisorSchema,
} = require("../validators/product.validators");

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Products]
 *     summary: List all products
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, DISCONTINUED, OUT_OF_STOCK]
 *     responses:
 *       200:
 *         description: Array of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Product"
 */
router.get("/", async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const where = {};
    if (category) where.category = category;
    if (status) where.status = status;

    const products = await prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { suggestions: { where: { status: "PENDING" } } } },
      },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get a single product with its pending suggestions
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product with suggestions
 *       404:
 *         description: Not found
 */
router.get("/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        suggestions: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" } },
        priceHistory: { orderBy: { changedAt: "desc" }, take: 10 },
      },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/Product"
 *     responses:
 *       201:
 *         description: Created product
 *       400:
 *         $ref: "#/components/schemas/Error"
 */
router.post("/", async (req, res, next) => {
  try {
    const data = CreateProductSchema.parse(req.body);
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update product fields
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/Product"
 *     responses:
 *       200:
 *         description: Updated product
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const data = UpdateProductSchema.parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
    });

    // Reactive: trigger advisor on demand velocity or stock changes
    if (data.demandVelocity !== undefined || data.stock !== undefined) {
      const triggerReason = data.stock !== undefined && product.stock <= product.reorderThreshold
        ? "LOW_INVENTORY"
        : "DEMAND_SPIKE";
      setImmediate(() => advisorService.handleProductEvent(product.id, triggerReason));
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /products/{id}/stock:
 *   patch:
 *     tags: [Products]
 *     summary: Update product stock level
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated product
 */
router.patch("/:id/stock", async (req, res, next) => {
  try {
    const { stock } = UpdateStockSchema.parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { stock },
    });

    // Reactive: if low stock, fire advisor asynchronously
    if (stock <= product.reorderThreshold) {
      setImmediate(() => advisorService.handleProductEvent(product.id, "LOW_INVENTORY"));
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /products/{id}/advise:
 *   post:
 *     tags: [AI]
 *     summary: Manually trigger AI advisor for a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               triggerReason:
 *                 type: string
 *                 default: MANUAL
 *     responses:
 *       200:
 *         description: Generated suggestions
 */
router.post("/:id/advise", async (req, res, next) => {
  try {
    const { triggerReason } = TriggerAdvisorSchema.parse(req.body);
    const result = await advisorService.generateSuggestions(req.params.id, triggerReason);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /products/{id}/price-history:
 *   get:
 *     tags: [Products]
 *     summary: Get price change history for a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Price history array
 */
router.get("/:id/price-history", async (req, res, next) => {
  try {
    const history = await prisma.priceHistory.findMany({
      where: { productId: req.params.id },
      orderBy: { changedAt: "desc" },
    });
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
