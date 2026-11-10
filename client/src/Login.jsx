import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth.jsx";
import "./Login.css";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RestockPreview() {
  return (
    <aside className="login-visual" aria-label="Brew2Basket restock plan preview">
      <div className="login-visual-glow" aria-hidden="true" />
      <div className="login-visual-copy">
        <p className="login-kicker">A LITTLE MORE IN CONTROL</p>
        <h2>Ready before<br />the morning rush.</h2>
        <p>See what’s running low and make a plan that fits your budget.</p>
      </div>
      <article className="login-preview-card">
        <div className="login-preview-top"><span>THIS WEEK’S RESTOCK</span><b>On budget</b></div>
        <h3>Inventory snapshot</h3>
        <div className="login-stock-row"><div><span>House espresso beans</span><strong>0.7 days</strong></div><div className="login-stock-track"><i className="login-bar-critical" /></div></div>
        <div className="login-stock-row"><div><span>Vanilla syrup</span><strong>1.9 days</strong></div><div className="login-stock-track"><i className="login-bar-soon" /></div></div>
        <div className="login-stock-row"><div><span>Barista oat milk</span><strong>4.8 days</strong></div><div className="login-stock-track"><i className="login-bar-healthy" /></div></div>
        <div className="login-budget-box">
          <div><span>Planned spend</span><strong>$162 <small>of $180</small></strong></div>
          <div className="login-budget-track"><i /></div>
          <small>$18 left in your budget</small>
        </div>
      </article>
      <p className="login-visual-foot">Good choices, clear costs, your call.</p>
    </aside>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cafeName, setCafeName] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function validate() {
    const nextErrors = {};
    if (!emailPattern.test(email.trim())) nextErrors.email = "Enter a valid email address.";
    if (password.length < 4) nextErrors.password = "Password must be at least 4 characters.";
    if (isSignUp && !cafeName.trim()) nextErrors.cafeName = "Enter your café name.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }
  function finishLogin(session) {
    login(session);
    const destination = window.localStorage.getItem("Brew2Basket:intro-seen") === "1" ? "/" : "/welcome";
    navigate(destination, { replace: true });
  }
  function handleSubmit(event) {
    event.preventDefault();
    if (busy || !validate()) return;
    setBusy(true);
    window.setTimeout(() => finishLogin({ email: email.trim(), cafeName: isSignUp ? cafeName.trim() : "Demo café", rememberMe }), 600);
  }
  function useDemoCafe() { finishLogin({ email: "demo@Brew2Basket.cafe", cafeName: "Demo café" }); }
  function switchVariant(event) {
    event.preventDefault();
    setErrors({});
    setIsSignUp((current) => !current);
    setPassword("");
  }

  return (
    <main className="login-page">
      <section className="login-form-side">
        <Link className="login-brand" to="/login" aria-label="Brew2Basket login"><span className="login-brand-mark">S</span><span>Brew2Basket<span>.</span></span></Link>
        <div className="login-card">
          <p className="eyebrow">YOUR CAFÉ PURCHASING COPILOT</p>
          <h1>{isSignUp ? "Create your account" : "Welcome back"}</h1>
          <p className="login-intro">Sign in to plan your café’s next restock.</p>
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {isSignUp && <div className="login-field"><label htmlFor="login-cafe-name">Café name</label><input id="login-cafe-name" type="text" autoComplete="organization" placeholder="e.g. Little Oak Café" value={cafeName} onChange={(event) => setCafeName(event.target.value)} aria-invalid={Boolean(errors.cafeName)} aria-describedby={errors.cafeName ? "login-cafe-error" : undefined} />{errors.cafeName && <small className="login-error" id="login-cafe-error">{errors.cafeName}</small>}</div>}
            <div className="login-field"><label htmlFor="login-email">Email</label><input id="login-email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "login-email-error" : undefined} />{errors.email && <small className="login-error" id="login-email-error">{errors.email}</small>}</div>
            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-password-wrap"><input id="login-password" type={showPassword ? "text" : "password"} autoComplete={isSignUp ? "new-password" : "current-password"} placeholder="At least 4 characters" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "login-password-error" : undefined} /><button className="login-show-password" type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div>
              {errors.password && <small className="login-error" id="login-password-error">{errors.password}</small>}
            </div>
            {!isSignUp && <label className="login-remember"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} /><span>Remember me</span></label>}
            <button className="button login-submit" type="submit" disabled={busy}>{busy ? <><span className="login-spinner" aria-hidden="true" /> Signing in…</> : isSignUp ? "Create account" : "Sign in"}</button>
          </form>
          <div className="login-divider"><span>or</span></div>
          <button className="button login-demo-button" type="button" onClick={useDemoCafe} disabled={busy}><span aria-hidden="true">☕</span> Use demo café</button>
          <p className="login-mode-note">PayPal sandbox mode. No real payments are made.</p>
          <p className="login-switch">{isSignUp ? "Already have an account? " : "New to Brew2Basket? "}<a href="#account" onClick={switchVariant}>{isSignUp ? "Sign in" : "Create an account"}</a></p>
        </div>
        <p className="login-side-note">Brew2Basket · Café purchasing copilot</p>
      </section>
      <RestockPreview />
    </main>
  );
}


