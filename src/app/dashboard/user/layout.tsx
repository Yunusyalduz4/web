import { ReactNode } from "react";
import BottomNav from "../../../components/BottomNav";

export default function UserDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="pb-14"> {/* BottomNav için padding */}
      {children}
      <BottomNav />
    </div>
  );
} 