import { useState, useEffect } from "react";
import { ToastProvider } from "./components/Toast";
import { getSuggestionStats, getHealth } from "./api";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Suggestions from "./pages/Suggestions";
import "./index.css";

const TABS = [
  { id: "dashboard",   label: "Dashboard",       icon: "◈" },
  { id: "products",    label: "Products",         icon: "▦" },
  { id: "suggestions", label: "AI Suggestions",   icon: "✦" },
];

function Navbar({ tab, setTab, pendingCount, apiOk }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">⚡</div>
        <span>StockPulse</span>
      </div>

      <div className="navbar-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`nav-tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span>
            <span className="tab-label">{t.label}</span>
            {t.id === "suggestions" && pendingCount > 0 && (
              <span className="tab-badge">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="navbar-right">
        <div className="api-status">
          <div className={`api-dot ${apiOk === true ? "ok" : apiOk === false ? "error" : ""}`} />
          <span>{apiOk === true ? "API connected" : apiOk === false ? "API offline" : "Connecting…"}</span>
        </div>
      </div>
    </nav>
  );
}

function AppInner() {
  const [tab, setTab]               = useState("dashboard");
  const [productId, setProductId]   = useState(null);
  const [pendingCount, setPending]  = useState(0);
  const [apiOk, setApiOk]           = useState(null);
  const [suggestionsKey, setSuggestionsKey] = useState(0); // force remount on tab switch

  // Check API health
  useEffect(() => {
    getHealth()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);

  // Refresh pending suggestion count whenever tab changes
  useEffect(() => {
    getSuggestionStats()
      .then((r) => setPending(r.data.pending))
      .catch(() => {});
  }, [tab]);

  const goProduct = (id) => {
    setProductId(id);
    setTab("product-detail");
  };
  const goBack = () => {
    setProductId(null);
    setTab("products");
  };
  const goSuggestions = () => {
    setSuggestionsKey((k) => k + 1);
    setProductId(null);
    setTab("suggestions");
  };

  const refreshCount = () => getSuggestionStats().then(r => setPending(r.data.pending)).catch(() => {});

  const renderPage = () => {
    switch (tab) {
      case "dashboard":
        return <Dashboard onGoProducts={() => setTab("products")} onGoProduct={goProduct} onGoSuggestions={goSuggestions} />;
      case "products":
        return <Products onGoProduct={goProduct} />;
      case "product-detail":
        return <ProductDetail id={productId} onBack={goBack} onGoSuggestions={goSuggestions} />;
      case "suggestions":
        return <Suggestions key={suggestionsKey} onRefreshCount={refreshCount} />;
      default:
        return <Dashboard onGoProducts={() => setTab("products")} onGoProduct={goProduct} onGoSuggestions={goSuggestions} />;
    }
  };

  return (
    <>
      <Navbar
        tab={tab === "product-detail" ? "products" : tab}
        setTab={(t) => {
          setProductId(null);
          if (t === "suggestions") setSuggestionsKey((k) => k + 1);
          setTab(t);
        }}
        pendingCount={pendingCount}
        apiOk={apiOk}
      />
      <main>{renderPage()}</main>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
