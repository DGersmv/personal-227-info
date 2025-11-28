import type { Metadata } from 'next';
import './globals.css';
import InputFix from '@/components/InputFix';

export const metadata: Metadata = {
  title: 'Personal227Info - Управление проектами',
  description: 'Система управления строительными проектами',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
      </head>
      <body className="antialiased">
        <InputFix />
        {children}
      </body>
    </html>
  );
}



