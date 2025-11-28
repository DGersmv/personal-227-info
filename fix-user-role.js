const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserRole() {
  try {
    const email = process.argv[2];
    const role = process.argv[3];

    if (!email || !role) {
      console.error('Использование: node fix-user-role.js <email> <role>');
      console.error('Роли: DESIGNER, BUILDER, CUSTOMER, ADMIN');
      process.exit(1);
    }

    if (!['DESIGNER', 'BUILDER', 'CUSTOMER', 'ADMIN'].includes(role)) {
      console.error('Неверная роль. Используйте: DESIGNER, BUILDER, CUSTOMER, ADMIN');
      process.exit(1);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Пользователь с email ${email} не найден`);
      process.exit(1);
    }

    console.log(`Текущая роль пользователя ${email}: ${user.role}`);
    console.log(`Изменение роли на: ${role}...`);

    await prisma.user.update({
      where: { email },
      data: { role },
    });

    console.log(`✅ Роль успешно изменена на ${role}`);
  } catch (error) {
    console.error('[ERROR] Ошибка:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixUserRole();

