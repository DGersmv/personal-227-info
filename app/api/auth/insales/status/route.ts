import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Проверка статуса авторизации через insales
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Не авторизован' },
      { status: 401 }
    );
  }

  // Проверить, есть ли связь с insales
  const insalesAccount = await prisma.inSalesAccount.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json({
    isAuthorized: true,
    hasInsalesAccount: !!insalesAccount,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    insalesAccount: insalesAccount
      ? {
          shopDomain: insalesAccount.shopDomain,
          isActive: insalesAccount.isActive,
          lastLogin: insalesAccount.lastLogin,
        }
      : null,
  });
}



