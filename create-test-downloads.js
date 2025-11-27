const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestDownloads() {
  try {
    console.log('Создание тестовых загрузок...\n');

    const downloads = [
      {
        name: 'AutoCAD Плагин для чертежей',
        description: 'Расширенный плагин для AutoCAD с дополнительными инструментами для создания чертежей',
        type: 'PLUGIN',
        version: '2.1.0',
        author: 'Design Tools Inc.',
        filename: 'autocad-plugin.zip',
        filePath: 'public/downloads/autocad-plugin.zip', // Временный путь
        fileSize: 10240000, // 10 MB
        mimeType: 'application/zip',
        price: 1500.00,
        category: 'CAD плагины',
        status: 'ACTIVE',
      },
      {
        name: '3D Studio Max Расширение',
        description: 'Набор инструментов для 3D моделирования в 3ds Max',
        type: 'PLUGIN',
        version: '1.5.2',
        author: '3D Tools',
        filename: '3dsmax-extension.zip',
        filePath: 'public/downloads/3dsmax-extension.zip',
        fileSize: 20480000, // 20 MB
        mimeType: 'application/zip',
        price: 2500.00,
        category: '3D плагины',
        status: 'ACTIVE',
      },
      {
        name: 'Библиотека строительных элементов',
        description: 'Готовая библиотека строительных элементов для проектирования',
        type: 'LIBRARY',
        version: '3.0.0',
        author: 'Build Library',
        filename: 'building-elements-library.zip',
        filePath: 'public/downloads/building-elements-library.zip',
        fileSize: 51200000, // 50 MB
        mimeType: 'application/zip',
        price: null, // Бесплатно
        category: 'Библиотеки',
        status: 'ACTIVE',
      },
      {
        name: 'Revit Шаблоны проектов',
        description: 'Набор готовых шаблонов для Revit',
        type: 'TEMPLATE',
        version: '1.0.0',
        author: 'Revit Templates',
        filename: 'revit-templates.zip',
        filePath: 'public/downloads/revit-templates.zip',
        fileSize: 30720000, // 30 MB
        mimeType: 'application/zip',
        price: 800.00,
        category: 'Шаблоны',
        status: 'ACTIVE',
      },
      {
        name: 'Калькулятор смет',
        description: 'Программа для расчета смет строительных работ',
        type: 'PROGRAM',
        version: '4.2.1',
        author: 'Estimate Pro',
        filename: 'estimate-calculator.exe',
        filePath: 'public/downloads/estimate-calculator.exe',
        fileSize: 15360000, // 15 MB
        mimeType: 'application/x-msdownload',
        price: 5000.00,
        category: 'Программы',
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

    console.log('Тестовые загрузки созданы!');
    console.log('\nПримечание:');
    console.log('   - Файлы нужно будет загрузить в указанные пути');
    console.log('   - Для платных загрузок нужно настроить insalesProductId');
  } catch (error) {
    console.error('[ERROR] Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestDownloads();

