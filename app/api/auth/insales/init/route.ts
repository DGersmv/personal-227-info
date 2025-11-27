import { NextRequest, NextResponse } from 'next/server';
import { getInsalesAuthUrl, isInsalesConfigured } from '@/lib/insales';
import crypto from 'crypto';

/**
 * Инициализация OAuth авторизации через insales
 * Генерирует state для безопасности и редиректит на страницу авторизации insales
 */
export async function GET(request: NextRequest) {
  if (!isInsalesConfigured()) {
    return NextResponse.json(
      { error: 'Insales не настроен. Проверьте переменные окружения.' },
      { status: 500 }
    );
  }

  // Генерируем state для защиты от CSRF
  const state = crypto.randomBytes(32).toString('hex');
  
  // Сохраняем state в cookie (можно также использовать сессию или БД)
  const response = NextResponse.redirect(getInsalesAuthUrl(state));
  response.cookies.set('insales_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 минут
  });

  return response;
}



