import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { getRoleName } from '@/lib/roles';
import InsalesLoginButton from '@/components/InsalesLoginButton';
import TestLoginForm from '@/components/TestLoginForm';
import PortfolioPreview from '@/components/PortfolioPreview';
import DashboardObjectsList from '@/components/DashboardObjectsList';
import AllParticipantsList from '@/components/AllParticipantsList';
import DashboardAssignmentsManager from '@/components/DashboardAssignmentsManager';
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

  // Если авторизован - показываем дашборд
  const roleName = getRoleName(user.role);
  const showPortfolio = user.role === 'DESIGNER' || user.role === 'BUILDER' || user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 max-w-7xl mx-auto">
          {/* Панель с портфолио (сверху на мобильных, слева на десктопе) */}
          {showPortfolio && (
            <aside className="w-full md:w-1/4 flex-shrink-0 order-1 md:order-0">
              <PortfolioPreview />
            </aside>
          )}

          {/* Основной контент (3/4 ширины или 100% если нет портфолио) */}
          <div className={`flex-1 ${showPortfolio ? 'md:w-3/4' : 'max-w-6xl mx-auto'} order-0 md:order-1`}>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">Дашборд</h1>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-8">
              Добро пожаловать, {user.name || user.email}! Ваша роль: {roleName}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="glass rounded-lg p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">Объекты</h2>
              <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">Управление объектами строительства</p>
              <a
                href="/objects"
                className="text-sm md:text-base text-primary-600 hover:underline font-medium"
              >
                Перейти →
              </a>
            </div>

            <div className="glass rounded-lg p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">Проекты</h2>
              <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">Просмотр и управление проектами</p>
              <a
                href="/projects"
                className="text-sm md:text-base text-primary-600 hover:underline font-medium"
              >
                Перейти →
              </a>
            </div>

            {(user.role === 'DESIGNER' || user.role === 'ADMIN') && (
              <div className="glass rounded-lg p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">Загрузки</h2>
                <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">Плагины, программы и инструменты</p>
                <a
                  href="/downloads"
                  className="text-sm md:text-base text-primary-600 hover:underline font-medium"
                >
                  Перейти →
                </a>
              </div>
            )}

            {(user.role === 'DESIGNER' || user.role === 'BUILDER' || user.role === 'ADMIN') && (
              <div className="glass rounded-lg p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">Портфолио</h2>
                <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">Настройка карточки портфолио и проектов</p>
                <a
                  href="/portfolio"
                  className="text-sm md:text-base text-primary-600 hover:underline font-medium"
                >
                  Перейти →
                </a>
              </div>
            )}

            {user.role !== 'DESIGNER' && user.role !== 'ADMIN' && user.role !== 'BUILDER' && (
              <div className="glass rounded-lg p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">Профиль</h2>
                <p className="text-sm md:text-base text-gray-600 mb-3 md:mb-4">Настройки профиля и аккаунта</p>
                <a
                  href="/profile"
                  className="text-sm md:text-base text-primary-600 hover:underline font-medium"
                >
                  Перейти →
                </a>
              </div>
            )}
          </div>

          {/* Список объектов с заказчиками и строителями */}
          <div className="mt-4 md:mt-8">
            <DashboardObjectsList />
          </div>

          {/* Управление назначениями */}
          <div className="mt-4 md:mt-8">
            <DashboardAssignmentsManager userRole={user.role} userId={user.id} />
          </div>

          {/* Список всех участников */}
          <div className="mt-4 md:mt-8">
            <AllParticipantsList />
          </div>

          {/* Роль-специфичный контент */}
          <div className="mt-4 md:mt-8">
            {user.role === 'DESIGNER' && (
              <div className="glass rounded-lg p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Панель Проектировщика</h2>
                <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                  Создавайте и управляйте проектами, загружайте проектную документацию,
                  используйте плагины и программы для работы.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <Link
                    href="/downloads"
                    className="glass rounded-lg p-4 hover:bg-white/20 transition"
                  >
                    <h3 className="font-semibold mb-2">Загрузки</h3>
                    <p className="text-sm text-gray-600">
                      Плагины, программы и инструменты для проектирования
                    </p>
                  </Link>
                  <Link
                    href="/portfolio"
                    className="glass rounded-lg p-4 hover:bg-white/20 transition"
                  >
                    <h3 className="font-semibold mb-2">Портфолио</h3>
                    <p className="text-sm text-gray-600">
                      Настройка карточки портфолио и добавление проектов
                    </p>
                  </Link>
                  <Link
                    href="/objects"
                    className="glass rounded-lg p-4 hover:bg-white/20 transition"
                  >
                    <h3 className="font-semibold mb-2">Объекты</h3>
                    <p className="text-sm text-gray-600">
                      Просмотр и управление объектами строительства
                    </p>
                  </Link>
                </div>
              </div>
            )}

            {user.role === 'BUILDER' && (
              <div className="glass rounded-lg p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Панель Строителя</h2>
                <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                  Загружайте фото и панорамы, отмечайте выполненные работы, управляйте своим портфолио.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Link
                    href="/portfolio"
                    className="glass rounded-lg p-4 hover:bg-white/20 transition"
                  >
                    <h3 className="font-semibold mb-2">Портфолио</h3>
                    <p className="text-sm text-gray-600">
                      Настройка карточки портфолио и добавление проектов
                    </p>
                  </Link>
                  <Link
                    href="/objects"
                    className="glass rounded-lg p-4 hover:bg-white/20 transition"
                  >
                    <h3 className="font-semibold mb-2">Объекты</h3>
                    <p className="text-sm text-gray-600">
                      Просмотр и управление объектами строительства
                    </p>
                  </Link>
                </div>
              </div>
            )}

            {user.role === 'CUSTOMER' && (
              <div className="glass rounded-lg p-4 md:p-6">
                <h2 className="text-xl md:text-2xl font-semibold mb-3 md:mb-4">Панель Заказчика</h2>
                <p className="text-sm md:text-base text-gray-600">
                  Здесь будет интерфейс для просмотра проектов, оплаты документов,
                  отслеживания прогресса.
                </p>
              </div>
            )}
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}

