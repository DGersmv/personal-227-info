import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/users/[id]/objects - Получить объекты пользователя
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Неверный ID пользователя' },
        { status: 400 }
      );
    }

    // Получить информацию о пользователе
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    let objects: any[] = [];

    // Получить объекты в зависимости от роли пользователя
    if (targetUser.role === 'CUSTOMER') {
      // Объекты, где пользователь является заказчиком
      objects = await prisma.object.findMany({
        where: { userId: userId },
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
    } else if (targetUser.role === 'DESIGNER' || targetUser.role === 'BUILDER') {
      // Объекты, где пользователь назначен как проектировщик или строитель
      let assignmentWhere: any = { userId: userId };
      
      // Если текущий пользователь - заказчик, показывать только его объекты
      if (user.role === 'CUSTOMER') {
        // Получить ID всех объектов текущего заказчика
        const customerObjects = await prisma.object.findMany({
          where: { userId: user.id },
          select: { id: true },
        });
        const customerObjectIds = customerObjects.map((o) => o.id);
        
        if (customerObjectIds.length === 0) {
          // У заказчика нет объектов, значит нет объектов для показа
          objects = [];
        } else {
          // Показать только назначения на объекты текущего заказчика
          assignmentWhere.objectId = { in: customerObjectIds };
        }
      }
      
      // Если у заказчика нет объектов, не выполнять запрос
      if (user.role !== 'CUSTOMER' || (user.role === 'CUSTOMER' && assignmentWhere.objectId)) {
        const assignments = await prisma.userObjectAssignment.findMany({
          where: assignmentWhere,
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
        objects = assignments.map((a) => ({
          ...a.object,
          assignmentRole: a.role, // Роль на этом объекте
        }));
      }
    }

    return NextResponse.json({
      user: targetUser,
      objects,
    });
  } catch (error) {
    console.error('Ошибка получения объектов пользователя:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

