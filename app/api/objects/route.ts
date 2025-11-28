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
      // Проектировщик и Строитель видят:
      // 1. Созданные ими объекты (где они владельцы)
      // 2. Назначенные на них объекты
      const createdObjects = await prisma.object.findMany({
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
      const assignedObjects = assignments.map((a) => a.object);
      
      // Объединить и убрать дубликаты
      const allObjects = [...createdObjects, ...assignedObjects];
      const uniqueObjects = allObjects.filter((obj, index, self) =>
        index === self.findIndex((o) => o.id === obj.id)
      );
      objects = uniqueObjects.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
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

    // Проверка прав: все авторизованные пользователи могут создавать объекты
    // (CUSTOMER, DESIGNER, BUILDER, ADMIN)

    const body = await request.json();
    const { title, description, address, assignments } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Название объекта обязательно' },
        { status: 400 }
      );
    }

    // ВАЖНО: Роль пользователя (user.role) НЕ меняется при создании объекта!
    // Пользователь становится владельцем объекта (userId), но его системная роль остается прежней
    // DESIGNER остается DESIGNER, даже если создал объект
    
    // Создать объект
    const object = await prisma.object.create({
      data: {
        title,
        description: description || null,
        address: address || null,
        userId: user.id, // Создатель становится владельцем (но его роль НЕ меняется!)
        status: 'ACTIVE',
        // Создать назначения, если они указаны
        assignments: assignments && Array.isArray(assignments) ? {
          create: assignments.map((assignment: { userId: number; role: string }) => ({
            userId: assignment.userId,
            role: assignment.role as any,
          })),
        } : undefined,
      },
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


