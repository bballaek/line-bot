import './globals.css';
import type { Metadata } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import ClientProviders from './providers';

const notoSansThai = Noto_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

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
      <body className={`${notoSansThai.className} antialiased`} style={{ margin: 0, padding: 0 }}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
