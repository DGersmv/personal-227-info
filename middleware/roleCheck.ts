import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { canUser, hasRole, hasAnyRole } from '@/lib/roles';

/**
 * Тип для конфигурации проверки роли
 */
export interface RoleCheckConfig {
  role?: UserRole;              // Требуемая роль
  roles?: UserRole[];           // Одна из ролей
  resource?: string;            // Ресурс для проверки прав
  action?: string;              // Действие для проверки прав
  allowAdmin?: boolean;         // Разрешить админу (по умолчанию true)
}

/**
 * Получить пользователя из запроса (нужно реализовать в зависимости от вашей системы аутентификации)
 */
async function getCurrentUser(request: NextRequest): Promise<any | null> {
  // TODO: Реализовать получение пользователя из JWT токена или сессии
  // Пример:
  // const token = request.cookies.get('token')?.value;
  // if (!token) return null;
  // const user = await verifyToken(token);
  // return user;
  
  return null; // Заглушка
}

/**
 * Middleware для проверки роли пользователя
 */
export async function checkRoleMiddleware(
  request: NextRequest,
  config: RoleCheckConfig
): Promise<NextResponse | null> {
  const user = await getCurrentUser(request);

  // Если пользователь не авторизован
  if (!user) {
    return NextResponse.json(
      { error: 'Необходима авторизация' },
      { status: 401 }
    );
  }

  // Проверка конкретной роли
  if (config.role) {
    if (!hasRole(user, config.role)) {
      // Админ имеет доступ ко всему (если не отключено)
      if (config.allowAdmin !== false && user.role === 'ADMIN') {
        return null; // Разрешить
      }
      return NextResponse.json(
        { error: 'Недостаточно прав доступа' },
        { status: 403 }
      );
    }
  }

  // Проверка одной из ролей
  if (config.roles && config.roles.length > 0) {
    if (!hasAnyRole(user, config.roles)) {
      // Админ имеет доступ ко всему (если не отключено)
      if (config.allowAdmin !== false && user.role === 'ADMIN') {
        return null; // Разрешить
      }
      return NextResponse.json(
        { error: 'Недостаточно прав доступа' },
        { status: 403 }
      );
    }
  }

  // Проверка прав доступа к ресурсу
  if (config.resource && config.action) {
    if (!canUser(user, config.resource, config.action)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения действия' },
        { status: 403 }
      );
    }
  }

  return null; // Все проверки пройдены
}

/**
 * Хелпер для создания middleware функции с предустановленной конфигурацией
 */
export function requireRole(role: UserRole) {
  return async (request: NextRequest) => {
    return checkRoleMiddleware(request, { role });
  };
}

/**
 * Хелпер для проверки одной из ролей
 */
export function requireAnyRole(roles: UserRole[]) {
  return async (request: NextRequest) => {
    return checkRoleMiddleware(request, { roles });
  };
}

/**
 * Хелпер для проверки прав доступа
 */
export function requirePermission(resource: string, action: string) {
  return async (request: NextRequest) => {
    return checkRoleMiddleware(request, { resource, action });
  };
}



