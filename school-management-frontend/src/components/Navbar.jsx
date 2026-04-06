import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [systemDate, setSystemDate] = useState("");

  useEffect(() => {
    function formatNow() {
      const now = new Date();
      const date = now.toLocaleDateString("en-GB");
      const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).toLowerCase();
      setSystemDate(`${date} ${time}`);
    }

    formatNow();
    const timer = window.setInterval(formatNow, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <p className="navbar-kicker">School Management Suite</p>
        <h1>Examz Control Room</h1>
      </div>
      {currentUser ? (
        <div className="navbar-system-date">
          <span>System Date</span>
          <strong>{systemDate}</strong>
        </div>
      ) : null}
      {currentUser && (
        <div className="navbar-actions">
          <div className="navbar-user-card">
            <strong>{currentUser.full_name}</strong>
            <span>{currentUser.role} account</span>
          </div>
          <button
            type="button"
            className="navbar-logout"
            onClick={() => {
              logout();
              navigate("/");
            }}
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
