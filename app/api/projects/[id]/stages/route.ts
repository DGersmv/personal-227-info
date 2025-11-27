import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUser } from '@/lib/roles';

/**
 * GET /api/projects/[id]/stages - Получить этапы проекта
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

    // Получить проект и проверить доступ
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        object: {
          include: {
            assignments: true,
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

    // Проверка прав доступа
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

    // Получить этапы
    const stages = await prisma.projectStage.findMany({
      where: { projectId },
      orderBy: { orderIndex: 'asc' },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    return NextResponse.json({ stages });
  } catch (error) {
    console.error('Ошибка получения этапов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/stages - Создать новый этап
 */
export async function POST(
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

    // Получить проект и проверить доступ
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        object: {
          include: {
            assignments: true,
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

    // Проверка прав: только Проектировщик может создавать этапы
    if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав для создания этапа' },
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
          { error: 'Нет прав для создания этапа' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { title, description } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Название этапа обязательно' },
        { status: 400 }
      );
    }

    // Получить максимальный orderIndex
    const maxStage = await prisma.projectStage.findFirst({
      where: { projectId },
      orderBy: { orderIndex: 'desc' },
    });

    const orderIndex = maxStage ? maxStage.orderIndex + 1 : 0;

    // Создать этап
    const stage = await prisma.projectStage.create({
      data: {
        title,
        description: description || null,
        projectId,
        orderIndex,
        status: 'PENDING',
      },
      include: {
        _count: {
          select: {
            photos: true,
          },
        },
      },
    });

    return NextResponse.json({ stage }, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания этапа:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



