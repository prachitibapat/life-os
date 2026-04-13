import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'Your unified personal operating system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-full p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  );
}
