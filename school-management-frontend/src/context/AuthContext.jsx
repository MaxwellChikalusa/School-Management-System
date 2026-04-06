import React, { createContext, useContext, useState } from "react";
import { loginUser, signupUser } from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);

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
      return { success: true };
    }
    return result;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, signup, login, logout, setCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
