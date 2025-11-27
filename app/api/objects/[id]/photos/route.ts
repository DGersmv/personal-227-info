import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/objects/[id]/photos - Получить фото объекта
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const objectId = parseInt(id);
    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    // Проверить доступ к объекту
    const object = await prisma.object.findUnique({
      where: { id: objectId },
      include: {
        assignments: true,
      },
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав доступа
    if (user.role === 'CUSTOMER') {
      if (object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('folderId');
    const stageId = searchParams.get('stageId');

    const where: any = {
      objectId: objectId,
    };

    if (folderId) {
      where.folderId = parseInt(folderId);
    }

    if (stageId) {
      where.stageId = parseInt(stageId);
    }

    // Для заказчика показываем только видимые фото
    if (user.role === 'CUSTOMER') {
      where.isVisibleToCustomer = true;
    }

    // Получить фото
    const photos = await prisma.photo.findMany({
      where,
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        stage: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });

    // Получить папки объекта
    const folders = await prisma.photoFolder.findMany({
      where: { objectId },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({ photos, folders });
  } catch (error) {
    console.error('Ошибка получения фото:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/objects/[id]/photos - Загрузить фото
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const objectId = parseInt(id);
    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    // Проверить доступ к объекту
    const object = await prisma.object.findUnique({
      where: { id: objectId },
      include: {
        assignments: true,
      },
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: Строитель и Заказчик могут загружать фото
    if (user.role !== 'BUILDER' && user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав для загрузки фото' },
        { status: 403 }
      );
    }

    // Проверка доступа к объекту
    if (user.role === 'CUSTOMER') {
      if (object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    } else if (user.role === 'BUILDER') {
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId');
    const stageId = formData.get('stageId');
    const isVisibleToCustomer = formData.get('isVisibleToCustomer') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    // Проверить тип файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Файл должен быть изображением' },
        { status: 400 }
      );
    }

    // Проверить размер файла (макс 10 MB)
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимальный размер: 10 MB' },
        { status: 400 }
      );
    }

    // TODO: Сохранить файл на сервер и создать миниатюру
    // Пока возвращаем успех без сохранения файла
    // В будущем нужно:
    // 1. Сохранить файл в public/uploads/objects/[id]/photos/
    // 2. Создать миниатюру
    // 3. Сохранить информацию в БД

    return NextResponse.json(
      { 
        message: 'Загрузка фото будет реализована в следующем шаге',
        error: 'Функционал загрузки файлов пока не реализован'
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Ошибка загрузки фото:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



