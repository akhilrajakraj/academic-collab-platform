import type { Metadata } from 'next';
import './globals.css';
import './landing.css';

export const metadata: Metadata = {
  title: {
    default: 'Academic Collab — Better work, together',
    template: '%s | Academic Collab',
  },
  description:
    'A shared workspace for student teams to organise academic projects, write together, and keep collaboration moving.',
  applicationName: 'Academic Collab',
  openGraph: {
    title: 'Academic Collab — Better work, together',
    description:
      'Bring your research, writing, and teammates together in one thoughtful workspace.',
    type: 'website',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
