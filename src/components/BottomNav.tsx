"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Building2, Heart, User } from "lucide-react";

const navItems = [
  { href: "/dashboard/user", label: "Randevularım", icon: <Calendar size={18} /> },
  { href: "/dashboard/user/businesses", label: "İşletmeler", icon: <Building2 size={18} /> },
  { href: "/dashboard/user/favorites", label: "Favoriler", icon: <Heart size={18} /> },
  { href: "/dashboard/user/profile", label: "Profilim", icon: <User size={18} /> },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
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
                  ? 'bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 text-white shadow-lg shadow-rose-500/25' 
                  : 'text-gray-800 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 rounded-full animate-pulse" />
              )}
              
              {/* Icon */}
              <div className={`transition-transform duration-300 ${
                active ? 'scale-110' : 'group-hover:scale-105'
              }`}>
                {item.icon}
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