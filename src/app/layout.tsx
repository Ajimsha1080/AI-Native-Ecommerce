import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const plusJakartaSans = localFont({
  src: '../../public/fonts/PlusJakartaSans.ttf',
  variable: '--font-display',
  display: 'swap',
});

const geistSans = localFont({
  src: '../../public/fonts/Inter.ttf',
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: '../../public/fonts/JetBrainsMono.ttf',
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ShopMate AaaS — Enterprise E-Commerce AI Agent-as-a-Service Platform',
  description: 'Production-ready AI agents for high-converting e-commerce stores. Semantic catalog search, live order tracking, returns processing, and automated human handoff.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}>
      <body className={`${plusJakartaSans.className} font-display bg-[#f4f5f7] text-zinc-900 antialiased min-h-screen selection:bg-indigo-100 selection:text-indigo-900 tracking-[-0.015em]`}>
        {children}
      </body>
    </html>
  );
}
