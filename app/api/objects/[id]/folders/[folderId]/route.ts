import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/objects/[id]/folders/[folderId] - Обновить папку
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id, folderId } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const objectId = parseInt(id);
    const folderIdNum = parseInt(folderId);

    if (isNaN(objectId) || isNaN(folderIdNum)) {
      return NextResponse.json(
        { error: 'Неверные параметры' },
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

    const body = await request.json();
    const { name, orderIndex } = body;

    // Найти папку
    const folder = await prisma.photoFolder.findUnique({
      where: { id: folderIdNum },
    });

    if (!folder || folder.objectId !== objectId) {
      return NextResponse.json(
        { error: 'Папка не найдена' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Название папки не может быть пустым' },
          { status: 400 }
        );
      }

      // Проверить, нет ли уже папки с таким именем
      const existingFolder = await prisma.photoFolder.findFirst({
        where: {
          objectId,
          name: name.trim(),
          id: { not: folderIdNum },
        },
      });

      if (existingFolder) {
        return NextResponse.json(
          { error: 'Папка с таким именем уже существует' },
          { status: 400 }
        );
      }

      updateData.name = name.trim();
    }

    if (orderIndex !== undefined) {
      updateData.orderIndex = parseInt(orderIndex);
    }

    // Обновить папку
    const updatedFolder = await prisma.photoFolder.update({
      where: { id: folderIdNum },
      data: updateData,
      include: {
        _count: {
          select: {
            photos: true,
            videos: true,
          },
        },
      },
    });

    return NextResponse.json({ folder: updatedFolder });
  } catch (error) {
    console.error('Ошибка обновления папки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/objects/[id]/folders/[folderId] - Удалить папку
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id, folderId } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const objectId = parseInt(id);
    const folderIdNum = parseInt(folderId);

    if (isNaN(objectId) || isNaN(folderIdNum)) {
      return NextResponse.json(
        { error: 'Неверные параметры' },
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

    // Найти папку
    const folder = await prisma.photoFolder.findUnique({
      where: { id: folderIdNum },
    });

    if (!folder || folder.objectId !== objectId) {
      return NextResponse.json(
        { error: 'Папка не найдена' },
        { status: 404 }
      );
    }

    // При удалении папки все фото/видео переходят в "Все" (folderId = null)
    await prisma.photo.updateMany({
      where: { folderId: folderIdNum },
      data: { folderId: null },
    });

    await prisma.video.updateMany({
      where: { folderId: folderIdNum },
      data: { folderId: null },
    });

    // Удалить папку
    await prisma.photoFolder.delete({
      where: { id: folderIdNum },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления папки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


