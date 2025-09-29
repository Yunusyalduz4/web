"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const navItems = [
  { 
    href: "/dashboard/business", 
    label: "Panel", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v4m8-4v4" />
      </svg>
    ),
    permission: null // Her zaman erişilebilir
  },
  { 
    href: "/dashboard/business/appointments", 
    label: "Randevular", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    permission: "can_manage_appointments"
  },
  { 
    href: "/dashboard/business/analytics", 
    label: "İstatistikler", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    permission: "can_view_analytics"
  },
  { 
    href: "/dashboard/business/services", 
    label: "Hizmetler", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    permission: "can_manage_services"
  },
  { 
    href: "/dashboard/business/employees", 
    label: "Çalışanlar", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    permission: "can_manage_employees"
  },
  { 
    href: "/dashboard/business/reviews", 
    label: "Yorumlar", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    permission: "can_manage_appointments"
  },
  { 
    href: "/dashboard/business/profile", 
    label: "Profil", 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    permission: null // Her zaman erişilebilir
  },
];

export default function BusinessBottomNav() {
  const { data: session } = useSession();
  const [currentPath, setCurrentPath] = useState("");
  
  useEffect(() => {
    // Get current pathname after component mounts
    setCurrentPath(window.location.pathname);
    
    // Listen for route changes
    const handleRouteChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    // Add event listener for popstate (back/forward buttons)
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // Filter nav items based on user role
  const filteredNavItems = navItems.filter(item => {
    // Business users can see all items
    if (session?.user?.role === 'business') {
      return true;
    }
    
    // Employee users can only see specific items
    if (session?.user?.role === 'employee') {
      // Employee'ler sadece bu sayfaları görebilir
      const allowedEmployeePages = [
        '/dashboard/business', // Dashboard
        '/dashboard/business/appointments', // Randevular
        '/dashboard/business/analytics', // İstatistikler
        '/dashboard/business/reviews', // Yorumlar
        '/dashboard/business/profile' // Profil
      ];
      return allowedEmployeePages.includes(item.href);
    }
    
    // Default: show all items
    return true;
  });
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      {/* Background with blur effect */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-md border-t border-white/40" />
      
      {/* Navigation items */}
      <div className="relative flex justify-around items-center h-20 sm:h-24 px-1 sm:px-2 overflow-x-auto no-scrollbar">
        {filteredNavItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all duration-300 min-h-[44px] flex-shrink-0 ${
                isActive 
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
              onClick={() => setCurrentPath(item.href)}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
              
              {/* Icon */}
              <div className={`transition-transform duration-300 ${
                isActive ? 'scale-110' : 'group-hover:scale-105'
              }`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon.props.children}
                </svg>
              </div>
              
              {/* Label */}
              <span className={`text-[9px] sm:text-[10px] font-medium mt-1 transition-all duration-300 ${
                isActive ? 'text-white' : 'text-gray-600'
              }`}>
                {item.label}
              </span>
              
              {/* Hover effect */}
              {!isActive && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/0 to-indigo-500/0 group-hover:from-blue-500/5 group-hover:to-indigo-500/5 transition-all duration-300" />
              )}
            </Link>
          );
        })}
      </div>
      
      {/* Bottom safe area for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)] bg-white/80 backdrop-blur-md" />
    </nav>
  );
} 