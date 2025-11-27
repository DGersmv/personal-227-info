# 👤 Создание тестовых пользователей

## Быстрый способ (через скрипт)

### Создать всех пользователей (рекомендуется):

```bash
node create-all-test-users.js
```

Это создаст пользователей всех ролей:
- **Заказчик:** `customer@test.com` / `test123`
- **Проектировщик:** `designer@test.com` / `test123`
- **Строитель:** `builder@test.com` / `test123`
- **Администратор:** `admin@test.com` / `test123`

### Создать одного пользователя:

```bash
node create-test-user.js
```

Это создаст пользователя:
- **Email:** `test@example.com`
- **Пароль:** `test123`
- **Роль:** `CUSTOMER`

## Создание пользователей разных ролей

### Через Prisma Studio (визуально):

```bash
npm run db:studio
```

Откройте браузер на `http://localhost:5555` и создайте пользователей вручную.

### Через скрипт (программно):

Создайте файл `create-users.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createUsers() {
  const password = await bcrypt.hash('test123', 10);

  // Заказчик
  await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      password,
      name: 'Тестовый Заказчик',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    },
  });

  // Проектировщик
  await prisma.user.upsert({
    where: { email: 'designer@test.com' },
    update: {},
    create: {
      email: 'designer@test.com',
      password,
      name: 'Тестовый Проектировщик',
      role: 'DESIGNER',
      status: 'ACTIVE',
    },
  });

  // Строитель
  await prisma.user.upsert({
    where: { email: 'builder@test.com' },
    update: {},
    create: {
      email: 'builder@test.com',
      password,
      name: 'Тестовый Строитель',
      role: 'BUILDER',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Пользователи созданы!');
  console.log('Все пароли: test123');
}

createUsers().finally(() => prisma.$disconnect());
```

## Вход в систему

### Вариант 1: Через insales (когда настроен)

1. Откройте `http://localhost:3000`
2. Нажмите "Войти через insales"
3. Авторизуйтесь в insales

### Вариант 2: Временный вход (для тестирования)

**⚠️ ВАЖНО:** Сейчас вход только через insales. Если нужно протестировать без insales, можно:

1. Временно добавить форму входа (но это не рекомендуется, так как мы решили использовать только insales)
2. Или настроить insales для тестирования

## Настройка insales для тестирования

1. Создайте тестовый магазин в insales
2. Создайте OAuth приложение
3. Заполните переменные в `.env`:
   ```env
   INSALES_API_KEY="your-key"
   INSALES_API_SECRET="your-secret"
   INSALES_SHOP_DOMAIN="your-shop.insales.ru"
   INSALES_OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/insales/callback"
   ```

## Тестовые данные

После создания пользователей вы можете:
- Зайти на dashboard
- Создать объекты
- Протестировать функционал

