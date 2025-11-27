import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUser } from '@/lib/roles';

/**
 * GET /api/projects/[id] - Получить проект по ID
 */
export async function GET(
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

    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Неверный ID проекта' },
        { status: 400 }
      );
    }

    // Получить проект
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        object: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
        },
        stages: {
          orderBy: { orderIndex: 'asc' },
          include: {
            _count: {
              select: {
                photos: true,
              },
            },
          },
        },
        _count: {
          select: {
            documents: true,
            photos: true,
            messages: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав доступа к объекту
    const object = project.object;
    if (user.role === 'CUSTOMER') {
      if (object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому проекту' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому проекту' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Ошибка получения проекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id] - Обновить проект
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

    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Неверный ID проекта' },
        { status: 400 }
      );
    }

    // Получить проект
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        object: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: только Проектировщик может редактировать проекты
    if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Нет прав для редактирования проекта' },
        { status: 403 }
      );
    }

    // Проектировщик должен быть назначен на объект
    if (user.role === 'DESIGNER') {
      const assignment = await prisma.userObjectAssignment.findUnique({
        where: {
          userId_objectId: {
            userId: user.id,
            objectId: project.objectId,
          },
        },
      });
      if (!assignment && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет прав для редактирования проекта' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { title, description, status } = body;

    // Обновить проект
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
      include: {
        object: {
          select: {
            id: true,
            title: true,
          },
        },
        stages: {
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: {
            documents: true,
            photos: true,
            messages: true,
          },
        },
      },
    });

    return NextResponse.json({ project: updatedProject });
  } catch (error) {
    console.error('Ошибка обновления проекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id] - Удалить проект
 */
export async function DELETE(
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

    const projectId = parseInt(id);
    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Неверный ID проекта' },
        { status: 400 }
      );
    }

    // Получить проект
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        object: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: только Проектировщик или Админ может удалять
    if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Нет прав для удаления проекта' },
        { status: 403 }
      );
    }

    // Проектировщик должен быть назначен на объект
    if (user.role === 'DESIGNER') {
      const assignment = await prisma.userObjectAssignment.findUnique({
        where: {
          userId_objectId: {
            userId: user.id,
            objectId: project.objectId,
          },
        },
      });
      if (!assignment && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет прав для удаления проекта' },
          { status: 403 }
        );
      }
    }

    // Удалить проект
    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления проекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



