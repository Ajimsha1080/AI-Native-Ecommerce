import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
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
    <html lang="en" className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-[#f4f5f7] text-zinc-900 font-sans antialiased min-h-screen selection:bg-indigo-100 selection:text-indigo-900 tracking-[-0.015em]">
        {children}
      </body>
    </html>
  );
}
