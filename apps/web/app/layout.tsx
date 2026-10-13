import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Academic Collab',
  description: 'A shared workspace for student research and writing.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
