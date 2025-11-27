import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/search - Поиск пользователей по email или имени
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

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const role = searchParams.get('role'); // DESIGNER или BUILDER

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Минимум 2 символа для поиска' },
        { status: 400 }
      );
    }

    // Построить условие поиска
    // Для PostgreSQL используем ilike для case-insensitive поиска
    const where: any = {
      OR: [
        { email: { contains: query } },
        { name: { contains: query } },
      ],
      status: 'ACTIVE',
    };

    // Фильтр по роли, если указан
    if (role && (role === 'DESIGNER' || role === 'BUILDER')) {
      where.role = role;
    }

    // Найти пользователей
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      take: 10, // Ограничить до 10 результатов
      orderBy: { email: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Ошибка поиска пользователей:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

