import { redirect } from 'next/navigation';

/**
 * Редирект на главную страницу, так как Dashboard теперь на главной
 */
export default async function DashboardPage() {
  redirect('/');
}

