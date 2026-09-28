import { useEffect, useState, useCallback } from "react";
import { getProducts, createProduct } from "../api";
import { useToast } from "../components/Toast";

const STATUS_BADGE = { ACTIVE: "badge-green", DISCONTINUED: "badge-muted", OUT_OF_STOCK: "badge-red" };

function CreateModal({ onClose, onCreated, categories }) {
  const toast = useToast();
  const [form, setForm] = useState({ sku: "", name: "", category: "", price: "", stock: "", reorderThreshold: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createProduct({
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        reorderThreshold: parseInt(form.reorderThreshold),
      });
      toast("Product created successfully", "success");
      onCreated();
      onClose();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to create product", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">New Product</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input className="input" placeholder="ELEC-001" value={form.sku} onChange={set("sku")} required />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <input className="input" list="cats" placeholder="Electronics" value={form.category} onChange={set("category")} required />
                <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="input" placeholder="Wireless Headphones Pro" value={form.name} onChange={set("name")} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Price ($) *</label>
                <input className="input" type="number" step="0.01" min="0" placeholder="49.99" value={form.price} onChange={set("price")} required />
              </div>
              <div className="form-group">
                <label className="form-label">Initial Stock *</label>
                <input className="input" type="number" min="0" placeholder="100" value={form.stock} onChange={set("stock")} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Reorder Threshold *</label>
              <input className="input" type="number" min="1" placeholder="20" value={form.reorderThreshold} onChange={set("reorderThreshold")} required />
              <span className="form-hint">AI advisor triggers when stock falls below this</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving && <span className="spinner" />}
              Create Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Products({ onGoProduct }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch]    = useState("");
  const [catFilter, setCat]    = useState("");
  const [statusFilter, setSts] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (catFilter)    params.category = catFilter;
    if (statusFilter) params.status   = statusFilter;
    getProducts(params)
      .then((r) => setProducts(r.data))
      .finally(() => setLoading(false));
  }, [catFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const categories = [...new Set(products.map((p) => p.category))];

  const filtered = products.filter((p) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-wrap">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">{products.length} products in inventory</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Product</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="input filter-search"
          placeholder="🔍  Search name or SKU…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="select" value={catFilter} onChange={(e) => setCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" value={statusFilter} onChange={(e) => setSts(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
          <option value="DISCONTINUED">Discontinued</option>
        </select>
        {(catFilter || statusFilter || search) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(""); setCat(""); setSts(""); }}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner spinner-lg" />Loading products…</div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <div className="empty-title">No products found</div>
            <div className="empty-sub">{search ? "Try a different search term" : "Create your first product"}</div>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock / Threshold</th>
                <th>Demand</th>
                <th>Status</th>
                <th>Suggestions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isLow    = p.stock <= p.reorderThreshold;
                const stockPct = Math.min(100, (p.stock / Math.max(p.reorderThreshold * 3, 1)) * 100);
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </div>
                    </td>
                    <td><span className="mono">{p.sku}</span></td>
                    <td><span style={{ fontSize: 13, color: "var(--text-2)" }}>{p.category}</span></td>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono'", fontWeight: 600, fontSize: 13 }}>
                        ${p.price.toFixed(2)}
                      </span>
                    </td>
                    <td>
                      <div style={{ minWidth: 90 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, color: isLow ? "var(--amber)" : "var(--text)", fontSize: 13 }}>
                            {p.stock}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-3)" }}>/ {p.reorderThreshold}</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${stockPct}%`, background: isLow ? "var(--amber)" : "var(--green)" }}
                          />
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize: 13, color: "var(--text-2)" }}>{p.demandVelocity}/day</span></td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status] || "badge-muted"}`}>{p.status}</span>
                    </td>
                    <td>
                      {p._count?.suggestions > 0 ? (
                        <span className="badge badge-accent">{p._count.suggestions} pending</span>
                      ) : (
                        <span style={{ color: "var(--text-3)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => onGoProduct(p.id)}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
          categories={categories}
        />
      )}
    </div>
  );
}
