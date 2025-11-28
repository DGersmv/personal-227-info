import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { prisma } from '@/lib/prisma';
import ObjectDetailTabs from '@/components/ObjectDetailTabs';
import ObjectAssignments from '@/components/ObjectAssignments';
import CustomerCard from '@/components/CustomerCard';
import Link from 'next/link';

export default async function ObjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/');
  }

  const objectId = parseInt(id);
  if (isNaN(objectId)) {
    redirect('/objects');
  }

  // Получить объект
  const object = await prisma.object.findUnique({
    where: { id: objectId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      },
      _count: {
        select: {
          projects: true,
          photos: true,
          videos: true,
          panoramas: true,
          documents: true,
        },
      },
    },
  });

  if (!object) {
    redirect('/objects');
  }

  // Проверка прав доступа
  if (user.role === 'CUSTOMER') {
    // Заказчик видит только свои объекты (где он владелец)
    if (object.userId !== user.id) {
      redirect('/objects');
    }
  } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
    // Проектировщик и Строитель видят:
    // 1. Объекты, которые они создали (где они владельцы)
    // 2. Объекты, на которые они назначены
    const isOwner = object.userId === user.id;
    const hasAssignment = object.assignments.some((a) => a.userId === user.id);
    if (!isOwner && !hasAssignment && user.role !== 'ADMIN') {
      redirect('/objects');
    }
  }
  // ADMIN имеет доступ ко всем объектам

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href="/objects"
              className="text-primary-600 hover:underline mb-4 inline-block"
            >
              ← Назад к объектам
            </Link>
            <h1 className="text-4xl font-bold mb-2">{object.title}</h1>
            {object.address && (
              <p className="text-gray-600 text-lg">{object.address}</p>
            )}
          </div>

          {/* Информация об объекте */}
          <div className="glass rounded-lg p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Информация об объекте</h2>
                {object.description && (
                  <p className="text-gray-700 mb-4">{object.description}</p>
                )}
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Статус:</span>{' '}
                    <span className="capitalize">
                      {object.status === 'ACTIVE' && 'Активный'}
                      {object.status === 'INACTIVE' && 'Неактивный'}
                      {object.status === 'ARCHIVED' && 'Архивный'}
                    </span>
                  </div>
                  <CustomerCard
                    userId={object.user.id}
                    userName={object.user.name}
                    userEmail={object.user.email}
                  />
                  <div>
                    <span className="font-medium">Создан:</span>{' '}
                    {new Date(object.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Статистика</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass rounded p-4 text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {object._count.projects}
                    </div>
                    <div className="text-sm text-gray-600">Проектов</div>
                  </div>
                  <div className="glass rounded p-4 text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {object._count.photos}
                    </div>
                    <div className="text-sm text-gray-600">Фото</div>
                  </div>
                  <div className="glass rounded p-4 text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {object._count.panoramas}
                    </div>
                    <div className="text-sm text-gray-600">Панорам</div>
                  </div>
                  <div className="glass rounded p-4 text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {object._count.documents}
                    </div>
                    <div className="text-sm text-gray-600">Документов</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Участники объекта */}
          <div className="mb-6">
            <ObjectAssignments
              objectId={objectId}
              userRole={user.role}
              isOwner={object.userId === user.id}
              userId={user.id}
            />
          </div>

          {/* Вкладки с контентом */}
          <ObjectDetailTabs objectId={objectId} userRole={user.role} />
        </div>
      </div>
    </div>
  );
}


