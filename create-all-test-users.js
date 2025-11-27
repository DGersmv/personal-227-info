const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAllTestUsers() {
  try {
    const password = await bcrypt.hash('test123', 10);

    const users = [
      {
        email: 'customer@test.com',
        password,
        name: 'Тестовый Заказчик',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      },
      {
        email: 'designer@test.com',
        password,
        name: 'Тестовый Проектировщик',
        role: 'DESIGNER',
        status: 'ACTIVE',
      },
      {
        email: 'builder@test.com',
        password,
        name: 'Тестовый Строитель',
        role: 'BUILDER',
        status: 'ACTIVE',
      },
      {
        email: 'admin@test.com',
        password,
        name: 'Тестовый Администратор',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    ];

    console.log('Создание тестовых пользователей...\n');

    for (const userData of users) {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          password: userData.password,
          name: userData.name,
          role: userData.role,
          status: userData.status,
        },
        create: userData,
      });

      const roleNames = {
        CUSTOMER: 'Заказчик',
        DESIGNER: 'Проектировщик',
        BUILDER: 'Строитель',
        ADMIN: 'Администратор',
      };

      console.log(`[OK] ${roleNames[user.role]}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Пароль: test123`);
      console.log(`   ID: ${user.id}\n`);
    }

    console.log('Все тестовые пользователи созданы!');
    console.log('\nДанные для входа:');
    console.log('   Заказчик: customer@test.com / test123');
    console.log('   Проектировщик: designer@test.com / test123');
    console.log('   Строитель: builder@test.com / test123');
    console.log('   Администратор: admin@test.com / test123');
  } catch (error) {
    console.error('[ERROR] Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAllTestUsers();

