import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

/**
 * POST /api/objects/[id]/models/[modelId]/tree/save - Сохранить дерево параметров на сервере
 */
export async function POST(
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

    // Получение дерева из тела запроса
    const body = await request.json();
    const tree = body.tree;

    if (!tree) {
      return NextResponse.json(
        { error: 'Дерево параметров не предоставлено' },
        { status: 400 }
      );
    }

    // Сохранение дерева в JSON файл
    const treeDir = join(
      process.cwd(),
      'uploads',
      'objects',
      objectId.toString(),
      'models',
      bimModelId.toString()
    );

    // Создание директории, если не существует
    await mkdir(treeDir, { recursive: true });

    const treePath = join(treeDir, 'tree.json');
    await writeFile(treePath, JSON.stringify(tree, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Дерево параметров успешно сохранено',
    });
  } catch (error) {
    console.error('Ошибка сохранения дерева параметров:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

