'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  // Используем нативные DOM события вместо React синтетических
  // И обновляем значение напрямую в DOM, минуя React
  useEffect(() => {
    const emailInput = emailRef.current;
    
    if (emailInput) {
      const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        // Обновляем state для отправки формы
        setEmail(value);
        // Принудительно обновляем значение в DOM (на случай если React его сбросил)
        if (emailInput.value !== value) {
          emailInput.value = value;
        }
      };
      
      const handleKeyDown = (e: KeyboardEvent) => {
        // Не блокируем событие
      };
      
      emailInput.addEventListener('input', handleInput, true);
      emailInput.addEventListener('keydown', handleKeyDown, true);
      
      return () => {
        emailInput.removeEventListener('input', handleInput, true);
        emailInput.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, []);
  
  useEffect(() => {
    const passwordInput = passwordRef.current;
    
    if (passwordInput) {
      const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement;
        const value = target.value;
        // Обновляем state для отправки формы
        setPassword(value);
        // Принудительно обновляем значение в DOM (на случай если React его сбросил)
        if (passwordInput.value !== value) {
          passwordInput.value = value;
        }
      };
      
      const handleKeyDown = (e: KeyboardEvent) => {
        // Не блокируем событие
      };
      
      passwordInput.addEventListener('input', handleInput, true);
      passwordInput.addEventListener('keydown', handleKeyDown, true);
      
      return () => {
        passwordInput.removeEventListener('input', handleInput, true);
        passwordInput.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Получаем значения напрямую из DOM элементов
    const emailValue = emailRef.current?.value || email;
    const passwordValue = passwordRef.current?.value || password;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка входа');
        setLoading(false);
        return;
      }

      // Успешный вход - полная перезагрузка страницы для применения cookie
      window.location.href = '/';
    } catch (err) {
      setError('Ошибка соединения с сервером');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        <input
          ref={emailRef}
          key="email-input"
          type="email"
          placeholder="Email (test@example.com)"
          required
          disabled={loading}
          autoComplete="off"
          suppressHydrationWarning
          style={{ 
            color: 'black',
            backgroundColor: 'white',
            WebkitTextFillColor: 'black',
            caretColor: 'black',
          }}
          className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white placeholder:text-gray-400 placeholder:opacity-60"
        />
        <input
          ref={passwordRef}
          key="password-input"
          type="password"
          placeholder="Пароль (test123)"
          required
          disabled={loading}
          autoComplete="new-password"
          suppressHydrationWarning
          style={{ 
            color: 'black',
            backgroundColor: 'white',
            WebkitTextFillColor: 'black',
            caretColor: 'black',
          }}
          className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-white placeholder:text-gray-400 placeholder:opacity-60"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        {loading ? 'Вход...' : 'Войти (тест)'}
      </button>
      
      <p className="text-xs text-gray-500 text-center">
        Тестовый пользователь: test@example.com / test123
      </p>
    </form>
  );
}


