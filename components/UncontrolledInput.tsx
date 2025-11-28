'use client';

import { useRef } from 'react';

export default function UncontrolledInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      alert('Введенное значение: ' + inputRef.current.value);
    }
  };

  return (
    <div style={{ padding: '20px', background: 'cyan', border: '5px solid blue', margin: '20px' }}>
      <h2 style={{ color: 'black' }}>UNCONTROLLED INPUT (без React state):</h2>
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          defaultValue=""
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '20px',
            border: '5px solid blue',
            background: 'white',
            pointerEvents: 'auto',
            userSelect: 'text',
          }}
          placeholder="ВВЕДИТЕ ТЕКСТ - это uncontrolled input"
        />
        <button type="submit" style={{ marginTop: '10px', padding: '10px' }}>
          Показать значение
        </button>
      </form>
      <p style={{ color: 'black', marginTop: '10px' }}>
        Это поле НЕ использует React state (value/onChange), работает напрямую с DOM
      </p>
    </div>
  );
}

