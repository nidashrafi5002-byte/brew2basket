import { useEffect, useState } from "react";
import "./SplashScreen.css";

const STORAGE_KEY = "Brew2Basket:splash-seen";
const EXIT_MS = 620;
const REDUCED_DURATION_MS = 650;

function readSeenFlag() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveSeenFlag() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // The splash still works when browser storage is unavailable.
  }
}

export default function SplashScreen({ children, duration = 2800 }) {
  const [visible, setVisible] = useState(() => !readSeenFlag());
  const [exiting, setExiting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );

  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!preference) return undefined;
    const updatePreference = () => setReducedMotion(preference.matches);
    preference.addEventListener?.("change", updatePreference);
    return () => preference.removeEventListener?.("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!visible) return undefined;

    const effectiveDuration = reducedMotion
      ? REDUCED_DURATION_MS
      : Math.max(0, Number(duration) || 2800);
    const exitDuration = reducedMotion ? 350 : EXIT_MS;
    const exitTimer = window.setTimeout(
      () => setExiting(true),
      Math.max(0, effectiveDuration + 40 - exitDuration)
    );
    const finishTimer = window.setTimeout(() => {
      saveSeenFlag();
      setVisible(false);
    }, effectiveDuration + 40);

    const skip = () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
      saveSeenFlag();
      setVisible(false);
    };

    document.addEventListener("keydown", skip);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(finishTimer);
      document.removeEventListener("keydown", skip);
    };
  }, [duration, reducedMotion, visible]);

  return (
    <>
      {children}
      {visible && (
        <div
          className={`splash-screen${exiting ? " is-exiting" : ""}${reducedMotion ? " reduce-motion" : ""}`}
          onClick={() => {
            saveSeenFlag();
            setVisible(false);
          }}
          aria-label="Brew2Basket intro screen"
        >
          <div className="splash-content">
            <div className="splash-logo" aria-label="Brew2Basket">
              <span className="splash-wordmark-base" aria-hidden="true">
                Brew2Basket<span className="splash-dot">.</span>
              </span>
              <span className="splash-wordmark-fill" aria-hidden="true">
                Brew2Basket<span className="splash-dot">.</span>
              </span>
              <span className="splash-fill-line" aria-hidden="true" />
            </div>
            <p className="splash-tagline">Keep the good stuff coming.</p>
          </div>
          <p className="splash-skip-hint">Click anywhere or press any key to skip</p>
        </div>
      )}
    </>
  );
}

