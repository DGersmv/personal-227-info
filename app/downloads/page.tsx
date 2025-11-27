import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import DownloadsList from '@/components/DownloadsList';
import Link from 'next/link';

export default async function DownloadsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  // Только Проектировщик и Админ могут видеть загрузки
  if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Загрузки</h1>
              <p className="text-gray-600">
                Плагины, программы и инструменты для проектирования
              </p>
            </div>
            {(user.role === 'DESIGNER' || user.role === 'ADMIN') && (
              <Link
                href="/downloads/new"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                + Добавить загрузку
              </Link>
            )}
          </div>

          <DownloadsList userRole={user.role} />
        </div>
      </div>
    </div>
  );
}

