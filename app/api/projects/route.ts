import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUser } from '@/lib/roles';

/**
 * GET /api/projects - Получить список проектов
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
    const objectId = searchParams.get('objectId');

    let projects;

    if (objectId) {
      // Проекты конкретного объекта
      const objectIdNum = parseInt(objectId);
      
      // Проверка доступа к объекту
      const object = await prisma.object.findUnique({
        where: { id: objectIdNum },
      });

      if (!object) {
        return NextResponse.json(
          { error: 'Объект не найден' },
          { status: 404 }
        );
      }

      // Проверка прав доступа
      if (user.role === 'CUSTOMER') {
        if (object.userId !== user.id) {
          return NextResponse.json(
            { error: 'Нет доступа к этому объекту' },
            { status: 403 }
          );
        }
      } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
        const assignment = await prisma.userObjectAssignment.findUnique({
          where: {
            userId_objectId: {
              userId: user.id,
              objectId: objectIdNum,
            },
          },
        });
        if (!assignment && user.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Нет доступа к этому объекту' },
            { status: 403 }
          );
        }
      }

      projects = await prisma.project.findMany({
        where: { objectId: objectIdNum },
        include: {
          object: {
            select: {
              id: true,
              title: true,
            },
          },
          _count: {
            select: {
              stages: true,
              documents: true,
              photos: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Все проекты пользователя
      if (user.role === 'DESIGNER') {
        // Проектировщик видит проекты на своих объектах
        const assignments = await prisma.userObjectAssignment.findMany({
          where: {
            userId: user.id,
            role: 'DESIGNER',
          },
          include: {
            object: {
              include: {
                projects: {
                  include: {
                    object: {
                      select: {
                        id: true,
                        title: true,
                      },
                    },
                    _count: {
                      select: {
                        stages: true,
                        documents: true,
                        photos: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });
        projects = assignments.flatMap((a) => a.object.projects);
      } else if (user.role === 'CUSTOMER') {
        // Заказчик видит проекты на своих объектах
        const objects = await prisma.object.findMany({
          where: { userId: user.id },
          include: {
            projects: {
              include: {
                object: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
                _count: {
                  select: {
                    stages: true,
                    documents: true,
                    photos: true,
                  },
                },
              },
            },
          },
        });
        projects = objects.flatMap((o) => o.projects);
      } else if (user.role === 'ADMIN') {
        // Админ видит все проекты
        projects = await prisma.project.findMany({
          include: {
            object: {
              select: {
                id: true,
                title: true,
              },
            },
            _count: {
              select: {
                stages: true,
                documents: true,
                photos: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        projects = [];
      }
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Ошибка получения проектов:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects - Создать новый проект
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

    // Проверка прав: только Проектировщик может создавать проекты
    if (!canUser(user, 'project', 'create')) {
      if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Недостаточно прав для создания проекта' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { title, description, objectId } = body;

    if (!title || !objectId) {
      return NextResponse.json(
        { error: 'Название проекта и ID объекта обязательны' },
        { status: 400 }
      );
    }

    const objectIdNum = parseInt(objectId);
    if (isNaN(objectIdNum)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    // Проверка доступа к объекту
    const object = await prisma.object.findUnique({
      where: { id: objectIdNum },
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Проектировщик должен быть назначен на объект
    if (user.role === 'DESIGNER') {
      const assignment = await prisma.userObjectAssignment.findUnique({
        where: {
          userId_objectId: {
            userId: user.id,
            objectId: objectIdNum,
          },
        },
      });
      if (!assignment && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Вы не назначены на этот объект' },
          { status: 403 }
        );
      }
    }

    // Создать проект
    const project = await prisma.project.create({
      data: {
        title,
        description: description || null,
        objectId: objectIdNum,
        status: 'PLANNING',
      },
      include: {
        object: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            stages: true,
            documents: true,
            photos: true,
          },
        },
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания проекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



