import './globals.css';
import { ReactNode } from 'react';
import Providers from '../components/Providers';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import PWARegister from '../components/PWARegister';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RANDEVUO</title>
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="RANDEVUO" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RANDEVUO" />
        <meta name="description" content="RANDEVUO - Kuaför randevu ve yönetim uygulaması" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#3b82f6" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/logo.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/logo.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#3b82f6" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Microsoft Tiles */}
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <Providers>
        {children}
        </Providers>
        <PWAInstallPrompt />
        <PWARegister />
      </body>
    </html>
  );
}
