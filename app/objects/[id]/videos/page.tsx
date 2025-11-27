import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import VideosGallery from '@/components/VideosGallery';

export default async function ObjectVideosPage({
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
      assignments: true,
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

  const canUpload = user.role === 'DESIGNER' || user.role === 'BUILDER' || user.role === 'CUSTOMER' || user.role === 'ADMIN';

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
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2">Видео</h1>
              <p className="text-sm md:text-base text-gray-600">Объект: {object.title}</p>
            </div>
          </div>

          <VideosGallery objectId={objectId} userRole={user.role} canUpload={canUpload} />
        </div>
      </div>
    </div>
  );
}

