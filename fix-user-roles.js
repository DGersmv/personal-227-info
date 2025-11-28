const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserRoles() {
  try {
    console.log('Проверка ролей пользователей...\n');

    // Получить всех пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: { id: 'asc' },
    });

    console.log(`Найдено пользователей: ${users.length}\n`);

    for (const user of users) {
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Имя: ${user.name || '(не указано)'}`);
      console.log(`Текущая роль: ${user.role}`);
      console.log('---');
    }

    console.log('\nЕсли нужно исправить роль пользователя, используйте:');
    console.log('node fix-user-role.js <email> <role>');
    console.log('Роли: DESIGNER, BUILDER, CUSTOMER, ADMIN');
  } catch (error) {
    console.error('[ERROR] Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserRoles();

