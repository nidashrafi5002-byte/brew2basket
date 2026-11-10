import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCafe } from "../context/CafeContext.jsx";

function readPendingOrder() {
  try {
    return JSON.parse(
      sessionStorage.getItem("Brew2Basket-pending-order-v1") || "null"
    );
  } catch {
    return null;
  }
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value) || 0);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "The request could not be completed.");
  }
  return result;
}

function loadPayPalSdk(clientId) {
  if (window.paypal?.Buttons) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      "script[data-Brew2Basket-paypal]"
    );

    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("PayPal checkout could not be loaded.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.Brew2BasketPaypal = "true";
    script.src =
      `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("PayPal checkout could not be loaded."));
    document.head.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { activeCafe } = useCafe();
  const navigate = useNavigate();
  const paypalContainer = useRef(null);
  const paypalButtons = useRef(null);

  const [pending] = useState(readPendingOrder);
  const [configLoading, setConfigLoading] = useState(true);
  const [paypalConfigured, setPaypalConfigured] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [demoAvailable, setDemoAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const productsById = useMemo(
    () => new Map((pending?.catalog || []).map((product) => [product.id, product])),
    [pending]
  );

  const total = useMemo(() => {
    if (!pending?.plan?.items) return 0;

    return pending.plan.items.reduce((sum, item) => {
      const product = productsById.get(item.productId);
      const offer =
        product?.offers?.find((entry) => entry.vendor === item.vendor) ||
        product?.offers?.[0];

      return sum + Number(offer?.price || 0) * Number(item.quantity || 0);
    }, 0);
  }, [pending, productsById]);

  useEffect(() => {
    if (!pending) {
      setConfigLoading(false);
      return;
    }

    let cancelled = false;

    async function preparePayPal() {
      try {
        const response = await fetch("/api/config");
        const config = await response.json();

        if (!response.ok) {
          throw new Error(config.error || "Could not load checkout settings.");
        }

        if (!config.paypalReady || !config.paypalClientId) {
          if (!cancelled) setDemoAvailable(true);
          return;
        }

        if (!cancelled) setPaypalConfigured(true);

        await loadPayPalSdk(config.paypalClientId);
        if (!cancelled) setSdkReady(true);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "PayPal checkout could not be prepared.");
          setDemoAvailable(true);
        }
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    }

    preparePayPal();
    return () => {
      cancelled = true;
    };
  }, [pending]);

  useEffect(() => {
    if (!sdkReady || !pending || !paypalContainer.current || !window.paypal?.Buttons) {
      return undefined;
    }

    let cancelled = false;
    paypalContainer.current.replaceChildren();

    const buttons = window.paypal.Buttons({
      createOrder: async () => {
        setError("");
        setMessage("Preparing PayPal Sandbox checkout…");
        const order = await postJson("/api/paypal/create-order", { amount: total });
        return order.id;
      },

      onApprove: async (data) => {
        setBusy(true);
        setError("");
        setMessage("Confirming your Sandbox payment…");

        try {
          const result = await postJson("/api/paypal/capture-order", {
            orderId: data.orderID,
          });

          const items = pending.plan.items.map((item) => {
            const product = productsById.get(item.productId);
            const offer =
              product?.offers?.find((entry) => entry.vendor === item.vendor) ||
              product?.offers?.[0];

            return {
              productId: item.productId,
              name: product?.name || "Ingredient",
              quantity: item.quantity,
              vendor: offer?.vendor || item.vendor,
              unitPrice: Number(offer?.price || 0),
            };
          });

          const order = {
            id: result.orderId,
            status: result.status,
            total,
            items,
            cafeName: activeCafe?.name || "Café",
            createdAt: new Date().toISOString(),
            mode: "PayPal Sandbox",
          };

          try {
            const savedOrders = JSON.parse(
              localStorage.getItem("Brew2Basket-orders-v1") || "[]"
            );
            const nextOrders = Array.isArray(savedOrders)
              ? [order, ...savedOrders]
              : [order];

            localStorage.setItem(
              "Brew2Basket-orders-v1",
              JSON.stringify(nextOrders)
            );
          } catch {
            // The success page can still display the order for this visit.
          }

          sessionStorage.setItem(
            "Brew2Basket-last-order-v1",
            JSON.stringify(order)
          );
          sessionStorage.removeItem("Brew2Basket-pending-order-v1");

          navigate("/success", { state: { order } });
        } catch (err) {
          setError(err.message || "Payment confirmation failed.");
          setMessage("");
        } finally {
          setBusy(false);
        }
      },

      onCancel: () => {
        setMessage("Checkout was cancelled. Your basket is still here.");
      },

      onError: (err) => {
        setError(err?.message || "PayPal checkout could not be completed.");
        setMessage("");
        setBusy(false);
      },
    });

    paypalButtons.current = buttons;

    buttons.render(paypalContainer.current).catch((err) => {
      if (!cancelled) {
        setError(err.message || "PayPal buttons could not be displayed.");
        setDemoAvailable(true);
      }
    });

    return () => {
      cancelled = true;
      paypalButtons.current?.close?.();
      paypalButtons.current = null;
      paypalContainer.current?.replaceChildren();
    };
  }, [sdkReady, pending, total, productsById, activeCafe, navigate]);

  function completeDemoOrder() {
    if (!pending) return;

    const order = {
      id: `DEMO-${Date.now()}`,
      status: "DEMO_COMPLETE",
      total,
      items: pending.plan.items.map((item) => {
        const product = productsById.get(item.productId);
        const offer =
          product?.offers?.find((entry) => entry.vendor === item.vendor) ||
          product?.offers?.[0];

        return {
          productId: item.productId,
          name: product?.name || "Ingredient",
          quantity: item.quantity,
          vendor: offer?.vendor || item.vendor,
          unitPrice: Number(offer?.price || 0),
        };
      }),
      cafeName: activeCafe?.name || "Café",
      createdAt: new Date().toISOString(),
      mode: "Local demo",
    };

    try {
      const savedOrders = JSON.parse(
        localStorage.getItem("Brew2Basket-orders-v1") || "[]"
      );
      localStorage.setItem(
        "Brew2Basket-orders-v1",
        JSON.stringify([order, ...(Array.isArray(savedOrders) ? savedOrders : [])])
      );
    } catch {
      // Continue to the confirmation page even if browser storage is unavailable.
    }

    sessionStorage.setItem("Brew2Basket-last-order-v1", JSON.stringify(order));
    sessionStorage.removeItem("Brew2Basket-pending-order-v1");
    navigate("/success", { state: { order } });
  }

  if (!pending?.plan?.items?.length) {
    return (
      <main className="checkout-page">
        <section className="checkout-panel">
          <p className="eyebrow">CHECKOUT</p>
          <h1>No basket to check out</h1>
          <p>Build and approve a restock plan first. Your basket will appear here.</p>
          <Link className="button button-primary" to="/restock">Return to Restock</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <header className="checkout-heading">
        <p className="eyebrow">FINAL REVIEW</p>
        <h1>Complete checkout</h1>
        <p>Review your basket before continuing to PayPal Sandbox.</p>
      </header>

      <section className="checkout-panel">
        <div className="checkout-panel-title">
          <div>
            <p className="eyebrow">{activeCafe?.name || "YOUR CAFÉ"}</p>
            <h2>Order summary</h2>
          </div>
          <span className="paypal-tag">
            {paypalConfigured ? "PayPal Sandbox" : "Demo checkout"}
          </span>
        </div>

        <div className="checkout-lines">
          {pending.plan.items.map((item, index) => {
            const product = productsById.get(item.productId);
            const offer =
              product?.offers?.find((entry) => entry.vendor === item.vendor) ||
              product?.offers?.[0];

            return (
              <div className="checkout-line" key={`${item.productId}-${index}`}>
                <div>
                  <strong>{product?.name || "Ingredient"}</strong>
                  <small>
                    {item.quantity} {Number(item.quantity) === 1 ? "unit" : "units"}
                    {" · "}{offer?.vendor || item.vendor}
                    {offer?.lead ? ` · ${offer.lead}` : ""}
                  </small>
                </div>
                <strong>{money(Number(offer?.price || 0) * item.quantity)}</strong>
              </div>
            );
          })}
        </div>

        <div className="checkout-total">
          <span>Estimated total</span>
          <strong>{money(total)}</strong>
        </div>

        {configLoading && <p className="checkout-message">Preparing checkout…</p>}
        {message && <p className="checkout-message" role="status">{message}</p>}
        {error && <p className="checkout-error" role="alert">{error}</p>}

        {sdkReady && (
          <div className="paypal-buttons" ref={paypalContainer} />
        )}

        {demoAvailable && (
          <div className="demo-checkout">
            <p>
              PayPal Sandbox isn’t available right now. You can complete a local
              demo order; this will not charge a payment method.
            </p>
            <button
              className="button button-primary"
              type="button"
              onClick={completeDemoOrder}
              disabled={busy}
            >
              Complete demo order
            </button>
          </div>
        )}

        <Link className="checkout-back" to="/restock">
          Back to your plan
        </Link>
        <p className="restock-note">
          Nothing is purchased until you approve it. Use a Sandbox buyer account
          when testing PayPal.
        </p>
      </section>
    </main>
  );
}