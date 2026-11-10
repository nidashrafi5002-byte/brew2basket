import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function readOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem("Brew2Basket-orders-v1") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function OrdersPage() {
  const [orders] = useState(readOrders);
  const navigate = useNavigate();

  function reorder(order) {
    const ids = [...new Set(
      (order.items || []).map((item) => item.productId).filter(Boolean)
    )];

    if (!ids.length) {
      navigate("/restock");
      return;
    }

    const params = new URLSearchParams({ items: ids.join(",") });
    navigate(`/restock?${params.toString()}`);
  }

  return (
    <main className="orders-page">
      <header className="orders-heading">
        <p className="eyebrow">PURCHASE HISTORY</p>
        <h1>Orders</h1>
        <p>Review completed Sandbox and local demo orders from this browser.</p>
      </header>

      {orders.length === 0 ? (
        <section className="orders-empty">
          <span aria-hidden="true">☕</span>
          <h2>No orders yet</h2>
          <p>Once you complete a checkout, your order will appear here.</p>
          <Link className="button button-primary" to="/restock">
            Plan a restock
          </Link>
        </section>
      ) : (
        <section className="orders-list" aria-label="Order history">
          {orders.map((order, index) => (
            <article className="order-card" key={order.id || `${order.createdAt}-${index}`}>
              <header className="order-card-heading">
                <div>
                  <p className="eyebrow">{order.cafeName || "YOUR CAFÉ"}</p>
                  <h2>Order {order.id || "ID unavailable"}</h2>
                  <p className="order-date">{formatDate(order.createdAt)}</p>
                </div>
                <span className={`order-status ${order.mode === "Local demo" ? "demo" : ""}`}>
                  {order.status || "Completed"}
                </span>
              </header>

              <ol className="order-timeline" aria-label="Order progress">
                <li className="complete">Plan reviewed</li>
                <li className="complete">Approved for checkout</li>
                <li className="complete">{order.mode === "Local demo" ? "Demo order recorded" : "PayPal capture complete"}</li>
              </ol>

              <div className="order-items">
                {(order.items || []).map((item, itemIndex) => (
                  <div className="order-line" key={`${item.productId || item.name}-${itemIndex}`}>
                    <div>
                      <strong>{item.name || "Ingredient"}</strong>
                      <small>
                        {item.quantity} {Number(item.quantity) === 1 ? "unit" : "units"}
                        {item.vendor ? ` · ${item.vendor}` : ""}
                      </small>
                    </div>
                    <strong>{money(Number(item.unitPrice || 0) * Number(item.quantity || 0))}</strong>
                  </div>
                ))}
              </div>

              <footer className="order-card-footer">
                <div>
                  <small>{order.mode || "PayPal Sandbox"}</small>
                  <strong>Total · {money(order.total)}</strong>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => reorder(order)}
                >
                  Reorder these items →
                </button>
              </footer>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
