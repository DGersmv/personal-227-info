import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const secretKey = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

/**
 * Создать JWT токен
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  return jwt.sign(payload, secretKey, {
    expiresIn: '7d',
  });
}

/**
 * Верифицировать JWT токен
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const payload = jwt.verify(token, secretKey) as JWTPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Получить текущего пользователя из токена
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  // ВАЖНО: Всегда получаем роль пользователя из базы данных, а не из токена
  // Это гарантирует, что роль всегда актуальна и не меняется при создании объектов
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true, // Системная роль пользователя - постоянная, не меняется
      status: true,
    },
  });

  return user;
}

/**
 * Установить токен в cookie
 */
export async function setAuthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 дней
  });
}

/**
 * Удалить токен из cookie
 */
export async function removeAuthToken() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
}

/**
 * Хешировать пароль
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Проверить пароль
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

