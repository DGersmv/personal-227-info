import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUser } from '@/lib/roles';

/**
 * GET /api/objects/[id] - Получить объект по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const objectId = parseInt(id);
    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    // Получить объект
    const object = await prisma.object.findUnique({
      where: { id: objectId },
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
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав доступа
    if (user.role === 'CUSTOMER') {
      // Заказчик видит только свои объекты
      if (object.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      // Проектировщик и Строитель видят назначенные объекты
      const hasAccess = object.assignments.some(
        (a) => a.userId === user.id
      );
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ object });
  } catch (error) {
    console.error('Ошибка получения объекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/objects/[id] - Обновить объект
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const objectId = parseInt(id);
    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    // Получить объект
    const object = await prisma.object.findUnique({
      where: { id: objectId },
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: только владелец или админ может редактировать
    if (object.userId !== user.id && user.role !== 'ADMIN') {
      // Проектировщик может редактировать назначенные объекты
      if (user.role === 'DESIGNER') {
        const assignment = await prisma.userObjectAssignment.findUnique({
          where: {
            userId_objectId: {
              userId: user.id,
              objectId: object.id,
            },
          },
        });
        if (!assignment) {
          return NextResponse.json(
            { error: 'Нет прав для редактирования объекта' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Нет прав для редактирования объекта' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { title, description, address, status } = body;

    // Обновить объект
    const updatedObject = await prisma.object.update({
      where: { id: objectId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(address !== undefined && { address }),
        ...(status && { status }),
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

    return NextResponse.json({ object: updatedObject });
  } catch (error) {
    console.error('Ошибка обновления объекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/objects/[id] - Удалить объект
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    const objectId = parseInt(id);
    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    // Получить объект
    const object = await prisma.object.findUnique({
      where: { id: objectId },
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: только владелец или админ может удалять
    if (object.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Нет прав для удаления объекта' },
        { status: 403 }
      );
    }

    // Удалить объект
    await prisma.object.delete({
      where: { id: objectId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления объекта:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



