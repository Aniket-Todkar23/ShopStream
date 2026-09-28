<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</div>

<h1 align="center">🛍️ ShopStream (StockPulse)</h1>

<p align="center">
  <strong>AI-Powered Inventory & Pricing Management System</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/platform-windows%20%7C%20macos%20%7C%20linux-lightgrey" alt="Platforms" />
</p>

---

## 🌟 What is ShopStream?

ShopStream (also known as StockPulse) is an intelligent commerce platform that helps retailers optimize their inventory and pricing strategies using artificial intelligence. Unlike traditional inventory management systems, ShopStream doesn't just track stock—it actively suggests smart actions to maximize profits and minimize waste.

### 🔮 AI-Powered Intelligence
- **Smart Pricing**: Automatically suggests optimal prices based on demand patterns.
- **Inventory Forecasting**: Predicts when to reorder stock before running out.
- **Support Chat Panel**: Ask questions about your inventory and get instant database answers via the AI Assistant.
- **Trend Analysis**: Identifies sales patterns and seasonal fluctuations.

### 🎯 Key Features

| Feature | Description |
|--------|-------------|
| **🎯 Real-time Inventory Tracking** | Monitor stock levels across all products instantly. |
| **🤖 AI Advisor** | Get intelligent suggestions for pricing and reordering. |
| **📈 Demand Analytics** | Understand which products are trending up or down. |
| **📊 Interactive Dashboard** | Visualize key metrics at a glance. |
| **⚡ One-click Actions** | Implement AI suggestions with a single click. |
| **💬 AI Assistant Chat** | Chat with the AI directly from the UI for data insights. |

---

## 🚀 Quick Start

Ready to dive in? Get ShopStream running in minutes!

### Prerequisites
Before you begin, make sure you have these installed:
- **Node.js** (version 18 or higher)
- **PostgreSQL** (running locally or via Docker)
- **Git**

### One-Command Startup (Recommended)

1. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/yourusername/shopstream.git
   cd shopstream
   ```
2. Start everything using the provided script (which boots both frontend and backend):
   ```bash
   # On Windows
   start-system.bat
   
   # On macOS/Linux
   chmod +x start-system.sh
   ./start-system.sh
   ```

### Manual Setup

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   # Make sure to copy .env.example to .env and configure your DB / AI Keys
   npm run dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Access the Application**:
   - **Frontend App**: http://localhost:5173
   - **Backend API**: http://localhost:4000
   - **API Documentation**: http://localhost:4000/api/docs

---

## 🏗️ Technical Architecture

### System Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Frontend      │    │   Backend API    │    │   PostgreSQL     │
│   React/Vite    │◄──►│   Node/Express   │◄──►│   Database       │
└─────────────────┘    └──────────────────┘    └──────────────────┘
         ▲                      ▲                      
         │                ┌─────┴─────┐                
         │                │  AI Layer │                
         │                │ (LiteLLM/ │                
         │                │ Gemini)   │                
         │                └───────────┘                
         │                                              
┌─────────────────┐                                    
│   User Browser  │                                    
└─────────────────┘                                    
```

### Technology Stack

**Frontend**
- React 18+ with Hooks
- Vite for blazing-fast development
- Modern CSS (Custom Design System)
- Axios for API communication

**Backend**
- Node.js with Express framework
- PostgreSQL with Prisma ORM
- RESTful API architecture
- Swagger/OpenAPI documentation

**AI Intelligence**
- **LiteLLM**: Standardized AI integration.
- **Gemini API**: Primary inference provider.
- **Rule-based Fallback**: Reliable algorithm when AI is unavailable.
- **Contextual Prompting**: Rich system context to make inventory decisions.

---

## 🧠 How ShopStream Works

1. **🛒 Product Management**
   - Add, edit, and organize your product catalog.
   - Monitor demand velocity in real-time by simulating sales.

2. **🤖 AI Advisory Engine**
   - **Demand Spike Detection**: When products sell faster than usual, the system automatically triggers AI analysis to suggest price hikes or reorder adjustments.
   - **Low Stock Protection**: Immediate alert generation when inventory runs low, complete with restock recommendations.

3. **💬 AI Chat Assistant**
   - Located in the bottom right corner of the dashboard.
   - Ask questions like: "What products have low stock?", "Show me pending suggestions", or "What's the current price for Wireless Headphones?"

4. **💡 Smart Suggestions**
   - Review pending AI suggestions on the **AI Suggestions** tab.
   - Read the AI's reasoning, accept recommendations with one click, or reject them.

---

## 📚 API Documentation

Complete API documentation is available at: http://localhost:4000/api/docs

### Key Endpoints

#### Product Management
- `GET /api/products` - List all products
- `POST /api/products` - Create new product
- `GET /api/products/:id` - Get product details
- `PATCH /api/products/:id` - Update product
- `PATCH /api/products/:id/stock` - Update stock level

#### AI Interaction
- `POST /api/products/:id/advise` - Trigger AI advisory
- `POST /api/chat/query` - Interact with the AI Assistant

#### Suggestions System
- `GET /api/suggestions` - List all suggestions
- `POST /api/suggestions/:id/accept` - Accept suggestion
- `POST /api/suggestions/:id/reject` - Reject suggestion

---



<p align="center">
  Made For Zycus Hackathon
</p>
