import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/portfolio/projects - Получить проекты портфолио текущего пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Получить портфолио пользователя
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!portfolio) {
      return NextResponse.json({ projects: [] });
    }

    // Получить проекты портфолио
    const projects = await prisma.portfolioProject.findMany({
      where: { portfolioId: portfolio.id },
      orderBy: { orderIndex: 'asc' },
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
    const projectsData = projects.map((project) => ({
      ...project,
      tags: project.tags ? JSON.parse(project.tags) : [],
    }));

    return NextResponse.json({ projects: projectsData });
  } catch (error) {
    console.error('Ошибка получения проектов портфолио:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portfolio/projects - Создать проект в портфолио
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Только Проектировщик и Строитель могут добавлять проекты
    if (user.role !== 'DESIGNER' && user.role !== 'BUILDER' && user.role !== 'ADMIN') {
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
      projectId, // Опциональная связь с реальным проектом
      orderIndex,
      isVisible,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Название проекта обязательно' },
        { status: 400 }
      );
    }

    // Получить или создать портфолио
    let portfolio = await prisma.portfolio.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: {
          userId: user.id,
          title: user.name || 'Мое портфолио',
        },
        select: { id: true },
      });
    }

    // Определить порядок отображения
    let finalOrderIndex = orderIndex;
    if (finalOrderIndex === undefined || finalOrderIndex === null) {
      const maxOrder = await prisma.portfolioProject.findFirst({
        where: { portfolioId: portfolio.id },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });
      finalOrderIndex = maxOrder ? maxOrder.orderIndex + 1 : 0;
    }

    // Создать проект
    const project = await prisma.portfolioProject.create({
      data: {
        portfolioId: portfolio.id,
        projectId: projectId || null,
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        category: category || null,
        tags: tags ? JSON.stringify(tags) : null,
        orderIndex: finalOrderIndex,
        isVisible: isVisible !== undefined ? isVisible : true,
      },
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

    return NextResponse.json({ project: projectData }, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания проекта портфолио:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


