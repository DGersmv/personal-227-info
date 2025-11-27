import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUser } from '@/lib/roles';

/**
 * GET /api/objects - Получить список объектов
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

    let objects;

    if (user.role === 'CUSTOMER') {
      // Заказчик видит только свои объекты
      objects = await prisma.object.findMany({
        where: { userId: user.id },
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
          _count: {
            select: {
              projects: true,
              photos: true,
              panoramas: true,
              documents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      // Проектировщик и Строитель видят назначенные объекты
      const assignments = await prisma.userObjectAssignment.findMany({
        where: { userId: user.id },
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
              _count: {
                select: {
                  projects: true,
                  photos: true,
                  panoramas: true,
                  documents: true,
                },
              },
            },
          },
        },
      });
      objects = assignments.map((a) => a.object);
    } else if (user.role === 'ADMIN') {
      // Админ видит все объекты
      objects = await prisma.object.findMany({
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
          _count: {
            select: {
              projects: true,
              photos: true,
              panoramas: true,
              documents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      objects = [];
    }

    return NextResponse.json({ objects });
  } catch (error) {
    console.error('Ошибка получения объектов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/objects - Создать новый объект
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

    // Проверка прав: только Заказчик может создавать объекты
    if (!canUser(user, 'object', 'create')) {
      // Но по нашей логике, только CUSTOMER может создавать объекты
      if (user.role !== 'CUSTOMER' && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Недостаточно прав для создания объекта' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { title, description, address } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Название объекта обязательно' },
        { status: 400 }
      );
    }

    // Создать объект
    const object = await prisma.object.create({
      data: {
        title,
        description: description || null,
        address: address || null,
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ object }, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания объекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


