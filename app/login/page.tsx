import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

/**
 * Страница входа теперь на главной странице
 * Редиректим на главную
 */
export default async function LoginPage() {
  const user = await getCurrentUser();
  
  // Если уже авторизован - редирект на главную
  if (user) {
    redirect('/');
  }
  
  // Если не авторизован - тоже на главную (там будет экран входа)
  redirect('/');
}

