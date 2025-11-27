import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * GET /api/downloads/[id]/download - Скачать файл
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

    // Только Проектировщик и Админ могут скачивать
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

    // Проверить права на скачивание
    const isFree = !item.price || item.price === 0;
    if (!isFree) {
      // Проверить покупку
      const purchase = await prisma.downloadPurchase.findUnique({
        where: {
          userId_itemId: {
            userId: user.id,
            itemId: item.id,
          },
        },
      });

      if (!purchase || purchase.status !== 'paid') {
        return NextResponse.json(
          { error: 'Загрузка не оплачена. Необходимо сначала оплатить.' },
          { status: 403 }
        );
      }
    }

    // Прочитать файл
    // Поддержка старых путей (public/downloads/) и новых (uploads/downloads/)
    try {
      let filePath: string;
      if (item.filePath.startsWith('public/')) {
        // Старый путь (для обратной совместимости)
        filePath = join(process.cwd(), item.filePath);
      } else if (item.filePath.startsWith('uploads/')) {
        // Новый путь (защищенное хранилище)
        filePath = join(process.cwd(), item.filePath);
      } else {
        // Если путь относительный, пробуем оба варианта
        filePath = join(process.cwd(), 'uploads', 'downloads', item.filename);
      }
      const fileBuffer = await readFile(filePath);

      // Увеличить счетчик скачиваний
      await prisma.downloadableItem.update({
        where: { id: itemId },
        data: {
          downloadCount: {
            increment: 1,
          },
        },
      });

      // Вернуть файл
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': item.mimeType,
          'Content-Disposition': `attachment; filename="${item.filename}"`,
          'Content-Length': item.fileSize.toString(),
        },
      });
    } catch (fileError) {
      console.error('Ошибка чтения файла:', fileError);
      return NextResponse.json(
        { error: 'Файл не найден на сервере' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Ошибка скачивания:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}



