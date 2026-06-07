import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bill Pro Final Full System',
  description: 'Bill Splitter with Supabase and history',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
