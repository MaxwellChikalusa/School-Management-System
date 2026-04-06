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
          <h2>Login to manage students, fees, exams and timetables.</h2>
          <p>Default admin account: username `admin`, password `admin123`.</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <h3>Login</h3>
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
    </section>
  );
}
