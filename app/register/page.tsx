import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

/**
 * Страница регистрации теперь на главной странице
 * Регистрация происходит автоматически при первом входе через insales
 * Редиректим на главную
 */
export default async function RegisterPage() {
  const user = await getCurrentUser();
  
  // Если уже авторизован - редирект на главную
  if (user) {
    redirect('/');
  }
  
  // Если не авторизован - тоже на главную (там будет экран входа)
  redirect('/');
}

