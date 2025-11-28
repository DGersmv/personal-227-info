import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * GET /api/objects/[id]/models/[modelId]/tree - Получить дерево параметров модели
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
    const bimModelId = parseInt(modelId);

    if (isNaN(objectId) || isNaN(bimModelId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта или модели' },
        { status: 400 }
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

    // Проверка существования модели
    const model = await prisma.bimModel.findFirst({
      where: {
        id: bimModelId,
        objectId: objectId,
      },
    });

    if (!model) {
      return NextResponse.json(
        { error: 'Модель не найдена' },
        { status: 404 }
      );
    }

    // Проверка видимости для заказчика
    if (user.role === 'CUSTOMER' && !model.isVisibleToCustomer) {
      return NextResponse.json(
        { error: 'Нет доступа к этой модели' },
        { status: 403 }
      );
    }

    // Путь к файлу дерева
    const treePath = join(
      process.cwd(),
      'uploads',
      'objects',
      objectId.toString(),
      'models',
      bimModelId.toString(),
      'tree.json'
    );

    // Проверка существования файла дерева
    if (!existsSync(treePath)) {
      return NextResponse.json(
        { error: 'Дерево параметров еще не сгенерировано' },
        { status: 404 }
      );
    }

    // Чтение и возврат дерева
    const treeContent = await readFile(treePath, 'utf-8');
    const tree = JSON.parse(treeContent);

    return NextResponse.json({ tree });
  } catch (error) {
    console.error('Ошибка получения дерева параметров:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/objects/[id]/models/[modelId]/tree - Удалить дерево параметров модели
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
    const bimModelId = parseInt(modelId);

    if (isNaN(objectId) || isNaN(bimModelId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта или модели' },
        { status: 400 }
      );
    }

    // Проверка доступа (только не-CUSTOMER могут удалять дерево)
    if (user.role === 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Нет прав на удаление дерева' },
        { status: 403 }
      );
    }

    // Путь к файлу дерева
    const treePath = join(
      process.cwd(),
      'uploads',
      'objects',
      objectId.toString(),
      'models',
      bimModelId.toString(),
      'tree.json'
    );

    // Удаление файла дерева
    const { unlink } = await import('fs/promises');
    if (existsSync(treePath)) {
      await unlink(treePath);
      return NextResponse.json({ message: 'Дерево параметров удалено' });
    } else {
      return NextResponse.json(
        { error: 'Дерево параметров не найдено' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Ошибка удаления дерева параметров:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

