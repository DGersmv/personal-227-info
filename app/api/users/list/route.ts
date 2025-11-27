import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/list - Получить список всех пользователей (заказчиков, проектировщиков, строителей)
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
    const role = searchParams.get('role'); // Опциональный фильтр по роли

    // Построить условие поиска
    const where: any = {
      status: 'ACTIVE',
    };

    // Если текущий пользователь - заказчик, скрываем других заказчиков
    if (user.role === 'CUSTOMER') {
      // Заказчик видит только проектировщиков и строителей
      if (role && (role === 'DESIGNER' || role === 'BUILDER')) {
        where.role = role;
      } else {
        where.role = {
          in: ['DESIGNER', 'BUILDER'],
        };
      }
    } else {
      // Для остальных ролей (ADMIN, DESIGNER, BUILDER) - обычная логика
      if (role && (role === 'DESIGNER' || role === 'BUILDER' || role === 'CUSTOMER')) {
        where.role = role;
      } else {
        // По умолчанию показываем всех (заказчиков, проектировщиков, строителей)
        where.role = {
          in: ['CUSTOMER', 'DESIGNER', 'BUILDER'],
        };
      }
    }

    // Найти пользователей
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
        { email: 'asc' },
      ],
    });

    // Получить статистику объектов для каждого пользователя
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        let objectCount = 0;
        
        if (u.role === 'CUSTOMER') {
          // Количество объектов, где пользователь заказчик
          objectCount = await prisma.object.count({
            where: { userId: u.id },
          });
        } else if (u.role === 'DESIGNER' || u.role === 'BUILDER') {
          // Количество объектов, где пользователь назначен
          objectCount = await prisma.userObjectAssignment.count({
            where: { userId: u.id },
          });
        }

        return {
          ...u,
          objectCount,
        };
      })
    );

    // Если текущий пользователь - заказчик, показывать только тех проектировщиков и строителей,
    // у которых есть хотя бы одно назначение на объекты этого заказчика
    let filteredUsers = usersWithStats;
    if (user.role === 'CUSTOMER') {
      // Получить ID всех объектов заказчика
      const customerObjectIds = await prisma.object.findMany({
        where: { userId: user.id },
        select: { id: true },
      });
      const objectIds = customerObjectIds.map((o) => o.id);

      if (objectIds.length > 0) {
        // Получить назначения на объекты заказчика
        const assignments = await prisma.userObjectAssignment.findMany({
          where: {
            objectId: { in: objectIds },
          },
          select: {
            userId: true,
          },
          distinct: ['userId'],
        });

        const assignedUserIds = new Set(assignments.map((a) => a.userId));
        
        // Фильтровать: показывать только тех, у кого есть назначения на объекты заказчика
        filteredUsers = usersWithStats.filter((u) => {
          if (u.role === 'DESIGNER' || u.role === 'BUILDER') {
            return assignedUserIds.has(u.id);
          }
          return false;
        });
      } else {
        // Если у заказчика нет объектов, не показывать никого
        filteredUsers = [];
      }
    }

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error('Ошибка получения списка пользователей:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

