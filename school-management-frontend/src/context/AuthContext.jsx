import React, { createContext, useContext, useEffect, useState } from "react";
import { changePassword, loginUser, signupUser } from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = window.localStorage.getItem("sms_current_user");
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch {
      window.localStorage.removeItem("sms_current_user");
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      window.localStorage.setItem("sms_current_user", JSON.stringify(currentUser));
      return;
    }
    window.localStorage.removeItem("sms_current_user");
  }, [currentUser]);

  const signup = async (payload) => {
    const result = await signupUser(payload);
    if (result.success) {
      return { success: true, message: payload.role === "teacher" ? "Teacher account submitted for admin approval" : "Admin account created" };
    }
    return result;
  };

  const login = async (username, password) => {
    const result = await loginUser({ username, password });
    if (result.success) {
      setCurrentUser(result.data);
      return { success: true, mustChangePassword: result.data.must_change_password };
    }
    return result;
  };

  const updatePassword = async (currentPassword, newPassword) => {
    const result = await changePassword({ current_password: currentPassword, new_password: newPassword });
    if (result.success) {
      setCurrentUser(result.data);
    }
    return result;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, signup, login, logout, setCurrentUser, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
