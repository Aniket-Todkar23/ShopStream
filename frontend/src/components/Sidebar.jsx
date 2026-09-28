import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import { getSuggestionStats } from "../api";

export default function Sidebar() {
  const [pendingCount, setPendingCount] = useState(null);

  useEffect(() => {
    getSuggestionStats()
      .then((r) => setPendingCount(r.data.pending))
      .catch(() => {});
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">⚡</div>
        <div>
          <div className="logo-text">StockPulse</div>
          <div className="logo-sub">v1.0 · local</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          <span className="nav-icon">◈</span>
          Dashboard
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          <span className="nav-icon">▦</span>
          Products
        </NavLink>
        <NavLink to="/suggestions" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          <span className="nav-icon">✦</span>
          AI Suggestions
          {pendingCount > 0 && (
            <span className="nav-badge">{pendingCount}</span>
          )}
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="status-dot">API · localhost:4000</div>
      </div>
    </aside>
  );
}
