import { UserRole } from '@prisma/client';

/**
 * Расширенные типы для системы ролей
 */
export type { UserRole };

/**
 * Тип пользователя с ролью
 */
export interface UserWithRole {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  status: string;
  createdAt: Date;
  lastLogin: Date | null;
}

/**
 * Тип для проверки прав доступа
 */
export interface Permission {
  resource: string;
  action: string;
  allowed: boolean;
}

/**
 * Тип для конфигурации прав роли
 */
export interface RolePermissions {
  role: UserRole;
  permissions: Record<string, string[]>; // resource -> actions[]
}

/**
 * Константы ролей
 */
export const ROLES = {
  DESIGNER: 'DESIGNER' as UserRole,
  BUILDER: 'BUILDER' as UserRole,
  CUSTOMER: 'CUSTOMER' as UserRole,
  ADMIN: 'ADMIN' as UserRole,
} as const;

/**
 * Все доступные роли
 */
export const ALL_ROLES: UserRole[] = [
  ROLES.DESIGNER,
  ROLES.BUILDER,
  ROLES.CUSTOMER,
  ROLES.ADMIN,
];

/**
 * Роли пользователей (без админа)
 */
export const USER_ROLES: UserRole[] = [
  ROLES.DESIGNER,
  ROLES.BUILDER,
  ROLES.CUSTOMER,
];



