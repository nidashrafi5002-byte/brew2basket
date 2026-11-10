import { useEffect, useState } from "react";
import { useCafe } from "../context/CafeContext.jsx";

const emptyForm = {
  name: "",
  unit: "",
  stock: "",
  dailyUsage: "",
  vendor: "",
  price: "",
  leadDays: "",
};

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function SetupPage() {
  const {
    cafes,
    activeCafeId,
    activeCafe,
    catalog,
    inventory,
    loading,
    error,
    selectCafe,
    updateActiveCafe,
    addCafe,
  } = useCafe();

  const [cafeName, setCafeName] = useState(activeCafe?.name || "");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCafeName(activeCafe?.name || "");
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  }, [activeCafeId]);

  function changeField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function saveCafeName(event) {
    event.preventDefault();
    const name = cafeName.trim();
    if (!name || !activeCafe) return;

    updateActiveCafe({ name });
    setMessage("Café name saved.");
  }

  function startNewCafe() {
    addCafe();
    setForm(emptyForm);
    setEditingId(null);
    setMessage("New café created. Add its ingredients below.");
  }

  function startEditing(productId) {
    const product = catalog.find((item) => item.id === productId);
    const stock = inventory.find((item) => item.productId === productId);
    const offer = product?.offers?.[0];

    if (!product || !stock || !offer) return;

    setEditingId(productId);
    setForm({
      name: product.name,
      unit: product.unit,
      stock: String(stock.onHand),
      dailyUsage: String(stock.averageDailyDemand ?? stock.sales7d?.[0] ?? 0),
      vendor: offer.vendor,
      price: String(offer.price),
      leadDays: String(stock.leadDays),
    });
    setMessage("");
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  }

  function saveIngredient(event) {
    event.preventDefault();

    if (!activeCafe) return;

    const id = editingId || `item-${Date.now().toString(36)}`;
    const name = form.name.trim();
    const unit = form.unit.trim();
    const onHand = Math.floor(Number(form.stock));
    const dailyUsage = Number(form.dailyUsage);
    const vendor = form.vendor.trim();
    const price = Number(form.price);
    const leadDays = Math.floor(Number(form.leadDays));

    if (
      !name ||
      !unit ||
      !vendor ||
      !Number.isFinite(onHand) ||
      onHand < 0 ||
      !Number.isFinite(dailyUsage) ||
      dailyUsage < 0 ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(leadDays) ||
      leadDays < 1
    ) {
      return;
    }

    const oldProduct = catalog.find((product) => product.id === id);
    const product = {
      id,
      name,
      unit,
      category: oldProduct?.category || "Ingredient",
      demand: "Custom",
      icon: oldProduct?.icon || "🧺",
      offers: [
        {
          vendor,
          price,
          lead: leadDays === 1 ? "Tomorrow" : `${leadDays} days`,
          rating: oldProduct?.offers?.[0]?.rating || 4.5,
          note: "Entered by this café",
        },
      ],
    };

    const stockRecord = {
      productId: id,
      onHand,
      sales7d: Array(7).fill(dailyUsage),
      averageDailyDemand: dailyUsage,
      leadDays,
      safetyDays: 2,
      targetCoverDays: 3,
    };

    const nextCatalog = oldProduct
      ? catalog.map((item) => (item.id === id ? product : item))
      : [...catalog, product];

    const nextInventory = oldProduct
      ? inventory.map((item) => (item.productId === id ? stockRecord : item))
      : [...inventory, stockRecord];

    updateActiveCafe({ catalog: nextCatalog, inventory: nextInventory });
    setMessage(editingId ? "Ingredient updated." : "Ingredient added.");
    resetForm();
  }

  function removeIngredient(productId) {
    updateActiveCafe({
      catalog: catalog.filter((product) => product.id !== productId),
      inventory: inventory.filter((item) => item.productId !== productId),
    });

    if (editingId === productId) resetForm();
    setMessage("Ingredient removed.");
  }

  if (loading) {
    return <main className="content-panel"><p>Loading café data…</p></main>;
  }

  return (
    <main className="setup-page">
      <section className="setup-card">
        <p className="eyebrow">WORKSPACE</p>
        <h1>Café setup</h1>
        <p className="setup-intro">
          Keep each café’s name, ingredients, stock, and supplier offers organized.
        </p>

        {error && <p className="setup-message" role="status">{error}</p>}

        <div className="cafe-picker-row">
          <label htmlFor="active-cafe">Active café</label>
          <select
            id="active-cafe"
            value={activeCafeId || ""}
            onChange={(event) => selectCafe(event.target.value)}
          >
            {cafes.map((cafe) => (
              <option key={cafe.id} value={cafe.id}>{cafe.name}</option>
            ))}
          </select>
          <button className="button button-secondary" type="button" onClick={startNewCafe}>
            + New café
          </button>
        </div>

        <form className="cafe-name-form" onSubmit={saveCafeName}>
          <label htmlFor="cafe-name">Café name</label>
          <input
            id="cafe-name"
            value={cafeName}
            maxLength={60}
            required
            onChange={(event) => setCafeName(event.target.value)}
          />
          <button className="button button-secondary" type="submit">Save name</button>
        </form>
      </section>

      <section className="setup-card">
        <div className="setup-section-heading">
          <div>
            <p className="eyebrow">INGREDIENTS</p>
            <h2>{editingId ? "Edit ingredient" : "Add an ingredient"}</h2>
          </div>
          <span className="saved-note">Saved in this browser</span>
        </div>

        <form className="ingredient-form" onSubmit={saveIngredient}>
          <fieldset className="ingredient-fieldset">
            <legend>Item</legend>
            <div className="ingredient-field-grid">
              <label>
                Ingredient name
                <input name="name" value={form.name} maxLength={60} placeholder="e.g. House espresso beans" required onChange={changeField} />
              </label>

              <label>
                Purchase unit
                <input name="unit" value={form.unit} maxLength={35} placeholder="e.g. 5 lb bag" required onChange={changeField} />
              </label>

              <label>
                Stock on hand
                <input name="stock" type="number" min="0" max="99999" step="1" value={form.stock} placeholder="e.g. 4" required onChange={changeField} />
              </label>

              <label>
                Average use per day
                <input name="dailyUsage" type="number" min="0" max="9999" step="0.1" value={form.dailyUsage} placeholder="e.g. 1.5" required onChange={changeField} />
              </label>
            </div>
          </fieldset>

          <fieldset className="ingredient-fieldset">
            <legend>Supplier</legend>
            <div className="ingredient-field-grid ingredient-supplier-grid">
              <label>
                Supplier name
                <input name="vendor" value={form.vendor} maxLength={60} placeholder="e.g. Northstar Roasters" required onChange={changeField} />
              </label>

              <label>
                Price per unit (USD)
                <input name="price" type="number" min="0.01" max="100000" step="0.01" value={form.price} placeholder="e.g. 54.00" required onChange={changeField} />
              </label>

              <label>
                Delivery time (days)
                <input name="leadDays" type="number" min="1" max="60" step="1" value={form.leadDays} placeholder="e.g. 1" required onChange={changeField} />
              </label>
            </div>
          </fieldset>

          <div className="ingredient-form-actions">
            <button className="button button-primary" type="submit">
              {editingId ? "Save changes" : "Add ingredient"}
            </button>
            {editingId && (
              <button className="button button-secondary" type="button" onClick={resetForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>

        {message && <p className="setup-message" role="status">{message}</p>}

        <div className="ingredient-list" aria-live="polite">
          {catalog.length === 0 ? (
            <p className="empty-ingredients">
              No ingredients yet. Add your first item above.
            </p>
          ) : (
            catalog.map((product) => {
              const stock = inventory.find((item) => item.productId === product.id);
              const offer = product.offers?.[0];
              const onHand = Number(stock?.onHand ?? 0);

              return (
                <article className="ingredient-row" key={product.id}>
                  <div className="ingredient-main">
                    <span className="ingredient-icon">{product.icon || "🧺"}</span>
                    <div>
                      <strong>{product.name}</strong>
                      <small>{product.unit}</small>
                    </div>
                  </div>
                  <div><strong>{onHand} {onHand === 1 ? "unit" : "units"}</strong><small>On hand</small></div>
                  <div><strong>{Number(stock?.averageDailyDemand ?? 0).toFixed(1)} / day</strong><small>Average use</small></div>
                  <div><strong>{offer ? `${offer.vendor} · ${money(offer.price)}` : "No supplier"}</strong><small>Supplier offer</small></div>
                  <div className="ingredient-actions">
                    <button className="text-button" type="button" onClick={() => startEditing(product.id)}>Edit</button>
                    <button className="text-button remove-button" type="button" onClick={() => removeIngredient(product.id)}>Remove</button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}