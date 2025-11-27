import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { canUser } from '@/lib/roles';
import ProjectStagesSection from '@/components/ProjectStagesSection';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  const { id } = await params;

  if (!user) {
    redirect('/');
  }

  const projectId = parseInt(id);
  if (isNaN(projectId)) {
    redirect('/objects');
  }

  // Получить проект
  const project = await prisma.project.findUnique({
    where: { id: projectId },
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
        },
      },
      stages: {
        orderBy: { orderIndex: 'asc' },
        include: {
          _count: {
            select: {
              photos: true,
            },
          },
        },
      },
      _count: {
        select: {
          documents: true,
          photos: true,
          messages: true,
        },
      },
    },
  });

  if (!project) {
    redirect('/objects');
  }

  // Проверка прав доступа
  const object = project.object;
  if (user.role === 'CUSTOMER') {
    if (object.userId !== user.id) {
      redirect('/objects');
    }
  } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
    const hasAccess = object.assignments.some((a) => a.userId === user.id);
    if (!hasAccess && user.role !== 'ADMIN') {
      redirect('/objects');
    }
  }

  const canEdit = canUser(user, 'project', 'update');
  const canDelete = canUser(user, 'project', 'delete');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href={`/objects/${project.objectId}/projects`}
              className="text-primary-600 hover:underline mb-4 inline-block"
            >
              ← Назад к проектам
            </Link>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold mb-2">{project.title}</h1>
                <p className="text-gray-600">
                  Объект: <Link href={`/objects/${project.objectId}`} className="text-primary-600 hover:underline">{project.object.title}</Link>
                </p>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                    Редактировать
                  </button>
                )}
                {canDelete && (
                  <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">
                    Удалить
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Информация о проекте */}
          <div className="glass rounded-lg p-6 mb-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Информация о проекте</h2>
                {project.description && (
                  <p className="text-gray-700 mb-4">{project.description}</p>
                )}
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Статус:</span>{' '}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${
                        project.status === 'PLANNING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : project.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : project.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {project.status === 'PLANNING' && 'Планирование'}
                      {project.status === 'IN_PROGRESS' && 'В работе'}
                      {project.status === 'COMPLETED' && 'Завершен'}
                      {project.status === 'ON_HOLD' && 'Приостановлен'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Создан:</span>{' '}
                    {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Статистика</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass rounded p-4 text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {project.stages.length}
                    </div>
                    <div className="text-sm text-gray-600">Этапов</div>
                  </div>
                  <div className="glass rounded p-4 text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {project._count.documents}
                    </div>
                    <div className="text-sm text-gray-600">Документов</div>
                  </div>
                  <div className="glass rounded p-4 text-center">
                    <div className="text-2xl font-bold text-primary-600">
                      {project._count.photos}
                    </div>
                    <div className="text-sm text-gray-600">Фото</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Этапы проекта */}
          <ProjectStagesSection
            projectId={projectId}
            stages={project.stages}
            canEdit={canEdit}
            userRole={user.role}
          />
        </div>
      </div>
    </div>
  );
}

