import { useEffect } from "react";
import { Link, NavLink } from "react-router-dom";

const sidebarGroups = [
  {
    title: "Workspace",
    links: [
      { to: "/", label: "Home", icon: "home", end: true },
      { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { to: "/restock", label: "Restock planner", icon: "restock" },
      { to: "/orders", label: "Order history", icon: "orders" },
      { to: "/tools", label: "Planning tools", icon: "tools" },
    ],
  },
  {
    title: "Café",
    links: [
      { to: "/setup", label: "Ingredients & setup", icon: "setup" },
      { to: "/account", label: "My account & profile", icon: "account" },
    ],
  },
];

const sidebarIconPaths = {
  home: "M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-7h6v7",
  dashboard: "M4 4h6v7H4zM14 4h6v4h-6zM14 12h6v8h-6zM4 15h6v5H4z",
  restock: "M4 7h15l-2 8H7L5 4H3M8 19h.01M17 19h.01M8 11h9M13 8l3 3-3 3",
  orders: "M6 3h12v18l-6-3-6 3zM9 8h6M9 12h6",
  tools: "M4 6h16M4 12h16M4 18h16M8 4v4M15 10v4M10 16v4",
  setup: "M12 3c4 0 7 4 7 9s-3 9-7 9-7-4-7-9 3-9 7-9zM8 12h8M12 4v16",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
};

function WelcomeSidebar() {
  return (
    <aside className="welcome-sidebar" aria-label="Brew2Basket navigation">
      <nav className="welcome-sidebar-nav" aria-label="Workspace pages">
        {sidebarGroups.map((group) => (
          <div className="welcome-sidebar-group" key={group.title}>
            <p className="welcome-sidebar-group-title">{group.title}</p>
            {group.links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `welcome-sidebar-link${isActive ? " active" : ""}`}
              >
                <svg className="welcome-sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={sidebarIconPaths[item.icon]} />
                </svg>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="welcome-sidebar-note">
        <span className="welcome-sidebar-note-icon" aria-hidden="true">✦</span>
        <span><strong>Ready for the next rush?</strong><small>Keep stock and suppliers in one place.</small></span>
      </div>
    </aside>
  );
}

export default function WelcomePage() {
  useEffect(() => {
    const elements = document.querySelectorAll(".welcome-page [data-reveal]");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return (
    <main className="welcome-page">
      <WelcomeSidebar />
      <section className="welcome-hero">
        <div className="hero-coffee-art" aria-hidden="true">
          <span className="hero-coffee-steam hero-coffee-steam-one" />
          <span className="hero-coffee-steam hero-coffee-steam-two" />
          <span className="hero-coffee-steam hero-coffee-steam-three" />
          <span className="hero-coffee-cup"><i /></span>
          <span className="hero-coffee-saucer" />
        </div>
        <div className="welcome-copy">
          <p className="eyebrow">YOUR CAFÉ PURCHASING COPILOT</p>
          <h1>Keep the good stuff <em>coming.</em></h1>
          <p className="hero-description">
            Plan a sensible restock with your ingredients, supplier offers, and
            spending limit in view.
          </p>
          <Link className="button button-primary" to="/setup">
            Get started <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="hero-preview" data-reveal aria-label="Example Brew2Basket restock plan">
          <div className="preview-glow" aria-hidden="true" />
          <div className="preview-note preview-note-top">
            <span className="preview-note-icon">✦</span>
            <span><strong>Thoughtful restocking</strong><small>Clear choices, at a glance</small></span>
          </div>
          <article className="preview-plan-card">
            <div className="preview-plan-heading">
              <div>
                <p className="preview-kicker">THIS WEEK’S RESTOCK</p>
                <h2>Your plan is ready</h2>
              </div>
              <span className="preview-status"><i /> On budget</span>
            </div>
            <div className="preview-ingredient-list">
              <div className="preview-ingredient">
                <span className="preview-ingredient-icon">☕</span>
                <div className="preview-ingredient-info">
                  <div className="preview-ingredient-name"><strong>Espresso beans</strong><span>$108</span></div>
                  <small>2 bags · Northstar Roasters</small>
                  <div className="preview-stock-track"><span style={{ width: "28%" }} /></div>
                </div>
              </div>
              <div className="preview-ingredient">
                <span className="preview-ingredient-icon">🥛</span>
                <div className="preview-ingredient-info">
                  <div className="preview-ingredient-name"><strong>Barista oat milk</strong><span>$24</span></div>
                  <small>1 case · Field &amp; Foam</small>
                  <div className="preview-stock-track preview-stock-track-light"><span style={{ width: "56%" }} /></div>
                </div>
              </div>
            </div>
            <div className="preview-budget">
              <div><span>Budget used</span><strong>$132 <small>of $180</small></strong></div>
              <div className="preview-budget-track" role="progressbar" aria-label="Budget used" aria-valuemin="0" aria-valuemax="180" aria-valuenow="132"><span /></div>
              <small className="preview-budget-remaining">$48 left in your budget</small>
            </div>
            <div className="preview-approval-row">
              <span>Review every item before checkout</span>
              <span className="preview-arrow" aria-hidden="true">↗</span>
            </div>
          </article>
          <div className="preview-note preview-note-bottom">
            <span className="preview-check">✓</span>
            <span><strong>You stay in control</strong><small>Nothing is purchased without approval</small></span>
          </div>
        </div>
      </section>

      <section className="welcome-section feature-section" aria-labelledby="features-title">
        <p className="eyebrow">MADE FOR YOUR WORKFLOW</p>
        <h2 id="features-title">A clearer way to restock</h2>
        <div className="feature-grid bento-grid">
          <article className="bento-tile bento-risk" data-reveal>
            <div className="bento-heading"><span className="bento-icon">◉</span><span className="bento-label">LIVE INVENTORY SIGNAL</span></div>
            <h3>Risk radar</h3>
            <p>Spot what needs attention before the next rush.</p>
            <div className="risk-chart" aria-label="Example stock status: espresso critical, syrup reorder soon, oat milk healthy">
              <div className="risk-chart-row"><span>Espresso beans</span><strong>0.7 days</strong><div className="risk-track"><i className="risk-fill critical-fill" /></div><b className="risk-tag critical-tag">Critical</b></div>
              <div className="risk-chart-row"><span>Vanilla syrup</span><strong>1.9 days</strong><div className="risk-track"><i className="risk-fill amber-fill" /></div><b className="risk-tag amber-tag">Reorder soon</b></div>
              <div className="risk-chart-row"><span>Oat milk</span><strong>4.8 days</strong><div className="risk-track"><i className="risk-fill healthy-fill" /></div><b className="risk-tag healthy-tag">Healthy</b></div>
            </div>
            <span className="bento-footnote">Example days of stock remaining</span>
          </article>
          <article className="bento-tile bento-budget" data-reveal>
            <div className="bento-heading"><span className="bento-icon">↗</span><span className="bento-label">SPENDING LIMIT</span></div>
            <h3>Budget control</h3>
            <p>Keep the proposed basket inside your cap.</p>
            <div className="bento-budget-label"><strong>$162</strong><span>of $180</span></div>
            <div className="bento-budget-track" role="progressbar" aria-label="Example budget used" aria-valuemin="0" aria-valuemax="180" aria-valuenow="162"><i /></div>
            <small>$18 remaining</small>
          </article>
          <article className="bento-tile bento-suppliers" data-reveal>
            <div className="bento-heading"><span className="bento-icon">⇄</span><span className="bento-label">SIDE-BY-SIDE OFFERS</span></div>
            <h3>Supplier comparison</h3>
            <div className="bento-price-table">
              <div><strong>Northstar Roasters</strong><span>$54.00</span><small>Tomorrow · ★ 4.9</small></div>
              <div><strong>Harbor Coffee Co.</strong><span>$57.50</span><small>2 days · ★ 4.7</small></div>
            </div>
          </article>
          <article className="bento-tile bento-paypal" data-reveal>
            <div>
              <div className="bento-heading"><span className="bento-icon">✓</span><span className="bento-label">YOUR APPROVAL, YOUR CHECKOUT</span></div>
              <h3>PayPal checkout</h3>
              <p>Review the basket before continuing to secure sandbox checkout.</p>
            </div>
            <div className="bento-paypal-button" aria-hidden="true"><span>P</span> PayPal <i>→</i></div>
          </article>
        </div>
      </section>
      <section className="welcome-closing" data-reveal aria-labelledby="closing-title">
        <span className="closing-spark" aria-hidden="true">✦</span>
        <p className="eyebrow">A CALMER WAY TO RESTOCK</p>
        <h2 id="closing-title">Never run out<br /><em>mid-rush.</em></h2>
        <p>Start with your café’s ingredients. Brew2Basket helps shape a plan you can review, adjust, and approve.</p>
        <Link className="button closing-button" to="/setup">Plan your first restock <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}


