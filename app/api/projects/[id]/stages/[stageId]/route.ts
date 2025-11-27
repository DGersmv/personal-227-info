import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/projects/[id]/stages/[stageId] - Получить этап
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id, stageId } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const stageIdNum = parseInt(stageId);
    if (isNaN(stageIdNum)) {
      return NextResponse.json(
        { error: 'Неверный ID этапа' },
        { status: 400 }
      );
    }

    // Получить этап
    const stage = await prisma.projectStage.findUnique({
      where: { id: stageIdNum },
      include: {
        project: {
          include: {
            object: {
              include: {
                assignments: true,
              },
            },
          },
        },
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    if (!stage) {
      return NextResponse.json(
        { error: 'Этап не найден' },
        { status: 404 }
      );
    }

    // Проверка прав доступа к проекту
    const object = stage.project.object;
    if (user.role === 'CUSTOMER') {
      if (object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому этапу' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому этапу' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ stage });
  } catch (error) {
    console.error('Ошибка получения этапа:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]/stages/[stageId] - Обновить этап
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id, stageId } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const stageIdNum = parseInt(stageId);
    if (isNaN(stageIdNum)) {
      return NextResponse.json(
        { error: 'Неверный ID этапа' },
        { status: 400 }
      );
    }

    // Получить этап
    const stage = await prisma.projectStage.findUnique({
      where: { id: stageIdNum },
      include: {
        project: {
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

    if (!stage) {
      return NextResponse.json(
        { error: 'Этап не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: Проектировщик может редактировать, Строитель может менять статус
    if (user.role === 'DESIGNER') {
      const assignment = await prisma.userObjectAssignment.findUnique({
        where: {
          userId_objectId: {
            userId: user.id,
            objectId: stage.project.objectId,
          },
        },
      });
      if (!assignment && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет прав для редактирования этапа' },
          { status: 403 }
        );
      }
    } else if (user.role === 'BUILDER') {
      // Строитель может только менять статус этапа
      const assignment = await prisma.userObjectAssignment.findUnique({
        where: {
          userId_objectId: {
            userId: user.id,
            objectId: stage.project.objectId,
          },
        },
      });
      if (!assignment && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет прав для редактирования этапа' },
          { status: 403 }
        );
      }
    } else if (user.role !== 'ADMIN' && user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { error: 'Нет прав для редактирования этапа' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, status, orderIndex } = body;

    // Строитель может менять только статус
    const updateData: any = {};
    if (user.role === 'DESIGNER' || user.role === 'ADMIN') {
      if (title) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    }
    if (status) updateData.status = status;

    // Обновить этап
    const updatedStage = await prisma.projectStage.update({
      where: { id: stageIdNum },
      data: updateData,
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    return NextResponse.json({ stage: updatedStage });
  } catch (error) {
    console.error('Ошибка обновления этапа:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]/stages/[stageId] - Удалить этап
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id, stageId } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const stageIdNum = parseInt(stageId);
    if (isNaN(stageIdNum)) {
      return NextResponse.json(
        { error: 'Неверный ID этапа' },
        { status: 400 }
      );
    }

    // Получить этап
    const stage = await prisma.projectStage.findUnique({
      where: { id: stageIdNum },
      include: {
        project: {
          include: {
            object: true,
          },
        },
      },
    });

    if (!stage) {
      return NextResponse.json(
        { error: 'Этап не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: только Проектировщик может удалять этапы
    if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Нет прав для удаления этапа' },
        { status: 403 }
      );
    }

    // Проектировщик должен быть назначен на объект
    if (user.role === 'DESIGNER') {
      const assignment = await prisma.userObjectAssignment.findUnique({
        where: {
          userId_objectId: {
            userId: user.id,
            objectId: stage.project.objectId,
          },
        },
      });
      if (!assignment && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет прав для удаления этапа' },
          { status: 403 }
        );
      }
    }

    // Удалить этап
    await prisma.projectStage.delete({
      where: { id: stageIdNum },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления этапа:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



