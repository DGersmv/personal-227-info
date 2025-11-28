import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/objects/[id]/models/[modelId]/view
 * Получить файл для просмотра (IFC или glTF) - для встраивания в просмотрщик
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

    if (user.role === 'CUSTOMER') {
      if (object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этой модели' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этой модели' },
          { status: 403 }
        );
      }
    }

    // Проверить наличие файла для просмотра
    if (!model.viewableFilePath || !model.viewableFilename) {
      return NextResponse.json(
        { error: 'Файл для просмотра не загружен. Пожалуйста, загрузите IFC или glTF файл.' },
        { status: 404 }
      );
    }

    const filePath = join(process.cwd(), model.viewableFilePath);

    // Проверить существование файла
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Файл не найден на сервере' },
        { status: 404 }
      );
    }

    // Прочитать файл
    const fileBuffer = await readFile(filePath);

    // Определить MIME тип
    let mimeType = model.viewableMimeType || 'application/octet-stream';
    if (model.viewableFormat === 'IFC') {
      mimeType = 'application/ifc';
    } else if (model.viewableFormat === 'GLTF') {
      // glTF может быть .gltf (JSON) или .glb (binary)
      const ext = model.viewableFilename.toLowerCase().split('.').pop();
      mimeType = ext === 'glb' ? 'model/gltf-binary' : 'model/gltf+json';
    }

    // Вернуть файл с правильными заголовками для просмотра (не скачивания)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, max-age=3600', // Кеширование на 1 час
        'Access-Control-Allow-Origin': '*', // Для CORS при просмотре
      },
    });
  } catch (error) {
    console.error('Ошибка получения файла для просмотра:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

