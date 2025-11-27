'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
}

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me', {
      credentials: 'include', // Важно для отправки cookies
    })
      .then((res) => {
        if (res.status === 401) {
          // Пользователь не авторизован - это нормально
          setUser(null);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error('Ошибка загрузки данных пользователя');
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch((error) => {
        // Игнорируем ошибки 401, они нормальны для неавторизованных пользователей
        if (error.message !== 'Ошибка загрузки данных пользователя') {
          console.error('Ошибка загрузки пользователя:', error);
        }
        setUser(null);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' // Важно для отправки cookies
      });
      
      if (response.ok) {
        // Полная перезагрузка страницы для очистки состояния
        window.location.href = '/';
      } else {
        // В случае ошибки все равно перенаправляем
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Ошибка выхода:', error);
      // В случае ошибки все равно перенаправляем
      window.location.href = '/';
    }
  };

  const getRoleName = (role: string) => {
    const roles: Record<string, string> = {
      DESIGNER: 'Проектировщик',
      BUILDER: 'Строитель',
      CUSTOMER: 'Заказчик',
      ADMIN: 'Администратор',
    };
    return roles[role] || role;
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm border-b relative">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between relative">
          <Link href="/" className="text-xl md:text-2xl font-bold text-primary-600">
            Personal227Info
          </Link>

          {/* Мобильное меню кнопка */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
            aria-label="Меню"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {mobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Десктопное меню */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-6">
            {loading ? (
              <div className="text-gray-500">Загрузка...</div>
            ) : user ? (
              <>
                <Link
                  href="/"
                  className="text-sm lg:text-base text-gray-700 hover:text-primary-600 transition"
                >
                  Дашборд
                </Link>
                <Link
                  href="/objects"
                  className="text-sm lg:text-base text-gray-700 hover:text-primary-600 transition"
                >
                  Объекты
                </Link>
                {(user.role === 'DESIGNER' || user.role === 'ADMIN') && (
                  <Link
                    href="/downloads"
                    className="text-sm lg:text-base text-gray-700 hover:text-primary-600 transition"
                  >
                    Загрузки
                  </Link>
                )}
                {(user.role === 'DESIGNER' || user.role === 'BUILDER' || user.role === 'ADMIN') && (
                  <Link
                    href="/portfolio"
                    className="text-sm lg:text-base text-gray-700 hover:text-primary-600 transition"
                  >
                    Портфолио
                  </Link>
                )}
                <div className="flex items-center gap-2 lg:gap-4">
                  <div className="hidden lg:block text-sm text-gray-600">
                    <span className="font-medium">{user.name || user.email}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({getRoleName(user.role)})
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3 lg:px-4 py-1.5 lg:py-2 text-sm lg:text-base bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    Выход
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="px-3 lg:px-4 py-1.5 lg:py-2 text-sm lg:text-base bg-primary-600 text-white rounded hover:bg-primary-700 transition"
              >
                Войти через insales
              </Link>
            )}
          </nav>

          {/* Мобильное меню */}
          {mobileMenuOpen && user && (
            <nav className="absolute top-full left-0 right-0 bg-white border-b shadow-lg md:hidden z-50">
              <div className="container mx-auto px-4 py-4 space-y-3">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-gray-700 hover:text-primary-600 transition py-2"
                >
                  Дашборд
                </Link>
                <Link
                  href="/objects"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-gray-700 hover:text-primary-600 transition py-2"
                >
                  Объекты
                </Link>
                {(user.role === 'DESIGNER' || user.role === 'ADMIN') && (
                  <Link
                    href="/downloads"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-gray-700 hover:text-primary-600 transition py-2"
                  >
                    Загрузки
                  </Link>
                )}
                {(user.role === 'DESIGNER' || user.role === 'BUILDER' || user.role === 'ADMIN') && (
                  <Link
                    href="/portfolio"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-gray-700 hover:text-primary-600 transition py-2"
                  >
                    Портфолио
                  </Link>
                )}
                <div className="pt-3 border-t">
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">{user.name || user.email}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      ({getRoleName(user.role)})
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    Выход
                  </button>
                </div>
              </div>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}

