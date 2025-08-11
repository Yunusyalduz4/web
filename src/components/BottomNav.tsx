"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard/user", label: "Randevularım", icon: "📅" },
  { href: "/dashboard/user/businesses", label: "İşletmeler", icon: "🏢" },
  { href: "/dashboard/user/favorites", label: "Favoriler", icon: "❤️" },
  { href: "/dashboard/user/profile", label: "Profilim", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow z-50 flex justify-around items-center h-14 md:hidden">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center text-xs px-2 py-1 transition-colors ${
            pathname === item.href ? "text-blue-600" : "text-gray-500"
          }`}
        >
          <span className="text-xl">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
} 