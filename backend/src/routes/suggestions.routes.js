// src/routes/suggestions.routes.js
const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const advisorService = require("../services/advisor.service");

/**
 * @openapi
 * /suggestions:
 *   get:
 *     tags: [Suggestions]
 *     summary: List suggestions with optional filters
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, ACCEPTED, REJECTED]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PRICING, REORDER]
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Suggestion"
 */
router.get("/", async (req, res, next) => {
  try {
    const { status, type, productId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (productId) where.productId = productId;

    const suggestions = await prisma.suggestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { id: true, name: true, sku: true, category: true } } },
    });
    res.json(suggestions);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /suggestions/{id}:
 *   get:
 *     tags: [Suggestions]
 *     summary: Get a single suggestion
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Suggestion object
 *       404:
 *         description: Not found
 */
router.get("/:id", async (req, res, next) => {
  try {
    const suggestion = await prisma.suggestion.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });
    res.json(suggestion);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /suggestions/{id}/accept:
 *   post:
 *     tags: [Suggestions]
 *     summary: Accept a suggestion (applies the change to the product)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Accepted suggestion and updated product
 */
router.post("/:id/accept", async (req, res, next) => {
  try {
    const suggestion = await prisma.suggestion.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });
    if (suggestion.status !== "PENDING") {
      return res.status(400).json({ error: `Suggestion is already ${suggestion.status}` });
    }

    if (suggestion.type === "PRICING") {
      await advisorService.acceptPricingSuggestion(suggestion);
    } else if (suggestion.type === "REORDER") {
      await advisorService.acceptReorderSuggestion(suggestion);
    }

    const updated = await prisma.suggestion.findUnique({
      where: { id: suggestion.id },
      include: { product: true },
    });
    res.json({ message: "Suggestion accepted and applied", suggestion: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /suggestions/{id}/reject:
 *   post:
 *     tags: [Suggestions]
 *     summary: Reject a suggestion (no product changes applied)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rejected suggestion
 */
router.post("/:id/reject", async (req, res, next) => {
  try {
    const suggestion = await prisma.suggestion.findUnique({ where: { id: req.params.id } });
    if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });
    if (suggestion.status !== "PENDING") {
      return res.status(400).json({ error: `Suggestion is already ${suggestion.status}` });
    }

    const updated = await prisma.suggestion.update({
      where: { id: suggestion.id },
      data: { status: "REJECTED" },
      include: { product: true },
    });
    res.json({ message: "Suggestion rejected", suggestion: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /suggestions/stats:
 *   get:
 *     tags: [Suggestions]
 *     summary: Get suggestion statistics
 *     responses:
 *       200:
 *         description: Stats object
 */
router.get("/stats/summary", async (req, res, next) => {
  try {
    const [pending, accepted, rejected, total] = await Promise.all([
      prisma.suggestion.count({ where: { status: "PENDING" } }),
      prisma.suggestion.count({ where: { status: "ACCEPTED" } }),
      prisma.suggestion.count({ where: { status: "REJECTED" } }),
      prisma.suggestion.count(),
    ]);
    res.json({ pending, accepted, rejected, total });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
