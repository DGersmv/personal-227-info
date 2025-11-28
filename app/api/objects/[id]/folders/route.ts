import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/objects/[id]/folders - Получить папки объекта
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

    // Проверить доступ к объекту
    const object = await prisma.object.findUnique({
      where: { id: objectId },
      include: {
        assignments: true,
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

    // Получить папки
    const folders = await prisma.photoFolder.findMany({
      where: { objectId },
      include: {
        _count: {
          select: {
            photos: true,
            videos: true,
          },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    console.error('Ошибка получения папок:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/objects/[id]/folders - Создать папку
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

    const objectId = parseInt(id);
    if (isNaN(objectId)) {
      return NextResponse.json(
        { error: 'Неверный ID объекта' },
        { status: 400 }
      );
    }

    // Проверить доступ к объекту
    const object = await prisma.object.findUnique({
      where: { id: objectId },
      include: {
        assignments: true,
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

    const body = await request.json();
    const { name } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Название папки не может быть пустым' },
        { status: 400 }
      );
    }

    // Проверить, нет ли уже папки с таким именем
    const existingFolder = await prisma.photoFolder.findFirst({
      where: {
        objectId,
        name: name.trim(),
      },
    });

    if (existingFolder) {
      return NextResponse.json(
        { error: 'Папка с таким именем уже существует' },
        { status: 400 }
      );
    }

    // Получить максимальный orderIndex
    const maxOrder = await prisma.photoFolder.aggregate({
      where: { objectId },
      _max: { orderIndex: true },
    });

    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    // Создать папку
    const folder = await prisma.photoFolder.create({
      data: {
        objectId,
        name: name.trim(),
        orderIndex,
      },
      include: {
        _count: {
          select: {
            photos: true,
            videos: true,
          },
        },
      },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания папки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}


