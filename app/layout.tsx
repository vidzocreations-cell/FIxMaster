import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'FixMaster POS & Repair Management System',
  description: 'Point of Sale & Repair System for Multi-Category Hardware & Power Tools Repair Shops.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FixMaster',
  },
};

export const viewport: Viewport = {
  themeColor: '#06b6d4',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-white" suppressHydrationWarning>
        <Navbar />
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 md:pb-6 space-y-6">
            {children}
          </main>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var i = 0; i < registrations.length; i++) {
                    registrations[i].unregister();
                  }
                });
              }
              if ('caches' in window) {
                caches.keys().then(function(keys) {
                  for (var j = 0; j < keys.length; j++) {
                    caches.delete(keys[j]);
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
