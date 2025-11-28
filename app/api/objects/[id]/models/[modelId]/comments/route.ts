import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const { id: objectId, modelId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем доступ к объекту
    const object = await prisma.object.findFirst({
      where: {
        id: parseInt(objectId),
      },
      include: {
        assignments: true,
      },
    });

    if (!object) {
      return NextResponse.json({ error: 'Объект не найден' }, { status: 404 });
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
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    }

    // Проверяем существование модели
    const model = await prisma.bimModel.findFirst({
      where: {
        id: parseInt(modelId),
        objectId: parseInt(objectId),
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Модель не найдена' }, { status: 404 });
    }

    // Получаем комментарии
    const comments = await prisma.bimModelComment.findMany({
      where: {
        bimModelId: parseInt(modelId),
        // Для заказчика показываем только видимые комментарии
        ...(user.role === 'CUSTOMER'
          ? { isVisibleToCustomer: true }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(comments);
  } catch (error: any) {
    console.error('Ошибка получения комментариев:', error);
    return NextResponse.json(
      { error: 'Ошибка получения комментариев' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; modelId: string }> }
) {
  try {
    const { id: objectId, modelId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    // Проверяем доступ к объекту
    const object = await prisma.object.findFirst({
      where: {
        id: parseInt(objectId),
      },
      include: {
        assignments: true,
      },
    });

    if (!object) {
      return NextResponse.json({ error: 'Объект не найден' }, { status: 404 });
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
      const hasAccess = object.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому объекту' },
          { status: 403 }
        );
      }
    }

    // Проверяем существование модели
    const model = await prisma.bimModel.findFirst({
      where: {
        id: parseInt(modelId),
        objectId: parseInt(objectId),
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Модель не найдена' }, { status: 404 });
    }

    const body = await request.json();
    const { content, x, y, z } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Комментарий не может быть пустым' },
        { status: 400 }
      );
    }

    // Создаем комментарий
    const comment = await prisma.bimModelComment.create({
      data: {
        bimModelId: parseInt(modelId),
        userId: user.id,
        content: content.trim(),
        x: x !== undefined ? x : null,
        y: y !== undefined ? y : null,
        z: z !== undefined ? z : null,
        isVisibleToCustomer: user.role !== 'CUSTOMER', // Комментарии заказчика видны всем
        isAdminComment: user.role === 'ADMIN',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error: any) {
    console.error('Ошибка создания комментария:', error);
    return NextResponse.json(
      { error: 'Ошибка создания комментария' },
      { status: 500 }
    );
  }
}

