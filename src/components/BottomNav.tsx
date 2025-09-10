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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-md border-t border-white/40" />
      
      {/* Navigation items */}
      <div className="relative flex justify-around items-center h-20 sm:h-24 px-2">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all duration-300 min-h-[44px] ${
                active 
                  ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              )}
              
              {/* Icon */}
              <div className={`transition-transform duration-300 ${
                active ? 'scale-110' : 'group-hover:scale-105'
              }`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="sm:w-[18px] sm:h-[18px]">
                  {item.icon.props.children}
                </svg>
              </div>
              
              {/* Label */}
              <span className={`text-[9px] sm:text-[10px] font-medium mt-1 transition-all duration-300 ${
                active ? 'text-white' : 'text-gray-600'
              }`}>
                {item.label}
              </span>
              
              {/* Hover effect */}
              {!active && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-500/0 to-pink-500/0 group-hover:from-rose-500/5 group-hover:to-pink-500/5 transition-all duration-300" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 