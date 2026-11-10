import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCafe } from "../context/CafeContext.jsx";

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

function getRisk(stock) {
  const dailyUse = Number(
    stock.averageDailyDemand ?? stock.sales7d?.[0] ?? 0
  );
  const leadDays = Number(stock.leadDays ?? 0);
  const safetyDays = Number(stock.safetyDays ?? 2);
  const daysLeft = dailyUse > 0 ? Number(stock.onHand ?? 0) / dailyUse : Infinity;

  if (dailyUse > 0 && daysLeft <= leadDays) {
    return { label: "Critical", className: "critical", daysLeft };
  }

  if (dailyUse > 0 && daysLeft <= leadDays + safetyDays) {
    return { label: "Reorder soon", className: "soon", daysLeft };
  }

  return { label: "Healthy", className: "healthy", daysLeft };
}

function runsOutLabel(daysLeft) {
  if (!Number.isFinite(daysLeft)) return "Usage not set";

  const date = new Date();
  date.setDate(date.getDate() + Math.max(0, Math.ceil(daysLeft)));

  return `Runs out ${date.toLocaleDateString("en-US", { weekday: "short" })}`;
}

export default function DashboardPage() {
  const { catalog, inventory, loading, loadDemoData } = useCafe();
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");
  const [demandMultiplier, setDemandMultiplier] = useState(1);
  const navigate = useNavigate();

  if (loading) {
    return <main className="dashboard-page"><section className="dashboard-panel">Loading café inventory…</section></main>;
  }

  if (catalog.length === 0) {
    return <Navigate to="/setup" replace />;
  }

  const items = catalog.map((product) => {
    const stock = inventory.find((entry) => entry.productId === product.id) || {};
    const risk = getRisk(stock);
    const dailyUse = Number(
      stock.averageDailyDemand ?? stock.sales7d?.[0] ?? 0
    );
    const leadDays = Number(stock.leadDays ?? 0);
    const safetyDays = Number(stock.safetyDays ?? 2);
    const targetCoverDays = Number(stock.targetCoverDays ?? 3);
    const needed = Math.max(
      0,
      Math.ceil(
        dailyUse * (leadDays + safetyDays + targetCoverDays) -
          Number(stock.onHand ?? 0)
      )
    );
    const cheapestOffer = [...(product.offers || [])].sort(
      (a, b) => Number(a.price) - Number(b.price)
    )[0];

    return {
      product,
      stock,
      risk,
      dailyUse,
      needed,
      estimatedCost: cheapestOffer
        ? needed * Number(cheapestOffer.price)
        : 0,
    };
  });

  const priority = { critical: 0, soon: 1, healthy: 2 };
  items.sort(
    (a, b) =>
      priority[a.risk.className] - priority[b.risk.className] ||
      a.risk.daysLeft - b.risk.daysLeft
  );

  const criticalCount = items.filter((item) => item.risk.className === "critical").length;
  const soonCount = items.filter((item) => item.risk.className === "soon").length;
  const healthyCount = items.filter((item) => item.risk.className === "healthy").length;
  const atRiskItems = items.filter((item) => item.risk.className !== "healthy");
  const estimatedCost = atRiskItems.reduce((sum, item) => sum + item.estimatedCost, 0);

  async function handleLoadDemo() {
    setDemoBusy(true);
    setDemoMessage("");
    const loaded = await loadDemoData();
    setDemoMessage(
      loaded
        ? "Demo café restored. Your other café profiles are unchanged."
        : "Demo data could not load. Check that the Brew2Basket server is running."
    );
    setDemoBusy(false);
  }
  function goToRestock() {
    const params = new URLSearchParams();
    params.set("items", atRiskItems.map((item) => item.product.id).join(","));
    navigate(`/restock?${params.toString()}`);
  }
  function planForForecast() {
    const params = new URLSearchParams();
    const forecastAtRisk = items.filter(({ stock, dailyUse }) => {
      const forecastUse = dailyUse * demandMultiplier;
      const daysLeft = forecastUse > 0 ? Number(stock.onHand ?? 0) / forecastUse : Infinity;
      return forecastUse > 0 && daysLeft <= Number(stock.leadDays ?? 0) + Number(stock.safetyDays ?? 2);
    });
    params.set("items", forecastAtRisk.map(({ product }) => product.id).join(","));
    params.set("demand", String(demandMultiplier));
    navigate(`/restock?${params.toString()}`);
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR CAFÉ AT A GLANCE</p>
          <h1>Inventory dashboard</h1>
          <p className="dashboard-description">
            See what may run low and plan your next restock.
          </p>
        </div>
        <div className="dashboard-heading-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={handleLoadDemo}
            disabled={demoBusy}
          >
            {demoBusy ? "Loading demo…" : "Load demo data"}
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={goToRestock}
            disabled={atRiskItems.length === 0}
          >
            Fix at-risk items <span aria-hidden="true">→</span>
          </button>
          {demoMessage && <p className="demo-data-message" role="status">{demoMessage}</p>}
        </div>
      </header>

      <section className="dashboard-stats" aria-label="Inventory summary">
        <div className="dashboard-stat critical">
          <strong>{criticalCount}</strong><span>Critical</span>
        </div>
        <div className="dashboard-stat soon">
          <strong>{soonCount}</strong><span>Reorder soon</span>
        </div>
        <div className="dashboard-stat healthy">
          <strong>{healthyCount}</strong><span>Healthy</span>
        </div>
        <div className="dashboard-stat cost">
          <strong>{money(estimatedCost)}</strong><span>Estimated restock</span>
        </div>
      </section>

      <details className="forecast-panel">
        <summary>
          <span><strong>What-if forecast</strong><small>See the effect of a busier week and plan lean quantities.</small></span>
          <span className="forecast-summary-action">Explore <span aria-hidden="true">⌄</span></span>
        </summary>
        <div className="forecast-content">
          <div className="forecast-controls">
            <label htmlFor="demand-scenario">Expected demand</label>
            <select id="demand-scenario" value={demandMultiplier} onChange={(event) => setDemandMultiplier(Number(event.target.value))}>
              <option value="1">Typical week</option>
              <option value="1.25">Busy week (+25%)</option>
              <option value="1.5">Event week (+50%)</option>
            </select>
            <p>Forecast uses the café’s recent weighted sales and current on-hand stock.</p>
          </div>
          <div className="forecast-list" aria-live="polite">
            {items.slice(0, 3).map(({ product, stock, dailyUse }) => {
              const forecastUse = dailyUse * demandMultiplier;
              const daysLeft = forecastUse > 0 ? Number(stock.onHand ?? 0) / forecastUse : Infinity;
              const leadDays = Number(stock.leadDays ?? 0);
              const safetyDays = Number(stock.safetyDays ?? 2);
              const targetDays = Number(stock.targetCoverDays ?? 3);
              const needed = forecastUse > 0
                ? Math.max(0, Math.ceil(forecastUse * (leadDays + safetyDays + targetDays) - Number(stock.onHand ?? 0)))
                : 0;
              return (
                <div className="forecast-row" key={product.id}>
                  <strong>{product.name}</strong>
                  <span className={daysLeft <= leadDays ? "forecast-critical" : daysLeft <= leadDays + safetyDays ? "forecast-soon" : ""}>
                    {Number.isFinite(daysLeft) ? `${daysLeft.toFixed(1)} days left` : "Usage not set"}
                  </span>
                  <small>{needed ? `Plan about ${needed} ${needed === 1 ? "unit" : "units"}` : "No top-up indicated"}</small>
                </div>
              );
            })}
          </div>
          <div className="forecast-footer">
            <p>Suggested quantities target a short cover window after lead time and safety stock, helping avoid oversized orders.</p>
            <button className="button button-secondary" type="button" onClick={planForForecast}>Plan for this demand</button>
          </div>
        </div>
      </details>

      <section className="dashboard-panel">
        <div className="dashboard-panel-heading">
          <div>
            <p className="eyebrow">STOCK SIGNAL</p>
            <h2>Inventory risk radar</h2>
            <p>Items are sorted by urgency using stock on hand, daily use, and supplier lead time.</p>
          </div>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => navigate("/setup")}
          >
            Edit ingredients
          </button>
        </div>

        <div className="dashboard-item-grid">
          {items.map(({ product, stock, risk, dailyUse, needed }) => (
            <article className={`dashboard-item ${risk.className}`} key={product.id}>
              <div className="dashboard-item-title">
                <span className="dashboard-item-icon">{product.icon || "🧺"}</span>
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.unit}</p>
                </div>
                <span className={`risk-badge ${risk.className}`}>{risk.label}</span>
              </div>

              <div className="dashboard-item-metrics">
                <div>
                  <small>On hand</small>
                  <strong>{stock.onHand ?? 0} {Number(stock.onHand) === 1 ? "unit" : "units"}</strong>
                </div>
                <div>
                  <small>Estimated stock left</small>
                  <strong className={`days-left-pill ${risk.className}`}>{Number.isFinite(risk.daysLeft) ? `${risk.daysLeft.toFixed(1)} days` : "Usage not set"}</strong>
                </div>
                <div>
                  <small>Average use</small>
                  <strong>{dailyUse ? `${dailyUse.toFixed(1)} units/day` : "Not set"}</strong>
                </div>
                <div>
                  <small>Restock suggestion</small>
                  <strong>{needed > 0 ? `${needed} ${needed === 1 ? "unit" : "units"}` : "No restock needed"}</strong>
                </div>
              </div>

              <div
                className={`stock-progress ${risk.className}`}
                role="progressbar"
                aria-label={`Estimated stock coverage: ${Number.isFinite(risk.daysLeft) ? `${risk.daysLeft.toFixed(1)} days` : "unknown"}`}
                aria-valuemin="0"
                aria-valuemax="10"
                aria-valuenow={Number.isFinite(risk.daysLeft) ? Math.min(10, Math.max(0, risk.daysLeft)) : 10}
              >
                <span
                  style={{
                    width: `${Number.isFinite(risk.daysLeft) ? Math.min(100, Math.max(0, (risk.daysLeft / 10) * 100)) : 100}%`,
                  }}
                />
              </div>
              <p className="runs-out">{runsOutLabel(risk.daysLeft)}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
