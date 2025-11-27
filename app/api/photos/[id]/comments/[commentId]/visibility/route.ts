import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/photos/[id]/comments/[commentId]/visibility - Изменить видимость комментария
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id, commentId } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const photoId = parseInt(id);
    const commentIdNum = parseInt(commentId);

    if (isNaN(photoId) || isNaN(commentIdNum)) {
      return NextResponse.json(
        { error: 'Неверные параметры' },
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

    // Найти комментарий
    const comment = await prisma.photoComment.findUnique({
      where: { id: commentIdNum },
      include: {
        photo: {
          include: {
            object: {
              include: {
                assignments: true,
              },
            },
          },
        },
      },
    });

    if (!comment || comment.photoId !== photoId) {
      return NextResponse.json(
        { error: 'Комментарий не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: можно изменить свой комментарий или быть админом
    if (comment.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Нет прав на изменение этого комментария' },
        { status: 403 }
      );
    }

    // Обновить видимость
    const updatedComment = await prisma.photoComment.update({
      where: { id: commentIdNum },
      data: {
        isVisibleToCustomer: isVisibleToCustomer,
      },
    });

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error('Ошибка изменения видимости комментария:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

