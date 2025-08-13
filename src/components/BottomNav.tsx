"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard/user", label: "Randevularım", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M8 3v4M16 3v4M3 11h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ) },
  { href: "/dashboard/user/businesses", label: "İşletmeler", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 21h18" stroke="currentColor" strokeWidth="2"/><path d="M5 21V10l7-4 7 4v11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ) },
  { href: "/dashboard/user/favorites", label: "Favoriler", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.1 21.35l-1.1-1.01C5.14 15.24 2 12.36 2 8.5 2 6 4 4 6.5 4c1.74 0 3.41.81 4.5 2.09C12.59 4.81 14.26 4 16 4 18.5 4 20.5 6 20.5 8.5c0 3.86-3.14 6.74-8.9 11.84l-.5.46z"/></svg>
  ) },
  { href: "/dashboard/user/profile", label: "Profilim", icon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/><path d="M4 20c2-3 5-4 8-4s6 1 8 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ) },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-3 left-0 right-0 md:hidden">
      <div className="mx-auto max-w-2xl px-4">
        <div className="bg-white/70 backdrop-blur-md border border-white/40 shadow-lg rounded-2xl">
          <div className="grid grid-cols-4">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 text-[11px] py-2 transition ${active ? 'text-rose-600' : 'text-gray-600'}`}
                >
                  <span className="grid place-items-center w-8 h-8 rounded-xl">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
} 