import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/portfolio/projects/[id] - Получить проект портфолио
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const projectId = parseInt(params.id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Неверный ID проекта' },
        { status: 400 }
      );
    }

    // Получить проект
    const project = await prisma.portfolioProject.findUnique({
      where: { id: projectId },
      include: {
        portfolio: {
          select: { userId: true },
        },
        project: {
          select: {
            id: true,
            name: true,
            description: true,
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

    // Проверить права доступа (только владелец портфолио)
    if (project.portfolio.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Парсим JSON поля
    const projectData = {
      ...project,
      tags: project.tags ? JSON.parse(project.tags) : [],
    };

    return NextResponse.json({ project: projectData });
  } catch (error) {
    console.error('Ошибка получения проекта портфолио:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/portfolio/projects/[id] - Обновить проект портфолио
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const projectId = parseInt(params.id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Неверный ID проекта' },
        { status: 400 }
      );
    }

    // Получить проект и проверить права
    const existingProject = await prisma.portfolioProject.findUnique({
      where: { id: projectId },
      include: {
        portfolio: {
          select: { userId: true },
        },
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Проверить права доступа
    if (existingProject.portfolio.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      imageUrl,
      category,
      tags,
      projectId: linkedProjectId,
      orderIndex,
      isVisible,
    } = body;

    // Подготовка данных для обновления
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) {
      updateData.tags = typeof tags === 'string' ? tags : JSON.stringify(tags);
    }
    if (linkedProjectId !== undefined) updateData.projectId = linkedProjectId || null;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (isVisible !== undefined) updateData.isVisible = isVisible;

    // Обновить проект
    const project = await prisma.portfolioProject.update({
      where: { id: projectId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Парсим JSON поля
    const projectData = {
      ...project,
      tags: project.tags ? JSON.parse(project.tags) : [],
    };

    return NextResponse.json({ project: projectData });
  } catch (error) {
    console.error('Ошибка обновления проекта портфолио:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/portfolio/projects/[id] - Удалить проект портфолио
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const projectId = parseInt(params.id);

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: 'Неверный ID проекта' },
        { status: 400 }
      );
    }

    // Получить проект и проверить права
    const existingProject = await prisma.portfolioProject.findUnique({
      where: { id: projectId },
      include: {
        portfolio: {
          select: { userId: true },
        },
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Проект не найден' },
        { status: 404 }
      );
    }

    // Проверить права доступа
    if (existingProject.portfolio.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ запрещен' },
        { status: 403 }
      );
    }

    // Удалить проект
    await prisma.portfolioProject.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления проекта портфолио:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


