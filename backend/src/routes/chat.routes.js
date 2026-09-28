const { Router } = require("express");
const { processChatQuery } = require("../services/chat.service.js");

const router = Router();

// POST /api/chat/query
router.post("/query", async (req, res) => {
  try {
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }
    
    const answer = await processChatQuery(question);
    res.json({ answer });
  } catch (error) {
    console.error("Chat query error:", error);
    res.status(500).json({ error: "Failed to process chat query" });
  }
});

module.exports = router;