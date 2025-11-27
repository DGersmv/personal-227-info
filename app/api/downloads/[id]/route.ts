import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/downloads/[id] - Получить информацию о загрузке
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

    // Только Проектировщик и Админ могут видеть загрузки
    if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ только для проектировщиков' },
        { status: 403 }
      );
    }

    const itemId = parseInt(id);
    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: 'Неверный ID загрузки' },
        { status: 400 }
      );
    }

    // Получить загрузку
    const item = await prisma.downloadableItem.findUnique({
      where: { id: itemId },
      include: {
        _count: {
          select: {
            purchases: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Загрузка не найдена' },
        { status: 404 }
      );
    }

    // Проверить, куплена ли загрузка
    const purchase = await prisma.downloadPurchase.findUnique({
      where: {
        userId_itemId: {
          userId: user.id,
          itemId: item.id,
        },
      },
    });

    const isPurchased = purchase?.status === 'paid';
    const isFree = !item.price || item.price === 0;

    return NextResponse.json({
      item: {
        ...item,
        isPurchased,
        isFree,
        canDownload: isFree || isPurchased,
      },
    });
  } catch (error) {
    console.error('Ошибка получения загрузки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



