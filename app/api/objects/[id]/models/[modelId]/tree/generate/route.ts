import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateIFCTree } from '@/lib/generateIFCTree';

/**
 * POST /api/objects/[id]/models/[modelId]/tree/generate - Сгенерировать дерево параметров IFC модели
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

    // Только проектировщики и админы могут генерировать дерево
    if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
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

    // Проверка прав доступа к объекту
    const hasAccess = object.assignments.some((a) => a.userId === user.id);
    if (!hasAccess && object.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Нет доступа к этому объекту' },
        { status: 403 }
      );
    }

    // Получение модели
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

    // Проверка, что модель в формате IFC
    if (model.viewableFormat !== 'IFC' && model.originalFormat !== 'IFC') {
      return NextResponse.json(
        { error: 'Дерево параметров можно генерировать только для IFC моделей' },
        { status: 400 }
      );
    }

    // Путь к IFC файлу
    const ifcFilePath = model.viewableFilePath || model.originalFilePath;
    if (!ifcFilePath) {
      return NextResponse.json(
        { error: 'IFC файл не найден' },
        { status: 404 }
      );
    }

    // Генерация дерева параметров
    const tree = await generateIFCTree(objectId, bimModelId, ifcFilePath);

    return NextResponse.json({
      success: true,
      message: 'Дерево параметров успешно сгенерировано',
      tree: tree,
    });
  } catch (error: any) {
    console.error('Ошибка генерации дерева параметров:', error);
    return NextResponse.json(
      {
        error: 'Ошибка генерации дерева параметров',
        details: error?.message || 'Неизвестная ошибка',
      },
      { status: 500 }
    );
  }
}

