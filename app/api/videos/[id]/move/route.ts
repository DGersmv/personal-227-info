import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/videos/[id]/move - Переместить видео в папку
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

    const videoId = parseInt(id);
    if (isNaN(videoId)) {
      return NextResponse.json(
        { error: 'Неверный ID видео' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { folderId } = body; // null означает "Все"

    // Найти видео
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        object: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!video || !video.object) {
      return NextResponse.json(
        { error: 'Видео не найдено' },
        { status: 404 }
      );
    }

    // Проверка прав доступа к объекту
    if (user.role === 'CUSTOMER') {
      if (video.object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому видео' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = video.object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому видео' },
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

      if (!folder || folder.objectId !== video.objectId) {
        return NextResponse.json(
          { error: 'Папка не найдена' },
          { status: 404 }
        );
      }
    }

    // Обновить видео
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
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

    return NextResponse.json({ video: updatedVideo });
  } catch (error) {
    console.error('Ошибка перемещения видео:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


