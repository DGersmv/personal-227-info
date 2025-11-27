import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isInsalesConfigured } from '@/lib/insales';

/**
 * POST /api/downloads/[id]/purchase - Инициировать покупку загрузки
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

    // Только Проектировщик может покупать
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
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Загрузка не найдена' },
        { status: 404 }
      );
    }

    // Проверить, бесплатная ли загрузка
    const isFree = !item.price || item.price === 0;
    if (isFree) {
      // Для бесплатных загрузок сразу создаем покупку
      const purchase = await prisma.downloadPurchase.upsert({
        where: {
          userId_itemId: {
            userId: user.id,
            itemId: item.id,
          },
        },
        update: {
          status: 'paid',
          purchasedAt: new Date(),
        },
        create: {
          userId: user.id,
          itemId: item.id,
          status: 'paid',
          purchasedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        purchase,
        message: 'Бесплатная загрузка доступна для скачивания',
      });
    }

    // Для платных загрузок нужна оплата через insales
    if (!isInsalesConfigured()) {
      return NextResponse.json(
        { error: 'Оплата через insales не настроена' },
        { status: 500 }
      );
    }

    // Проверить, не куплена ли уже
    const existingPurchase = await prisma.downloadPurchase.findUnique({
      where: {
        userId_itemId: {
          userId: user.id,
          itemId: item.id,
        },
      },
    });

    if (existingPurchase && existingPurchase.status === 'paid') {
      return NextResponse.json(
        { error: 'Загрузка уже куплена' },
        { status: 400 }
      );
    }

    // Создать или обновить покупку со статусом pending
    const purchase = await prisma.downloadPurchase.upsert({
      where: {
        userId_itemId: {
          userId: user.id,
          itemId: item.id,
        },
      },
      update: {
        status: 'pending',
      },
      create: {
        userId: user.id,
        itemId: item.id,
        amount: item.price,
        currency: 'RUB',
        status: 'pending',
      },
    });

    // Создать платеж
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        downloadableItemId: item.id,
        amount: item.price!,
        currency: 'RUB',
        status: 'pending',
        metadata: JSON.stringify({
          itemName: item.name,
          itemType: item.type,
        }),
      },
    });

    // TODO: Инициировать оплату через insales API
    // Пока возвращаем информацию о необходимости оплаты
    return NextResponse.json({
      success: true,
      purchase,
      payment,
      requiresPayment: true,
      insalesProductId: item.insalesProductId,
      message: 'Требуется оплата через insales',
      // В будущем здесь будет URL для редиректа на оплату в insales
      // paymentUrl: `https://${shopDomain}/checkout?product_id=${item.insalesProductId}`
    });
  } catch (error) {
    console.error('Ошибка создания покупки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



