import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useCafe } from "../context/CafeContext.jsx";
import { useAuth } from "../useAuth.jsx";

const navigation = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/restock", label: "Restock" },
  { to: "/orders", label: "Orders" },
  { to: "/tools", label: "Tools" },
];

export default function SiteLayout({ children }) {
  const { activeCafe } = useCafe();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isLoginPage = location.pathname === "/login";
  const isWelcomePage = location.pathname === "/welcome";
  const isLandingPage = location.pathname === "/";
  const isFullScreenPage = isLoginPage || isWelcomePage;

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <div className={`app-shell${isLoginPage ? " login-shell" : isWelcomePage ? " welcome-shell" : isLandingPage ? " landing-shell" : ""}`}>
      <div className="cafe-backdrop" aria-hidden="true">
        <div className="shelf shelf-one" />
        <div className="shelf shelf-two" />
        <div className="shelf shelf-three" />
      </div>

      {!isFullScreenPage && (
        <header className="navbar">
          <NavLink className="brand" to="/">
            <span className="brand-mark">S</span>
            <span>Brew2Basket<span className="brand-dot">.</span></span>
          </NavLink>
          <nav aria-label="Main navigation">
            {navigation.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="cafe-meta">
            {user ? (
              <div className="user-menu-wrap">
                <button className="user-pill" type="button" aria-expanded={userMenuOpen} onClick={() => setUserMenuOpen((open) => !open)}>
                  <span className="user-pill-dot" aria-hidden="true" />
                  {user.cafeName || activeCafe?.name || "Demo café"}
                  <span className="user-pill-chevron" aria-hidden="true">⌄</span>
                </button>
                {userMenuOpen && (
                  <div className="user-menu" role="menu">
                    <span className="user-menu-email">{user.email}</span>
                    <Link to="/account" role="menuitem" onClick={() => setUserMenuOpen(false)}>My account &amp; profile</Link>
                    <button type="button" role="menuitem" onClick={handleLogout}>Log out</button>
                  </div>
                )}
              </div>
            ) : (
              <span>{activeCafe?.name || "Loading café…"}</span>
            )}
            <span className="paypal-tag">PayPal sandbox</span>
          </div>
        </header>
      )}

      <div className={`site-content${isLoginPage ? " site-content-login" : isWelcomePage ? " site-content-welcome" : isLandingPage ? " site-content-landing" : ""}`}>{children}</div>

      {!isFullScreenPage && (
        <footer className="site-footer">
          <span>Brew2Basket · Café purchasing copilot</span>
          <span>Nothing is purchased until you approve it.</span>
          {location.pathname === "/" && (
            <Link className="replay-intro-link" to="/welcome" onClick={() => window.localStorage.removeItem("Brew2Basket:intro-seen")}>Replay intro</Link>
          )}
        </footer>
      )}
    </div>
  );
}


