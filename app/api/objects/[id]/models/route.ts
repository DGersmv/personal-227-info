import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { generateIFCTree } from '@/lib/generateIFCTree';

/**
 * GET /api/objects/[id]/models - Получить список 3D моделей объекта
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const objectId = parseInt(id);

    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
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

    // Получить модели
    const models = await prisma.bimModel.findMany({
      where: {
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
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Ошибка получения моделей:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/objects/[id]/models - Загрузить 3D модель
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Только проектировщики и админы могут загружать модели
    if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав. Только проектировщики могут загружать модели.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const objectId = parseInt(id);

    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
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

    const formData = await request.formData();
    const originalFile = formData.get('originalFile') as File;
    const viewableFile = formData.get('viewableFile') as File | null;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const version = formData.get('version') as string | null;
    const projectId = formData.get('projectId') as string | null;
    const stageId = formData.get('stageId') as string | null;
    const isVisibleToCustomer = formData.get('isVisibleToCustomer') === 'true';

    if (!originalFile) {
      return NextResponse.json(
        { error: 'Исходный файл обязателен' },
        { status: 400 }
      );
    }

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'Название модели обязательно' },
        { status: 400 }
      );
    }

    // Проверка размера файлов (макс 500 MB для исходного, 200 MB для просматриваемого)
    const maxOriginalSize = 500 * 1024 * 1024; // 500 MB
    const maxViewableSize = 200 * 1024 * 1024; // 200 MB

    if (originalFile.size > maxOriginalSize) {
      return NextResponse.json(
        { error: 'Исходный файл слишком большой. Максимальный размер: 500 MB' },
        { status: 400 }
      );
    }

    if (viewableFile && viewableFile.size > maxViewableSize) {
      return NextResponse.json(
        { error: 'Файл для просмотра слишком большой. Максимальный размер: 200 MB' },
        { status: 400 }
      );
    }

    // Определить формат исходного файла
    const getFormatFromExtension = (filename: string): string => {
      const ext = filename.toLowerCase().split('.').pop();
      const formatMap: Record<string, string> = {
        'skp': 'SKETCHUP',
        'rvt': 'REVIT',
        'pln': 'ARCHICAD',
        'pla': 'ARCHICAD',
        'ifc': 'IFC',
        'gltf': 'GLTF',
        'glb': 'GLTF',
        'obj': 'OBJ',
        '3ds': 'THREE_DS',
      };
      return formatMap[ext || ''] || 'OTHER';
    };

    const originalFormat = getFormatFromExtension(originalFile.name);

    // Проверить формат файла для просмотра (должен быть IFC или GLTF)
    let viewableFormat: string | null = null;
    if (viewableFile) {
      const viewableExt = viewableFile.name.toLowerCase().split('.').pop();
      if (viewableExt === 'ifc') {
        viewableFormat = 'IFC';
      } else if (viewableExt === 'gltf' || viewableExt === 'glb') {
        viewableFormat = 'GLTF';
      } else {
        return NextResponse.json(
          { error: 'Файл для просмотра должен быть в формате IFC или glTF/glB' },
          { status: 400 }
        );
      }
    }

    // Создать директорию для модели
    const modelsDir = join(process.cwd(), 'uploads', 'objects', objectId.toString(), 'models');
    if (!existsSync(modelsDir)) {
      await mkdir(modelsDir, { recursive: true });
    }

    // Создать запись в БД сначала, чтобы получить ID
    const model = await prisma.bimModel.create({
      data: {
        objectId: objectId,
        projectId: projectId ? parseInt(projectId) : null,
        stageId: stageId ? parseInt(stageId) : null,
        name: name.trim(),
        description: description?.trim() || null,
        version: version?.trim() || null,
        originalFilename: originalFile.name,
        originalFilePath: '', // Заполним после сохранения
        originalFileSize: originalFile.size,
        originalMimeType: originalFile.type || 'application/octet-stream',
        originalFormat: originalFormat as any,
        viewableFilename: viewableFile ? viewableFile.name : null,
        viewableFilePath: null,
        viewableFileSize: viewableFile ? viewableFile.size : null,
        viewableMimeType: viewableFile ? viewableFile.type || 'application/octet-stream' : null,
        viewableFormat: viewableFormat as any,
        isVisibleToCustomer,
        uploadedByUserId: user.id,
      },
    });

    // Сохранить исходный файл
    const originalFileExt = originalFile.name.split('.').pop();
    const originalFilename = `${model.id}-original.${originalFileExt}`;
    const originalFilePath = join(modelsDir, originalFilename);
    const originalBytes = await originalFile.arrayBuffer();
    const originalBuffer = Buffer.from(originalBytes);
    await writeFile(originalFilePath, originalBuffer);

    // Сохранить файл для просмотра, если есть
    let viewableFilePath: string | null = null;
    if (viewableFile) {
      const viewableFileExt = viewableFile.name.split('.').pop();
      const viewableFilename = `${model.id}-viewable.${viewableFileExt}`;
      viewableFilePath = join(modelsDir, viewableFilename);
      const viewableBytes = await viewableFile.arrayBuffer();
      const viewableBuffer = Buffer.from(viewableBytes);
      await writeFile(viewableFilePath, viewableBuffer);
    }

    // Обновить пути в БД
    const viewableFileName = viewableFilePath ? viewableFilePath.split(/[/\\]/).pop() : null;
    const updatedModel = await prisma.bimModel.update({
      where: { id: model.id },
      data: {
        originalFilePath: `uploads/objects/${objectId}/models/${originalFilename}`,
        viewableFilePath: viewableFileName
          ? `uploads/objects/${objectId}/models/${viewableFileName}`
          : null,
      },
      include: {
        uploadedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Дерево параметров будет сгенерировано на клиенте при первом открытии модели

    return NextResponse.json({
      success: true,
      model: updatedModel,
    });
  } catch (error) {
    console.error('Ошибка загрузки модели:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки модели' },
      { status: 500 }
    );
  }
}

