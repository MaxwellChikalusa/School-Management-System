import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export default function Login() {
  const { currentUser, login, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(form.username, form.password);
    setLoading(false);

    if (result.success) {
      if (result.mustChangePassword) {
        setPasswordForm((current) => ({ ...current, current_password: form.password }));
        return;
      }
      navigate("/dashboard");
      return;
    }

    setError(result.message);
  };

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError("New password and confirm password must match");
      return;
    }

    setLoading(true);
    setError("");
    const result = await updatePassword(passwordForm.current_password, passwordForm.new_password);
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
          {currentUser?.must_change_password ? (
            <form className="auth-form" onSubmit={handlePasswordChange}>
              <p className="eyebrow">Security Update</p>
              <h3>Change Password</h3>
              <p className="auth-form-note">You must set a new password before continuing.</p>
              <input
                type="password"
                placeholder="Current password *"
                value={passwordForm.current_password}
                onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })}
                required
              />
              <input
                type="password"
                placeholder="New password *"
                value={passwordForm.new_password}
                onChange={(event) => setPasswordForm({ ...passwordForm, new_password: event.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Confirm new password *"
                value={passwordForm.confirm_password}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirm_password: event.target.value })}
                required
              />
              {error ? <p className="form-error">{error}</p> : null}
              <div className="button-row">
                <button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Password"}
                </button>
                <button type="button" className="confirm-secondary" onClick={() => navigate("/dashboard")}>
                  Not Now
                </button>
              </div>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              <p className="eyebrow">Welcome Back</p>
              <h3>Login</h3>
              <p className="auth-form-note">Use your approved school account to continue.</p>
              <input
                type="text"
                placeholder="Username *"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
              <input
                type="password"
                placeholder="Password *"
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
          )}
        </div>
      </div>
    </section>
  );
}
