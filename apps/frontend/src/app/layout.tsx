import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReactElement, ReactNode } from 'react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Vibe Food Ordering',
  description: 'Discover restaurants, browse menus, and order your favorite food for delivery',
  keywords: ['food delivery', 'restaurant', 'ordering', 'takeaway'],
  authors: [{ name: 'Vibe Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#ffffff',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): ReactElement {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}