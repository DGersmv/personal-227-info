'use client';

import { useEffect, useRef } from 'react';

export default function DirectInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const input = inputRef.current;

    // Работаем напрямую с DOM, минуя React
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      console.log('DIRECT INPUT VALUE:', target.value);
      // Обновляем значение напрямую в DOM
      if (target.value !== input.value) {
        input.value = target.value;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      console.log('DIRECT KEYDOWN:', e.key, e.code);
      // НЕ блокируем событие
    };

    // Добавляем обработчики напрямую к DOM элементу
    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeyDown);
    input.addEventListener('keypress', handleKeyDown);
    input.addEventListener('keyup', handleKeyDown);

    // Убеждаемся, что поле доступно
    input.style.pointerEvents = 'auto';
    input.style.userSelect = 'text';
    input.removeAttribute('readonly');
    input.removeAttribute('disabled');

    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keydown', handleKeyDown);
      input.removeEventListener('keypress', handleKeyDown);
      input.removeEventListener('keyup', handleKeyDown);
    };
  }, []);

  return (
    <div style={{ padding: '20px', background: 'lime', border: '5px solid green', margin: '20px' }}>
      <h2 style={{ color: 'black' }}>ПОЛЕ С ПРЯМЫМ ДОСТУПОМ К DOM:</h2>
      <input
        ref={inputRef}
        type="text"
        defaultValue=""
        style={{
          width: '100%',
          padding: '15px',
          fontSize: '20px',
          border: '5px solid green',
          background: 'white',
          pointerEvents: 'auto',
          userSelect: 'text',
        }}
        placeholder="ВВЕДИТЕ ТЕКСТ СЮДА"
      />
      <p style={{ color: 'black', marginTop: '10px' }}>
        Это поле работает напрямую с DOM, минуя React state
      </p>
    </div>
  );
}

