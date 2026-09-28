# ShopStream

ShopStream is an AI-powered inventory and pricing management system that helps retailers optimize their merchandise strategies through intelligent suggestions for pricing adjustments and reorder quantities.

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [API Endpoints](#api-endpoints)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [AI Advisor System](#ai-advisor-system)
- [Development](#development)

## Architecture

ShopStream follows a modern microservices-inspired architecture with a monolithic backend:

```
┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │   Backend API    │
│   (React/Vite)  │◄──►│   (Node.js/      │
└─────────────────┘    │   Express)       │
                       └─────────▲────────┘
                                 │
                       ┌─────────▼────────┐
                       │    Database      │
                       │  (PostgreSQL)    │
                       └──────────────────┘
```

### Key Components

1. **Frontend**: React application with Vite for fast development
2. **Backend API**: Node.js/Express server with RESTful endpoints
3. **Database**: PostgreSQL with Prisma ORM for data persistence
4. **AI Advisor**: Intelligent recommendation engine with fallback mechanisms
5. **Documentation**: Swagger/OpenAPI for API documentation

## Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Documentation**: Swagger UI / OpenAPI
- **AI Services**: 
  - Primary: Google Gemini API
  - Secondary: LiteLLM
  - Fallback: Rule-based system

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **Routing**: React Router
- **HTTP Client**: Axios
- **Styling**: CSS Modules

### Infrastructure
- **Containerization**: Docker (planned)
- **Deployment**: Platform-independent

## Features

### Core Functionality
- Real-time inventory tracking
- Automated pricing suggestions

## API Endpoints

### Products

#### GET `/api/products`
List all products with optional filtering
- Query Parameters:
  - `category` (string): Filter by category
  - `status` (string): Filter by status [ACTIVE, DISCONTINUED, OUT_OF_STOCK]

#### GET `/api/products/{id}`
Get a specific product with its pending suggestions and price history

#### POST `/api/products`
Create a new product
- Body: Product object (see schema)

#### PATCH `/api/products/{id}`
Update product fields
- Body: Partial product object

#### PATCH `/api/products/{id}/stock`
Update stock level
- Body: `{ stock: integer }`

#### POST `/api/products/{id}/advise`
Trigger AI advisor for a product
- Body: `{ triggerReason: string }`

#### POST `/api/products/{id}/orders`
Simulate a sale (decreases stock, affects demand velocity)
- Body: `{ quantity: integer }` (default: 1)

#### POST `/api/products/{id}/suggest-pricing`
Generate on-demand pricing suggestion

#### POST `/api/products/{id}/suggest-reorder`
Generate on-demand reorder suggestion

### Suggestions

#### GET `/api/suggestions`
List all suggestions with optional filtering
- Query Parameters:
  - `status` (string): Filter by status [PENDING, ACCEPTED, REJECTED]
  - `type` (string): Filter by type [PRICING, REORDER]
  - `productId` (string): Filter by product ID

#### GET `/api/suggestions/{id}`
Get a specific suggestion

#### POST `/api/suggestions/{id}/accept`
Accept and apply a suggestion

#### POST `/api/suggestions/{id}/reject`
Reject a suggestion

#### GET `/api/suggestions/stats/summary`
Get statistics on suggestions

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- Git
- Docker (recommended for database, but optional)

### Quick Start (Recommended)

Use the provided startup scripts to launch the entire system with one command:

**Windows:**
```bash
start-system.bat
```

**Mac/Linux:**
```bash
chmod +x start-system.sh
./start-system.sh
```

**Cross-platform (requires Node.js):**
```bash
npm start
```

### Manual Setup

If you prefer to start services manually:

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. Run database migrations:
   ```bash
   npm run db:migrate
   ```

5. Seed the database (optional):
   ```bash
   npm run db:seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # The postinstall script will copy .env.example to .env automatically
   # Edit .env with your configuration if needed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Database Setup

The application requires PostgreSQL. You can:

1. **Use Docker (recommended)**: The startup scripts will automatically start a PostgreSQL container
2. **Use existing PostgreSQL installation**: Configure the DATABASE_URL in backend/.env
3. **Use cloud PostgreSQL**: Configure the DATABASE_URL in backend/.env

## Getting Started

### Prerequisites

- Node.js >= 18.x
- PostgreSQL >= 13.x
- npm or yarn
- Git

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. Run database migrations:
   ```bash
   npm run db:migrate
   ```

5. Seed the database (optional):
   ```bash

## Environment Variables

### Backend (.env)

```env
# Server configuration
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shopstream

# AI Configuration
LITELLM_BASE_URL=https://litellm-qc.zycus.net/v1
LITELLM_API_KEY=your_api_key_here
LITELLM_MODEL=qwen-cursor
LITELLM_TIMEOUT_MS=15000
LITELLM_PRODUCT_HEADER=PC1

# AI Configuration (Primary)
GEMINI_API_KEY=your_gemini_api_key_here

# Business Rules

## Database Schema

The database consists of three main models:

### Product
```prisma
model Product {
  id               String   @id @default(uuid())
  sku              String   @unique
  name             String
  category         String
  price            Float
  costPrice        Float?   // Sprint 2: Margin floors
  stock            Int
  reorderThreshold Int
  demandVelocity   Float    @default(0)
  status           String   @default("ACTIVE") // ACTIVE | DISCONTINUED | OUT_OF_STOCK
  supplierId       String?  // Sprint 2: Supplier catalogs
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  suggestions  Suggestion[]
  priceHistory PriceHistory[]
}
```

### Suggestion
```prisma
model Suggestion {
  id              String   @id @default(uuid())
  productId       String
  type            String   // PRICING | REORDER
  status          String   @default("PENDING") // PENDING | ACCEPTED | REJECTED
  triggerReason   String
  source          String   @default("AI") // AI | RULE_BASED

  // Pricing fields
  currentPrice        Float?
  recommendedPrice    Float?
  direction           String?  // INCREASE | DECREASE | HOLD
  pricingConfidence   Float?
  pricingReasoning    String?

  // Reorder fields
  currentStock        Int?
  recommendedQty      Int?
  reorderConfidence   Float?
  reorderReasoning    String?


## AI Advisor System

The AI Advisor is the core intelligence of ShopStream, providing context-aware recommendations for pricing and inventory management.

### Architecture

The system follows a three-tier fallback approach:
1. **Primary**: Google Gemini API
2. **Secondary**: LiteLLM API
3. **Fallback**: Rule-based system

### Triggers

The advisor responds to three types of triggers:
1. **INVENTORY_LOW**: Stock drops below reorder threshold
2. **DEMAND_SPIKE**: Unusually high demand velocity
3. **MANUAL**: User-initiated request

### Recommendation Process

1. Event detection (inventory low, demand spike)
2. Context compilation (product data, category trends)
3. AI analysis (Gemini → LiteLLM → Rules)
4. Suggestion creation in database
5. User review and action

### Response Format

AI responses follow a standardized JSON format:

## Development

### Project Structure

```
shopstream/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   └── index.js
│   ├── env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
└── README.md
```

### Available Scripts

#### Backend
- `npm run dev`: Start development server with file watching
- `npm start`: Start production server
- `npm run db:migrate`: Run database migrations
- `npm run db:seed`: Seed the database
- `npm run db:reset`: Reset the database
- `npm run db:studio`: Open Prisma Studio

#### Frontend
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run linter

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
```json
{
  "pricing": {
    "recommendedPrice": 29.99,
    "direction": "INCREASE",
    "confidence": 0.85,
    "reasoning": "High demand velocity suggests opportunity for yield maximization"
  },
  "reorder": {
    "recommendedQty": 150,
    "confidence": 0.92,
    "reasoning": "Current stock will deplete in 2 days at current velocity"
  }
}
```
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

### PriceHistory
```prisma
model PriceHistory {
  id        String   @id @default(uuid())
  productId String
  oldPrice  Float
  newPrice  Float
  reason    String
  changedAt DateTime @default(now())

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```
DEMAND_SPIKE_MULTIPLIER=2
LOW_STOCK_PRICE_BUMP=0.10
DEMAND_SPIKE_PRICE_BUMP=0.05
```

### Frontend (.env)

```env
# API Configuration
VITE_API_URL=http://localhost:4000
```
   npm run db:seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # The postinstall script will copy .env.example to .env automatically
   # Edit .env with your configuration if needed
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Health

#### GET `/health`
Check API health status

### Documentation

#### GET `/api/docs`
Swagger UI documentation
- Smart reorder recommendations
- Demand velocity monitoring
- Category-based analytics

### AI-Powered Recommendations
- Context-aware pricing adjustments
- Demand spike detection and response
- Low stock inventory protection
- Multi-layer fallback system (AI → LiteLLM → Rules)

### User Interface
- Dashboard with KPIs
- Product catalog management
- Interactive suggestion review
- Visual analytics