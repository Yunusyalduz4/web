"use client";
import { useEffect, useState } from 'react';
import EmployeeBottomNav from './EmployeeBottomNav';

export default function EmployeeBottomNavWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <EmployeeBottomNav />;
}
