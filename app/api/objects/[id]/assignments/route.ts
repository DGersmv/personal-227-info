import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/objects/[id]/assignments - Получить назначения пользователей на объект
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
      select: { userId: true },
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: владелец объекта, назначенный пользователь или админ
    if (user.role === 'CUSTOMER') {
      if (object.userId !== user.id && user.role !== 'ADMIN') {
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
            objectId: objectId,
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

    // Получить назначения
    const assignments = await prisma.userObjectAssignment.findMany({
      where: { objectId },
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
      orderBy: { assignedAt: 'desc' },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Ошибка получения назначений:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/objects/[id]/assignments - Назначить пользователя на объект
 */
export async function POST(
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
    const objectId = parseInt(id);

    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'ID пользователя и роль обязательны' },
        { status: 400 }
      );
    }

    // Проверка роли (только DESIGNER или BUILDER можно назначать)
    if (role !== 'DESIGNER' && role !== 'BUILDER') {
      return NextResponse.json(
        { error: 'Можно назначать только проектировщиков и строителей' },
        { status: 400 }
      );
    }

    // Получить объект
    const object = await prisma.object.findUnique({
      where: { id: objectId },
      select: { userId: true },
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    // Проверка прав: только владелец объекта или админ может назначать
    if (user.role === 'CUSTOMER') {
      if (object.userId !== user.id && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Только владелец объекта может назначать пользователей' },
          { status: 403 }
        );
      }
    } else if (user.role !== 'ADMIN') {
      // Проектировщик может назначать строителей на свои объекты
      if (user.role === 'DESIGNER' && role === 'BUILDER') {
        const assignment = await prisma.userObjectAssignment.findUnique({
          where: {
            userId_objectId: {
              userId: user.id,
              objectId: objectId,
            },
          },
        });
        if (!assignment && user.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Вы не назначены на этот объект как проектировщик' },
            { status: 403 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Недостаточно прав для назначения' },
          { status: 403 }
        );
      }
    }

    // Проверить, что пользователь существует и имеет правильную роль
    const targetUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Проверить, что роль пользователя соответствует назначаемой роли
    if (targetUser.role !== role) {
      return NextResponse.json(
        { error: `Пользователь должен иметь роль ${role === 'DESIGNER' ? 'Проектировщик' : 'Строитель'}` },
        { status: 400 }
      );
    }

    // Создать или обновить назначение
    const assignment = await prisma.userObjectAssignment.upsert({
      where: {
        userId_objectId: {
          userId: parseInt(userId),
          objectId: objectId,
        },
      },
      update: {
        role: role as any,
      },
      create: {
        userId: parseInt(userId),
        objectId: objectId,
        role: role as any,
      },
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
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error: any) {
    console.error('Ошибка назначения пользователя:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Пользователь уже назначен на этот объект' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/objects/[id]/assignments - Удалить назначение пользователя
 */
export async function DELETE(
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
    const objectId = parseInt(id);

    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID пользователя обязателен' },
        { status: 400 }
      );
    }

    // Получить объект
    const object = await prisma.object.findUnique({
      where: { id: objectId },
      select: { userId: true },
    });

    if (!object) {
      return NextResponse.json(
        { error: 'Объект не найден' },
        { status: 404 }
      );
    }

    const targetUserId = parseInt(userId);
    
    // Проверка прав на удаление:
    // 1. Админ может удалять любые назначения
    // 2. Владелец объекта может удалять любые назначения на своем объекте
    // 3. Участник может удалять только свое назначение (удалить себя)
    const isAdmin = user.role === 'ADMIN';
    const isOwner = object.userId === user.id;
    const isRemovingSelf = targetUserId === user.id;

    // Проверить, что пользователь, которого удаляют, действительно назначен на объект
    const targetAssignment = await prisma.userObjectAssignment.findUnique({
      where: {
        userId_objectId: {
          userId: targetUserId,
          objectId: objectId,
        },
      },
    });

    if (!targetAssignment) {
      return NextResponse.json(
        { error: 'Назначение не найдено' },
        { status: 404 }
      );
    }

    // Проверка прав
    if (!isAdmin && !isOwner && !isRemovingSelf) {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления назначения' },
        { status: 403 }
      );
    }

    // Удалить назначение
    await prisma.userObjectAssignment.delete({
      where: {
        userId_objectId: {
          userId: parseInt(userId),
          objectId: objectId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ошибка удаления назначения:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Назначение не найдено' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

