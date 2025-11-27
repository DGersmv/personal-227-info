# 🔑 Простой способ сброса пароля PostgreSQL

## Способ 1: Через меню Пуск (если pgAdmin установлен)

1. Нажмите **Win** (клавиша Windows)
2. Введите `pgAdmin`
3. Запустите **pgAdmin 4** из результатов поиска
4. Подключитесь к серверу и измените пароль

## Способ 2: Сброс через файл конфигурации (без pgAdmin)

### Шаг 1: Найдите файл pg_hba.conf

Обычно находится в:
```
C:\Program Files\PostgreSQL\16\data\pg_hba.conf
```

### Шаг 2: Откройте PowerShell **от имени администратора**

1. Нажмите **Win + X**
2. Выберите **"Windows PowerShell (администратор)"** или **"Терминал (администратор)"**

### Шаг 3: Сделайте резервную копию

```powershell
Copy-Item "C:\Program Files\PostgreSQL\16\data\pg_hba.conf" "C:\Program Files\PostgreSQL\16\data\pg_hba.conf.backup"
```

### Шаг 4: Откройте файл для редактирования

```powershell
notepad "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"
```

### Шаг 5: Найдите и измените строку

Найдите строку (обычно в конце файла):
```
host    all             all             127.0.0.1/32            scram-sha-256
```

Или:
```
host    all             all             127.0.0.1/32            md5
```

**Временно** замените на:
```
host    all             all             127.0.0.1/32            trust
```

**⚠️ ВАЖНО:** Это отключает проверку пароля для localhost! Используйте только для сброса.

### Шаг 6: Сохраните файл и закройте Notepad

### Шаг 7: Перезапустите PostgreSQL

```powershell
Restart-Service postgresql-16
```

### Шаг 8: Найдите psql.exe

```powershell
Get-ChildItem -Path "C:\Program Files\PostgreSQL" -Recurse -Filter "psql.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 FullName
```

### Шаг 9: Подключитесь без пароля и измените пароль

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost
```

В psql выполните:
```sql
ALTER USER postgres WITH PASSWORD 'admin123';
\q
```

### Шаг 10: Верните pg_hba.conf обратно

1. Откройте файл снова:
   ```powershell
   notepad "C:\Program Files\PostgreSQL\16\data\pg_hba.conf"
   ```

2. Верните обратно:
   ```
   host    all             all             127.0.0.1/32            scram-sha-256
   ```

3. Сохраните и перезапустите:
   ```powershell
   Restart-Service postgresql-16
   ```

## Способ 3: Создание нового пользователя (если не помните пароль postgres)

Выполните Шаги 1-7 из Способа 2, затем:

### Шаг 8: Создайте нового пользователя

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost
```

В psql:
```sql
CREATE USER myuser WITH PASSWORD 'mypassword';
ALTER USER myuser CREATEDB;
CREATE DATABASE personal227info;
GRANT ALL PRIVILEGES ON DATABASE personal227info TO myuser;
\q
```

### Шаг 9: Используйте нового пользователя в .env

```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/personal227info?schema=public"
```

### Шаг 10: Верните pg_hba.conf (см. Шаг 10 из Способа 2)

## ✅ После сброса пароля

1. Обновите `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:admin123@localhost:5432/personal227info?schema=public"
   ```

2. Убедитесь, что база данных создана:
   ```powershell
   & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE personal227info;"
   ```

3. Попробуйте:
   ```bash
   npm run db:push
   ```



