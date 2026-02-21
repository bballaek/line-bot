import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ClientProviders from './providers';

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
      <body className={`${inter.className} antialiased`} style={{ margin: 0, padding: 0 }}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}

