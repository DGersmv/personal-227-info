import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/files/photos/[objectId]/[filename] - Получить фото с проверкой прав доступа
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

    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    // Получить фото из БД
    const photo = await prisma.photo.findFirst({
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

    if (!photo) {
      return NextResponse.json(
        { error: 'Фото не найдено' },
        { status: 404 }
      );
    }

    // Проверка прав доступа к объекту
    const object = photo.object;
    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав доступа
    if (user.role === 'CUSTOMER') {
      // Заказчик может видеть только свои объекты и только видимые фото
      if (object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому фото' },
          { status: 403 }
        );
      }
      if (!photo.isVisibleToCustomer) {
        return NextResponse.json(
          { error: 'Нет доступа к этому фото' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      // Проектировщик и строитель могут видеть фото объектов, к которым назначены
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому фото' },
          { status: 403 }
        );
      }
    }
    // ADMIN имеет доступ ко всем фото

    // Путь к файлу (вне public/)
    const filePath = join(process.cwd(), 'uploads', 'objects', objectId.toString(), 'photos', filename);

    // Проверить существование файла
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 404 }
      );
    }

    // Прочитать файл
    const fileBuffer = await readFile(filePath);

    // Определить MIME тип
    const mimeType = photo.mimeType || 'image/jpeg';

    // Вернуть файл с правильными заголовками
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Кеширование на 1 час
      },
    });
  } catch (error) {
    console.error('Ошибка получения фото:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


