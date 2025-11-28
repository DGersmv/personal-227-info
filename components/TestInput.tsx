'use client';

import { useState } from 'react';

export default function TestInput() {
  const [value, setValue] = useState('');

  return (
    <div style={{ padding: '20px', background: 'white', border: '2px solid red', margin: '20px' }}>
      <h2>Тестовое поле ввода</h2>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          console.log('onChange triggered:', e.target.value);
          setValue(e.target.value);
        }}
        onInput={(e) => {
          console.log('onInput triggered:', (e.target as HTMLInputElement).value);
          setValue((e.target as HTMLInputElement).value);
        }}
        onKeyDown={(e) => {
          console.log('onKeyDown:', e.key);
        }}
        onKeyPress={(e) => {
          console.log('onKeyPress:', e.key);
        }}
        onKeyUp={(e) => {
          console.log('onKeyUp:', e.key);
        }}
        style={{
          width: '100%',
          padding: '10px',
          fontSize: '16px',
          border: '2px solid blue',
          pointerEvents: 'auto',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
        placeholder="Попробуйте ввести текст здесь"
      />
      <p>Текущее значение: {value}</p>
    </div>
  );
}

