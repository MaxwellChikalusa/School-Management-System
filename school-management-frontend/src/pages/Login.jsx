import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(form.username, form.password);
    setLoading(false);

    if (result.success) {
      navigate("/dashboard");
      return;
    }

    setError(result.message);
  };

  return (
    <section className="auth-page">
      <div className="auth-panel">
        <div className="auth-copy">
          <p className="eyebrow">Secure School Operations</p>
          <h2>Run the whole school from one calm, fast workspace.</h2>
          <p className="auth-copy-text">
            Built for daily school work across phones, tablets and full desktop screens.
          </p>
          <div className="auth-orbit auth-orbit-one" />
          <div className="auth-orbit auth-orbit-two" />
          <div className="auth-highlight-grid">
            <div className="auth-highlight-card">
              <strong>Admin</strong>
              <span>Controls users, approvals and school-wide records.</span>
            </div>
            <div className="auth-highlight-card">
              <strong>Teacher</strong>
              <span>Works only inside approved forms and subjects.</span>
            </div>
          </div>
          <div className="auth-stats-row">
            <div className="auth-stat-chip">
              <strong>7 Forms</strong>
              <span>Organized automatically</span>
            </div>
            <div className="auth-stat-chip">
              <strong>Live Access</strong>
              <span>Admin and teacher roles</span>
            </div>
          </div>
        </div>
        <div className="auth-form-shell">
          <form className="auth-form" onSubmit={handleSubmit}>
            <p className="eyebrow">Welcome Back</p>
            <h3>Login</h3>
            <p className="auth-form-note">Use your approved school account to continue.</p>
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" disabled={loading}>
              {loading ? "Checking..." : "Login"}
            </button>
            <button type="button" className="text-link-button" onClick={() => navigate("/signup")}>
              Create Account
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
