import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useCafe } from "../context/CafeContext.jsx";

const scenarios = [
  { id: "lean", title: "Lean essentials", amount: 120, detail: "Keep the basket tight" },
  { id: "balanced", title: "Balanced", amount: 180, detail: "Everyday restock" },
  { id: "buffer", title: "Build a buffer", amount: 240, detail: "More room for coverage" },
];

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

function leadTimeDays(offer) {
  const lead = String(offer.lead || "");
  if (/tomorrow/i.test(lead)) return 1;
  return Number(lead.match(/\d+/)?.[0] || 99);
}

function previewBasket(budget, catalog, inventory) {
  const candidates = catalog
    .map((product) => {
      const offer = [...(product.offers || [])]
        .filter((entry) => Number(entry.price) > 0)
        .sort((a, b) => Number(a.price) - Number(b.price))[0];
      if (!offer) return null;

      const stock = inventory.find((entry) => entry.productId === product.id) || {};
      const dailyUse = Number(stock.averageDailyDemand ?? stock.sales7d?.[0] ?? 0);
      const leadDays = Number(stock.leadDays ?? 0);
      const safetyDays = Number(stock.safetyDays ?? 2);
      const daysLeft = dailyUse > 0 ? Number(stock.onHand ?? 0) / dailyUse : Infinity;
      const urgency = dailyUse > 0 && daysLeft <= leadDays
        ? 0
        : dailyUse > 0 && daysLeft <= leadDays + safetyDays
          ? 1
          : 2;
      const targetQty = dailyUse > 0
        ? Math.max(1, Math.min(4, Math.ceil(
            dailyUse * (leadDays + safetyDays + Number(stock.targetCoverDays ?? 3))
              - Number(stock.onHand ?? 0)
          )))
        : 1;

      return { product, offer, urgency, daysLeft, dailyUse, targetQty };
    })
    .filter(Boolean)
    .sort((a, b) => a.urgency - b.urgency || a.daysLeft - b.daysLeft || b.dailyUse - a.dailyUse);

  let remaining = Number(budget);
  const basket = [];

  // First include one package of each highest-priority item that fits.
  for (const candidate of candidates) {
    const price = Number(candidate.offer.price);
    if (price <= remaining) {
      basket.push({ ...candidate, quantity: 1 });
      remaining -= price;
    }
  }

  // Then add extra packages toward the café's target stock cover.
  for (const candidate of candidates) {
    const line = basket.find((item) => item.product.id === candidate.product.id);
    if (!line) continue;

    const price = Number(candidate.offer.price);
    while (line.quantity < candidate.targetQty && price <= remaining) {
      line.quantity += 1;
      remaining -= price;
    }
  }

  const total = basket.reduce(
    (sum, item) => sum + Number(item.offer.price) * item.quantity,
    0
  );
  return { items: basket, total, remaining: Math.max(0, Number(budget) - total) };
}

export default function ToolsPage() {
  const { catalog, inventory, loading, activeCafe } = useCafe();
  const navigate = useNavigate();
  const [selectedScenario, setSelectedScenario] = useState("balanced");

  function useScenario(scenario) {
    setSelectedScenario(scenario.id);
    navigate(`/restock?budget=${scenario.amount}`);
  }

  if (loading) {
    return <main className="tools-page"><section className="tools-panel">Loading café data…</section></main>;
  }

  if (!catalog.length) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <main className="tools-page">
      <header className="tools-heading">
        <p className="eyebrow">PLAN WITH CONFIDENCE</p>
        <h1>Planning tools</h1>
        <p>
          Explore spending limits and compare supplier offers for{" "}
          <strong>{activeCafe?.name || "your café"}</strong>.
        </p>
      </header>

      <section className="tools-panel">
        <div className="tools-panel-heading">
          <div>
            <p className="eyebrow">BUDGET CONTROL</p>
            <h2>Budget scenarios</h2>
            <p>See an example basket for each cap, then open Restock with that budget.</p>
          </div>
        </div>

        <div className="scenario-grid">
          {scenarios.map((scenario) => {
            const preview = previewBasket(scenario.amount, catalog, inventory);
            return (
              <article
                className={`scenario-card ${selectedScenario === scenario.id ? "selected" : ""}`}
                key={scenario.id}
              >
                <span>{scenario.id === "lean" ? "01" : scenario.id === "balanced" ? "02" : "03"}</span>
                <h3>{scenario.title}</h3>
                <p>{scenario.detail}</p>
                <strong className="scenario-amount">{money(scenario.amount)}</strong>

                <div className="scenario-preview">
                  <div className="scenario-preview-heading">
                    <strong>Example basket</strong>
                    <span>{money(preview.total)}</span>
                  </div>
                  {preview.items.length ? (
                    <ul>
                      {preview.items.slice(0, 4).map((item) => (
                        <li key={item.product.id}>
                          <span title={item.product.name}>{item.product.name} × {item.quantity}</span>
                          <strong>{money(Number(item.offer.price) * item.quantity)}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="scenario-preview-empty">No supplier packages fit this cap yet.</p>
                  )}
                  {preview.items.length > 4 && (
                    <small>+ {preview.items.length - 4} more ingredients</small>
                  )}
                  <div className="scenario-preview-total">
                    <span>Budget left</span>
                    <strong>{money(preview.remaining)}</strong>
                  </div>
                </div>

                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => useScenario(scenario)}
                >
                  Use this budget →
                </button>
              </article>
            );
          })}
        </div>

        <p className="tools-note">
          Example baskets use this café’s stock urgency and lowest listed supplier prices. The final plan depends on your request; selecting a cap never places or pays for an order.
        </p>
      </section>

      <section className="tools-panel">
        <div className="tools-panel-heading">
          <div>
            <p className="eyebrow">SUPPLIER OPTIONS</p>
            <h2>Supplier comparison</h2>
            <p>Compare the listed prices, delivery estimates, and ratings for each ingredient.</p>
          </div>
        </div>

        {catalog.some((product) => product.offers?.length > 0) ? (
          <div className="supplier-table-wrap">
            <table className="supplier-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Supplier</th>
                  <th>Price</th>
                  <th>Delivery</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {catalog.flatMap((product) => {
                  const offers = product.offers || [];
                  if (!offers.length) return [];

                  const cheapest = Math.min(...offers.map((offer) => Number(offer.price)));
                  const fastest = Math.min(...offers.map(leadTimeDays));

                  return offers.map((offer, index) => (
                    <tr key={`${product.id}-${offer.vendor}-${index}`}>
                      <td>
                        <strong>{product.icon || "🧺"} {product.name}</strong>
                        <small>{product.unit}</small>
                      </td>
                      <td>
                        {offer.vendor}
                        {Number(offer.price) === cheapest && (
                          <span className="offer-tag value-tag">Best price</span>
                        )}
                      </td>
                      <td><strong>{money(offer.price)}</strong></td>
                      <td>
                        {offer.lead || "Not listed"}
                        {leadTimeDays(offer) === fastest && (
                          <span className="offer-tag speed-tag">Fastest</span>
                        )}
                      </td>
                      <td>
                        {Number.isFinite(Number(offer.rating))
                          ? `★ ${Number(offer.rating).toFixed(1)}`
                          : "Not rated"}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="tools-empty">
            No supplier offers yet. Add ingredients and supplier details in Café setup.
          </p>
        )}

        <p className="tools-note">
          These are the offers saved for this café. Confirm availability and final terms with the supplier.
        </p>
      </section>
    </main>
  );
}
