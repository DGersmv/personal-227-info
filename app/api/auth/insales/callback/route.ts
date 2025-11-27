import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getInsalesUser, isInsalesConfigured } from '@/lib/insales';
import { prisma } from '@/lib/prisma';
import { createToken, setAuthToken } from '@/lib/auth';
import { UserRole } from '@prisma/client';

/**
 * Обработка callback от insales после авторизации
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Проверка ошибки от insales
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  // Проверка наличия кода
  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', request.url)
    );
  }

  // Проверка state (защита от CSRF)
  const savedState = request.cookies.get('insales_oauth_state')?.value;
  if (!state || state !== savedState) {
    return NextResponse.redirect(
      new URL('/login?error=invalid_state', request.url)
    );
  }

  if (!isInsalesConfigured()) {
    return NextResponse.redirect(
      new URL('/login?error=insales_not_configured', request.url)
    );
  }

  try {
    // Обменять код на access_token
    const tokenData = await exchangeCodeForToken(code);
    if (!tokenData) {
      return NextResponse.redirect(
        new URL('/login?error=token_exchange_failed', request.url)
      );
    }

    // Получить данные пользователя из insales
    const insalesUser = await getInsalesUser(tokenData.access_token);
    if (!insalesUser || !insalesUser.email) {
      return NextResponse.redirect(
        new URL('/login?error=user_data_failed', request.url)
      );
    }

    // Найти или создать пользователя в нашей БД
    let user = await prisma.user.findUnique({
      where: { email: insalesUser.email },
    });

    if (!user) {
      // Создать нового пользователя
      // По умолчанию роль CUSTOMER, можно будет изменить в админке
      user = await prisma.user.create({
        data: {
          email: insalesUser.email,
          name: insalesUser.name || null,
          role: 'CUSTOMER',
          password: '', // Пароль не нужен, авторизация через insales
          status: 'ACTIVE',
        },
      });
    } else {
      // Обновить данные существующего пользователя
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: insalesUser.name || user.name,
          lastLogin: new Date(),
        },
      });
    }

    // Сохранить связь с insales аккаунтом
    await prisma.inSalesAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        insalesUserId: insalesUser.id.toString(),
        insalesEmail: insalesUser.email,
        accessToken: tokenData.access_token,
        refreshToken: (tokenData as any).refresh_token || null,
        shopDomain: process.env.INSALES_SHOP_DOMAIN || '',
        isActive: true,
        lastLogin: new Date(),
      },
      update: {
        insalesEmail: insalesUser.email,
        accessToken: tokenData.access_token,
        refreshToken: (tokenData as any).refresh_token || undefined,
        lastLogin: new Date(),
        isActive: true,
      },
    });

    // Создать JWT токен для нашей системы
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Установить токен в cookie
    // Редирект на главную страницу (теперь это Dashboard)
    const response = NextResponse.redirect(new URL('/', request.url));
    await setAuthToken(token);

    // Удалить state cookie
    response.cookies.delete('insales_oauth_state');

    return response;
  } catch (error) {
    console.error('Ошибка при обработке callback insales:', error);
    return NextResponse.redirect(
      new URL('/login?error=internal_error', request.url)
    );
  }
}

