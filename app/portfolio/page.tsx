import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import PortfolioEditor from '@/components/PortfolioEditor';

export default async function PortfolioPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  // Портфолио доступно для всех ролей

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Мое портфолио</h1>
            <p className="text-gray-600">
              Настройте свою карточку портфолио и добавьте проекты
            </p>
          </div>

          <PortfolioEditor />
        </div>
      </div>
    </div>
  );
}

