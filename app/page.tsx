import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { getRoleName } from '@/lib/roles';
import InsalesLoginButton from '@/components/InsalesLoginButton';
import TestLoginForm from '@/components/TestLoginForm';
import PortfolioPreview from '@/components/PortfolioPreview';
import DashboardObjectsAndAssignments from '@/components/DashboardObjectsAndAssignments';
import Link from 'next/link';

export default async function Home() {
  const user = await getCurrentUser();

  // Если пользователь не авторизован - показываем экран входа
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Header />
        <main className="min-h-[calc(100vh-80px)] flex items-center justify-center">
          <div className="glass rounded-lg p-12 w-full max-w-2xl">
            <h1 className="text-5xl font-bold text-gray-900 mb-6 text-center">
              Добро пожаловать в Personal227Info
            </h1>
            <p className="text-xl text-gray-700 mb-8 text-center">
              Система управления строительными проектами
            </p>
            
            {/* Временная форма входа для тестирования */}
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-4 font-semibold">
                Временный вход для тестирования (без insales)
              </p>
              <TestLoginForm />
            </div>

            <div className="text-center mb-8">
              <p className="text-gray-600 mb-4">
                Или авторизуйтесь через insales
              </p>
              <div className="max-w-md mx-auto">
                <InsalesLoginButton />
              </div>
            </div>

            <div className="mt-12 grid md:grid-cols-3 gap-6 text-left">
              <div className="glass rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Проектировщик</h3>
                <p className="text-gray-600 text-sm">
                  Создавайте и управляйте проектами, загружайте документацию
                </p>
              </div>

              <div className="glass rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Строитель</h3>
                <p className="text-gray-600 text-sm">
                  Загружайте фото и панорамы, отмечайте выполненные работы
                </p>
              </div>

              <div className="glass rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-2">Заказчик</h3>
                <p className="text-gray-600 text-sm">
                  Просматривайте проекты, оплачивайте документы, следите за прогрессом
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Если авторизован - показываем панель управления
  const roleName = getRoleName(user.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 max-w-7xl mx-auto">
          {/* Панель с портфолио (сверху на мобильных, слева на десктопе) - для всех ролей */}
          <aside className="w-full md:w-1/4 flex-shrink-0 order-1 md:order-0">
            <PortfolioPreview />
          </aside>

          {/* Основной контент (3/4 ширины) */}
          <div className="flex-1 md:w-3/4 order-0 md:order-1">
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Панель управления</h1>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-8">
              Добро пожаловать, {user.name || user.email}! Ваша роль: {roleName}
            </p>

            {/* Карточки быстрого доступа - одинаковые для всех */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              <Link
                href="/objects"
                className="glass rounded-lg p-4 md:p-6 hover:bg-white/20 transition"
              >
                <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">Объекты</h2>
                <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">
                  Управление объектами строительства
                </p>
                <span className="text-sm md:text-base text-primary-600 hover:underline font-medium">
                  Перейти →
                </span>
              </Link>

              <Link
                href="/projects"
                className="glass rounded-lg p-4 md:p-6 hover:bg-white/20 transition"
              >
                <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">Проекты</h2>
                <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">
                  Просмотр и управление проектами
                </p>
                <span className="text-sm md:text-base text-primary-600 hover:underline font-medium">
                  Перейти →
                </span>
              </Link>

              {(user.role === 'DESIGNER' || user.role === 'ADMIN') && (
                <Link
                  href="/downloads"
                  className="glass rounded-lg p-4 md:p-6 hover:bg-white/20 transition"
                >
                  <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">Загрузки</h2>
                  <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">
                    Плагины, программы и инструменты
                  </p>
                  <span className="text-sm md:text-base text-primary-600 hover:underline font-medium">
                    Перейти →
                  </span>
                </Link>
              )}

            </div>

            {/* Объекты и назначения (единый компонент) */}
            <div className="mt-4 md:mt-8">
              <DashboardObjectsAndAssignments userRole={user.role} userId={user.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

