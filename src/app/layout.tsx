import './globals.css';
import { LiffProvider } from '@/lib/liff-provider';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Homework Tracker LIFF',
  description: 'Manage your homework seamlessly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <LiffProvider>
          <div className="max-w-md mx-auto min-h-screen bg-white shadow-sm pb-12">
            {children}
          </div>
        </LiffProvider>
      </body>
    </html>
  );
}
