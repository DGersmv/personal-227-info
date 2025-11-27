import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function ObjectsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  // Получить объекты пользователя в зависимости от роли
  let objects;
  if (user.role === 'CUSTOMER') {
    // Заказчик видит только свои объекты
    objects = await prisma.object.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
    // Проектировщик и Строитель видят назначенные объекты
    const assignments = await prisma.userObjectAssignment.findMany({
      where: { userId: user.id },
      include: { object: true },
    });
    objects = assignments.map((a) => a.object);
  } else {
    // Админ видит все объекты
    objects = await prisma.object.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold">Объекты</h1>
            {user.role === 'CUSTOMER' && (
              <Link
                href="/objects/new"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-block"
              >
                + Создать объект
              </Link>
            )}
          </div>

          {objects.length === 0 ? (
            <div className="glass rounded-lg p-12 text-center">
              <p className="text-gray-600 text-lg mb-4">
                У вас пока нет объектов
              </p>
              {user.role === 'CUSTOMER' && (
                <Link
                  href="/objects/new"
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-block"
                >
                  Создать первый объект
                </Link>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {objects.map((object) => (
                <div
                  key={object.id}
                  className="glass rounded-lg p-6 hover:bg-white/20 transition cursor-pointer"
                >
                  <h2 className="text-xl font-semibold mb-2">{object.title}</h2>
                  {object.address && (
                    <p className="text-gray-600 text-sm mb-3">{object.address}</p>
                  )}
                  {object.description && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                      {object.description}
                    </p>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(object.createdAt).toLocaleDateString('ru-RU')}
                    </span>
                    <a
                      href={`/objects/${object.id}`}
                      className="text-primary-600 hover:underline text-sm"
                    >
                      Подробнее →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

