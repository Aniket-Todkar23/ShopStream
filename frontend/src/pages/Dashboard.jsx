import { useEffect, useState } from "react";
import { getProducts, getSuggestionStats, getSuggestions } from "../api";

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : {}}>{value ?? "—"}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ onGoProducts, onGoProduct, onGoSuggestions }) {
  const [products, setProducts] = useState([]);
  const [stats, setStats]       = useState(null);
  const [recent, setRecent]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getProducts(), getSuggestionStats(), getSuggestions({ status: "PENDING" })])
      .then(([p, s, sg]) => {
        setProducts(p.data);
        setStats(s.data);
        setRecent(sg.data.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="loading-state">
          <div className="spinner spinner-lg" />
          Loading dashboard…
        </div>
      </div>
    );
  }

  const lowStock    = products.filter((p) => p.stock <= p.reorderThreshold);
  const activeProds = products.filter((p) => p.status === "ACTIVE");
  const totalValue  = products.reduce((s, p) => s + p.price * p.stock, 0);
  const categories  = [...new Set(products.map((p) => p.category))];

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Real-time inventory &amp; AI suggestion overview</p>
        </div>
        <button className="btn btn-primary" onClick={onGoProducts}>+ New Product</button>
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard icon="📦" label="Total Products" value={products.length} sub={`${activeProds.length} active`} />
        <StatCard
          icon="⚠️"
          label="Low Stock Alerts"
          value={lowStock.length}
          sub="below reorder threshold"
          color={lowStock.length > 0 ? "var(--amber)" : "var(--green)"}
        />
        <StatCard
          icon="✦"
          label="Pending Suggestions"
          value={stats?.pending ?? 0}
          sub={`${stats?.accepted ?? 0} accepted · ${stats?.rejected ?? 0} rejected`}
          color={stats?.pending > 0 ? "var(--accent)" : undefined}
        />
        <StatCard
          icon="💰"
          label="Inventory Value"
          value={`$${totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          sub="across all products"
        />
      </div>

      <div className="two-col">
        {/* Low Stock */}
        <div className="card">
          <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 0 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>⚠ Low Stock Products</div>
          </div>
          {lowStock.length === 0 ? (
            <div className="empty-state" style={{ padding: "28px 24px" }}>
              <div className="empty-icon">✓</div>
              <div className="empty-title">All stocked up</div>
              <div className="empty-sub">No products below reorder threshold</div>
            </div>
          ) : (
            <div>
              {lowStock.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onGoProduct(p.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "11px 22px",
                    borderBottom: "1px solid var(--border)", background: "none",
                    cursor: "pointer", transition: "background var(--transition)", textAlign: "left",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--text)" }}>{p.name}</div>
                    <div className="mono">{p.sku}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="badge badge-amber">{p.stock} left</span>
                    <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 3 }}>threshold: {p.reorderThreshold}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pending Suggestions */}
        <div className="card">
          <div className="card-pad" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 14, marginBottom: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="section-title" style={{ marginBottom: 0 }}>✦ Pending AI Suggestions</div>
            {stats?.pending > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={onGoSuggestions}>View all</button>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="empty-state" style={{ padding: "28px 24px" }}>
              <div className="empty-icon">✦</div>
              <div className="empty-title">No pending suggestions</div>
              <div className="empty-sub">Trigger AI advisor on any product</div>
            </div>
          ) : (
            <div>
              {recent.map((s) => (
                <div key={s.id} style={{ padding: "11px 22px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                    <span className={`badge ${s.type === "PRICING" ? "badge-accent" : "badge-blue"}`}>{s.type}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{s.product?.name}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                    {(s.pricingReasoning || s.reorderReasoning || s.triggerReason || "").slice(0, 100)}
                    {(s.pricingReasoning || s.reorderReasoning || "").length > 100 ? "…" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="divider" />

      {/* Category breakdown */}
      <div className="section-title">Products by Category</div>
      <div className="cat-grid">
        {categories.map((cat) => {
          const count = products.filter((p) => p.category === cat).length;
          return (
            <button key={cat} className="cat-pill" onClick={onGoProducts}>
              <div className="cat-pill-label">{cat}</div>
              <div className="cat-pill-count">{count}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
