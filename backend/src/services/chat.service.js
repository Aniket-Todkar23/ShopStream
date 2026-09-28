const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Extract product name or SKU from question
function extractProductInfo(question) {
  const productPatterns = [
    /product ([\w\s\-']+)(?:\?|$)/i,
    /item ([\w\s\-']+)(?:\?|$)/i,
    /sku ([\w\d\-]+)(?:\?|$)/i,
    /for ([\w\s\-']+)(?:\?|$)/i
  ];
  
  for (const pattern of productPatterns) {
    const match = question.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

// Simple intent recognition
function getIntent(question) {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes("stock") || lowerQuestion.includes("inventory")) {
    if (lowerQuestion.includes("low") || lowerQuestion.includes("out of")) {
      return "LOW_STOCK";
    }
    if (lowerQuestion.includes("how many") || lowerQuestion.includes("count") || lowerQuestion.includes("level")) {
      return "STOCK_LEVEL";
    }
    return "STOCK_INFO";
  }
  
  if (lowerQuestion.includes("suggestion") || lowerQuestion.includes("suggest")) {
    if (lowerQuestion.includes("pending") || lowerQuestion.includes("waiting")) {
      return "PENDING_SUGGESTIONS";
    }
    if (lowerQuestion.includes("why") || lowerQuestion.includes("reason")) {
      return "SUGGESTION_REASON";
    }
    return "SUGGESTIONS_INFO";
  }
  
  if (lowerQuestion.includes("demand") || lowerQuestion.includes("velocity")) {
    return "DEMAND_INFO";
  }
  
  if (lowerQuestion.includes("price") || lowerQuestion.includes("cost")) {
    return "PRICE_INFO";
  }
  
  return "UNKNOWN";
}

// Process chat query and generate response
async function processChatQuery(question) {
  const intent = getIntent(question);
  const productInfo = extractProductInfo(question);
  
  try {
    switch (intent) {
      case "LOW_STOCK": {
        const lowStockProducts = await prisma.product.findMany({
          where: {
            stock: {
              lte: 10
            }
          },
          take: 10,
          orderBy: {
            stock: "asc"
          }
        });
        
        if (lowStockProducts.length === 0) {
          return "Great news! All your products have sufficient stock levels.";
        }
        
        const lowStockList = lowStockProducts.map(p => `${p.name} (${p.sku}): ${p.stock} units`).join("\n");
        return `Here are products with low stock (10 units or less):\n\n${lowStockList}`;
      }
        
      case "STOCK_LEVEL": {
        if (productInfo) {
          const product = await prisma.product.findFirst({
            where: {
              OR: [
                { name: { contains: productInfo, mode: "insensitive" } },
                { sku: { equals: productInfo, mode: "insensitive" } }
              ]
            }
          });
          
          if (product) {
            return `The current stock level for ${product.name} (${product.sku}) is ${product.stock} units.`;
          } else {
            return `I couldn't find a product matching "${productInfo}". Could you check the product name or SKU?`;
          }
        } else {
          const totalProducts = await prisma.product.count();
          const totalStock = await prisma.product.aggregate({
            _sum: {
              stock: true
            }
          });
          
          return `You currently have ${totalProducts} products in your inventory with a total of ${totalStock._sum.stock || 0} units in stock.`;
        }
      }
        
      case "PENDING_SUGGESTIONS": {
        const pendingSuggestions = await prisma.suggestion.findMany({
          where: {
            status: "PENDING"
          },
          include: {
            product: true
          },
          take: 10
        });
        
        if (pendingSuggestions.length === 0) {
          return "You don't have any pending suggestions right now.";
        }
        
        const suggestionList = pendingSuggestions.map(s => 
          `- ${s.type === "PRICING" ? "Price adjustment" : "Reorder"} for ${s.product.name} (${s.product.sku})`
        ).join("\n");
        
        return `You have ${pendingSuggestions.length} pending suggestion(s):\n\n${suggestionList}`;
      }

      case "SUGGESTION_REASON": {
        if (productInfo) {
          const product = await prisma.product.findFirst({
            where: {
              OR: [
                { name: { contains: productInfo, mode: "insensitive" } },
                { sku: { equals: productInfo, mode: "insensitive" } }
              ]
            }
          });
          
          if (product) {
            const recentSuggestion = await prisma.suggestion.findFirst({
              where: {
                productId: product.id
              },
              orderBy: {
                createdAt: "desc"
              }
            });
            
            if (recentSuggestion) {
              return `The suggestion for ${product.name} was generated because: ${recentSuggestion.reasoning}`;
            } else {
              return `There are no recent suggestions for ${product.name}.`;
            }
          } else {
            return `I couldn't find a product matching "${productInfo}".`;
          }
        } else {
          return "Please specify which product you'd like to know the suggestion reason for.";
        }
      }

      case "DEMAND_INFO": {
        const highDemandProducts = await prisma.product.findMany({
          where: {
            demandVelocity: {
              gte: 5
            }
          },
          take: 10,
          orderBy: {
            demandVelocity: "desc"
          }
        });
        
        if (highDemandProducts.length === 0) {
          return "No products are showing particularly high demand right now.";
        }
        
        const demandList = highDemandProducts.map(p => 
          `${p.name} (${p.sku}): demand velocity ${p.demandVelocity}`
        ).join("\n");
        
        return `Here are your high-demand products (velocity >= 5):\n\n${demandList}`;
      }
        
      case "PRICE_INFO": {
        if (productInfo) {
          const product = await prisma.product.findFirst({
            where: {
              OR: [
                { name: { contains: productInfo, mode: "insensitive" } },
                { sku: { equals: productInfo, mode: "insensitive" } }
              ]
            }
          });
          
          if (product) {
            return `The current price for ${product.name} (${product.sku}) is $${product.price.toFixed(2)}.`;
          } else {
            return `I couldn't find a product matching "${productInfo}".`;
          }
        } else {
          const avgPrice = await prisma.product.aggregate({
            _avg: {
              price: true
            }
          });
          
          return `Your average product price is $${(avgPrice._avg.price || 0).toFixed(2)}.`;
        }
      }
        
      default:
        return "I can help you with questions about your inventory, products, and suggestions. Try asking about:\n• Stock levels for specific products\n• Products with low inventory\n• Pending suggestions\n• Reasons for specific suggestions\n• Product demand information\n• Price information";
    }
  } catch (error) {
    console.error("Error processing chat query:", error);
    return "Sorry, I encountered an error while processing your query. Please try rephrasing your question.";
  }
}

module.exports = {
  processChatQuery
};