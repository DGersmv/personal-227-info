import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { join } from 'path';

/**
 * GET /api/files/videos/[objectId]/[filename] - Получить видео файл
 * Защищенный доступ: проверка прав пользователя
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectId: string; filename: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { objectId: objectIdStr, filename } = await params;
    const objectId = parseInt(objectIdStr);

    if (isNaN(objectId) || !filename) {
      return NextResponse.json(
        { error: 'Неверные параметры' },
        { status: 400 }
      );
    }

    // Найти видео в БД
    const video = await prisma.video.findFirst({
      where: {
        objectId: objectId,
        filename: filename,
      },
      include: {
        object: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!video) {
      return NextResponse.json(
        { error: 'Видео не найдено' },
        { status: 404 }
      );
    }

    // Проверить доступ к объекту
    if (user.role === 'CUSTOMER') {
      if (video.object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = video.object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    }

    // Проверить видимость видео для заказчика
    if (user.role === 'CUSTOMER' && !video.isVisibleToCustomer) {
      return NextResponse.json(
        { error: 'Видео не видно заказчику' },
        { status: 403 }
      );
    }

    // Путь к файлу в защищенном хранилище
    const filePath = join(process.cwd(), 'uploads', 'objects', objectId.toString(), 'videos', filename);

    // Проверить существование файла
    const { existsSync } = await import('fs');
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 404 }
      );
    }

    // Прочитать файл и вернуть его
    const { readFile } = await import('fs/promises');
    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': video.mimeType,
        'Content-Disposition': `inline; filename="${video.originalName}"`,
        'Content-Length': video.fileSize.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('Ошибка получения видео:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


