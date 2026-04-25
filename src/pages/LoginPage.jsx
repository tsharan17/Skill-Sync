import { useState } from "react";
import { signIn, signUp } from "../lib/firebase.js";
import "./LoginPage.css";

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [role, setRole]         = useState("candidate");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");

    try {
      let user;
      if (isSignup) {
        user = await signUp(email, password);
      } else {
        user = await signIn(email, password);
      }
      await onLogin(role, user);
    } catch (err) {
      // Map Firebase error codes to readable messages
      const msg = {
        "auth/email-already-in-use":  "An account with this email already exists.",
        "auth/invalid-email":         "Please enter a valid email address.",
        "auth/weak-password":         "Password must be at least 6 characters.",
        "auth/user-not-found":        "No account found with this email.",
        "auth/wrong-password":        "Incorrect password. Please try again.",
        "auth/invalid-credential":    "Incorrect email or password.",
        "auth/too-many-requests":     "Too many attempts. Please wait a moment and retry.",
        "auth/network-request-failed":"Network error. Check your connection.",
      }[err.code] || err.message || "Authentication failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      {/* Left panel – branding */}
      <div className="login-left">
        <div className="login-brand">
          <span className="brand-dot" />
          Skill<span>Sync</span>
        </div>
        <h2 className="login-tagline">
          Skill-based hiring.<br />No keyword noise.
        </h2>
        <p className="login-desc">
          We match you to jobs using your real skills,
          projects, and certifications — not resume buzzwords.
        </p>
        <div className="login-features">
          {["Explainable match scores", "Portfolio-aware AI", "Zero resume spam"].map((f) => (
            <div key={f} className="login-feature">
              <span className="feature-check">✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – form */}
      <div className="login-right">
        <div className="login-card">
          <h3 className="login-form-title">{isSignup ? "Create account" : "Welcome back"}</h3>
          <p className="login-form-sub">
            {isSignup ? "Start your skill-based job search" : "Sign in to your account"}
          </p>

          {/* Role toggle */}
          <div className="role-toggle">
            <button
              type="button"
              className={`role-btn ${role === "candidate" ? "active" : ""}`}
              onClick={() => setRole("candidate")}
            >
              👤 Candidate
            </button>
            <button
              type="button"
              className={`role-btn ${role === "company" ? "active" : ""}`}
              onClick={() => setRole("company")}
            >
              🏢 Employer
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {isSignup && (
              <div className="field">
                <label>Full name</label>
                <input
                  type="text"
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px",
                background: "rgba(255,95,109,0.10)",
                border: "1px solid rgba(255,95,109,0.25)",
                borderRadius: 8,
                fontSize: 13,
                color: "#ff5f6d",
                marginBottom: 10,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  {isSignup ? "Creating account…" : "Signing in…"}
                </span>
              ) : (
                isSignup ? "Create account →" : "Sign in →"
              )}
            </button>
          </form>

          <hr className="divider" />

          <p className="login-toggle">
            {isSignup ? "Already have an account?" : "New here?"}
            <button className="toggle-btn" onClick={() => { setIsSignup(!isSignup); setError(""); }}>
              {isSignup ? " Sign in" : " Create account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
