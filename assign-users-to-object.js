const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function assignUsersToObject() {
  try {
    // Получить объект (первый объект в базе)
    const object = await prisma.object.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!object) {
      console.log('[ERROR] Объекты не найдены. Сначала создайте объект через интерфейс.');
      return;
    }

    console.log(`Найден объект: "${object.title}" (ID: ${object.id})\n`);

    // Получить пользователей
    const designer = await prisma.user.findUnique({
      where: { email: 'designer@test.com' },
    });

    const builder = await prisma.user.findUnique({
      where: { email: 'builder@test.com' },
    });

    if (!designer) {
      console.log('[ERROR] Проектировщик не найден. Запустите: node create-all-test-users.js');
      return;
    }

    if (!builder) {
      console.log('[ERROR] Строитель не найден. Запустите: node create-all-test-users.js');
      return;
    }

    // Назначить Проектировщика на объект
    const designerAssignment = await prisma.userObjectAssignment.upsert({
      where: {
        userId_objectId: {
          userId: designer.id,
          objectId: object.id,
        },
      },
      update: {
        role: 'DESIGNER',
      },
      create: {
        userId: designer.id,
        objectId: object.id,
        role: 'DESIGNER',
      },
    });

    console.log('[OK] Проектировщик назначен на объект:');
    console.log(`   ${designer.name} (${designer.email})`);

    // Назначить Строителя на объект
    const builderAssignment = await prisma.userObjectAssignment.upsert({
      where: {
        userId_objectId: {
          userId: builder.id,
          objectId: object.id,
        },
      },
      update: {
        role: 'BUILDER',
      },
      create: {
        userId: builder.id,
        objectId: object.id,
        role: 'BUILDER',
      },
    });

    console.log('\n[OK] Строитель назначен на объект:');
    console.log(`   ${builder.name} (${builder.email})`);

    console.log('\nПользователи назначены на объект!');
    console.log('\nТеперь:');
    console.log(`   - Проектировщик (designer@test.com) может создавать проекты на объекте "${object.title}"`);
    console.log(`   - Строитель (builder@test.com) может загружать фото и панорамы на объекте "${object.title}"`);
  } catch (error) {
    console.error('[ERROR] Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignUsersToObject();

