import type { Metadata } from 'next';
import './globals.css';

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
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}



