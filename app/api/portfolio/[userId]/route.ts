import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/portfolio/[userId] - Получить портфолио конкретного пользователя
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { userId } = await params;
    const targetUserId = parseInt(userId);

    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { error: 'Неверный ID пользователя' },
        { status: 400 }
      );
    }

    // Получить портфолио
    const portfolio = await prisma.portfolio.findUnique({
      where: { userId: targetUserId },
      include: {
        projects: {
          where: { isPublished: true },
          orderBy: { orderIndex: 'asc' },
          take: 3, // Показываем только первые 3 проекта в карточке
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Если портфолио не существует, возвращаем null (не ошибку)
    if (!portfolio) {
      return NextResponse.json({ portfolio: null });
    }

    // Проверка прав доступа: если портфолио не публичное, показываем только владельцу
    if (!portfolio.isPublic && portfolio.userId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Портфолио недоступно' },
        { status: 403 }
      );
    }

    // Парсинг JSON полей
    let socialLinks = null;
    try {
      if (portfolio.socialLinks) {
        socialLinks = typeof portfolio.socialLinks === 'string'
          ? JSON.parse(portfolio.socialLinks)
          : portfolio.socialLinks;
      }
    } catch (e) {
      console.error('Ошибка парсинга socialLinks:', e);
    }

    const portfolioData = {
      ...portfolio,
      socialLinks,
      projects: portfolio.projects.map((project) => {
        let tags = [];
        try {
          if (project.tags) {
            tags = typeof project.tags === 'string'
              ? JSON.parse(project.tags)
              : project.tags;
          }
        } catch (e) {
          console.error('Ошибка парсинга tags:', e);
        }
        return { ...project, tags };
      }),
    };

    return NextResponse.json({ portfolio: portfolioData });
  } catch (error: any) {
    console.error('Ошибка получения портфолио:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


