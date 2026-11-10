import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { useCafe } from "../context/CafeContext.jsx";

const steps = [
  "Checking stock levels",
  "Comparing suppliers",
  "Fitting your budget",
];

const money = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);

function readPreviousPrices() {
  try {
    const orders = JSON.parse(localStorage.getItem("Brew2Basket-orders-v1") || "[]");
    const latest = Array.isArray(orders)
      ? [...orders].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      : [];
    const prices = new Map();
    latest.forEach((order) => (order.items || []).forEach((item) => {
      const price = Number(item.unitPrice);
      if (item.productId && Number.isFinite(price) && price > 0 && !prices.has(item.productId)) {
        prices.set(item.productId, price);
      }
    }));
    return prices;
  } catch {
    return new Map();
  }
}

function leadTimeDays(offer) {
  if (/tomorrow/i.test(String(offer?.lead || ""))) return 1;
  return Number(String(offer?.lead || "").match(/\d+/)?.[0] || 99);
}

export default function RestockPage() {
  const { catalog, inventory, loading } = useCafe();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prefilled = useRef(false);

  const selectedIds = useMemo(
    () => (searchParams.get("items") || "").split(",").filter(Boolean),
    [searchParams]
  );
  const demandMultiplier = Math.max(1, Math.min(2, Number(searchParams.get("demand")) || 1));
  const previousPrices = useMemo(readPreviousPrices, []);

  const [request, setRequest] = useState(
    () => `We need espresso beans and oat milk for the weekend.${demandMultiplier > 1 ? ` Plan for a busier period with demand about ${Math.round((demandMultiplier - 1) * 100)}% higher than usual.` : ""}`
  );
  const [budget, setBudget] = useState(
    () => Number(searchParams.get("budget")) || 180
  );
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [waited, setWaited] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefilled.current || !selectedIds.length || !catalog.length) return;

    const names = catalog
      .filter((product) => selectedIds.includes(product.id))
      .map((product) => product.name);

    if (names.length) {
      setRequest(
        `Prioritize restocking these at-risk ingredients: ${names.join(", ")}. Stay within my budget and explain your recommendations.${demandMultiplier > 1 ? ` Plan for a busier period with demand about ${Math.round((demandMultiplier - 1) * 100)}% higher than usual.` : ""}`
      );
    }
    prefilled.current = true;
  }, [catalog, selectedIds, demandMultiplier]);

  const productsById = useMemo(
    () => new Map(catalog.map((product) => [product.id, product])),
    [catalog]
  );

  const total = useMemo(() => {
    if (!plan) return 0;

    return plan.items.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      const offer = product?.offers?.find((entry) => entry.vendor === item.vendor)
        || product?.offers?.[0];

      return sum + Number(offer?.price || 0) * Number(item.quantity || 0);
    }, 0);
  }, [plan, productsById]);

  async function buildPlan(event) {
    event.preventDefault();
    setError("");
    setPlan(null);
    setBusy(true);
    setActiveStep(0);
    setWaited(0);

    const timer = window.setInterval(() => {
      setActiveStep((current) => Math.min(current + 1, steps.length - 1));
    }, 900);
    const elapsedTimer = window.setInterval(() => setWaited((seconds) => seconds + 1), 1000);

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request,
          budget: Number(budget),
          catalog,
          demandMultiplier,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Could not build a restock plan.");
      }

      setActiveStep(steps.length - 1);
      setPlan(result);
    } catch (err) {
      setError(err.message || "Could not build your plan. Please try again.");
    } finally {
      window.clearInterval(timer);
      window.clearInterval(elapsedTimer);
      setBusy(false);
    }
  }

  function updateItem(index, updates) {
    setPlan((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      ),
    }));
  }

  function removeItem(index) {
    setPlan((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function approvePlan() {
    if (!plan || total <= 0 || total > Number(budget)) return;

    sessionStorage.setItem(
      "Brew2Basket-pending-order-v1",
      JSON.stringify({ plan, budget: Number(budget), catalog })
    );
    navigate("/checkout");
  }

  if (loading) {
    return <main className="restock-page"><section className="restock-panel">Loading café data…</section></main>;
  }

  if (!catalog.length) {
    return <Navigate to="/setup" replace />;
  }

  return (
    <main className="restock-page">
      <header className="restock-heading">
        <p className="eyebrow">PURCHASING COPILOT</p>
        <h1>Make your next restock a smart one.</h1>
        <p>Tell Brew2Basket what’s running low. Compare a practical basket before checkout.</p>
      </header>

      <div className="restock-layout">
        <section className="restock-panel request-panel">
          <div className="request-panel-heading">
            <span className="request-step-number">01</span>
            <div>
              <p className="eyebrow">YOUR REQUEST</p>
              <h2>What does your café need?</h2>
            </div>
          </div>
          <form onSubmit={buildPlan}>
            <label htmlFor="restock-request">Describe what’s running low</label>
            <textarea
              id="restock-request"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              rows="5"
              required
            />

            <label htmlFor="restock-budget">Spending limit</label>
            <div className="restock-budget-input">
              <span>$</span>
              <input
                id="restock-budget"
                type="number"
                min="1"
                max="1500"
                step="1"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                required
              />
              <small>USD</small>
            </div>

            <button className="button button-primary build-plan-button" type="submit" disabled={busy}>
              {busy ? "Building your plan…" : "Build my restock plan"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {error && <p className="restock-error" role="alert">{error}</p>}
          <p className="restock-note">Nothing is purchased until you approve it.</p>
        </section>

        <section className="restock-panel plan-panel" aria-live="polite">
          <div className="plan-panel-heading">
            <span className="request-step-number">02</span>
            <div>
              <p className="eyebrow">YOUR RESTOCK PLAN</p>
              <h2>{plan ? "Review your basket" : busy ? "Finding the right basket" : "A better restock starts here"}</h2>
            </div>
            {plan && <span className="plan-review-pill">Ready to review</span>}
          </div>

          {!plan && !busy && (
            <div className="plan-empty-state">
              <div className="plan-empty-symbol" aria-hidden="true">✳</div>
              <p className="plan-empty-title">Your café’s next good decision starts here.</p>
              <p>We’ll match your request with this café’s ingredients and supplier offers, then check the total against your budget.</p>
              <div className="plan-empty-flow" aria-label="Planning steps">
                <span>Stock check</span><b aria-hidden="true">→</b>
                <span>Supplier match</span><b aria-hidden="true">→</b>
                <span>Budget fit</span>
              </div>
              <div className="plan-empty-preview" aria-hidden="true">
                <span>Ingredient cards</span><span>Supplier prices</span><span>Budget meter</span>
              </div>
            </div>
          )}

          {busy && (
            <div className="plan-loading-state">
              <div className="plan-loader-orbit" aria-hidden="true"><span>✳</span></div>
              <p className="plan-loading-caption">Putting together a sensible basket</p>
              {waited >= 8 && (
                <p className="plan-wait-hint">The AI can take a little longer to respond. If it reaches 25 seconds, Brew2Basket will finish with its built-in planner.</p>
              )}
              <ol className="planner-steps" aria-live="polite">
                {steps.map((step, index) => (
                  <li
                    className={index < activeStep ? "completed" : index === activeStep ? "active" : ""}
                    aria-current={index === activeStep ? "step" : undefined}
                    key={step}
                  >
                    <span className="planner-step-icon">
                      {index < activeStep ? "✓" : index === activeStep ? <i aria-hidden="true" /> : "○"}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {plan && (
            <>
              <div className="plan-summary">
                <strong>Why this basket?</strong>
                <p>{plan.summary}</p>
                <small>{plan.notice || `Recommendation · ${plan.mode}`}</small>
              </div>

              <div className="plan-items">
                {plan.items.map((item, index) => {
                  const product = productsById.get(item.productId);
                  if (!product) return null;

                  const offer =
                    product.offers?.find((entry) => entry.vendor === item.vendor)
                    || product.offers?.[0];
                  const itemPrice = Number(offer?.price || 0) * Number(item.quantity || 0);
                  const cheapestPrice = Math.min(...(product.offers || []).map((entry) => Number(entry.price)).filter((price) => price > 0));
                  const fastestDays = Math.min(...(product.offers || []).map(leadTimeDays));
                  const lastPaidPrice = previousPrices.get(product.id);
                  const priceDelta = Number(offer?.price || 0) - Number(lastPaidPrice || 0);
                  const tradeoff = Number(offer?.price) <= cheapestPrice
                    ? "Lowest listed price"
                    : `$${(Number(offer?.price) - cheapestPrice).toFixed(2)} above the lowest listed offer`;

                  return (
                    <motion.article
                      className="plan-item"
                      key={`${item.productId}-${index}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.12, duration: 0.35 }}
                    >
                      <div className="plan-item-top">
                        <div className="plan-item-product">
                          <span className="plan-item-icon">{product.icon || "🧺"}</span>
                          <div>
                            <strong>{product.name}</strong>
                            <small>{product.unit}</small>
                          </div>
                        </div>
                        <strong className="plan-item-price">{money(itemPrice)}</strong>
                      </div>

                      <div className="plan-item-facts">
                        <span><strong>{item.quantity}</strong> {Number(item.quantity) === 1 ? "unit" : "units"}</span>
                        <span>{offer?.vendor || "Supplier not listed"}</span>
                        <span>Arrives {offer?.lead?.toLowerCase() || "date not listed"}</span>
                      </div>

                      <div className="plan-insights">
                        <span className="plan-insight">{tradeoff}</span>
                        <span className="plan-insight">{leadTimeDays(offer) === fastestDays ? "Fastest listed delivery" : `${offer?.lead || "Delivery not listed"} delivery`}</span>
                        {Number.isFinite(lastPaidPrice) && (
                          <span className={`plan-insight ${priceDelta > 0.009 ? "price-up" : priceDelta < -0.009 ? "price-down" : ""}`}>
                            {priceDelta > 0.009
                              ? `Up ${((priceDelta / lastPaidPrice) * 100).toFixed(0)}% vs last paid`
                              : priceDelta < -0.009
                                ? `Down ${((Math.abs(priceDelta) / lastPaidPrice) * 100).toFixed(0)}% vs last paid`
                                : "Same as last paid"}
                          </span>
                        )}
                      </div>

                      <div className="plan-item-controls">
                        <label>
                          Supplier
                          <select
                            value={offer?.vendor || ""}
                            onChange={(event) => updateItem(index, { vendor: event.target.value })}
                          >
                            {product.offers?.map((entry) => (
                              <option value={entry.vendor} key={entry.vendor}>
                                {entry.vendor} · {money(entry.price)} · {entry.lead}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Quantity
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={item.quantity}
                            onChange={(event) =>
                              updateItem(index, {
                                quantity: Math.max(1, Number(event.target.value) || 1),
                              })
                            }
                          />
                        </label>

                        <button
                          className="text-button remove-button"
                          type="button"
                          onClick={() => removeItem(index)}
                        >
                          Remove
                        </button>
                      </div>

                      <p className="plan-reason"><strong>Why this?</strong> {item.reason}</p>
                    </motion.article>
                  );
                })}
              </div>

              <div className="plan-total">
                <div className="plan-budget-heading">
                  <span>Budget used</span>
                  <strong>{money(total)} <small>of {money(Number(budget))}</small></strong>
                </div>
                <div
                  className="budget-track"
                  role="progressbar"
                  aria-label="Budget used"
                  aria-valuemin="0"
                  aria-valuemax={Number(budget) || 0}
                  aria-valuenow={total}
                >
                  <span style={{ width: `${Math.min(100, total / Math.max(1, Number(budget)) * 100)}%` }} />
                </div>
                <small>{money(Math.max(0, Number(budget) - total))} remaining from your budget</small>
              </div>

              {total > Number(budget) && (
                <p className="restock-error" role="alert">
                  This basket is over budget. Reduce quantities or choose another supplier.
                </p>
              )}

              <div className="plan-actions">
                <button
                  className="button button-primary paypal-approve-button"
                  type="button"
                  onClick={approvePlan}
                  disabled={total <= 0 || total > Number(budget)}
                >
                  Approve &amp; pay with PayPal <span aria-hidden="true">→</span>
                </button>
                <button className="button button-secondary" type="button" onClick={() => setPlan(null)}>
                  Reject plan
                </button>
              </div>
              <p className="restock-note">You’ll review your order in PayPal Sandbox before payment is captured.</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}


