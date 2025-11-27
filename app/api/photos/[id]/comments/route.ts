import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/photos/[id]/comments - Получить комментарии к фото
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

    const photoId = parseInt(id);
    if (isNaN(photoId)) {
      return NextResponse.json(
        { error: 'Неверный ID фото' },
        { status: 400 }
      );
    }

    // Проверить доступ к фото
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        object: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Фото не найдено' },
        { status: 404 }
      );
    }

    // Проверка прав доступа к объекту
    if (user.role === 'CUSTOMER') {
      if (photo.object?.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому фото' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = photo.object?.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому фото' },
          { status: 403 }
        );
      }
    }

    // Получить комментарии
    // Для заказчика показываем только видимые комментарии
    const where: any = { photoId };
    if (user.role === 'CUSTOMER') {
      where.isVisibleToCustomer = true;
    }

    const comments = await prisma.photoComment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Ошибка получения комментариев:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos/[id]/comments - Создать комментарий к фото
 */
export async function POST(
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

    const photoId = parseInt(id);
    if (isNaN(photoId)) {
      return NextResponse.json(
        { error: 'Неверный ID фото' },
        { status: 400 }
      );
    }

    // Проверить доступ к фото
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: {
        object: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Фото не найдено' },
        { status: 404 }
      );
    }

    // Проверка прав доступа к объекту
    if (user.role === 'CUSTOMER') {
      if (photo.object?.userId !== user.id) {
        return NextResponse.json(
          { error: 'Нет доступа к этому фото' },
          { status: 403 }
        );
      }
    } else if (user.role === 'DESIGNER' || user.role === 'BUILDER') {
      const hasAccess = photo.object?.assignments.some((a) => a.userId === user.id);
      if (!hasAccess && user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Нет доступа к этому фото' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { content, x, y, isVisibleToCustomer } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Комментарий не может быть пустым' },
        { status: 400 }
      );
    }

    // Валидация координат (если указаны)
    if (x !== undefined && y !== undefined) {
      if (typeof x !== 'number' || typeof y !== 'number') {
        return NextResponse.json(
          { error: 'Координаты должны быть числами' },
          { status: 400 }
        );
      }
      if (x < 0 || x > 100 || y < 0 || y > 100) {
        return NextResponse.json(
          { error: 'Координаты должны быть в диапазоне от 0 до 100' },
          { status: 400 }
        );
      }
    }

    // Определить видимость комментария для заказчика
    // По умолчанию: комментарии заказчика видны всем, комментарии других ролей - настраиваемые
    let commentVisibility = true;
    if (isVisibleToCustomer !== undefined) {
      commentVisibility = isVisibleToCustomer;
    } else {
      // По умолчанию: комментарии заказчика всегда видны, остальные - видимы
      commentVisibility = true;
    }

    // Создать комментарий
    const comment = await prisma.photoComment.create({
      data: {
        photoId,
        userId: user.id,
        content: content.trim(),
        x: x !== undefined ? x : null,
        y: y !== undefined ? y : null,
        isVisibleToCustomer: commentVisibility,
        isAdminComment: user.role === 'ADMIN',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания комментария:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

