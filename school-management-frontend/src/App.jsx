import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Attendance from "./pages/Attendance";
import Dashboard from "./pages/Dashboard";
import Exams from "./pages/Exams";
import Fees from "./pages/Fees";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Timetable from "./pages/Timetable";

function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { currentUser } = useAuth();

  return (
    <div className="app-layout">
      <Navbar />
      <div className="main-layout">
        {currentUser && <Sidebar />}
        <main className={`page-content${currentUser ? "" : " page-content-full"}`}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
            <Route path="/teachers" element={<ProtectedRoute><Teachers /></ProtectedRoute>} />
            <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
            <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
            <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
