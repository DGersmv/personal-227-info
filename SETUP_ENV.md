# Настройка переменных окружения

## Создание файла .env

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
# База данных PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/personal227info?schema=public"

# JWT секретный ключ (сгенерируйте случайную строку)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-min-32-chars"

# Node окружение
NODE_ENV="development"

# Insales OAuth настройки
INSALES_API_KEY="your-api-key-here"
INSALES_API_SECRET="your-api-secret-here"
INSALES_SHOP_DOMAIN="myshop.insales.ru"
INSALES_OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/insales/callback"
```

## Быстрая настройка для разработки

### 1. Создайте базу данных PostgreSQL:

```sql
CREATE DATABASE personal227info;
```

### 2. Обновите DATABASE_URL в .env:

Замените `user`, `password`, `localhost`, `5432` на ваши настройки PostgreSQL.

### 3. Генерация JWT_SECRET:

Можно использовать онлайн генератор или команду:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Примените схему базы данных:

```bash
npm run db:push
```

Или создайте миграцию:
```bash
npm run db:migrate
```

## Важно

- ⚠️ **НЕ коммитьте** файл `.env` в Git
- Файл `.env` уже должен быть в `.gitignore`
- Для продакшена используйте другие значения переменных
- JWT_SECRET должен быть длинным и случайным (минимум 32 символа)



