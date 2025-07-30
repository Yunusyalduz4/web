import { ReactNode } from "react";
import BusinessBottomNav from "../../../components/BusinessBottomNav";

export default function BusinessDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pb-14"> {/* BottomNav için padding */}
      {children}
      <BusinessBottomNav />
    </div>
  );
} 