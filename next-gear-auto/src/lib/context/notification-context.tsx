"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
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

  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    dispatch({ type: "ADD_TOAST", payload: { id, type, title, message } });
  }, []);

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: "DISMISS_TOAST", payload: id });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: "CLEAR_ALL" });
  }, []);

  return (
    <NotificationContext.Provider value={{ toasts: state.toasts, showToast, dismissToast, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within a NotificationProvider");
  return context;
}
