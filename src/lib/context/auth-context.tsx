"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { Customer } from "@/lib/types";

interface AuthState {
  user: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "LOGIN_START" }
  | { type: "LOGIN_SUCCESS"; payload: Customer }
  | { type: "LOGIN_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "UPDATE_PROFILE"; payload: Partial<Customer> }
  | { type: "SET_LOADING"; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "LOGIN_START":
      return { ...state, isLoading: true, error: null };
    case "LOGIN_SUCCESS":
      return { ...state, user: action.payload, isAuthenticated: true, isLoading: false, error: null };
    case "LOGIN_FAILURE":
      return { ...state, user: null, isAuthenticated: false, isLoading: false, error: action.payload };
    case "LOGOUT":
      return { ...initialState };
    case "UPDATE_PROFILE":
      return state.user ? { ...state, user: { ...state.user, ...action.payload } } : state;
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (data: { name: string; email: string; password: string; phone: string }) => Promise<void>;
  updateProfile: (data: Partial<Customer>) => void;
  checkRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = useCallback(async (email: string, _password: string) => {
    dispatch({ type: "LOGIN_START" });
    try {
      // Simulated login - replace with real API call in production
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "login" }),
      });
      const data = await res.json();
      if (data.success) {
        dispatch({ type: "LOGIN_SUCCESS", payload: data.data });
      } else {
        dispatch({ type: "LOGIN_FAILURE", payload: data.message || "Login failed" });
      }
    } catch {
      dispatch({ type: "LOGIN_FAILURE", payload: "An error occurred during login" });
    }
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
  }, []);

  const signup = useCallback(async (data: { name: string; email: string; password: string; phone: string }) => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, action: "signup" }),
      });
      const result = await res.json();
      if (result.success) {
        dispatch({ type: "LOGIN_SUCCESS", payload: result.data });
      } else {
        dispatch({ type: "LOGIN_FAILURE", payload: result.message || "Signup failed" });
      }
    } catch {
      dispatch({ type: "LOGIN_FAILURE", payload: "An error occurred during signup" });
    }
  }, []);

  const updateProfile = useCallback((data: Partial<Customer>) => {
    dispatch({ type: "UPDATE_PROFILE", payload: data });
  }, []);

  const checkRole = useCallback(
    (role: string) => state.user?.role === role,
    [state.user]
  );

  return (
    <AuthContext.Provider value={{ ...state, login, logout, signup, updateProfile, checkRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
