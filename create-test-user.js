const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash('test123', 10);

    // Создаем пользователя
    const user = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {
        password: hashedPassword,
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
      create: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Тестовый пользователь',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Тестовый пользователь создан:');
    console.log('   Email: test@example.com');
    console.log('   Пароль: test123');
    console.log('   Роль: CUSTOMER');
    console.log('   ID:', user.id);
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();



