import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/videos/[id]/visibility - Изменить видимость видео для заказчика
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
    const { isVisibleToCustomer } = body;

    if (typeof isVisibleToCustomer !== 'boolean') {
      return NextResponse.json(
        { error: 'isVisibleToCustomer должен быть boolean' },
        { status: 400 }
      );
    }

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

    // Обновить видимость
    const updatedVideo = await prisma.video.update({
      where: { id: videoId },
      data: {
        isVisibleToCustomer: isVisibleToCustomer,
      },
    });

    return NextResponse.json({ video: updatedVideo });
  } catch (error) {
    console.error('Ошибка изменения видимости видео:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

