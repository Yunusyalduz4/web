"use client";
import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    // Safari uyumluluğu için kontrol
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        // Safari için özel registration
        navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          // Safari uyumluluğu için
          updateViaCache: 'none'
        })
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return null;
}
