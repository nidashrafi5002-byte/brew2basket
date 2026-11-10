const $ = (selector) => document.querySelector(selector);
const state = { catalog: [], inventory: [], plan: null, config: null, approved: false, scenario: "balanced", cafes: [], activeCafeId: null, editingIngredientId: null };

const money = (amount) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

function getProduct(productId) {
  return state.catalog.find((item) => item.id === productId);
}

function activeCafe() {
  return state.cafes.find((cafe) => cafe.id === state.activeCafeId);
}

function persistCafeProfiles() {
  try {
    localStorage.setItem("Brew2Basket-cafes-v1", JSON.stringify({ cafes: state.cafes, activeCafeId: state.activeCafeId }));
  } catch {
    $(".setup-footnote").textContent = "Browser storage is unavailable. Café changes may not persist after refresh.";
  }
}

function initializeCafeProfiles(defaultCatalog, defaultInventory) {
  try {
    const saved = JSON.parse(localStorage.getItem("Brew2Basket-cafes-v1") || "null");
    if (saved && Array.isArray(saved.cafes) && saved.cafes.length) state.cafes = saved.cafes;
    state.activeCafeId = saved?.activeCafeId;
  } catch { /* Replace unreadable local profile data with the demo profile. */ }
  if (!state.cafes.length) {
    state.cafes = [{ id: "demo-cafe", name: "Demo café", isDemo: true, catalog: defaultCatalog, inventory: defaultInventory }];
  }
  if (!state.cafes.some((cafe) => cafe.id === state.activeCafeId)) state.activeCafeId = state.cafes[0].id;
  loadActiveCafe();
  persistCafeProfiles();
}

function loadActiveCafe() {
  const cafe = activeCafe();
  if (!cafe) return;
  state.catalog = Array.isArray(cafe.catalog) ? cafe.catalog : [];
  state.inventory = Array.isArray(cafe.inventory) ? cafe.inventory : [];
  state.plan = null;
  state.approved = false;
  $("#cafe-label").textContent = cafe.name;
  $(".inventory-method").textContent = `${cafe.isDemo ? "Illustrative demo data" : "This café's saved data"} · 7-day weighted sales average · Edit stock on hand to explore scenarios.`;
  $("#confirmation").classList.add("hidden");
  renderCafeSetup();
  renderInventory();
  renderExpiryWatch();
  renderSupplierComparison();
  $("#basket").innerHTML = "";
  $("#order-summary").classList.add("hidden");
  $("#checkout").classList.add("hidden");
  $("#recommendation").classList.add("empty-state");
  $("#recommendation").innerHTML = '<div class="empty-icon">✳</div><strong>Your next good decision starts here.</strong><p>Build a plan using this café’s ingredients and supplier offers.</p>';
  $("#result-status").textContent = "Ready when you are.";
  $("#planner-label").textContent = "Brew2Basket planner";
  $("#planner-description").textContent = "Uses the active café’s ingredient list and supplier offers.";
}

function renderCafeSetup() {
  const cafe = activeCafe();
  if (!cafe) return;
  $("#cafe-picker").innerHTML = state.cafes.map((row) => `<option value="${escapeHtml(row.id)}" ${row.id === cafe.id ? "selected" : ""}>${escapeHtml(row.name)}</option>`).join("");
  $("#cafe-name").value = cafe.name;
  const rows = state.catalog.map((product) => {
    const stock = state.inventory.find((record) => record.productId === product.id);
    const offer = product.offers?.[0];
    return `<article class="ingredient-row">
      <div class="ingredient-row-name"><span>${product.icon || "🧺"}</span><div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.unit)}</small></div></div>
      <div class="ingredient-row-stat"><strong>${stock?.onHand ?? 0} units</strong><small>On hand</small></div>
      <div class="ingredient-row-stat"><strong>${Number(stock?.averageDailyDemand ?? stock?.sales7d?.[0] ?? 0).toFixed(1)} / day</strong><small>Average use</small></div>
      <div class="ingredient-row-stat"><strong>${offer ? `${escapeHtml(offer.vendor)} · ${money(offer.price)}` : "No supplier"}</strong><small>Supplier offer</small></div>
      <div class="ingredient-row-actions"><button type="button" data-edit-ingredient="${escapeHtml(product.id)}">Edit</button><button type="button" class="remove-ingredient" data-remove-ingredient="${escapeHtml(product.id)}">Remove</button></div>
    </article>`;
  }).join("");
  $("#ingredient-list").innerHTML = rows || '<p class="ingredient-empty">No ingredients added yet. Add the first item above to start this café’s inventory.</p>';
}

function refreshActiveCafe() {
  const cafe = activeCafe();
  if (!cafe) return;
  cafe.catalog = state.catalog;
  cafe.inventory = state.inventory;
  persistCafeProfiles();
  state.plan = null;
  state.approved = false;
  $("#basket").innerHTML = "";
  $("#order-summary").classList.add("hidden");
  $("#checkout").classList.add("hidden");
  $("#confirmation").classList.add("hidden");
  $("#recommendation").classList.add("empty-state");
  $("#recommendation").innerHTML = '<div class="empty-icon">✳</div><strong>Your café data changed.</strong><p>Build a fresh plan to use the updated ingredients, stock, and supplier details.</p>';
  $("#result-status").textContent = "Café setup saved. Ready for a fresh plan.";
}

function resetIngredientForm() {
  state.editingIngredientId = null;
  $("#ingredient-form").reset();
  $("#save-ingredient-button").textContent = "Add ingredient";
  $("#cancel-edit-button").classList.add("hidden");
}

function editIngredient(id) {
  const product = getProduct(id);
  const stock = state.inventory.find((record) => record.productId === id);
  const offer = product?.offers?.[0];
  if (!product || !stock || !offer) return;
  state.editingIngredientId = id;
  $("#ingredient-name").value = product.name;
  $("#ingredient-unit").value = product.unit;
  $("#ingredient-stock").value = stock.onHand;
  $("#ingredient-demand").value = stock.averageDailyDemand ?? stock.sales7d[0] ?? 0;
  $("#ingredient-supplier").value = offer.vendor;
  $("#ingredient-price").value = offer.price;
  $("#ingredient-lead").value = stock.leadDays;
  $("#save-ingredient-button").textContent = "Save changes";
  $("#cancel-edit-button").classList.remove("hidden");
  $("#ingredient-name").focus();
}

function saveIngredient(event) {
  event.preventDefault();
  const id = state.editingIngredientId || `item-${Date.now().toString(36)}`;
  const name = $("#ingredient-name").value.trim();
  const unit = $("#ingredient-unit").value.trim();
  const onHand = Math.floor(Number($("#ingredient-stock").value));
  const dailyUsage = Number($("#ingredient-demand").value);
  const vendor = $("#ingredient-supplier").value.trim();
  const price = Number($("#ingredient-price").value);
  const leadDays = Math.floor(Number($("#ingredient-lead").value));
  if (!name || !unit || !vendor || onHand < 0 || dailyUsage < 0 || price <= 0 || leadDays < 1) return;
  const oldProduct = getProduct(id);
  const product = { id, name, unit, category: oldProduct?.category || "Ingredient", demand: "Custom", icon: oldProduct?.icon || "🧺", offers: [{ vendor, price, lead: leadDays === 1 ? "Tomorrow" : `${leadDays} days`, rating: oldProduct?.offers?.[0]?.rating || 4.5, note: "Entered by this café" }] };
  const record = { productId: id, onHand, sales7d: Array(7).fill(dailyUsage), averageDailyDemand: dailyUsage, leadDays, safetyDays: 2, targetCoverDays: 3 };
  if (oldProduct) {
    state.catalog = state.catalog.map((row) => row.id === id ? product : row);
    state.inventory = state.inventory.map((row) => row.productId === id ? record : row);
  } else {
    state.catalog = [...state.catalog, product];
    state.inventory = [...state.inventory, record];
  }
  refreshActiveCafe();
  renderCafeSetup();
  renderInventory();
  renderSupplierComparison();
  resetIngredientForm();
}

function getInventoryMetrics(record) {
  const weights = record.sales7d.map((_, index) => index + 1);
  const weightedDemand = record.sales7d.reduce((sum, sales, index) => sum + sales * weights[index], 0)
    / weights.reduce((sum, weight) => sum + weight, 0);
  const daysLeft = weightedDemand > 0 ? record.onHand / weightedDemand : null;
  const reorderPoint = Math.ceil(weightedDemand * (record.leadDays + record.safetyDays));
  const suggestedQuantity = Math.max(0, Math.ceil(weightedDemand * 3) - record.onHand);
  const risk = daysLeft !== null && daysLeft <= record.leadDays
    ? "critical"
    : daysLeft !== null && daysLeft <= record.leadDays + record.safetyDays
      ? "soon"
      : "healthy";
  return { weightedDemand, daysLeft, reorderPoint, suggestedQuantity, risk };
}

function usageUnit(product) {
  const unit = String(product.unit || "").toLowerCase();
  if (unit.includes("bag")) return "bags";
  if (unit.includes("bottle")) return "bottles";
  if (unit.includes("case")) return "cases";
  if (unit.includes("sleeve")) return "sleeves";
  if (unit.includes("tin")) return "tins";
  if (unit.includes("jar")) return "jars";
  if (unit.includes("packet") || unit.includes("pack")) return "packs";
  return "units";
}

function renderHeroStats() {
  const counts = { critical: 0, soon: 0, healthy: 0 };
  let estimate = 0;
  for (const record of state.inventory) {
    const metrics = getInventoryMetrics(record);
    counts[metrics.risk]++;
    const product = getProduct(record.productId);
    const cheapest = Math.min(...(product?.offers || []).map((offer) => Number(offer.price)).filter(Number.isFinite));
    if (Number.isFinite(cheapest)) estimate += metrics.suggestedQuantity * cheapest;
  }
  $("#stat-critical").textContent = counts.critical;
  $("#stat-soon").textContent = counts.soon;
  $("#stat-healthy").textContent = counts.healthy;
  $("#stat-estimate").textContent = money(estimate);
}

function runsOutLabel(daysLeft) {
  if (daysLeft === null) return "No recent use";
  const when = new Date();
  when.setDate(when.getDate() + Math.max(0, Math.ceil(daysLeft)));
  return `Runs out ${daysLeft <= 0 ? "today" : when.toLocaleDateString("en-US", { weekday: "short" })}`;
}

function renderInventory() {
  const grid = $("#inventory-radar");
  if (!state.inventory.length) {
    grid.innerHTML = '<p class="inventory-loading">This café has no inventory yet. Add ingredients in Your café setup to populate the radar.</p>';
    renderHeroStats();
    return;
  }
  const orderedInventory = [...state.inventory].sort((first, second) => {
    const urgency = { critical: 0, soon: 1, healthy: 2 };
    const firstMetrics = getInventoryMetrics(first);
    const secondMetrics = getInventoryMetrics(second);
    return urgency[firstMetrics.risk] - urgency[secondMetrics.risk]
      || (firstMetrics.daysLeft ?? Infinity) - (secondMetrics.daysLeft ?? Infinity);
  });
  grid.innerHTML = orderedInventory.map((record, cardIndex) => {
    const product = getProduct(record.productId);
    if (!product) return "";
    const metrics = getInventoryMetrics(record);
    const riskLabel = metrics.risk === "critical" ? "Critical" : metrics.risk === "soon" ? "Reorder soon" : "Healthy";
    const daysText = metrics.daysLeft === null ? "No recent sales" : `${metrics.daysLeft.toFixed(1)} days`;
    const topUp = metrics.suggestedQuantity > 0
      ? `Top up ${metrics.suggestedQuantity} ${metrics.suggestedQuantity === 1 ? "unit" : "units"} for 3-day cover.`
      : "Current stock covers the 3-day target.";
    const progress = Math.max(0, Math.min(100, (metrics.daysLeft || 0) / (record.leadDays + record.safetyDays + 1) * 100));
    return `
      <article class="inventory-item glass-surface ${metrics.risk}" style="--card-index:${cardIndex}">
        <div class="inventory-item-top">
          <div class="inventory-product">
            <span class="inventory-product-icon">${product.icon || "🧺"}</span>
            <div><strong>${escapeHtml(product.name)}</strong><small>${escapeHtml(product.unit)}</small></div>
          </div>
          <span class="risk-badge ${metrics.risk}">${riskLabel}</span>
        </div>
        <div class="inventory-metrics">
          <div class="inventory-metric">
            <span>On hand · edit</span>
            <label class="inventory-stock-edit">
              <input type="number" min="0" max="99999" step="1" value="${record.onHand}" data-stock-id="${escapeHtml(record.productId)}" aria-label="Current stock of ${escapeHtml(product.name)}">
              <small>units</small>
            </label>
          </div>
          <div class="inventory-metric stock-left-metric"><span>Estimated stock left</span><strong>${daysText}</strong><div class="stock-progress"><span style="--stock-progress:${progress}%"></span></div><small class="runs-out">${runsOutLabel(metrics.daysLeft)}</small></div>
          <div class="inventory-metric"><span>7-day weighted usage</span><strong>${metrics.weightedDemand.toFixed(1)} ${usageUnit(product)}/day</strong></div>
          <div class="inventory-metric"><span>Reorder point</span><strong>At ${metrics.reorderPoint} units</strong></div>
        </div>
        <p class="inventory-foot">${topUp} Supplier lead time: ${record.leadDays} ${record.leadDays === 1 ? "day" : "days"} · ${record.safetyDays} safety days.</p>
      </article>`;
  }).join("");
  renderHeroStats();
}

function renderExpiryWatch() {
  if (!activeCafe()?.isDemo) {
    $("#expiry-list").innerHTML = '<p class="ingredient-empty">No expiry lots are recorded for this café yet. Add expiry tracking when you enter lot dates.</p>';
    $("#expiry-demo-note").textContent = "Expiry alerts are shown only when lot dates are available.";
    return;
  }
  $("#expiry-demo-note").textContent = "Illustrative demo dates only; connect real lot data for operational use.";
  const lots = [
    { productId: "oat", days: 2, quantity: 3, note: "Use in weekend drinks" },
    { productId: "syrup", days: 4, quantity: 1, note: "Feature in a special" },
    { productId: "tea", days: 6, quantity: 1, note: "Offer as a daily brew" }
  ];
  $("#expiry-list").innerHTML = lots.map((lot) => {
    const product = getProduct(lot.productId);
    if (!product) return "";
    const level = lot.days <= 2 ? "urgent" : "watch";
    return `<article class="expiry-row ${level}">
      <span class="expiry-product-icon">${product.icon}</span>
      <span class="expiry-product"><strong>${escapeHtml(product.name)}</strong><small>${lot.quantity} ${escapeHtml(product.unit)} · ${escapeHtml(lot.note)}</small></span>
      <span class="expiry-days">${lot.days} days</span>
    </article>`;
  }).join("");
}

function renderBudgetScenarios() {
  const scenarios = [
    { id: "lean", title: "Lean essentials", amount: 120, detail: "Keep the basket tight" },
    { id: "balanced", title: "Balanced", amount: 180, detail: "Everyday restock" },
    { id: "buffer", title: "Build a buffer", amount: 240, detail: "More room for coverage" }
  ];
  $("#budget-scenarios").innerHTML = scenarios.map((item) => `
    <button class="scenario-option ${state.scenario === item.id ? "selected" : ""}" type="button" data-scenario="${item.id}" aria-pressed="${state.scenario === item.id}">
      <span><strong>${item.title}</strong><small>${item.detail}</small></span><b>${money(item.amount)}</b>
    </button>`).join("");
}

function leadTimeDays(offer) {
  const match = String(offer.lead).match(/(\d+)/);
  return /tomorrow/i.test(offer.lead) ? 1 : match ? Number(match[1]) : 99;
}

function renderSupplierComparison() {
  const rows = state.catalog.flatMap((product) => {
    const offers = [...product.offers];
    const cheapest = Math.min(...offers.map((offer) => offer.price));
    const quickest = Math.min(...offers.map(leadTimeDays));
    return offers.map((offer) => `<tr>
      <td><span class="compare-product">${product.icon} ${escapeHtml(product.name)}</span><small>${escapeHtml(product.unit)}</small></td>
      <td>${escapeHtml(offer.vendor)}${offer.price === cheapest ? '<span class="offer-tag value-tag">Best price</span>' : ""}</td>
      <td><strong>${money(offer.price)}</strong></td>
      <td>${escapeHtml(offer.lead)}${leadTimeDays(offer) === quickest ? '<span class="offer-tag speed-tag">Fastest</span>' : ""}</td>
      <td>★ ${Number(offer.rating).toFixed(1)}</td>
    </tr>`);
  }).join("");
  $("#supplier-comparison").innerHTML = rows
    ? `<table class="supplier-table"><thead><tr><th>Product</th><th>Supplier</th><th>Price</th><th>Delivery</th><th>Rating</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<p class="ingredient-empty">Add a product and supplier offer in Your café setup to compare them here.</p>';
}

function applyBudgetScenario(id) {
  const scenario = { lean: { amount: 120, label: "Lean essentials" }, balanced: { amount: 180, label: "Balanced" }, buffer: { amount: 240, label: "Build a buffer" } }[id];
  if (!scenario) return;
  state.scenario = id;
  $("#budget").value = scenario.amount;
  $("#budget").dispatchEvent(new Event("input", { bubbles: true }));
  $("#scenario-message").textContent = `${scenario.label} selected · spending cap set to ${money(scenario.amount)}. Build a new plan to apply it.`;
  renderBudgetScenarios();
}

function selectedOffer(item) {
  const product = getProduct(item.productId);
  return product.offers.find((offer) => offer.vendor === item.vendor) || product.offers[0];
}

function totalCost() {
  return state.plan.items.reduce((sum, item) => {
    return sum + selectedOffer(item).price * item.quantity;
  }, 0);
}

function renderBasket() {
  if (!state.plan) return;
  const basket = $("#basket");
  const editing = basket.classList.contains("editing");

  basket.innerHTML = state.plan.items.map((item, index) => {
    const product = getProduct(item.productId);
    const offer = selectedOffer(item);
    const offerOptions = product.offers.map((option) =>
      `<option value="${escapeHtml(option.vendor)}" ${option.vendor === offer.vendor ? "selected" : ""}>
        ${escapeHtml(option.vendor)} · ${money(option.price)} · ${escapeHtml(option.lead)}
      </option>`
    ).join("");

    return `
      <article class="basket-item glass-surface" data-index="${index}" style="--item-index:${index}">
        <div class="item-top">
          <div class="item-name">
            <span class="item-icon">${product.icon}</span>
            <div>
              <strong>${escapeHtml(product.name)}</strong>
              <small>${escapeHtml(product.unit)}</small>
            </div>
          </div>
          <span class="item-price">${money(offer.price * item.quantity)}</span>
        </div>
        <div class="item-facts"><span><b>${item.quantity}</b> ${item.quantity === 1 ? "unit" : "units"}</span><span>${escapeHtml(offer.vendor)}</span><span>Arrives ${escapeHtml(offer.lead.toLowerCase())}</span></div>
        <div class="item-controls">
          <select class="offer-select" aria-label="Choose supplier for ${escapeHtml(product.name)}">
            ${offerOptions}
          </select>
          <div class="qty">
            <button type="button" data-action="decrease" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="item-why"><strong>Why this?</strong><p class="item-reason">${escapeHtml(item.reason)}</p></div>
      </article>`;
  }).join("");
  basket.classList.toggle("editing", editing);

  const total = totalCost();
  const budget = Number($("#budget").value);
  $("#subtotal").textContent = money(total);
  const totalElement = $("#total");
  const startValue =
    Number(totalElement.textContent.replace(/[^0-9.-]/g, "")) || 0;
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) {
    totalElement.textContent = money(total);
  } else {
    const animationStart = performance.now();
    const duration = 600;

    const animateTotal = (now) => {
      const progress = Math.min((now - animationStart) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      totalElement.textContent = money(
        startValue + (total - startValue) * eased
      );

      if (progress < 1) requestAnimationFrame(animateTotal);
    };

    requestAnimationFrame(animateTotal);
  }
  $("#remaining").textContent = money(Math.max(0, budget - total));
  $("#approve-button").disabled = total > budget;
  const percent = budget > 0 ? Math.max(0, Math.min(100, total / budget * 100)) : 0;
  $("#budget-meter-fill").style.width = `${percent}%`;
  $(".budget-meter").setAttribute("aria-valuenow", String(Math.round(percent)));
  $("#edit-plan-button").textContent = editing ? "Done editing" : "Edit basket";
  $("#order-summary").classList.remove("hidden");
}

function renderPlan(plan) {
  state.plan = plan;
  state.approved = false;
  $("#result-status").textContent = plan.notice || `Recommendation · ${plan.mode}`;
  $("#planner-label").textContent = plan.notice ? "Built-in demo planner" : plan.mode;
  $("#planner-description").textContent = plan.summary;
  $("#recommendation").classList.remove("empty-state");
  $("#recommendation").innerHTML = `
    <strong>Why this basket?</strong>
    <p>${escapeHtml(plan.summary)}</p>`;
  $("#confirmation").classList.add("hidden");
  $("#checkout").classList.add("hidden");
  $("#paypal-button-container").innerHTML = "";
  $("#demo-checkout-button").classList.add("hidden");
  $("#plan-loading").classList.add("hidden");
  $("#basket").classList.remove("editing");
  renderBasket();
}

async function loadPayPalSdk() {
  if (!state.config.paypalReady) return;
  const url = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(state.config.paypalClientId)}&currency=USD`;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load PayPal checkout."));
    document.head.append(script);
  });
  $("#payment-mode").textContent = "PayPal sandbox";
}

function showConfirmation(message) {
  $("#confirmation").textContent = message;
  $("#confirmation").classList.remove("hidden");
  $("#checkout").classList.add("hidden");
}

async function setupCheckout() {
  const amount = totalCost();
  const container = $("#paypal-button-container");
  container.innerHTML = "";

  if (!state.config.paypalReady || !window.paypal) {
    $("#checkout-message").textContent = "Local demo mode — no payment will be made.";
    $("#demo-checkout-button").classList.remove("hidden");
    return;
  }

  $("#checkout-message").textContent = "Pay with a PayPal sandbox buyer account.";
  await window.paypal.Buttons({
    createOrder: async () => {
      const order = await postJson("/api/paypal/create-order", { amount });
      return order.id;
    },
    onApprove: async (data) => {
      const result = await postJson("/api/paypal/capture-order", { orderId: data.orderID });
      showConfirmation(`Sandbox payment complete. Order ${result.orderId} · Status: ${result.status}.`);
    },
    onError: (error) => {
      $("#checkout-message").textContent = error.message || "PayPal checkout could not be completed.";
    }
  }).render("#paypal-button-container");
}

$("#request-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = $("#plan-button");
  button.disabled = true;
  $("#result-status").classList.remove("plan-error");
  button.textContent = "Building your plan…";
  $("#result-status").textContent = "Comparing supplier offers…";
  const loading = $("#plan-loading");
  const steps = [...loading.querySelectorAll(".plan-step")];
  let activeStep = 0;

  const showStep = () => {
    steps.forEach((step, index) => {
      step.classList.toggle("active", index === activeStep);
      step.classList.toggle("completed", index < activeStep);
    });
  };

  loading.classList.remove("hidden");
  showStep();

  const loadingInterval = setInterval(() => {
    if (activeStep < steps.length - 1) {
      activeStep += 1;
      showStep();
    }
  }, 1100);

  try {
    const plan = await postJson("/api/plan", {
      request: $("#request").value,
      budget: Number($("#budget").value),
      catalog: state.catalog
    });
    renderPlan(plan);
  } catch (error) {
    const status = $("#result-status");
    status.textContent = error.message || "We couldn't build your plan. Please try again.";
    status.classList.remove("plan-error");
    void status.offsetWidth;
    status.classList.add("plan-error");
  } finally {
    clearInterval(loadingInterval);
    loading.classList.add("hidden");
    button.disabled = false;
    button.innerHTML = 'Build my restock plan <span aria-hidden="true">→</span>';
  }
});

$("#basket").addEventListener("change", (event) => {
  if (!event.target.matches(".offer-select")) return;
  const index = Number(event.target.closest(".basket-item").dataset.index);
  state.plan.items[index].vendor = event.target.value;
  renderBasket();
});

$("#basket").addEventListener("click", (event) => {
  const action = event.target.dataset.action;
  if (!action) return;
  const index = Number(event.target.closest(".basket-item").dataset.index);
  const item = state.plan.items[index];
  item.quantity = Math.max(1, Math.min(8, item.quantity + (action === "increase" ? 1 : -1)));
  renderBasket();
});

$("#edit-plan-button").addEventListener("click", () => {
  const basket = $("#basket");
  basket.classList.toggle("editing");
  renderBasket();
});

$("#reject-plan-button").addEventListener("click", () => {
  state.plan = null;
  state.approved = false;
  $("#basket").classList.remove("editing");
  $("#basket").innerHTML = "";
  $("#order-summary").classList.add("hidden");
  $("#checkout").classList.add("hidden");
  $("#paypal-button-container").innerHTML = "";
  $("#recommendation").classList.add("empty-state");
  $("#recommendation").innerHTML = '<div class="empty-icon">✳</div><strong>Plan dismissed.</strong><p>Change your request or budget, then build a new plan when you’re ready.</p>';
  $("#result-status").textContent = "Plan rejected. Nothing was purchased.";
});

$("#budget").addEventListener("input", () => {
  if (state.plan) renderBasket();
});

$("#inventory-radar").addEventListener("change", (event) => {
  if (!event.target.matches("[data-stock-id]")) return;
  const record = state.inventory.find((row) => row.productId === event.target.dataset.stockId);
  if (!record) return;
  record.onHand = Math.max(0, Math.min(99999, Math.floor(Number(event.target.value) || 0)));
  refreshActiveCafe();
  renderInventory();
  renderCafeSetup();
});

$("#draft-risk-request").addEventListener("click", () => {
  const atRisk = state.inventory.filter((record) => getInventoryMetrics(record).risk !== "healthy");
  if (!atRisk.length) {
    $("#result-status").textContent = "No low-stock items are flagged right now. Lower an on-hand value to explore the radar.";
    return;
  }
  const details = atRisk.map((record) => {
    const metrics = getInventoryMetrics(record);
    const days = metrics.daysLeft === null ? "unknown days" : `${metrics.daysLeft.toFixed(1)} days`;
    return `${getProduct(record.productId)?.name || "Ingredient"} (${days} left; suggested top-up ${metrics.suggestedQuantity} units)`;
  }).join("; ");
  const request = $("#request");
  const existing = request.value.trim();
  request.value = `${existing}${existing ? "\n\n" : ""}Also prioritize these inventory-risk items based on recent sales: ${details}. Stay within my spending limit and explain any item you leave out.`;
  request.focus();
  $("#result-status").textContent = "At-risk items added to your request. Review it, then build the plan.";
});

$("#approve-button").addEventListener("click", async () => {
  state.approved = true;
  $("#checkout").classList.remove("hidden");
  $("#checkout-message").textContent = "Preparing checkout…";
  try {
    await setupCheckout();
  } catch (error) {
    $("#checkout-message").textContent = error.message;
  }
});

$("#demo-checkout-button").addEventListener("click", () => {
  if (!state.approved) return;
  showConfirmation(`Demo order complete for ${money(totalCost())}. This local walkthrough did not charge a payment method.`);
});

async function start() {
  try {
    const [catalogResponse, configResponse, inventoryResponse] = await Promise.all([
      fetch("/api/catalog"),
      fetch("/api/config"),
      fetch("/api/inventory")
    ]);
    const defaultCatalog = await catalogResponse.json();
    state.config = await configResponse.json();
    const defaultInventory = await inventoryResponse.json();
    initializeCafeProfiles(defaultCatalog, defaultInventory);
    renderBudgetScenarios();
    await loadPayPalSdk();
  } catch {
    $("#result-status").textContent = "Could not connect to Brew2Basket. Check that the server is running.";
  }
}

$("#cafe-picker").addEventListener("change", (event) => {
  state.activeCafeId = event.target.value;
  resetIngredientForm();
  loadActiveCafe();
  renderBudgetScenarios();
});

$("#new-cafe-button").addEventListener("click", () => {
  const cafe = { id: `cafe-${Date.now().toString(36)}`, name: `New café ${state.cafes.length}`, catalog: [], inventory: [] };
  state.cafes.push(cafe);
  state.activeCafeId = cafe.id;
  persistCafeProfiles();
  resetIngredientForm();
  loadActiveCafe();
  renderBudgetScenarios();
  $("#cafe-name").focus();
});

$("#cafe-name-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const cafe = activeCafe();
  const name = $("#cafe-name").value.trim();
  if (!cafe || !name) return;
  cafe.name = name;
  refreshActiveCafe();
  renderCafeSetup();
  $("#cafe-label").textContent = name;
});

$("#ingredient-form").addEventListener("submit", saveIngredient);
$("#cancel-edit-button").addEventListener("click", resetIngredientForm);
$("#ingredient-list").addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-ingredient]");
  const removeButton = event.target.closest("[data-remove-ingredient]");
  if (editButton) editIngredient(editButton.dataset.editIngredient);
  if (removeButton) {
    const id = removeButton.dataset.removeIngredient;
    state.catalog = state.catalog.filter((product) => product.id !== id);
    state.inventory = state.inventory.filter((record) => record.productId !== id);
    if (state.editingIngredientId === id) resetIngredientForm();
    refreshActiveCafe();
    renderCafeSetup();
    renderInventory();
    renderExpiryWatch();
    renderSupplierComparison();
  }
});

$("#budget-scenarios").addEventListener("click", (event) => {
  const button = event.target.closest("[data-scenario]");
  if (button) applyBudgetScenario(button.dataset.scenario);
});

start();
(() => {
  const elements = document.querySelectorAll(
    ".intro h1, .intro .subhead, .hero-summary, .inventory-card, .request-card, .results-card"
  );

  if (!elements.length) return;

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  elements.forEach((element, index) => {
    element.classList.add("scroll-enter");
    element.style.setProperty("--scroll-delay", `${index * 100}ms`);
  });

  if (reducedMotion || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { once: true, rootMargin: "0px 0px -80px 0px" }
  );

  elements.forEach((element) => observer.observe(element));
})();
