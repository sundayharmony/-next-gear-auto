"use client";

import React, { createContext, useContext, useReducer, useCallback, useMemo, useRef } from "react";
import type { Toast, ToastType } from "@/lib/types";

interface NotificationState {
  toasts: Toast[];
}

type NotificationAction =
  | { type: "ADD_TOAST"; payload: Toast }
  | { type: "DISMISS_TOAST"; payload: string }
  | { type: "CLEAR_ALL" };

const initialState: NotificationState = { toasts: [] };

function notificationReducer(state: NotificationState, action: NotificationAction): NotificationState {
  switch (action.type) {
    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.payload] };
    case "DISMISS_TOAST":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    case "CLEAR_ALL":
      return { ...state, toasts: [] };
    default:
      return state;
  }
}

interface NotificationContextType {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(notificationReducer, initialState);
  const timerMapRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    dispatch({ type: "ADD_TOAST", payload: { id, type, title, message } });
    // Auto-dismiss after 6 seconds; store timer so manual dismiss can clear it
    const timer = setTimeout(() => {
      timerMapRef.current.delete(id);
      dispatch({ type: "DISMISS_TOAST", payload: id });
    }, 6000);
    timerMapRef.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    // Clear the auto-dismiss timer to prevent memory leak
    const timer = timerMapRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerMapRef.current.delete(id);
    }
    dispatch({ type: "DISMISS_TOAST", payload: id });
  }, []);

  const clearAll = useCallback(() => {
    // Clear all pending timers
    timerMapRef.current.forEach((timer) => clearTimeout(timer));
    timerMapRef.current.clear();
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    () => ({ toasts: state.toasts, showToast, dismissToast, clearAll }),
    [state.toasts, showToast, dismissToast, clearAll]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within a NotificationProvider");
  return context;
}
