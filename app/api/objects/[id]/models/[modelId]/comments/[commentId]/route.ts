import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string; commentId: string }> }
) {
  try {
    const { id: objectId, modelId, commentId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем доступ к объекту
    const object = await prisma.object.findFirst({
      where: {
        id: parseInt(objectId),
      },
      include: {
        assignments: true,
      },
    });

    if (!object) {
      return NextResponse.json({ error: 'Объект не найден' }, { status: 404 });
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

    // Проверяем существование комментария
    const comment = await prisma.bimModelComment.findFirst({
      where: {
        id: parseInt(commentId),
        bimModelId: parseInt(modelId),
      },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Комментарий не найден' }, { status: 404 });
    }

    // Проверяем права на удаление (только автор или админ)
    if (comment.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Нет прав на удаление комментария' },
        { status: 403 }
      );
    }

    // Удаляем комментарий
    await prisma.bimModelComment.delete({
      where: {
        id: parseInt(commentId),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка удаления комментария:', error);
    return NextResponse.json(
      { error: 'Ошибка удаления комментария' },
      { status: 500 }
    );
  }
}

