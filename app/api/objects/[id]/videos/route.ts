import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/objects/[id]/videos - Получить видео объекта
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

    // Для заказчика показываем только видимые видео
    if (user.role === 'CUSTOMER') {
      where.isVisibleToCustomer = true;
    }

    // Получить видео
    const videos = await prisma.video.findMany({
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

    // Получить папки объекта (те же, что и для фото)
    const folders = await prisma.photoFolder.findMany({
      where: { objectId },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({ videos, folders });
  } catch (error) {
    console.error('Ошибка получения видео:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/objects/[id]/videos - Загрузить видео
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

    // Проверка прав: Проектировщик, Строитель и Заказчик могут загружать видео
    if (user.role !== 'DESIGNER' && user.role !== 'BUILDER' && user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав для загрузки видео' },
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
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    }

    const formData = await request.formData();
    const folderId = formData.get('folderId');
    const stageId = formData.get('stageId');
    const isVisibleToCustomer = formData.get('isVisibleToCustomer') === 'true';

    // Поддержка множественной загрузки
    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;
    
    const allFiles: File[] = [];
    if (singleFile) {
      allFiles.push(singleFile);
    }
    allFiles.push(...files);

    if (allFiles.length === 0) {
      return NextResponse.json(
        { error: 'Файлы не предоставлены' },
        { status: 400 }
      );
    }

    // Создать директорию для видео объекта
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');
    const { existsSync } = await import('fs');
    
    const uploadsDir = join(process.cwd(), 'uploads', 'objects', objectId.toString(), 'videos');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const maxSize = 500 * 1024 * 1024; // 500 MB для видео
    const uploadedVideos = [];

    // Обработать каждый файл
    for (const file of allFiles) {
      // Проверить тип файла (только видео)
      if (!file.type.startsWith('video/')) {
        continue; // Пропускаем не-видео
      }

      // Проверить размер файла
      if (file.size > maxSize) {
        continue; // Пропускаем слишком большие файлы
      }

      // Генерировать уникальное имя файла
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const originalName = file.name;
      const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'mp4';
      const filename = `${timestamp}-${randomStr}.${fileExtension}`;
      const filePath = join(uploadsDir, filename);

      // Сохранить файл
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // URL для доступа к файлу через API
      const url = `/api/files/videos/${objectId}/${filename}`;

      // Сохранить информацию о видео в БД
      const video = await prisma.video.create({
        data: {
          objectId: objectId,
          filename: filename,
          originalName: originalName,
          filePath: url,
          fileSize: file.size,
          mimeType: file.type,
          isVisibleToCustomer: isVisibleToCustomer,
          uploadedByUserId: user.id,
          folderId: folderId ? parseInt(folderId as string) : null,
          stageId: stageId ? parseInt(stageId as string) : null,
        },
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
      });

      uploadedVideos.push(video);
    }

    return NextResponse.json({
      success: true,
      videos: uploadedVideos,
      count: uploadedVideos.length,
    });
  } catch (error) {
    console.error('Ошибка загрузки видео:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


