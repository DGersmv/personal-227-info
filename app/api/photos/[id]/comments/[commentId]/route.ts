import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/photos/[id]/comments/[commentId] - Удалить комментарий
 */
export async function DELETE(
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

    if (!comment) {
      return NextResponse.json(
        { error: 'Комментарий не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: можно удалить свой комментарий или быть админом
    if (comment.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Нет прав на удаление этого комментария' },
        { status: 403 }
      );
    }

    // Удалить комментарий
    await prisma.photoComment.delete({
      where: { id: commentIdNum },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления комментария:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

