const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createRussianDownloads() {
  try {
    console.log('Создание российских загрузок...\n');

    const downloads = [
      {
        name: 'Renga BIM Плагин для экспорта',
        description: 'Плагин для экспорта проектов из Renga BIM в различные форматы',
        type: 'PLUGIN',
        version: '1.2.0',
        author: 'Renga Software',
        filename: 'renga-export-plugin.zip',
        filePath: 'public/downloads/renga-export-plugin.zip',
        fileSize: 5120000, // 5 MB
        mimeType: 'application/zip',
        price: null, // Бесплатно
        category: 'Renga плагины',
        tags: JSON.stringify(['renga', 'bim', 'экспорт', 'российский']),
        status: 'ACTIVE',
      },
      {
        name: 'nanoCAD Библиотека элементов',
        description: 'Расширенная библиотека строительных элементов для nanoCAD',
        type: 'LIBRARY',
        version: '2.0.0',
        author: 'nanoCAD Community',
        filename: 'nanocad-library.zip',
        filePath: 'public/downloads/nanocad-library.zip',
        fileSize: 25600000, // 25 MB
        mimeType: 'application/zip',
        price: null, // Бесплатно
        category: 'nanoCAD библиотеки',
        tags: JSON.stringify(['nanocad', 'библиотека', 'российский', 'элементы']),
        status: 'ACTIVE',
      },
      {
        name: 'КОМПАС-3D Шаблоны проектов',
        description: 'Набор готовых шаблонов для КОМПАС-3D',
        type: 'TEMPLATE',
        version: '1.0.0',
        author: 'АСКОН',
        filename: 'kompas-templates.zip',
        filePath: 'public/downloads/kompas-templates.zip',
        fileSize: 15360000, // 15 MB
        mimeType: 'application/zip',
        price: 1200.00,
        category: 'КОМПАС шаблоны',
        tags: JSON.stringify(['компас', 'компас-3d', 'askon', 'российский', 'шаблоны']),
        status: 'ACTIVE',
      },
      {
        name: 'ЛИРА-САПР Плагин для расчета',
        description: 'Плагин для автоматизации расчетов в ЛИРА-САПР',
        type: 'PLUGIN',
        version: '3.1.0',
        author: 'ЛИРА-САПР',
        filename: 'lira-plugin.zip',
        filePath: 'public/downloads/lira-plugin.zip',
        fileSize: 8192000, // 8 MB
        mimeType: 'application/zip',
        price: 3000.00,
        category: 'ЛИРА плагины',
        tags: JSON.stringify(['лира', 'лира-сапр', 'расчет', 'российский']),
        status: 'ACTIVE',
      },
      {
        name: 'Archicad Плагин для российских норм',
        description: 'Плагин для работы с российскими строительными нормами в Archicad',
        type: 'PLUGIN',
        version: '1.5.0',
        author: 'Archicad Russia',
        filename: 'archicad-russian-norms.zip',
        filePath: 'public/downloads/archicad-russian-norms.zip',
        fileSize: 10240000, // 10 MB
        mimeType: 'application/zip',
        price: 2000.00,
        category: 'Archicad плагины',
        tags: JSON.stringify(['archicad', 'российские нормы', 'снип', 'плагин']),
        status: 'ACTIVE',
      },
      {
        name: 'Revit Адаптация для РФ',
        description: 'Набор семейств и шаблонов Revit адаптированных для российских стандартов',
        type: 'TEMPLATE',
        version: '2.3.0',
        author: 'Revit Russia',
        filename: 'revit-russia-template.zip',
        filePath: 'public/downloads/revit-russia-template.zip',
        fileSize: 30720000, // 30 MB
        mimeType: 'application/zip',
        price: 2500.00,
        category: 'Revit шаблоны',
        tags: JSON.stringify(['revit', 'россия', 'снип', 'семейства', 'шаблоны']),
        status: 'ACTIVE',
      },
    ];

    for (const downloadData of downloads) {
      // Проверяем, существует ли уже загрузка с таким именем
      const existing = await prisma.downloadableItem.findFirst({
        where: { name: downloadData.name },
      });

      const item = existing
        ? await prisma.downloadableItem.update({
            where: { id: existing.id },
            data: downloadData,
          })
        : await prisma.downloadableItem.create({
            data: downloadData,
          });

      console.log(`[OK] ${item.name}`);
      console.log(`   Тип: ${item.type}, Цена: ${item.price ? item.price + ' ₽' : 'Бесплатно'}`);
      console.log(`   ID: ${item.id}\n`);
    }

    console.log('Российские загрузки созданы!');
  } catch (error) {
    console.error('[ERROR] Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createRussianDownloads();

