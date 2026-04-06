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

export default function Sidebar() {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <p>Examz</p>
        <span>{currentUser.role === "admin" ? "Administrator" : "Teacher Portal"}</span>
      </div>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
