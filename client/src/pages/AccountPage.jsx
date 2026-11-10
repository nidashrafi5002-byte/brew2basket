import { useState } from "react";
import { Link } from "react-router-dom";
import { useCafe } from "../context/CafeContext.jsx";
import { useAuth } from "../useAuth.jsx";

function initials(value) {
  return String(value || "BB")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function AccountPage() {
  const { user, updateProfile } = useAuth();
  const { activeCafe, catalog, inventory, updateActiveCafe } = useCafe();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [cafeName, setCafeName] = useState(activeCafe?.name || user?.cafeName || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function saveProfile(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!cafeName.trim()) {
      setError("Enter a café name to save your profile.");
      return;
    }

    try {
      const savedCafeName = cafeName.trim();
      updateProfile({ displayName, cafeName: savedCafeName });
      if (activeCafe) updateActiveCafe({ name: savedCafeName });
      setCafeName(savedCafeName);
      setDisplayName(displayName.trim());
      setMessage("Your profile has been saved in this browser.");
    } catch {
      setError("Your profile could not be saved. Check that browser storage is available.");
    }
  }

  const profileTitle = displayName.trim() || activeCafe?.name || user?.cafeName || "Café owner";

  return (
    <main className="account-page">
      <header className="account-heading">
        <p className="eyebrow">YOUR WORKSPACE</p>
        <h1>My account</h1>
        <p>Manage your profile and the café connected to your purchasing workspace.</p>
      </header>

      <div className="account-layout">
        <section className="account-card account-profile-card">
          <div className="account-profile-top">
            <div className="account-avatar" aria-hidden="true">{initials(profileTitle)}</div>
            <div>
              <p className="eyebrow">PROFILE</p>
              <h2>{profileTitle}</h2>
              <span className="account-mode-pill">Demo account</span>
            </div>
          </div>

          <form className="account-form" onSubmit={saveProfile}>
            <label htmlFor="account-display-name">Your name <span>Optional</span></label>
            <input
              id="account-display-name"
              type="text"
              autoComplete="name"
              maxLength={60}
              placeholder="e.g. Alex Morgan"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />

            <label htmlFor="account-email">Account email</label>
            <input id="account-email" type="email" value={user?.email || ""} readOnly />
            <small className="account-field-note">Email changes are unavailable with this demo sign-in.</small>

            <label htmlFor="account-cafe-name">Café name</label>
            <input
              id="account-cafe-name"
              type="text"
              autoComplete="organization"
              maxLength={60}
              required
              placeholder="e.g. Little Oak Café"
              value={cafeName}
              onChange={(event) => setCafeName(event.target.value)}
            />

            {error && <p className="account-feedback error" role="alert">{error}</p>}
            {message && <p className="account-feedback" role="status">{message}</p>}
            <button className="button button-primary" type="submit">Save profile <span aria-hidden="true">→</span></button>
          </form>
          <p className="account-storage-note">This prototype stores account and café details in this browser. Sign-in is mocked.</p>
        </section>

        <aside className="account-side-column">
          <section className="account-card workspace-card">
            <p className="eyebrow">CAFÉ WORKSPACE</p>
            <h2>{activeCafe?.name || cafeName || "Your café"}</h2>
            <p className="workspace-description">Your saved ingredients and inventory for this café.</p>
            <div className="workspace-stats">
              <div><strong>{catalog.length}</strong><span>Ingredients</span></div>
              <div><strong>{inventory.length}</strong><span>Stock records</span></div>
            </div>
            <Link className="button button-secondary" to="/setup">Manage ingredients <span aria-hidden="true">→</span></Link>
          </section>

          <section className="account-card account-payment-card">
            <span className="account-payment-icon" aria-hidden="true">✓</span>
            <div>
              <p className="eyebrow">PAYMENT MODE</p>
              <h2>PayPal Sandbox</h2>
              <p>Checkout is for testing. No real money is moved.</p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
