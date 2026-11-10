import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../useAuth.jsx";
import "./Welcome.css";

const SCENE_COUNT = 3;
const SCENE_DURATION = 4000;

function StockProblemVisual() {
  return (
    <div className="story-stock-card">
      <div className="story-card-heading"><span>Stock at a glance</span><span className="story-live-dot">Today</span></div>
      <div className="story-stock-item">
        <div><span className="story-product-icon">🥛</span><strong>Oat milk</strong><small>0.4 days left</small></div>
        <div className="story-static-track"><i className="story-red-bar oat-drain" /></div>
        <span className="story-stock-risk">Running low</span>
      </div>
      <div className="story-stock-item">
        <div><span className="story-product-icon">☕</span><strong>Espresso beans</strong><small>0.7 days left</small></div>
        <div className="story-static-track"><i className="story-red-bar bean-drain" /></div>
        <span className="story-stock-risk">Running low</span>
      </div>
      <p className="story-stock-footnote">A busy shift can empty the shelf fast.</p>
    </div>
  );
}

function PlanVisual() {
  return (
    <div className="story-plan-stack">
      <div className="story-request-bubble"><span>“We need espresso beans and oat milk for the weekend.”</span><small>Your request</small></div>
      <div className="story-plan-card">
        <div className="story-card-heading"><span>Your restock plan</span><span className="story-plan-ready">Ready to review</span></div>
        <div className="story-build-line"><span>☕</span><div><strong>House espresso beans</strong><small>2 bags · Northstar Roasters · Tomorrow</small></div><b>$108</b></div>
        <div className="story-build-line"><span>🥛</span><div><strong>Barista oat milk</strong><small>2 cases · Field &amp; Foam · Tomorrow</small></div><b>$54</b></div>
        <div className="story-plan-budget">
          <div><span>Estimated total</span><strong>$162 <small>of $180</small></strong></div>
          <div className="story-budget-track"><i /></div>
          <small>$18 remaining</small>
        </div>
      </div>
    </div>
  );
}

function CheckoutVisual() {
  return (
    <div className="story-checkout-card">
      <div className="story-card-heading"><span>Your basket</span><span>2 items</span></div>
      <div className="story-checkout-row"><span>House espresso beans · 2 bags</span><strong>$108</strong></div>
      <div className="story-checkout-row"><span>Barista oat milk · 2 cases</span><strong>$54</strong></div>
      <div className="story-checkout-total"><span>Total to review</span><strong>$162.00</strong></div>
      <div className="story-paypal-button"><b aria-hidden="true">P</b> PayPal sandbox <span aria-hidden="true">→</span></div>
      <p className="story-approval-note"><span aria-hidden="true">✓</span> Nothing is purchased until you approve.</p>
    </div>
  );
}

const scenes = [
  {
    kicker: "The problem",
    headline: <>Running out <em>mid-rush</em> costs you.</>,
    description: "When essentials run low, service slows and customers notice.",
    visual: <StockProblemVisual />,
  },
  {
    kicker: "The plan",
    headline: <>Tell us what’s low. <em>We plan the restock.</em></>,
    description: "Brew2Basket matches your request to ingredients, suppliers, and budget.",
    visual: <PlanVisual />,
  },
  {
    kicker: "Your call",
    headline: <>You approve. <em>PayPal handles the rest.</em></>,
    description: "Review every item, then continue through PayPal Sandbox checkout.",
    visual: <CheckoutVisual />,
  },
];

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeScene, setActiveScene] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [tabHidden, setTabHidden] = useState(() => document.visibilityState === "hidden");
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
  const remainingRef = useRef(SCENE_DURATION);
  const manualAdvanceRef = useRef(false);
  const paused = hovered || tabHidden;

  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!preference) return undefined;
    const handleChange = () => setReducedMotion(preference.matches);
    preference.addEventListener?.("change", handleChange);
    return () => preference.removeEventListener?.("change", handleChange);
  }, []);

  useEffect(() => {
    const handleVisibility = () => setTabHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (reducedMotion || paused || activeScene >= SCENE_COUNT - 1) return undefined;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => {
      manualAdvanceRef.current = true;
      remainingRef.current = SCENE_DURATION;
      setActiveScene((scene) => Math.min(scene + 1, SCENE_COUNT - 1));
    }, remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      if (manualAdvanceRef.current) {
        manualAdvanceRef.current = false;
      } else {
        remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startedAt));
      }
    };
  }, [activeScene, paused, reducedMotion]);

  function goToScene(nextScene) {
    const boundedScene = Math.max(0, Math.min(SCENE_COUNT - 1, nextScene));
    if (boundedScene === activeScene) return;
    manualAdvanceRef.current = true;
    remainingRef.current = SCENE_DURATION;
    setActiveScene(boundedScene);
  }

  useEffect(() => {
    function handleArrowKeys(event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToScene(activeScene + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToScene(activeScene - 1);
      }
    }
    window.addEventListener("keydown", handleArrowKeys);
    return () => window.removeEventListener("keydown", handleArrowKeys);
  }, [activeScene]);

  function enterBrew2Basket() {
    try { window.localStorage.setItem("Brew2Basket:intro-seen", "1"); } catch { /* Continue to the landing page if storage is unavailable. */ }
    navigate("/", { replace: true });
  }

  const scene = scenes[activeScene];
  return (
    <main
      className={`welcome-intro${paused ? " is-paused" : ""}${activeScene === SCENE_COUNT - 1 ? " is-last-scene" : ""}${reducedMotion ? " reduced-motion" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="welcome-progress" aria-label={`Scene ${activeScene + 1} of ${SCENE_COUNT}`}>
        {scenes.map((_, index) => (
          <span className="welcome-progress-track" key={index}>
            <i key={`${activeScene}-${index}`} className={index < activeScene ? "is-complete" : index === activeScene ? "is-current" : ""} />
          </span>
        ))}
      </div>

      <header className="welcome-intro-header">
        <p className="welcome-greeting">Hi, {user?.cafeName || "Demo café"}</p>
        <span className="welcome-intro-brand">Brew2Basket<span>.</span></span>
      </header>

      <section className="welcome-story" aria-roledescription="slide" aria-label={`Scene ${activeScene + 1} of ${SCENE_COUNT}`}>
        <article className={`welcome-scene welcome-scene-${activeScene + 1}`} key={activeScene}>
          <div className="welcome-scene-copy">
            <p className="welcome-scene-kicker">{scene.kicker}</p>
            <h1 aria-live="polite" aria-atomic="true">{scene.headline}</h1>
            <p className="welcome-scene-description">{scene.description}</p>
            <p className="welcome-scene-counter">0{activeScene + 1}<span> / 03</span></p>
          </div>
          <div className="welcome-scene-visual">{scene.visual}</div>
        </article>
      </section>

      <footer className="welcome-intro-controls" aria-label="Introduction controls">
        <button className="welcome-skip" type="button" onClick={enterBrew2Basket}>Skip intro</button>
        <div className="welcome-scene-controls">
          <button className="welcome-back" type="button" onClick={() => goToScene(activeScene - 1)} disabled={activeScene === 0} aria-label="Go to previous scene">Back</button>
          {activeScene < SCENE_COUNT - 1 ? (
            <button className="welcome-next" type="button" onClick={() => goToScene(activeScene + 1)} aria-label="Go to next scene">Next <span aria-hidden="true">→</span></button>
          ) : (
            <button className="welcome-enter" type="button" onClick={enterBrew2Basket}>Enter Brew2Basket <span aria-hidden="true">→</span></button>
          )}
        </div>
      </footer>
    </main>
  );
}

