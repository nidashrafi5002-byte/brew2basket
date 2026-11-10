import { useLocation, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";

function readLastOrder() {
  try {
    return JSON.parse(sessionStorage.getItem("Brew2Basket-last-order-v1") || "null");
  } catch {
    return null;
  }
}

export default function SuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [savedOrder] = useState(readLastOrder);
  const order = location.state?.order || savedOrder;
  const isDemo = order?.mode === "Local demo";
  const confetti = Array.from({ length: 34 }, (_, index) => index);

  return createPortal((
    <main className="checkout-page success-page">
      <div className="success-confetti" aria-hidden="true">
        {confetti.map((piece) => (
          <i
            key={piece}
            style={{
              "--confetti-x": `${(piece * 37) % 100}%`,
              "--confetti-delay": `${(piece % 11) * -0.23}s`,
              "--confetti-duration": `${5 + (piece % 7) * 0.45}s`,
              "--confetti-rotate": `${(piece * 43) % 360}deg`,
            }}
          />
        ))}
      </div>
      <section className="success-modal" aria-labelledby="success-title">
        <button className="success-close" type="button" onClick={() => navigate("/dashboard")} aria-label="Close confirmation">×</button>
        {order ? (
          <>
            <div className="success-mark" aria-hidden="true"><span>✓</span></div>
            <p className="success-kicker">{isDemo ? "DEMO ORDER COMPLETE" : "PAYMENT CONFIRMED"}</p>
            <h1 id="success-title">{isDemo ? "Your demo basket is ready." : "Your Sandbox checkout is complete."}</h1>
            <p className="success-intro">
              {isDemo
                ? "Your local walkthrough is complete. No payment method was charged."
                : "PayPal Sandbox confirmed this order, and it has been saved in your order history."}
            </p>

            <div className="success-receipt">
              <div className="success-receipt-icon" aria-hidden="true">☕</div>
              <div className="success-receipt-main">
                <span>Order reference</span>
                <strong>{order.id || "Order confirmed"}</strong>
              </div>
              <div className="success-receipt-total">
                <span>Total</span>
                <strong>${Number(order.total).toFixed(2)}</strong>
              </div>
            </div>

            <div className="success-next-heading">
              <h2>What would you like to do next?</h2>
              <p>Your order is saved in this browser.</p>
            </div>
            <div className="success-next-grid">
              <Link className="success-next-card" to="/orders">
                <span className="success-next-icon">↗</span>
                <span><strong>View order history</strong><small>See this order and past checkouts</small></span>
                <b aria-hidden="true">→</b>
              </Link>
              <Link className="success-next-card" to="/dashboard">
                <span className="success-next-icon">◉</span>
                <span><strong>Check inventory</strong><small>See what your café may need next</small></span>
                <b aria-hidden="true">→</b>
              </Link>
              <Link className="success-next-card" to="/restock">
                <span className="success-next-icon">＋</span>
                <span><strong>Plan another restock</strong><small>Build a new basket when you're ready</small></span>
                <b aria-hidden="true">→</b>
              </Link>
            </div>
            <p className="success-sandbox-note">{isDemo ? "Local demo only · No charge made" : "PayPal Sandbox · No real money moved"}</p>
          </>
        ) : (
          <div className="success-missing">
            <p className="success-kicker">ORDER UPDATE</p>
            <h1 id="success-title">No recent order found</h1>
            <p>There are no confirmation details saved in this browser.</p>
            <Link className="button button-primary" to="/dashboard">Back to Dashboard</Link>
          </div>
        )}
      </section>
    </main>
  ), document.body);
}
