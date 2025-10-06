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
          // Slash farkını göz ardı et - daha esnek path kontrolü
          const normalizedPathname = pathname.replace(/\/$/, '') || '/';
          const normalizedHref = item.href.replace(/\/$/, '') || '/';
          const active = normalizedPathname === normalizedHref;
          
          const activeStyles = active ? {
            background: 'linear-gradient(135deg, #fdf2f8, #fce7f3, #f3e8ff)',
            color: '#be185d',
            transform: 'scale(1.02)',
            boxShadow: '0 8px 25px -8px rgba(190, 24, 93, 0.25)',
            border: '1px solid rgba(190, 24, 93, 0.2)',
            backdropFilter: 'blur(10px)'
          } : {};
          
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all duration-300 min-h-[44px] ${
                active 
                  ? '!text-white !scale-105' 
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
              style={activeStyles}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full animate-pulse shadow-md" />
              )}
              
              {/* Icon */}
              <div 
                className={`transition-all duration-300 ${
                  active ? 'scale-105' : 'group-hover:scale-105'
                }`}
                style={active ? { color: '#be185d' } : {}}
              >
                {item.icon}
              </div>
              
              {/* Label */}
              <span 
                className={`text-[9px] sm:text-[10px] font-medium mt-1 transition-all duration-300 ${
                  active ? '' : 'text-gray-600'
                }`}
                style={active ? { color: '#be185d' } : {}}
              >
                {item.label}
              </span>
              
              {/* Hover effect */}
              {!active && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-50/0 to-pink-50/0 group-hover:from-rose-50/50 group-hover:to-pink-50/50 transition-all duration-300" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 