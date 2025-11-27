import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * POST /api/portfolio/upload - Загрузить изображение для портфолио (аватар или обложка)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Не авторизован' },
        { status: 401 }
      );
    }

    // Только Проектировщик и Строитель могут загружать изображения
    if (user.role !== 'DESIGNER' && user.role !== 'BUILDER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Недостаточно прав' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'avatar' или 'cover'

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не предоставлен' },
        { status: 400 }
      );
    }

    if (!type || (type !== 'avatar' && type !== 'cover')) {
      return NextResponse.json(
        { error: 'Неверный тип файла. Используйте "avatar" или "cover"' },
        { status: 400 }
      );
    }

    // Проверить тип файла (только изображения)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Неподдерживаемый тип файла. Разрешены: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // Проверить размер файла (макс 10 MB для изображений)
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимальный размер: 10 MB' },
        { status: 400 }
      );
    }

    // Создать директорию, если её нет
    const uploadsDir = join(process.cwd(), 'public', 'portfolio', type === 'avatar' ? 'avatars' : 'covers');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Генерировать уникальное имя файла
    const timestamp = Date.now();
    const originalName = file.name;
    const fileExtension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${user.id}-${timestamp}.${fileExtension}`;
    const filePath = join(uploadsDir, filename);

    // Сохранить файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // URL для доступа к файлу
    const url = `/portfolio/${type === 'avatar' ? 'avatars' : 'covers'}/${filename}`;

    // Вернуть информацию о файле
    return NextResponse.json({
      success: true,
      url,
      filename,
      originalName,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error('Ошибка загрузки изображения портфолио:', error);
    return NextResponse.json(
      { error: 'Ошибка загрузки изображения' },
      { status: 500 }
    );
  }
}


