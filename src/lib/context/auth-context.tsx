"use client";

import React, { createContext, useContext, useReducer, useCallback, useEffect } from "react";
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
  login: (email: string, password: string) => Promise<Customer | null>;
  logout: () => Promise<void>;
  signup: (data: { name: string; email: string; password: string; phone: string }) => Promise<boolean>;
  updateProfile: (data: Partial<Customer>) => void;
  checkRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore session from localStorage, then validate against server JWT
  useEffect(() => {
    let cancelled = false;

    // Immediately restore from localStorage for fast UI render
    try {
      const stored = localStorage.getItem("nga_user");
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.id && user?.email) {
          dispatch({ type: "LOGIN_SUCCESS", payload: user });
        }
      }
    } catch (err) {
      console.warn("Failed to parse stored user data:", err);
      localStorage.removeItem("nga_user");
    }

    // Then validate the JWT cookie against the server
    async function validateSession() {
      try {
        const res = await fetch("/api/auth", { credentials: "same-origin" });
        if (!res.ok) {
          // JWT expired or invalid — clear localStorage
          if (!cancelled) {
            localStorage.removeItem("nga_user");
            dispatch({ type: "LOGOUT" });
          }
          return;
        }
        const data = await res.json();
        if (data.success && data.data && !cancelled) {
          // Update localStorage with server-verified user data
          dispatch({ type: "LOGIN_SUCCESS", payload: data.data });
        }
      } catch {
        // Network error — keep cached user (offline-friendly)
      }
    }

    validateSession();
    return () => { cancelled = true; };
  }, []);

  // Persist user to localStorage on changes
  useEffect(() => {
    try {
      if (state.user) {
        localStorage.setItem("nga_user", JSON.stringify(state.user));
      } else {
        localStorage.removeItem("nga_user");
      }
    } catch {
      // localStorage unavailable (private browsing, storage full, etc.)
    }
  }, [state.user]);

  const login = useCallback(async (email: string, password: string): Promise<Customer | null> => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, action: "login" }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        dispatch({ type: "LOGIN_FAILURE", payload: errData?.message || `Server error (${res.status})` });
        return null;
      }
      const data = await res.json();
      if (data.success) {
        dispatch({ type: "LOGIN_SUCCESS", payload: data.data });
        return data.data as Customer;
      } else {
        dispatch({ type: "LOGIN_FAILURE", payload: data.message || "Login failed" });
        return null;
      }
    } catch {
      dispatch({ type: "LOGIN_FAILURE", payload: "An error occurred during login" });
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem("nga_user");
    dispatch({ type: "LOGOUT" });
    // Clear server-side HTTP-only cookies
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); } catch { /* best-effort */ }
  }, []);

  const signup = useCallback(async (data: { name: string; email: string; password: string; phone: string }): Promise<boolean> => {
    dispatch({ type: "LOGIN_START" });
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, action: "signup" }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        dispatch({ type: "LOGIN_FAILURE", payload: errData?.message || `Server error (${res.status})` });
        return false;
      }
      const result = await res.json();
      if (result.success) {
        dispatch({ type: "LOGIN_SUCCESS", payload: result.data });
        return true;
      } else {
        dispatch({ type: "LOGIN_FAILURE", payload: result.message || "Signup failed" });
        return false;
      }
    } catch {
      dispatch({ type: "LOGIN_FAILURE", payload: "An error occurred during signup" });
      return false;
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
