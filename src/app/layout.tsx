import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-zinc-100 antialiased min-h-screen selection:bg-zinc-800 selection:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
