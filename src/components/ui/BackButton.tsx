"use client";
import { useRouter } from "next/navigation";

export default function BackButton({ label = "Geri Dön" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 backdrop-blur border border-gray-200 text-gray-900 shadow-sm hover:shadow-md active:scale-[0.98] transition"
      aria-label={label}
    >
      <span className="text-lg">←</span>
      <span className="hidden sm:inline text-sm font-medium">{label}</span>
    </button>
  );
}


