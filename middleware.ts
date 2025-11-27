import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Маршруты, которые требуют авторизации (кроме главной, там своя логика)
const protectedRoutes = ['/objects', '/projects', '/profile'];

// Маршруты, которые доступны только неавторизованным
const authRoutes = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Проверка защищенных маршрутов
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Проверка маршрутов авторизации
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Если пользователь не авторизован и пытается зайти на защищенный маршрут
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Если пользователь авторизован и пытается зайти на страницы входа/регистрации
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

