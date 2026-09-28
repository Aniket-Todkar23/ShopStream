// src/middleware/errorHandler.js

/**
 * Global Express error handler.
 * Handles Zod validation errors, Prisma known errors, and generic errors.
 */
function errorHandler(err, req, res, next) {
  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation failed",
      details: err.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    });
  }

  // Prisma unique constraint
  if (err.code === "P2002") {
    return res.status(409).json({
      error: "Duplicate entry",
      details: `A record with that ${err.meta?.target?.join(", ")} already exists.`,
    });
  }

  // Prisma record not found
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  if (process.env.NODE_ENV !== "production") {
    console.error("[Error]", err);
  }

  return res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
