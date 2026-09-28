const express = require("express");
const router = express.Router();
const prisma = require("../config/prisma");
const advisorService = require("../services/advisor.service");

router.patch("/:id", async (req, res, next) => {
  try {
    const { status } = req.body; // ACCEPTED or REJECTED
    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "status must be ACCEPTED or REJECTED" });
    }

    const suggestion = await prisma.suggestion.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    
    if (!suggestion) return res.status(404).json({ error: "Suggestion not found" });
    if (suggestion.type !== "PRICING") return res.status(400).json({ error: "Not a pricing suggestion" });
    if (suggestion.status !== "PENDING") return res.status(400).json({ error: `Suggestion is already ${suggestion.status}` });

    if (status === "ACCEPTED") {
      await advisorService.acceptPricingSuggestion(suggestion);
    } else {
      await prisma.suggestion.update({
        where: { id: suggestion.id },
        data: { status: "REJECTED" }
      });
    }

    const updated = await prisma.suggestion.findUnique({
      where: { id: suggestion.id },
      include: { product: true },
    });
    res.json({ message: `Suggestion ${status.toLowerCase()}`, suggestion: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
