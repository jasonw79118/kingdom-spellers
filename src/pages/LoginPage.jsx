// Login / sign-up page. Email + password auth via the active backend
// (Supabase in production, local demo mode when unconfigured).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { backendMode } from "../lib/backend";

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result =
        mode === "signin" ? await signIn(email, password) : await signUp(email, password, name);
      if (result.error) {
        setError(result.error);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ks-center" style={{ minHeight: "100vh", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 420 }} className="ks-stack">
        <div className="text-center" style={{ marginBottom: 8 }}>
          <div style={{ fontSize: "3.4rem", lineHeight: 1 }} aria-hidden>
            👑
          </div>
          <h1 style={{ fontSize: "2rem", margin: "8px 0 4px" }}>Kingdom Spellers</h1>
          <p className="ks-muted" style={{ margin: 0 }}>
            Restore the kingdom, one spelling word at a time.
          </p>
        </div>

        <div className="card">
          <div className="ks-row" style={{ marginBottom: 18 }}>
            <button
              type="button"
              className={`btn ${mode === "signin" ? "" : "btn-ghost"} ks-grow`}
              onClick={() => setMode("signin")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn ${mode === "signup" ? "" : "btn-ghost"} ks-grow`}
              onClick={() => setMode("signup")}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="ks-stack">
            {mode === "signup" && (
              <div className="field">
                <label className="label" htmlFor="name">Parent name</label>
                <input
                  id="name"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </div>

            {error && (
              <p style={{ color: "var(--danger)", fontWeight: 700, margin: 0 }} role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-lg ks-grow" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center ks-small ks-muted" style={{ margin: 0 }}>
          {backendMode === "demo"
            ? "Demo mode — accounts are stored locally on this device. Add Supabase keys to go live."
            : "Secured with Supabase Auth."}
        </p>
      </div>
    </div>
  );
}
