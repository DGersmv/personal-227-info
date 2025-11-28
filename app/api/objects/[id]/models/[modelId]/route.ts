import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/objects/[id]/models/[modelId] - Получить информацию о модели
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
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
        stage: {
          select: {
            id: true,
            title: true,
          },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
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

    // Проверка доступа к объекту
    const object = await prisma.object.findFirst({
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

    return NextResponse.json({ model });
  } catch (error) {
    console.error('Ошибка получения модели:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/objects/[id]/models/[modelId] - Удалить модель
 */
export async function DELETE(
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
      },
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      );
    }

    // Только автор модели или админ может удалить
    if (model.uploadedByUserId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления модели' },
        { status: 403 }
      );
    }

    // Удалить файлы
    const modelsDir = join(process.cwd(), 'uploads', 'objects', objectId.toString(), 'models');
    
    if (model.originalFilePath) {
      const originalFilePath = join(process.cwd(), model.originalFilePath);
      if (existsSync(originalFilePath)) {
        const { unlink } = await import('fs/promises');
        await unlink(originalFilePath);
      }
    }

    if (model.viewableFilePath) {
      const viewableFilePath = join(process.cwd(), model.viewableFilePath);
      if (existsSync(viewableFilePath)) {
        const { unlink } = await import('fs/promises');
        await unlink(viewableFilePath);
      }
    }

    // Удалить из БД
    await prisma.bimModel.delete({
      where: { id: modelIdNum },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления модели:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления модели' },
      { status: 500 }
    );
  }
}

