"use client";
import { useEffect } from "react";
import { useWebSocket } from '../contexts/WebSocketContext';

export type ToastType = "success" | "error" | "warning" | "info";

export default function Toast({
  open,
  message,
  type = "info",
  onClose,
  duration = 3000,
}: {
  open: boolean;
  message: string;
  type?: ToastType;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (open) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [open, duration, onClose]);

  if (!open) return null;

  const colorMap = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    warning: "bg-yellow-500 text-white",
    info: "bg-blue-600 text-white",
  };

  return (
    <div
      className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-toast-in ${colorMap[type]}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="font-semibold text-base">{message}</span>
      <button
        className="ml-4 text-white/80 hover:text-white text-xl font-bold focus:outline-none"
        onClick={onClose}
        aria-label="Kapat"
      >
        ×
      </button>
      <style jsx global>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-toast-in {
          animation: toast-in 0.4s cubic-bezier(0.4,0,0.2,1) both;
        }
      `}</style>
    </div>
  );
} 