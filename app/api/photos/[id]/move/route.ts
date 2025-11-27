import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/photos/[id]/move - Переместить фото в папку
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const photoId = parseInt(id);
    if (isNaN(photoId)) {
      return NextResponse.json(
        { error: 'Неверный ID фото' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { folderId } = body; // null означает "Все"

    // Найти фото
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        object: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!photo || !photo.object) {
      return NextResponse.json(
        { error: 'Фото не найдено' },
        { status: 404 }
      );
    }

    // Проверка прав доступа к объекту
    if (user.role === 'CUSTOMER') {
      if (photo.object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому фото' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = photo.object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому фото' },
          { status: 403 }
        );
      }
    }

    // Проверить папку, если указана
    if (folderId !== null && folderId !== undefined) {
      const folderIdNum = parseInt(folderId);
      if (isNaN(folderIdNum)) {
        return NextResponse.json(
          { error: 'Неверный ID папки' },
          { status: 400 }
        );
      }

      const folder = await prisma.photoFolder.findUnique({
        where: { id: folderIdNum },
      });

      if (!folder || folder.objectId !== photo.objectId) {
        return NextResponse.json(
          { error: 'Папка не найдена' },
          { status: 404 }
        );
      }
    }

    // Обновить фото
    const updatedPhoto = await prisma.photo.update({
      where: { id: photoId },
      data: {
        folderId: folderId === null || folderId === undefined ? null : parseInt(folderId),
      },
      include: {
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ photo: updatedPhoto });
  } catch (error) {
    console.error('Ошибка перемещения фото:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

