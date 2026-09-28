// prisma/seed.js
const prisma = require("../src/config/prisma");

const products = [
  {
    sku: "ELEC-001",
    name: "Wireless Headphones Pro",
    category: "Electronics",
    price: 129.99,
    stock: 8,
    reorderThreshold: 10,
    demandVelocity: 4.5,
    status: "ACTIVE",
  },
  {
    sku: "ELEC-002",
    name: "Smart Watch Series X",
    category: "Electronics",
    price: 299.99,
    stock: 3,
    reorderThreshold: 15,
    demandVelocity: 8.2,
    status: "ACTIVE",
  },
  {
    sku: "APRL-001",
    name: "Premium Running Shoes",
    category: "Apparel",
    price: 89.99,
    stock: 45,
    reorderThreshold: 20,
    demandVelocity: 2.1,
    status: "ACTIVE",
  },
  {
    sku: "APRL-002",
    name: "Winter Jacket Deluxe",
    category: "Apparel",
    price: 199.99,
    stock: 12,
    reorderThreshold: 10,
    demandVelocity: 1.8,
    status: "ACTIVE",
  },
  {
    sku: "HOME-001",
    name: "Air Purifier 500X",
    category: "Home",
    price: 249.99,
    stock: 5,
    reorderThreshold: 8,
    demandVelocity: 3.3,
    status: "ACTIVE",
  },
  {
    sku: "HOME-002",
    name: "Coffee Maker Deluxe",
    category: "Home",
    price: 79.99,
    stock: 30,
    reorderThreshold: 15,
    demandVelocity: 2.0,
    status: "ACTIVE",
  },
  {
    sku: "BOOK-001",
    name: "Modern Web Dev Handbook",
    category: "Books",
    price: 34.99,
    stock: 100,
    reorderThreshold: 25,
    demandVelocity: 5.5,
    status: "ACTIVE",
  },
];

async function main() {
  console.log("Seeding database...");
  for (const product of products) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  console.log(`Seeded ${products.length} products.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
