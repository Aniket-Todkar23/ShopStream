import { useEffect, useState, useCallback } from "react";
import { getSuggestions, getSuggestionStats, acceptSuggestion, rejectSuggestion } from "../api";
import { useToast } from "../components/Toast";

const TYPE_BADGE   = { PRICING: "badge-accent", REORDER: "badge-blue" };
const STATUS_BADGE = { PENDING: "badge-amber", ACCEPTED: "badge-green", REJECTED: "badge-muted" };

export default function Suggestions({ onRefreshCount }) {
  const toast   = useToast();
  const [list, setList]         = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState({});
  const [fStatus, setFStatus]   = useState("PENDING");
  const [fType, setFType]       = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (fStatus) params.status = fStatus;
    if (fType)   params.type   = fType;
    Promise.all([getSuggestions(params), getSuggestionStats()])
      .then(([s, st]) => { setList(s.data); setStats(st.data); })
      .finally(() => setLoading(false));
  }, [fStatus, fType]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action, type) => {
    setActing((a) => ({ ...a, [id]: action }));
    try {
      if (action === "accept") await acceptSuggestion(id, type);
      else                     await rejectSuggestion(id, type);
      toast(action === "accept" ? "Suggestion accepted & applied ✓" : "Suggestion rejected", "success");
      load();
      onRefreshCount?.();
    } catch (err) {
      toast(err.response?.data?.error || `Failed to ${action}`, "error");
    } finally {
      setActing((a) => ({ ...a, [id]: null }));
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Suggestions</h1>
          <p className="page-subtitle">Review and act on AI-generated pricing &amp; reorder recommendations</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}>
          {loading ? <span className="spinner" /> : "↻"} Refresh
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          {[
            { label: "Pending",  val: stats.pending,  color: "var(--amber)" },
            { label: "Accepted", val: stats.accepted, color: "var(--green)" },
            { label: "Rejected", val: stats.rejected, color: "var(--text-3)" },
            { label: "Total",    val: stats.total,    color: "var(--text)" },
          ].map(({ label, val, color }) => (
            <div key={label} className="stat-card" style={{ flex: "1 1 100px", minWidth: 90, padding: "14px 18px" }}>
              <div className="stat-label">{label}</div>
              <div className="stat-value" style={{ color, fontSize: 22 }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <select className="select" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select className="select" value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">All Types</option>
          <option value="PRICING">Pricing</option>
          <option value="REORDER">Reorder</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner spinner-lg" />Loading suggestions…</div>
      ) : list.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <div className="empty-title">No suggestions found</div>
            <div className="empty-sub">Go to a product and run the AI Advisor to generate suggestions</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {list.map((s) => <SuggestionCard key={s.id} s={s} acting={acting} act={act} />)}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ s, acting, act }) {
  return (
    <div className="sug-card">
      {/* Header */}
      <div className="sug-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className={`badge ${TYPE_BADGE[s.type] || "badge-muted"}`}>{s.type}</span>
          <span className={`badge ${STATUS_BADGE[s.status] || "badge-muted"}`}>{s.status}</span>
          <span className={`badge ${
            s.triggerReason === "INVENTORY_LOW" ? "badge-amber" :
            s.triggerReason === "DEMAND_SPIKE" ? "badge-green" :
            "badge-muted"
          }`}>
            {s.triggerReason.replace("_", " ")}
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{s.product?.name}</span>
          <span className="mono">{s.product?.sku}</span>
        </div>
        <div className="sug-meta">{new Date(s.createdAt).toLocaleString()}</div>
      </div>

      {/* Body */}
      <div className="sug-card-body">
        {/* Pricing detail */}
        {s.type === "PRICING" && (
          <div className="sug-price-row">
            <div className="sug-price-block">
              <div className="sug-price-label">Current Price</div>
              <div className="sug-price-val" style={{ color: "var(--text-2)" }}>
                ${s.currentPrice?.toFixed(2) ?? "—"}
              </div>
            </div>
            <div className="sug-arrow">→</div>
            <div className="sug-price-block">
              <div className="sug-price-label">Recommended</div>
              <div className="sug-price-val" style={{ color: "var(--accent)" }}>
                ${s.recommendedPrice?.toFixed(2) ?? "—"}
              </div>
            </div>
            {s.direction && (
              <div className="sug-price-block">
                <div className="sug-price-label">Direction</div>
                <span className={`badge ${s.direction === "INCREASE" ? "badge-green" : s.direction === "DECREASE" ? "badge-red" : "badge-muted"}`}>
                  {s.direction}
                </span>
              </div>
            )}
            {s.pricingConfidence != null && (
              <div className="sug-price-block">
                <div className="sug-price-label">Confidence</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(s.pricingConfidence * 100)}%</div>
              </div>
            )}
          </div>
        )}

        {/* Reorder detail */}
        {s.type === "REORDER" && (
          <div className="sug-price-row">
            <div className="sug-price-block">
              <div className="sug-price-label">Current Stock</div>
              <div className="sug-price-val" style={{ color: "var(--text-2)" }}>
                {s.currentStock ?? "—"} units
              </div>
            </div>
            <div className="sug-arrow">→</div>
            <div className="sug-price-block">
              <div className="sug-price-label">Recommended Order</div>
              <div className="sug-price-val" style={{ color: "var(--blue)" }}>
                {s.recommendedQty ?? "—"} units
              </div>
            </div>
            {s.reorderConfidence != null && (
              <div className="sug-price-block">
                <div className="sug-price-label">Confidence</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{Math.round(s.reorderConfidence * 100)}%</div>
              </div>
            )}
          </div>
        )}

        {/* Reasoning */}
        {(s.pricingReasoning || s.reorderReasoning) && (
          <div className="sug-reasoning">{s.pricingReasoning || s.reorderReasoning}</div>
        )}
      </div>

      {/* Footer */}
      <div className="sug-card-footer">
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
          Source: <b style={{ color: "var(--text-2)", fontWeight: 500 }}>{s.source}</b>
          <span style={{ margin: "0 6px" }}>·</span>
          Trigger: <b style={{ color: "var(--text-2)", fontWeight: 500 }}>{s.triggerReason}</b>
        </div>

        {s.status === "PENDING" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btn-success btn-sm"
              onClick={() => act(s.id, "accept", s.type)}
              disabled={!!acting[s.id]}
            >
              {acting[s.id] === "accept" ? <span className="spinner" /> : "✓"}
              Accept
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => act(s.id, "reject", s.type)}
              disabled={!!acting[s.id]}
            >
              {acting[s.id] === "reject" ? <span className="spinner" /> : "✕"}
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
