import { useEffect, useState } from "react";
import { getProduct, updateStock, triggerAdvise, getPriceHistory, simulateSale } from "../api";
import { useToast } from "../components/Toast";

const STATUS_BADGE = { ACTIVE: "badge-green", DISCONTINUED: "badge-muted", OUT_OF_STOCK: "badge-red" };
const REASONS = ["MANUAL", "LOW_INVENTORY", "DEMAND_SPIKE", "SCHEDULED"];

export default function ProductDetail({ id, onBack, onGoSuggestions }) {
  const toast = useToast();
  const [product, setProduct]     = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [advising, setAdvising]   = useState(false);
  const [stockVal, setStockVal]   = useState("");
  const [stockBusy, setStockBusy] = useState(false);
  const [reason, setReason]       = useState("MANUAL");

  const load = () => {
    setLoading(true);
    Promise.all([getProduct(id), getPriceHistory(id)])
      .then(([p, h]) => {
        setProduct(p.data);
        setStockVal(String(p.data.stock));
        setHistory(h.data);
      })
      .catch(() => toast("Failed to load product", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleStock = async () => {
    const val = parseInt(stockVal);
    if (isNaN(val) || val < 0) return toast("Enter a valid stock number", "error");
    setStockBusy(true);
    try {
      await updateStock(id, val);
      toast("Stock updated", "success");
      load();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to update", "error");
    } finally {
      setStockBusy(false);
    }
  };

  const handleAdvise = async () => {
    setAdvising(true);
    try {
      const r = await triggerAdvise(id, reason);
      const created  = (r.data.suggestions || []).length;
      const skipped  = r.data.skippedDuplicates || 0;
      const fallback = r.data.fallbackReason;

      if (created > 0) {
        toast(`✦ AI generated ${created} suggestion${created !== 1 ? "s" : ""}${fallback ? " (rule-based)" : ""}`, "success");
      } else if (skipped > 0) {
        toast(`${skipped} suggestion${skipped !== 1 ? "s" : ""} already pending — review in AI Suggestions tab`, "success");
      } else {
        toast("No new suggestions generated", "success");
      }

      load();
      // Auto-navigate to suggestions tab so user sees results
      setTimeout(() => onGoSuggestions(), 800);
    } catch (err) {
      toast(err.response?.data?.error || "AI advisor failed", "error");
    } finally {
      setAdvising(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="loading-state"><div className="spinner spinner-lg" />Loading product…</div>
      </div>
    );
  }
  if (!product) {
    return (
      <div className="page-wrap">
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">Product not found</div>
          </div>
        </div>
      </div>
    );
  }

  const isLow    = product.stock <= product.reorderThreshold;
  const stockPct = Math.min(100, (product.stock / Math.max(product.reorderThreshold * 3, 1)) * 100);
  const daysLeft = product.demandVelocity > 0
    ? Math.round(product.stock / product.demandVelocity)
    : null;

  return (
    <div className="page-wrap">
      <button className="back-link" onClick={onBack}>← Back to Products</button>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{product.name}</h1>
            <span className={`badge ${STATUS_BADGE[product.status] || "badge-muted"}`}>{product.status}</span>
          </div>
          <div style={{ display: "flex", align: "center", gap: 8, color: "var(--text-2)", fontSize: 13 }}>
            <span className="mono">{product.sku}</span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span>{product.category}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono'", letterSpacing: "-0.02em", color: "var(--text)" }}>
            ${product.price.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>current price</div>
        </div>
      </div>

      {/* Key metric cards */}
      <div className="detail-grid" style={{ marginBottom: 20 }}>
        <div className="card card-pad">
          <div className="stat-label">Stock Level</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "6px 0" }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: isLow ? "var(--amber)" : "var(--green)" }}>
              {product.stock}
            </span>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>/ {product.reorderThreshold} threshold</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 8 }}>
            <div className="progress-fill" style={{ width: `${stockPct}%`, background: isLow ? "var(--amber)" : "var(--green)" }} />
          </div>
          {isLow && <span className="badge badge-amber">⚠ Below reorder threshold</span>}
        </div>

        <div className="card card-pad">
          <div className="stat-label">Demand Velocity</div>
          <div style={{ fontSize: 28, fontWeight: 700, margin: "6px 0" }}>
            {product.demandVelocity}
            <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-2)" }}>/day</span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            {daysLeft !== null ? `Est. ${daysLeft} days of stock remaining` : "No demand data"}
          </div>
        </div>
      </div>

      {/* Stock Update & Sale Simulation */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="section-title">Inventory Actions</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              className="input"
              type="number"
              min="0"
              value={stockVal}
              onChange={(e) => setStockVal(e.target.value)}
              style={{ width: 80 }}
            />
            <button className="btn btn-primary" onClick={handleStock} disabled={stockBusy}>
              {stockBusy && <span className="spinner" />}
              Set Stock
            </button>
          </div>

          <div style={{ width: "1px", height: "30px", background: "var(--border)" }} />

          <button 
            className="btn btn-secondary" 
            onClick={async () => {
              try {
                await simulateSale(id, 1);
                toast("Simulated 1 sale", "success");
                load();
              } catch (err) {
                toast("Sale failed", "error");
              }
            }}
          >
            🛒 Simulate Sale
          </button>
          <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>Current: {product.stock} units</span>
        </div>
      </div>

      {/* AI Advisor */}
      <div className="ai-banner" style={{ marginBottom: 24 }}>
        <div>
          <div className="ai-banner-title">✦ AI Advisor</div>
          <div className="ai-banner-sub">
            {product.suggestions?.length > 0
              ? `${product.suggestions.length} pending suggestion${product.suggestions.length !== 1 ? "s" : ""} — review in Suggestions tab`
              : "Generate intelligent pricing & reorder recommendations"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select className="select" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "auto" }}>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn btn-primary" onClick={handleAdvise} disabled={advising}>
            {advising ? <><span className="spinner" />Analyzing…</> : "Run Advisor"}
          </button>
          {product.suggestions?.length > 0 && (
            <button className="btn btn-secondary" onClick={onGoSuggestions}>
              Review Suggestions →
            </button>
          )}
        </div>
      </div>

      <div className="two-col">
        {/* Pending Suggestions */}
        <div className="card">
          <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 0 }}>
            <div className="section-title" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: 8 }}>
              Pending Suggestions
              {product.suggestions?.length > 0 && (
                <span className="badge badge-accent">{product.suggestions.length}</span>
              )}
            </div>
          </div>
          {!product.suggestions?.length ? (
            <div className="empty-state" style={{ padding: "28px 24px" }}>
              <div className="empty-icon">✦</div>
              <div className="empty-sub">No pending suggestions — run the advisor above</div>
            </div>
          ) : (
            product.suggestions.map((s) => (
              <div key={s.id} style={{ padding: "12px 22px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 7, marginBottom: 6, alignItems: "center" }}>
                  <span className={`badge ${s.type === "PRICING" ? "badge-accent" : "badge-blue"}`}>{s.type}</span>
                  <span className={`badge ${
                    s.triggerReason === "INVENTORY_LOW" ? "badge-amber" :
                    s.triggerReason === "DEMAND_SPIKE" ? "badge-green" :
                    "badge-muted"
                  }`}>
                    {s.triggerReason.replace("_", " ")}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>{s.source}</span>
                </div>
                {s.type === "PRICING" && s.recommendedPrice != null && (
                  <div style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: "var(--text-3)", textDecoration: "line-through", fontFamily: "'JetBrains Mono'", fontSize: 12 }}>
                      ${s.currentPrice?.toFixed(2)}
                    </span>
                    <span style={{ color: "var(--text-3)" }}>→</span>
                    <span style={{ fontWeight: 700, color: "var(--accent)", fontFamily: "'JetBrains Mono'" }}>
                      ${s.recommendedPrice?.toFixed(2)}
                    </span>
                    {s.direction && (
                      <span className={`badge ${s.direction === "INCREASE" ? "badge-green" : "badge-red"}`}>
                        {s.direction}
                      </span>
                    )}
                  </div>
                )}
                {s.type === "REORDER" && s.recommendedQty != null && (
                  <div style={{ fontSize: 13, color: "var(--blue)", fontWeight: 600, marginBottom: 4 }}>
                    Order {s.recommendedQty} units
                  </div>
                )}
                <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                  {s.pricingReasoning || s.reorderReasoning}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Price History */}
        <div className="card">
          <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 0 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Price History</div>
          </div>
          <div style={{ padding: "4px 22px" }}>
            {history.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 0" }}>
                <div className="empty-sub">No price changes recorded yet</div>
              </div>
            ) : (
              history.map((h) => {
                const diff = h.newPrice - h.oldPrice;
                const up   = diff > 0;
                return (
                  <div key={h.id} className="ph-row">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'JetBrains Mono'", fontSize: 13 }}>
                        <span style={{ color: "var(--text-3)", textDecoration: "line-through" }}>${h.oldPrice.toFixed(2)}</span>
                        <span style={{ color: "var(--text-3)" }}>→</span>
                        <span style={{ fontWeight: 700, color: up ? "var(--green)" : "var(--red)" }}>${h.newPrice.toFixed(2)}</span>
                        <span style={{ fontSize: 11, color: up ? "var(--green)" : "var(--red)" }}>
                          ({up ? "+" : ""}{diff.toFixed(2)})
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 2 }}>{h.reason}</div>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-3)", flexShrink: 0 }}>
                      {new Date(h.changedAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="divider" />
      <div className="section-title">Metadata</div>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
        {[["ID", product.id], ["Created", new Date(product.createdAt).toLocaleString()], ["Updated", new Date(product.updatedAt).toLocaleString()]].map(([k, v]) => (
          <div key={k} className="detail-item">
            <span className="detail-key">{k}</span>
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: "var(--text-2)" }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
