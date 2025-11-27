import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/portfolio - Получить портфолио текущего пользователя
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

    // Портфолио доступно для всех ролей

    // Получить или создать портфолио
    let portfolio = await prisma.portfolio.findUnique({
      where: { userId: user.id },
      include: {
        projects: {
          orderBy: { orderIndex: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Если портфолио не существует, создаем его
    if (!portfolio) {
      portfolio = await prisma.portfolio.create({
        data: {
          userId: user.id,
          title: user.name || 'Мое портфолио',
        },
        include: {
          projects: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }

    // Парсим JSON поля
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
        return {
          ...project,
          tags,
        };
      }),
    };

    return NextResponse.json({ portfolio: portfolioData });
  } catch (error) {
    console.error('Ошибка получения портфолио:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/portfolio - Обновить портфолио текущего пользователя
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Портфолио доступно для всех ролей

    const body = await request.json();
    const {
      title,
      description,
      bio,
      phone,
      website,
      socialLinks,
      avatarUrl,
      coverImageUrl,
      backgroundColor,
      isPublic,
      showEmail,
      showPhone,
    } = body;

    // Подготовка данных для обновления
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (bio !== undefined) updateData.bio = bio;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (socialLinks !== undefined) {
      updateData.socialLinks = typeof socialLinks === 'string' 
        ? socialLinks 
        : JSON.stringify(socialLinks);
    }
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
    if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (showEmail !== undefined) updateData.showEmail = showEmail;
    if (showPhone !== undefined) updateData.showPhone = showPhone;

    // Обновить или создать портфолио
    const portfolio = await prisma.portfolio.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
        title: title || user.name || 'Мое портфолио',
      },
      include: {
        projects: {
          orderBy: { orderIndex: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Парсим JSON поля для ответа
    let parsedSocialLinks = null;
    try {
      if (portfolio.socialLinks) {
        parsedSocialLinks = typeof portfolio.socialLinks === 'string' 
          ? JSON.parse(portfolio.socialLinks) 
          : portfolio.socialLinks;
      }
    } catch (e) {
      console.error('Ошибка парсинга socialLinks:', e);
    }

    const portfolioData = {
      ...portfolio,
      socialLinks: parsedSocialLinks,
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
        return {
          ...project,
          tags,
        };
      }),
    };

    return NextResponse.json({ portfolio: portfolioData });
  } catch (error) {
    console.error('Ошибка обновления портфолио:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

