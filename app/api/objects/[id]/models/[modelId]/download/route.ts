import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/objects/[id]/models/[modelId]/download?type=original|viewable
 * Скачать файл модели (исходный или для просмотра)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { id, modelId } = await params;
    const objectId = parseInt(id);
    const modelIdNum = parseInt(modelId);

    if (isNaN(objectId) || isNaN(modelIdNum)) {
      return NextResponse.json(
        { error: 'Неверный ID' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get('type') || 'original'; // 'original' или 'viewable'

    // Получить модель
    const model = await prisma.bimModel.findFirst({
      where: {
        id: modelIdNum,
        objectId: objectId,
        // Для заказчика показываем только видимые модели
        ...(user.role === 'CUSTOMER' ? { isVisibleToCustomer: true } : {}),
      },
      include: {
        object: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      );
    }

    // Проверка прав доступа к объекту
    const object = model.object;
    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // ВАЖНО: Заказчик может только просматривать модели, но НЕ скачивать их
    if (user.role === 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Заказчик может только просматривать модели, скачивание недоступно' },
        { status: 403 }
      );
    }

    // Проверка прав доступа к объекту для других ролей
    if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этой модели' },
          { status: 403 }
        );
      }
    }

    // Определить какой файл скачивать
    let filePath: string;
    let filename: string;
    let mimeType: string;

    if (fileType === 'viewable') {
      if (!model.viewableFilePath || !model.viewableFilename) {
        return NextResponse.json(
          { error: 'Файл для просмотра не найден' },
          { status: 404 }
        );
      }
      filePath = join(process.cwd(), model.viewableFilePath);
      filename = model.viewableFilename;
      mimeType = model.viewableMimeType || 'application/octet-stream';
    } else {
      // original
      if (!model.originalFilePath) {
        return NextResponse.json(
          { error: 'Исходный файл не найден' },
          { status: 404 }
        );
      }
      filePath = join(process.cwd(), model.originalFilePath);
      filename = model.originalFilename;
      mimeType = model.originalMimeType || 'application/octet-stream';
    }

    // Проверить существование файла
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Файл не найден на сервере' },
        { status: 404 }
      );
    }

    // Прочитать файл
    const fileBuffer = await readFile(filePath);

    // Вернуть файл с правильными заголовками
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Ошибка скачивания файла:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

