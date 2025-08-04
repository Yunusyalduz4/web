import './globals.css';
import { ReactNode } from 'react';
import Providers from '../components/Providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Kuaför Randevu Sistemi</title>
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <Providers>
        {children}
        </Providers>
      </body>
    </html>
  );
}
