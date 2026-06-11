"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon } from "@/components/Icons";

interface ToastState {
  id: number;
  message: string;
  tone: "success" | "error";
}

/**
 * Lightweight toast — returns a `show` function and the element to render.
 * Usage:
 *   const { toast, showToast } = useToast();
 *   showToast("Copied successfully");
 *   return <>{...}{toast}</>
 */
export function useToast() {
  const [state, setState] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!state) return;
    const t = setTimeout(() => setState(null), 2400);
    return () => clearTimeout(t);
  }, [state]);

  const showToast = useCallback(
    (message: string, tone: "success" | "error" = "success") => {
      setState({ id: Date.now(), message, tone });
    },
    []
  );

  const toast = state ? (
    <div
      key={state.id}
      className="fixed left-1/2 -translate-x-1/2 bottom-28 z-[60] float-in pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl glass border shadow-2xl shadow-black/50 text-sm font-medium ${
          state.tone === "success"
            ? "border-success/30 text-success"
            : "border-danger/30 text-danger"
        }`}
      >
        {state.tone === "success" && <CheckIcon size={16} />}
        {state.message}
      </div>
    </div>
  ) : null;

  return { toast, showToast };
}
