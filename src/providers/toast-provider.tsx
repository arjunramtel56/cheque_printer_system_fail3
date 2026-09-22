"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface ToastContextType {
  showToast: (message: string, type?: Toast["type"], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast["type"] = "info", duration = 3000) => {
    const toast: Toast = {
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      message,
      type,
    };
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, duration);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastPrimitive.Provider>
        <ToastPrimitive.Root>
          {toasts.map((toast) => (
            <ToastPrimitive.Viewport
              key={toast.id}
              className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 outline-none"
            >
              <ToastPrimitive.Toast
                className={cn(
                  "pointer-events-auto rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
                  "data-[swipe=cancel]:translate-x-0 data-[swipe=move]:bg-accent",
                  "data-[state=delayed-open]_data-[swipe=cancel]:translate-x-0",
                  {
                    "bg-green-600 text-white": toast.type === "success",
                    "bg-red-600 text-white": toast.type === "error",
                    "bg-blue-600 text-white": toast.type === "info",
                    "bg-amber-600 text-white": toast.type === "warning",
                  }
                )}
              >
                <div className="flex items-center gap-2">
                  <span>
                    {toast.type === "success" && "✅"}
                    {toast.type === "error" && "❌"}
                    {toast.type === "info" && "ℹ️"}
                    {toast.type === "warning" && "⚠️"}
                  </span>
                  {toast.message}
                </div>
                <ToastPrimitive.Close
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 opacity-70 hover:opacity-100"
                  asChild
                >
                  <X className="h-3 w-3" />
                </ToastPrimitive.Close>
              </ToastPrimitive.Toast>
            </ToastPrimitive.Viewport>
          ))}
        </ToastPrimitive.Root>
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
