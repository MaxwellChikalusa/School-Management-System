import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SECONDARY_SUBJECTS, SEX_OPTIONS } from "../constants/schoolData";
import "../styles/login.css";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "teacher",
    subject: "",
    sex: "",
    phone: "",
    email: "",
    qualification: "",
    profile_image: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const result = await signup(form);
    setLoading(false);

    if (result.success) {
      setMessage(result.message);
      setForm({
        username: "",
        password: "",
        full_name: "",
        role: "teacher",
        subject: "",
        sex: "",
        phone: "",
        email: "",
        qualification: "",
        profile_image: "",
      });
      return;
    }

    setError(result.message);
  };

  return (
    <section className="auth-page">
      <div className="auth-panel auth-panel-wide">
        <div className="auth-copy">
          <p className="eyebrow">Account Setup</p>
          <h2>Teachers require admin approval before they can sign in.</h2>
          <p className="auth-copy-text">Admins can also add more admins for schools that need multiple controllers.</p>
        </div>
        <div className="auth-form-shell">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h3>Create Account</h3>
            <div className="form-grid">
              <input
                type="text"
                placeholder="Full name"
                value={form.full_name}
                onChange={(event) => setForm({ ...form, full_name: event.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Username"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
              />
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value })}
              >
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
              <select value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>
                <option value="">Select subject</option>
                {SECONDARY_SUBJECTS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
              <select value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })}>
                <option value="">Select sex</option>
                {SEX_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <input
                type="text"
                placeholder="Phone e.g. 0991234567 or +265991234567"
                value={form.phone}
                pattern="^(099\d{7}|098\d{7}|088\d{7}|\+26599\d{7}|\+26598\d{7}|\+26588\d{7})$"
                title="Use 099, 098, 088, +26599, +26598 or +26588"
                onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\s+/g, "") })}
              />
              <input
                type="text"
                placeholder="example@gmail.com"
                value={form.email}
                pattern="^[a-z]+@gmail\.com$"
                title='Use lowercase Gmail format like "example@gmail.com"'
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <input
                type="text"
                placeholder="Qualification"
                value={form.qualification}
                onChange={(event) => setForm({ ...form, qualification: event.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const encoded = await fileToBase64(file);
                  setForm({ ...form, profile_image: encoded });
                }}
              />
            </div>
            {message ? <p className="form-success">{message}</p> : null}
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Submit Account"}
            </button>
            <button type="button" className="text-link-button" onClick={() => navigate("/")}>
              Back to Login
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
