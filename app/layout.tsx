import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Family Vine Choir - Administration & Member Portal',
  description: 'United in Harmony, Rooted in Grace. Administrative, music, attendance, and member management for Family Vine Choir.',
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full flex flex-col font-sans bg-[#fdfbf7] text-stone-900 selection:bg-choir-200 selection:text-choir-950">
        {children}
      </body>
    </html>
  );
}

