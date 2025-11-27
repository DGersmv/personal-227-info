'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function InsalesLoginButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const error = searchParams.get('error');

  const handleLogin = () => {
    setLoading(true);
    // Редирект на API route, который инициирует OAuth
    router.push('/api/auth/insales/init');
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error === 'missing_code' && 'Ошибка авторизации: отсутствует код'}
          {error === 'invalid_state' && 'Ошибка безопасности: неверный state'}
          {error === 'insales_not_configured' && 'Insales не настроен'}
          {error === 'token_exchange_failed' && 'Ошибка обмена токена'}
          {error === 'user_data_failed' && 'Ошибка получения данных пользователя'}
          {error === 'internal_error' && 'Внутренняя ошибка сервера'}
          {!['missing_code', 'invalid_state', 'insales_not_configured', 'token_exchange_failed', 'user_data_failed', 'internal_error'].includes(error) && `Ошибка: ${error}`}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Перенаправление...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Войти через insales
          </>
        )}
      </button>

      <p className="text-sm text-gray-600 text-center">
        Авторизация происходит через ваш аккаунт в insales
      </p>
    </div>
  );
}



