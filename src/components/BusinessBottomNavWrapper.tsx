"use client";
import { useEffect, useState } from 'react';
import BusinessBottomNav from './BusinessBottomNav';

export default function BusinessBottomNavWrapper() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <BusinessBottomNav />;
}
