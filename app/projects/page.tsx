import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function ProjectsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  // Получить проекты пользователя в зависимости от роли
  let projects: any[] = [];
  
  if (user.role === 'DESIGNER') {
    // Проектировщик видит проекты на своих объектах
    const assignments = await prisma.userObjectAssignment.findMany({
      where: {
        userId: user.id,
        role: 'DESIGNER',
      },
      include: {
        object: {
          include: {
            projects: {
              include: {
                object: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
                _count: {
                  select: {
                    stages: true,
                    documents: true,
                    photos: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    projects = assignments.flatMap((a) => a.object.projects);
  } else if (user.role === 'CUSTOMER') {
    // Заказчик видит проекты на своих объектах
    const objects = await prisma.object.findMany({
      where: { userId: user.id },
      include: {
        projects: {
          include: {
            object: {
              select: {
                id: true,
                title: true,
              },
            },
            _count: {
              select: {
                stages: true,
                documents: true,
                photos: true,
              },
            },
          },
        },
      },
    });
    projects = objects.flatMap((o) => o.projects);
  } else if (user.role === 'BUILDER') {
    // Строитель видит проекты на назначенных объектах
    const assignments = await prisma.userObjectAssignment.findMany({
      where: {
        userId: user.id,
        role: 'BUILDER',
      },
      include: {
        object: {
          include: {
            projects: {
              include: {
                object: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
                _count: {
                  select: {
                    stages: true,
                    documents: true,
                    photos: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    projects = assignments.flatMap((a) => a.object.projects);
  } else if (user.role === 'ADMIN') {
    // Админ видит все проекты
    projects = await prisma.project.findMany({
      include: {
        object: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            stages: true,
            documents: true,
            photos: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PLANNING: 'Планирование',
      IN_PROGRESS: 'В работе',
      COMPLETED: 'Завершен',
      ON_HOLD: 'Приостановлен',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PLANNING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      ON_HOLD: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl md:text-4xl font-bold">Проекты</h1>
          </div>

          {projects.length === 0 ? (
            <div className="glass rounded-lg p-8 md:p-12 text-center">
              <p className="text-gray-600 text-base md:text-lg mb-4">
                У вас пока нет проектов
              </p>
              <p className="text-sm md:text-base text-gray-500">
                Проекты создаются на странице объекта
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="glass rounded-lg p-4 md:p-6 hover:bg-white/20 transition cursor-pointer block"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-lg md:text-xl font-semibold flex-1 pr-2">
                      {project.title}
                    </h2>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(
                        project.status
                      )}`}
                    >
                      {getStatusLabel(project.status)}
                    </span>
                  </div>
                  
                  {project.description && (
                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  <div className="mb-3">
                    <p className="text-xs md:text-sm text-gray-600">
                      Объект:{' '}
                      <span className="text-primary-600 font-medium">
                        {project.object.title}
                      </span>
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                      <div className="text-sm md:text-base font-bold text-primary-600">
                        {project._count.stages}
                      </div>
                      <div className="text-xs text-gray-600">Этапов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm md:text-base font-bold text-primary-600">
                        {project._count.documents}
                      </div>
                      <div className="text-xs text-gray-600">Документов</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm md:text-base font-bold text-primary-600">
                        {project._count.photos}
                      </div>
                      <div className="text-xs text-gray-600">Фото</div>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


