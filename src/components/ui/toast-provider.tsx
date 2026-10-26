
"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

type ToastType = "success" | "error";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 0;

export function ToastProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) =>
      current.filter((toast) => toast.id !== id)
    );
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = ++nextToastId;

      setToasts((current) => [
        ...current,
        { id, type, message },
      ]);
    },
    []
  );

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismiss(toast.id), 4500)
    );

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [toasts, dismiss]);

  const success = useCallback(
    (message: string) => addToast("success", message),
    [addToast]
  );

  const error = useCallback(
    (message: string) => addToast("error", message),
    [addToast]
  );

  return (
    <ToastContext.Provider value={{ success, error }}>
      {children}

      <div
        aria-label="Notificaciones"
        className="pointer-events-none fixed right-4 top-20 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3"
      >
        {toasts.map((toast) => (
  <div
    key={toast.id}
    data-testid={toast.type === "success" ? "toast-success" : "toast-error"}
    role={toast.type === "error" ? "alert" : "status"}
    className={[
              "pointer-events-auto flex items-start gap-3",
              "rounded-xl border bg-[#18181B] p-4",
              "shadow-2xl shadow-black/40",
              toast.type === "success"
                ? "border-emerald-500/30"
                : "border-rose-500/30",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className={
                toast.type === "success"
                  ? "text-emerald-400"
                  : "text-rose-400"
              }
            >
              {toast.type === "success" ? "✓" : "!"}
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-100">
                {toast.type === "success"
                  ? "Operación exitosa"
                  : "Ocurrió un error"}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              aria-label="Cerrar notificación"
              onClick={() => dismiss(toast.id)}
              className="rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast debe utilizarse dentro de ToastProvider."
    );
  }

  return context;
}
