import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function UserObjectsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/');
  }

  const userId = parseInt(id);
  if (isNaN(userId)) {
    redirect('/');
  }

  // Получить информацию о пользователе
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  if (!targetUser) {
    redirect('/');
  }

  // Получить объекты пользователя
  let objects: any[] = [];

  if (targetUser.role === 'CUSTOMER') {
    // Объекты, где пользователь является заказчиком
    objects = await prisma.object.findMany({
      where: { userId: userId },
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
            panoramas: true,
            documents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } else if (targetUser.role === 'DESIGNER' || targetUser.role === 'BUILDER') {
    // Объекты, где пользователь назначен
    let assignmentWhere: any = { userId: userId };
    
    // Если текущий пользователь - заказчик, показывать только его объекты
    if (user.role === 'CUSTOMER') {
      // Получить ID всех объектов текущего заказчика
      const customerObjects = await prisma.object.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      const customerObjectIds = customerObjects.map((o) => o.id);
      
      if (customerObjectIds.length === 0) {
        // У заказчика нет объектов, значит нет объектов для показа
        objects = [];
      } else {
        // Показать только назначения на объекты текущего заказчика
        assignmentWhere.objectId = { in: customerObjectIds };
      }
    }
    
    // Если у заказчика нет объектов, не выполнять запрос
    if (user.role !== 'CUSTOMER' || (user.role === 'CUSTOMER' && assignmentWhere.objectId)) {
      const assignments = await prisma.userObjectAssignment.findMany({
        where: assignmentWhere,
        include: {
          object: {
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
                  panoramas: true,
                  documents: true,
                },
              },
            },
          },
        },
      });
      objects = assignments.map((a) => ({
        ...a.object,
        assignmentRole: a.role, // Роль на этом объекте
      }));
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      DESIGNER: 'Проектировщик',
      BUILDER: 'Строитель',
      CUSTOMER: 'Заказчик',
    };
    return labels[role] || role;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Активный',
      INACTIVE: 'Неактивный',
      ARCHIVED: 'Архивный',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-yellow-100 text-yellow-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href="/"
              className="text-primary-600 hover:underline mb-4 inline-block text-sm md:text-base"
            >
              ← Назад к Панели управления
            </Link>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">
              Объекты {targetUser.name || targetUser.email}
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Роль: {getRoleLabel(targetUser.role)} | Email: {targetUser.email}
            </p>
          </div>

          {objects.length === 0 ? (
            <div className="glass rounded-lg p-8 md:p-12 text-center">
              <p className="text-gray-600 text-base md:text-lg mb-4">
                У пользователя пока нет объектов
              </p>
              <p className="text-sm md:text-base text-gray-500">
                {targetUser.role === 'CUSTOMER'
                  ? 'Заказчик еще не создал объектов'
                  : targetUser.role === 'DESIGNER'
                  ? 'Проектировщик еще не назначен на объекты'
                  : 'Строитель еще не назначен на объекты'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {objects.map((object) => {
                const designers = object.assignments.filter((a) => a.role === 'DESIGNER');
                const builders = object.assignments.filter((a) => a.role === 'BUILDER');
                const isOwner = object.user.id === userId;
                const userAssignment = object.assignments.find((a) => a.user.id === userId);
                const userRoleOnObject = object.assignmentRole || (isOwner ? 'CUSTOMER' : userAssignment?.role);

                return (
                  <Link
                    key={object.id}
                    href={`/objects/${object.id}`}
                    className="glass rounded-lg p-4 md:p-6 hover:bg-white/20 transition block"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-lg md:text-xl font-semibold flex-1 pr-2">
                        {object.title}
                      </h2>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <span
                          className={`px-2 py-1 rounded text-xs ${getStatusColor(object.status)}`}
                        >
                          {getStatusLabel(object.status)}
                        </span>
                        {userRoleOnObject && (
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            {getRoleLabel(userRoleOnObject)}
                          </span>
                        )}
                      </div>
                    </div>

                    {object.address && (
                      <p className="text-xs md:text-sm text-gray-600 mb-3">
                        {object.address}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs md:text-sm">
                      <div>
                        <span className="text-gray-600">Проектов:</span>{' '}
                        <span className="font-medium">{object._count.projects}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Фото:</span>{' '}
                        <span className="font-medium">{object._count.photos}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Документов:</span>{' '}
                        <span className="font-medium">{object._count.documents}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Панорам:</span>{' '}
                        <span className="font-medium">{object._count.panoramas}</span>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-1 text-xs md:text-sm">
                      <div>
                        <span className="font-medium text-blue-700">Заказчик:</span>{' '}
                        <span className="text-gray-700">
                          {object.user.name || object.user.email}
                        </span>
                      </div>
                      {designers.length > 0 && (
                        <div>
                          <span className="font-medium text-purple-700">Проектировщики:</span>{' '}
                          <span className="text-gray-700">
                            {designers.map((d) => d.user.name || d.user.email).join(', ')}
                          </span>
                        </div>
                      )}
                      {builders.length > 0 && (
                        <div>
                          <span className="font-medium text-orange-700">Строители:</span>{' '}
                          <span className="text-gray-700">
                            {builders.map((b) => b.user.name || b.user.email).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

