import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { canUser } from '@/lib/roles';

export default async function ObjectProjectsPage({
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

  // Получить объект и проверить доступ
  const object = await prisma.object.findUnique({
    where: { id: objectId },
    include: {
      projects: {
        include: {
          _count: {
            select: {
              stages: true,
              documents: true,
              photos: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!object) {
    redirect('/objects');
  }

  // Проверка прав доступа
  if (user.role === 'CUSTOMER') {
    if (object.userId !== user.id) {
      redirect('/objects');
    }
  } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
    const assignment = await prisma.userObjectAssignment.findUnique({
      where: {
        userId_objectId: {
          userId: user.id,
          objectId: object.id,
        },
      },
    });
    if (!assignment && user.role !== 'ADMIN') {
      redirect('/objects');
    }
  }

  const canCreateProject = canUser(user, 'project', 'create');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <Link
              href={`/objects/${objectId}`}
              className="text-primary-600 hover:underline mb-4 inline-block"
            >
              ← Назад к объекту
            </Link>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold mb-2">Проекты</h1>
                <p className="text-gray-600">Объект: {object.title}</p>
              </div>
              {canCreateProject && (
                <Link
                  href={`/objects/${objectId}/projects/new`}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  + Создать проект
                </Link>
              )}
            </div>
          </div>

          {object.projects.length === 0 ? (
            <div className="glass rounded-lg p-12 text-center">
              <p className="text-gray-600 text-lg mb-4">
                На этом объекте пока нет проектов
              </p>
              {canCreateProject && (
                <Link
                  href={`/objects/${objectId}/projects/new`}
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-block"
                >
                  Создать первый проект
                </Link>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {object.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="glass rounded-lg p-6 hover:bg-white/20 transition block"
                >
                  <h2 className="text-xl font-semibold mb-2">{project.title}</h2>
                  {project.description && (
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Этапов: {project._count.stages}</span>
                    <span>Документов: {project._count.documents}</span>
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



