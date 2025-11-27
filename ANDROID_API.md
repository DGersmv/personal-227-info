# 📱 API для Android приложения

## Стратегия аутентификации

### **Гибридный подход: insales OAuth + JWT токены**

**Для веб:**
- OAuth через insales → JWT токен в cookie (как сейчас)

**Для Android:**
- OAuth через insales (в браузере/WebView) → получает JWT токен в JSON → использует в заголовках `Authorization: Bearer <token>`

### 1. **Аутентификация для Android**

**Текущая реализация:** 
- Веб: JWT через cookies после insales OAuth ✅
- Android: не поддерживается ❌

**Решение:**
1. **Расширить `/api/auth/insales/callback`:**
   - Определять тип клиента (веб/мобильный)
   - Для мобильного: возвращать JWT токен в JSON ответе
   - Для веб: сохранять в cookie (как сейчас)

2. **Расширить `getCurrentUser()`:**
   - Поддержка токена из заголовка `Authorization: Bearer <token>`
   - Поддержка токена из cookie (для веб)
   - Приоритет: заголовок > cookie

3. **Создать `/api/auth/token/refresh`:**
   - Обновление токена для Android приложения
   - Использование refresh token из insales

### 2. **Загрузка фото**

**Текущий API:** `/api/objects/[id]/photos` (POST)

**Требования:**
- ✅ Поддержка `multipart/form-data` (уже есть)
- ✅ Параметры: `file`, `folderId`, `stageId`, `isVisibleToCustomer`
- ✅ Права доступа: DESIGNER, BUILDER, CUSTOMER, ADMIN могут загружать фото
- ⚠️ Нужно добавить поддержку токена в заголовке

### 3. **Загрузка панорам**

**Статус:** ❌ Не реализовано

**Нужно создать:**
- API: `/api/objects/[id]/panoramas` (POST, GET)
- Поддержка `multipart/form-data`
- Параметры: `file`, `isVisibleToCustomer`, `projectionType`
- **Права на загрузку:** DESIGNER, BUILDER, CUSTOMER, ADMIN (проектировщики могут загружать из BIM программ)
- Создание миниатюр для панорам

---

## План реализации

### Этап 1: Расширение аутентификации

1. **Обновить `lib/auth.ts`:**
   - Добавить функцию `getCurrentUserFromHeader()` для получения токена из заголовка
   - Обновить `getCurrentUser()` для поддержки обоих способов (cookie + header)

2. **Обновить API `/api/auth/insales/callback`:**
   - Определять тип клиента по заголовку `X-Client-Type: mobile`
   - Для мобильного: возвращать JWT токен в JSON ответе
   - Для веб: сохранять в cookie и редиректить (как сейчас)
   - Возвращать также refresh token (если есть)

3. **Обновить все API endpoints:**
   - Поддержка аутентификации через заголовок `Authorization: Bearer <token>`
   - Приоритет: заголовок > cookie (для совместимости)

4. **Создать `/api/auth/token/refresh`:**
   - Обновление JWT токена для Android
   - Использование refresh token из insales (если есть)
   - Возврат нового JWT токена

### Этап 2: API для панорам

1. **Создать `/api/objects/[id]/panoramas`:**
   - GET - получить список панорам
   - POST - загрузить панораму
   - Поддержка multipart/form-data
   - Создание миниатюр

2. **Создать `/api/files/panoramas/[objectId]/[filename]`:**
   - GET - получить панораму с проверкой прав
   - Аналогично фото

### Этап 3: Документация API

1. **Создать `API_DOCUMENTATION.md`:**
   - Описание всех endpoints
   - Примеры запросов для Android
   - Формат ответов
   - Коды ошибок

---

## Примеры использования для Android

### Аутентификация через insales OAuth

**Шаг 1: Инициализация OAuth**
```kotlin
// GET /api/auth/insales/init
// Открыть в WebView или браузере
val authUrl = "https://your-domain.com/api/auth/insales/init"
// WebView открывает URL, пользователь авторизуется в insales
```

**Шаг 2: Обработка callback**
```kotlin
// После авторизации insales редиректит на:
// GET /api/auth/insales/callback?code=XXX&state=YYY

// Для мобильного приложения нужно:
// 1. Перехватить callback URL
// 2. Извлечь code и state
// 3. Отправить на сервер с заголовком X-Client-Type: mobile

val response = httpClient.get("/api/auth/insales/callback") {
    parameter("code", code)
    parameter("state", state)
    header("X-Client-Type", "mobile") // Указываем, что это мобильное приложение
}

// Сервер вернет JWT токен в JSON:
val token = response.jsonObject["token"] as String
val refreshToken = response.jsonObject["refreshToken"] as String? // Если есть
```

**Шаг 3: Использование токена**
```kotlin
// Все последующие запросы с токеном:
httpClient.post("/api/objects/$objectId/photos") {
    header("Authorization", "Bearer $token")
    // ...
}
```

### Загрузка фото

```kotlin
// POST /api/objects/[id]/photos
val formData = FormDataContent(
    formData {
        append("file", photoFile, Headers.build {
            append(HttpHeaders.ContentType, "image/jpeg")
            append(HttpHeaders.ContentDisposition, "form-data; name=\"file\"; filename=\"photo.jpg\"")
        })
        append("isVisibleToCustomer", "true")
        append("folderId", folderId.toString())
    }
)

val response = httpClient.post("/api/objects/$objectId/photos") {
    header("Authorization", "Bearer $token")
    contentType(ContentType.MultiPart.FormData)
    body = formData
}
```

### Загрузка панорамы

```kotlin
// POST /api/objects/[id]/panoramas
val formData = FormDataContent(
    formData {
        append("file", panoramaFile, Headers.build {
            append(HttpHeaders.ContentType, "image/jpeg")
            append(HttpHeaders.ContentDisposition, "form-data; name=\"file\"; filename=\"panorama.jpg\"")
        })
        append("isVisibleToCustomer", "true")
        append("projectionType", "EQUIRECTANGULAR")
    }
)

val response = httpClient.post("/api/objects/$objectId/panoramas") {
    header("Authorization", "Bearer $token")
    contentType(ContentType.MultiPart.FormData)
    body = formData
}
```

---

## Структура ответов API

### Успешная загрузка фото

```json
{
  "success": true,
  "photo": {
    "id": 123,
    "filename": "1703123456789-abc123.jpg",
    "originalName": "photo.jpg",
    "filePath": "/api/files/photos/1/1703123456789-abc123.jpg",
    "fileSize": 1024000,
    "mimeType": "image/jpeg",
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Ошибка

```json
{
  "error": "Недостаточно прав для загрузки фото"
}
```

---

## Коды ошибок

- `401` - Не авторизован (нет токена или токен невалидный)
- `403` - Недостаточно прав
- `404` - Объект не найден
- `400` - Неверные параметры запроса
- `413` - Файл слишком большой
- `500` - Внутренняя ошибка сервера

