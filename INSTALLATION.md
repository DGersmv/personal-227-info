# 📦 Руководство по установке

## Шаг 1: Установка PostgreSQL (psql)

### Вариант A: Через официальный установщик (рекомендуется)

1. Скачайте PostgreSQL с официального сайта:
   - Перейдите на: https://www.postgresql.org/download/windows/
   - Или прямую ссылку: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. Запустите установщик и следуйте инструкциям:
   - Запомните пароль для пользователя `postgres` (понадобится позже!)
   - Порт по умолчанию: `5432`
   - Установите все компоненты (включая pgAdmin и Command Line Tools)

3. **Настройка PATH (если команда `psql` не найдена):**

После установки PostgreSQL может быть не добавлен в PATH. Добавьте путь вручную:

```powershell
# Для текущей сессии PowerShell:
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"

# Для постоянного добавления в PATH (замените 18 на вашу версию):
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\18\bin", [EnvironmentVariableTarget]::User)
```

**Или используйте полный путь:**
```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" --version
```

4. Проверьте установку:
```powershell
psql --version
```

### Вариант B: Через Chocolatey (если установлен)

```powershell
choco install postgresql
```

### Вариант C: Через winget

```powershell
winget install PostgreSQL.PostgreSQL
```

---

## Шаг 2: Настройка PostgreSQL

### 2.1. Запустите PostgreSQL сервис

```powershell
# Проверьте статус сервиса
Get-Service postgresql*

# Если не запущен, запустите:
Start-Service postgresql*
```

### 2.2. Создайте базу данных

```powershell
# Подключитесь к PostgreSQL (используйте пароль, который указали при установке)
psql -U postgres

# В консоли PostgreSQL выполните:
CREATE DATABASE personal227info;
CREATE USER personal227user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE personal227info TO personal227user;
\q
```

**Или через одну команду:**

```powershell
psql -U postgres -c "CREATE DATABASE personal227info;"
```

---

## Шаг 3: Установка Node.js

### Проверьте, установлен ли Node.js:

```powershell
node --version
npm --version
```

### Если не установлен:

#### Вариант A: Через официальный сайт
1. Скачайте с: https://nodejs.org/
2. Установите LTS версию (рекомендуется)

#### Вариант B: Через Chocolatey
```powershell
choco install nodejs-lts
```

#### Вариант C: Через winget
```powershell
winget install OpenJS.NodeJS.LTS
```

---

## Шаг 4: Установка зависимостей проекта

```powershell
# Перейдите в директорию проекта (если еще не там)
cd E:\personal227info

# Установите все зависимости
npm install
```

---

## Шаг 5: Генерация Prisma Client

```powershell
npm run db:generate
```

**⚠️ ОБЯЗАТЕЛЬНО выполните эту команду после установки зависимостей!**

---

## Шаг 6: Настройка переменных окружения

### 6.1. Создайте файл `.env` в корне проекта:

```powershell
# Создайте файл .env (если его нет)
New-Item -Path .env -ItemType File -Force
```

### 6.2. Добавьте в `.env` следующее содержимое:

```env
# База данных PostgreSQL
# Замените user, password, localhost, 5432 на ваши настройки
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/personal227info?schema=public"

# JWT секретный ключ (сгенерируйте случайную строку минимум 32 символа)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production-min-32-chars"

# Node окружение
NODE_ENV="development"

# Insales OAuth настройки (можно оставить пустыми для начала)
INSALES_API_KEY=""
INSALES_API_SECRET=""
INSALES_SHOP_DOMAIN=""
INSALES_OAUTH_REDIRECT_URI="http://localhost:3000/api/auth/insales/callback"
```

### 6.3. Сгенерируйте JWT_SECRET:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Скопируйте результат и вставьте в `.env` вместо `your-super-secret-jwt-key-change-this-in-production-min-32-chars`

---

## Шаг 7: Применение схемы базы данных

```powershell
# Примените схему Prisma к базе данных
npm run db:push
```

Это создаст все таблицы в базе данных согласно схеме Prisma.

---

## Шаг 8: Создание тестовых пользователей (опционально)

```powershell
node create-all-test-users.js
```

---

## Шаг 9: Запуск проекта

```powershell
npm run dev
```

Откройте браузер: [http://localhost:3000](http://localhost:3000)

---

## 📋 Полный список команд для быстрой установки

Выполните команды по порядку:

```powershell
# 1. Проверка PostgreSQL
psql --version

# 2. Создание базы данных (если еще не создана)
psql -U postgres -c "CREATE DATABASE personal227info;"

# 3. Проверка Node.js
node --version
npm --version

# 4. Установка зависимостей
npm install

# 5. Генерация Prisma Client
npm run db:generate

# 6. Создание .env файла (вручную или через редактор)
# См. Шаг 6 выше

# 7. Применение схемы БД
npm run db:push

# 8. Запуск проекта
npm run dev
```

---

## ⚠️ Частые проблемы и решения

### Проблема: "psql: command not found"

**Решение:**
- Добавьте PostgreSQL в PATH:
  ```powershell
  # Для текущей сессии:
  $env:Path += ";C:\Program Files\PostgreSQL\18\bin"
  
  # Для постоянного добавления (замените 18 на вашу версию):
  [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\18\bin", [EnvironmentVariableTarget]::User)
  ```
  - Обычный путь: `C:\Program Files\PostgreSQL\<версия>\bin`
  - Или используйте полный путь: `& "C:\Program Files\PostgreSQL\18\bin\psql.exe"`
  - После добавления в PATH перезапустите терминал

### Проблема: "Can't reach database server"

**Решение:**
```powershell
# Проверьте, запущен ли сервис PostgreSQL
Get-Service postgresql*

# Если не запущен:
Start-Service postgresql*
```

### Проблема: "@prisma/client did not initialize yet"

**Решение:**
```powershell
npm run db:generate
```

### Проблема: "P1001: Can't reach database server"

**Решение:**
- Проверьте DATABASE_URL в `.env`
- Убедитесь, что PostgreSQL запущен
- Проверьте логин и пароль
- Убедитесь, что порт 5432 открыт

### Проблема: "password authentication failed"

**Решение:**
- Проверьте пароль в DATABASE_URL
- Или сбросьте пароль PostgreSQL (см. RESET_POSTGRES_PASSWORD.md)

---

## 🔧 Полезные команды

```powershell
# Открыть Prisma Studio (визуальный редактор БД)
npm run db:studio

# Создать миграцию
npm run db:migrate

# Проверить подключение к БД
psql -U postgres -d personal227info
```

---

## 📚 Дополнительная документация

- [Быстрый старт](./QUICK_START.md)
- [Настройка переменных окружения](./SETUP_ENV.md)
- [Сброс пароля PostgreSQL](./RESET_POSTGRES_PASSWORD.md)
- [README](./README.md)

