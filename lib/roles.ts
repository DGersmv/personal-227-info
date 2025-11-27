import { UserRole } from '@prisma/client';

/**
 * Типы для системы ролей
 */
export type Role = UserRole;

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  status: string;
}

/**
 * Проверка, имеет ли пользователь определенную роль
 */
export function hasRole(user: User | null, role: UserRole): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Проверка, имеет ли пользователь одну из ролей
 */
export function hasAnyRole(user: User | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

/**
 * Проверка, является ли пользователь администратором
 */
export function isAdmin(user: User | null): boolean {
  return hasRole(user, 'ADMIN');
}

/**
 * Проверка, является ли пользователь проектировщиком
 */
export function isDesigner(user: User | null): boolean {
  return hasRole(user, 'DESIGNER');
}

/**
 * Проверка, является ли пользователь строителем
 */
export function isBuilder(user: User | null): boolean {
  return hasRole(user, 'BUILDER');
}

/**
 * Проверка, является ли пользователь заказчиком
 */
export function isCustomer(user: User | null): boolean {
  return hasRole(user, 'CUSTOMER');
}

/**
 * Проверка прав доступа к ресурсу
 */
export interface PermissionCheck {
  resource: string; // 'project', 'object', 'document', 'photo', etc.
  action: string;   // 'create', 'read', 'update', 'delete'
}

/**
 * Проверка разрешения на действие
 */
export function canUser(
  user: User | null,
  resource: string,
  action: string
): boolean {
  if (!user) return false;

  // Администратор имеет все права
  if (isAdmin(user)) return true;

  // Проверка прав по ролям
  switch (user.role) {
    case 'DESIGNER':
      return canDesigner(resource, action);
    case 'BUILDER':
      return canBuilder(resource, action);
    case 'CUSTOMER':
      return canCustomer(resource, action);
    default:
      return false;
  }
}

/**
 * Права Проектировщика
 */
function canDesigner(resource: string, action: string): boolean {
  const permissions: Record<string, string[]> = {
    project: ['create', 'read', 'update', 'delete'], // Может управлять проектами
    object: ['read', 'update'],                       // Может просматривать и редактировать объекты
    document: ['create', 'read', 'update'],          // Может загружать и редактировать документы
    photo: ['read'],                                 // Может просматривать фото
    panorama: ['read'],                              // Может просматривать панорамы
    message: ['create', 'read'],                     // Может отправлять и читать сообщения
    comment: ['create', 'read'],                     // Может комментировать
  };

  return permissions[resource]?.includes(action) ?? false;
}

/**
 * Права Строителя
 */
function canBuilder(resource: string, action: string): boolean {
  const permissions: Record<string, string[]> = {
    project: ['read'],                               // Может только просматривать проекты
    object: ['read'],                                // Может просматривать объекты
    document: ['read'],                              // Может просматривать документы
    photo: ['create', 'read', 'update', 'delete'],  // Может загружать и управлять фото
    panorama: ['create', 'read', 'update', 'delete'], // Может загружать и управлять панорамами
    message: ['create', 'read'],                     // Может отправлять и читать сообщения
    comment: ['create', 'read'],                     // Может комментировать
  };

  return permissions[resource]?.includes(action) ?? false;
}

/**
 * Права Заказчика
 */
function canCustomer(resource: string, action: string): boolean {
  const permissions: Record<string, string[]> = {
    project: ['read'],                               // Может только просматривать проекты
    object: ['read'],                                // Может просматривать свои объекты
    document: ['create', 'read', 'update', 'delete'], // Может загружать свои документы (договоры, акты) и управлять ими
    photo: ['create', 'read', 'delete'],             // Может загружать свои фото и просматривать видимые
    panorama: ['read'],                              // Может просматривать панорамы (только видимые)
    message: ['create', 'read'],                     // Может отправлять и читать сообщения
    comment: ['create', 'read'],                     // Может комментировать
    payment: ['create', 'read'],                     // Может оплачивать и просматривать платежи
  };

  return permissions[resource]?.includes(action) ?? false;
}

/**
 * Получить список разрешенных действий для роли
 */
export function getAllowedActions(role: UserRole, resource: string): string[] {
  switch (role) {
    case 'ADMIN':
      return ['create', 'read', 'update', 'delete'];
    case 'DESIGNER':
      return canDesigner(resource, '') ? ['create', 'read', 'update', 'delete'] : [];
    case 'BUILDER':
      return canBuilder(resource, '') ? ['create', 'read', 'update', 'delete'] : [];
    case 'CUSTOMER':
      // Для документов и фото - может создавать и удалять свои
      if (resource === 'document' || resource === 'photo') {
        return canCustomer(resource, 'create') ? ['create', 'read', 'delete'] : ['read'];
      }
      return canCustomer(resource, '') ? ['read'] : [];
    default:
      return [];
  }
}

/**
 * Получить человекочитаемое название роли
 */
export function getRoleName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    DESIGNER: 'Проектировщик',
    BUILDER: 'Строитель',
    CUSTOMER: 'Заказчик',
    ADMIN: 'Администратор',
  };
  return names[role] || role;
}

/**
 * Получить описание роли
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    DESIGNER: 'Создает и управляет проектами, загружает проектную документацию',
    BUILDER: 'Загружает фото и панорамы строительства, отмечает выполненные работы',
    CUSTOMER: 'Просматривает проекты и документы, загружает свои документы (договоры, акты), оплачивает услуги',
    ADMIN: 'Полный доступ ко всем функциям системы',
  };
  return descriptions[role] || '';
}

