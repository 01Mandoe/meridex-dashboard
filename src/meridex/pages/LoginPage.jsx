import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Globe2, Mail, Lock, User as UserIcon, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../AuthContext";

// Emergent Google OAuth — redirects to the hosted auth page, returns with #session_id=...
function startGoogleSignIn() {
  const redirect = encodeURIComponent(`${window.location.origin}/auth/profile`);
  window.location.href = `https://auth.emergentagent.com/?redirect=${redirect}`;
}

export function LoginPage() {
  const { user, login, register, loading } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  if (!loading && user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(email, password, name || email.split("@")[0]);
      toast.success(mode === "login" ? "Welcome back" : "Welcome to Meridex");
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auth-shell">
      <div className="mx-auth-card">
        <div className="mx-auth-brand">
          <div className="mx-logo-mark"><Globe2 size={20} strokeWidth={2.2} /></div>
          <div>
            <div className="mx-auth-title">Meri<span style={{ color: "#00E5C7" }}>dex</span></div>
            <div className="mx-auth-sub">Real-time trading intelligence</div>
          </div>
        </div>

        <button className="mx-google-btn" onClick={startGoogleSignIn} data-testid="google-signin">
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.18h5.36c-.23 1.46-1.7 4.28-5.36 4.28-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.84 0 3.07.78 3.77 1.45l2.57-2.48C16.74 3.96 14.6 3 12 3 6.95 3 2.86 7.04 2.86 12s4.09 9 9.14 9c5.28 0 8.78-3.71 8.78-8.93 0-.6-.07-1.05-.16-1.5z"/></svg>
          Continue with Google
        </button>

        <div className="mx-auth-sep"><span>or</span></div>

        <form onSubmit={submit} className="mx-auth-form" data-testid="auth-form">
          {mode === "register" && (
            <label className="mx-field">
              <span>Name</span>
              <div className="mx-input-wrap">
                <UserIcon size={14} />
                <input className="mx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" data-testid="name-input" />
              </div>
            </label>
          )}
          <label className="mx-field">
            <span>Email</span>
            <div className="mx-input-wrap">
              <Mail size={14} />
              <input className="mx-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" data-testid="email-input" />
            </div>
          </label>
          <label className="mx-field">
            <span>Password</span>
            <div className="mx-input-wrap">
              <Lock size={14} />
              <input className="mx-input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" data-testid="password-input" />
            </div>
          </label>
          <button type="submit" className="mx-cta-primary" data-testid="submit-auth">
            {mode === "login" ? "Sign in" : "Create account"} <ChevronRight size={14} style={{ verticalAlign: "middle" }} />
          </button>
        </form>

        <div className="mx-auth-switch">
          {mode === "login" ? (
            <>New here? <button onClick={() => setMode("register")} data-testid="switch-register">Create an account</button></>
          ) : (
            <>Already have an account? <button onClick={() => setMode("login")} data-testid="switch-login">Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}

/** Handles the redirect back from Emergent Google: reads #session_id and exchanges it. */
export function AuthProfileCallback() {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const m = (window.location.hash || "").match(/session_id=([^&]+)/);
    if (!m) { navigate("/login", { replace: true }); return; }
    googleLogin(m[1]).then(
      () => navigate("/", { replace: true }),
      () => navigate("/login", { replace: true }),
    );
  }, [googleLogin, navigate]);

  return (
    <div className="mx-auth-shell">
      <div className="mx-auth-card" style={{ textAlign: "center" }}>
        <div className="mx-auth-title">Signing you in…</div>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="mx-auth-shell"><div className="mx-auth-card" style={{ textAlign: "center" }}>Loading…</div></div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
