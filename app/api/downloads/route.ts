import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUser } from '@/lib/roles';

/**
 * GET /api/downloads - Получить список загрузок
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

    // Только Проектировщик и Админ могут видеть загрузки
    if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Доступ только для проектировщиков' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const myDownloads = searchParams.get('my') === 'true'; // Только купленные загрузки
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const priceFilter = searchParams.get('price'); // 'free' или 'paid'
    const programFilter = searchParams.get('program'); // 'archicad', 'revit', 'russian'

    const where: any = {
      status: 'ACTIVE' as any, // Prisma конвертирует строку в enum
    };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    // Получить загрузки
    let items;
    try {
      items = await prisma.downloadableItem.findMany({
        where,
        include: {
          _count: {
            select: {
              purchases: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbError: any) {
      console.error('Ошибка запроса к БД:', dbError);
      // Если проблема с enum, попробуем без фильтра по status
      items = await prisma.downloadableItem.findMany({
        where: type ? { type: type as any } : {},
        include: {
          _count: {
            select: {
              purchases: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Проверить, какие загрузки уже куплены пользователем
    let purchases = [];
    try {
      purchases = await prisma.downloadPurchase.findMany({
        where: {
          userId: user.id,
          status: 'paid',
        },
        select: {
          itemId: true,
        },
      });
    } catch (purchaseError) {
      console.error('Ошибка получения покупок:', purchaseError);
      // Продолжаем без покупок
    }

    const purchasedItemIds = new Set(purchases.map((p) => p.itemId));

    // Если запрошены только мои загрузки, фильтруем по купленным
    if (myDownloads) {
      items = items.filter((item) => purchasedItemIds.has(item.id) || (!item.price || item.price === 0));
    }

    // Добавить информацию о покупке и применить фильтры
    let itemsWithPurchaseStatus = items.map((item) => ({
      ...item,
      isPurchased: purchasedItemIds.has(item.id),
      isFree: !item.price || item.price === 0,
    }));

    // Фильтр по цене
    if (priceFilter === 'free') {
      itemsWithPurchaseStatus = itemsWithPurchaseStatus.filter((item) => !item.price || item.price === 0);
    } else if (priceFilter === 'paid') {
      itemsWithPurchaseStatus = itemsWithPurchaseStatus.filter((item) => item.price && item.price > 0);
    }

    // Фильтр по программам
    if (programFilter) {
      const programLower = programFilter.toLowerCase();
      itemsWithPurchaseStatus = itemsWithPurchaseStatus.filter((item) => {
        const nameLower = item.name.toLowerCase();
        const descLower = (item.description || '').toLowerCase();
        const categoryLower = (item.category || '').toLowerCase();
        const tagsStr = item.tags || '';
        const tagsLower = tagsStr.toLowerCase();
        
        if (programLower === 'archicad') {
          return nameLower.includes('archicad') || 
                 descLower.includes('archicad') || 
                 categoryLower.includes('archicad') ||
                 tagsLower.includes('archicad');
        } else if (programLower === 'revit') {
          return nameLower.includes('revit') || 
                 descLower.includes('revit') || 
                 categoryLower.includes('revit') ||
                 tagsLower.includes('revit');
        } else if (programLower === 'russian') {
          // Российские программы: Renga, nanoCAD, КОМПАС, ЛИРА и т.д.
          const russianKeywords = [
            'renga', 'renга', 'ренга',
            'nanocad', 'наноcad', 'нанокад',
            'компас', 'kompas',
            'лира', 'lira',
            'к3', 'k3',
            'российск', 'russian', 'россия',
            'отечественн', 'domestic'
          ];
          const searchText = `${nameLower} ${descLower} ${categoryLower} ${tagsLower}`;
          return russianKeywords.some(keyword => searchText.includes(keyword));
        }
        return true;
      });
    }

    return NextResponse.json({ items: itemsWithPurchaseStatus });
  } catch (error) {
    console.error('Ошибка получения загрузок:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/downloads - Создать новую загрузку (только для админа)
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

    // Проектировщик и Админ могут создавать загрузки
    if (user.role !== 'DESIGNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав. Только проектировщики могут добавлять загрузки.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      version,
      author,
      filename,
      filePath,
      fileSize,
      mimeType,
      price,
      insalesProductId,
      category,
      tags,
      iconUrl,
      screenshotUrls,
    } = body;

    if (!name || !filename || !filePath) {
      return NextResponse.json(
        { error: 'Название, имя файла и путь обязательны' },
        { status: 400 }
      );
    }

    // Создать загрузку
    const item = await prisma.downloadableItem.create({
      data: {
        name,
        description: description || null,
        type: type || 'PLUGIN',
        version: version || null,
        author: author || null,
        filename,
        filePath,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/octet-stream',
        price: price ? parseFloat(price) : null,
        insalesProductId: insalesProductId || null,
        category: category || null,
        tags: tags ? JSON.stringify(tags) : null,
        iconUrl: iconUrl || null,
        screenshotUrls: screenshotUrls ? JSON.stringify(screenshotUrls) : null,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания загрузки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

