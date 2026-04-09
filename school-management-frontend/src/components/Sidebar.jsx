import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/students", label: "Students" },
  { to: "/teachers", label: "Teachers" },
  { to: "/attendance", label: "Attendance" },
  { to: "/exams", label: "Exams" },
  { to: "/fees", label: "Fees" },
  { to: "/timetable", label: "Timetable" },
];

export default function Sidebar({ collapsed, onToggleCollapse }) {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <aside className={`sidebar${collapsed ? " sidebar-collapsed" : ""}`}>
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggleCollapse}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Minimize sidebar"}
      >
        {collapsed ? (
          <span className="sidebar-toggle-menu" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <span className="sidebar-toggle-close" aria-hidden="true">
            <span />
            <span />
          </span>
        )}
      </button>
      <div className="sidebar-brand">
        <div className="sidebar-brand-copy">
          <p>Examz</p>
          <span>{currentUser.role === "admin" ? "Administrator" : "Teacher Portal"}</span>
        </div>
      </div>
      <div className="sidebar-scroll-area">
        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar-link${isActive ? " active" : ""}${collapsed ? " sidebar-link-collapsed" : ""}`
              }
              title={collapsed ? link.label : undefined}
            >
              <span className="sidebar-link-text">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
