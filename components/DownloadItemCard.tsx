'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DownloadItem {
  id: number;
  name: string;
  description: string | null;
  type: string;
  version: string | null;
  author: string | null;
  price: number | null;
  category: string | null;
  downloadCount: number;
  isPurchased: boolean;
  isFree: boolean;
  iconUrl: string | null;
}

interface DownloadItemCardProps {
  item: DownloadItem;
  userRole: string;
}

export default function DownloadItemCard({ item, userRole }: DownloadItemCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const typeLabels: Record<string, string> = {
    PLUGIN: 'Плагин',
    PROGRAM: 'Программа',
    TEMPLATE: 'Шаблон',
    LIBRARY: 'Библиотека',
    OTHER: 'Другое',
  };

  const handleDownload = async () => {
    if (!item.isFree && !item.isPurchased) {
      // Нужна покупка
      await handlePurchase();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/downloads/${item.id}/download`);
      
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Ошибка скачивания');
        setLoading(false);
        return;
      }

      // Получить blob и скачать
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      router.refresh();
    } catch (err) {
      setError('Ошибка скачивания файла');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/downloads/${item.id}/purchase`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка покупки');
        setLoading(false);
        return;
      }

      if (data.requiresPayment) {
        // TODO: Редирект на оплату в insales
        alert('Оплата через insales будет реализована позже. Пока можно скачать только бесплатные загрузки.');
      } else {
        // Бесплатная загрузка - можно сразу скачивать
        await handleDownload();
      }
    } catch (err) {
      setError('Ошибка покупки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-lg p-6 hover:bg-white/20 transition">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <div className="flex items-start gap-4 mb-4">
        {item.iconUrl ? (
          <img
            src={item.iconUrl}
            alt={item.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl">
            {item.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">{item.name}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
              {typeLabels[item.type] || item.type}
            </span>
            {item.version && <span>v{item.version}</span>}
          </div>
        </div>
      </div>

      {item.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          {item.isFree ? (
            <span className="text-green-600 font-semibold">Бесплатно</span>
          ) : (
            <span className="text-gray-900 font-semibold">
              {item.price?.toLocaleString('ru-RU')} ₽
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          Скачиваний: {item.downloadCount}
        </div>
      </div>

      {item.author && (
        <div className="text-sm text-gray-500 mb-4">Автор: {item.author}</div>
      )}

      <button
        onClick={handleDownload}
        disabled={loading || (!item.isFree && !item.isPurchased)}
        className={`w-full py-2 rounded-lg transition ${
          item.isFree || item.isPurchased
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading
          ? 'Загрузка...'
          : item.isFree || item.isPurchased
          ? 'Скачать'
          : 'Купить и скачать'}
      </button>

      {!item.isFree && !item.isPurchased && (
        <p className="text-xs text-gray-500 mt-2 text-center">
          Требуется оплата
        </p>
      )}

      {item.isPurchased && (
        <div className="mt-2 text-center">
          <p className="text-xs text-green-600 font-medium">
            Куплено
          </p>
          <p className="text-xs text-gray-500">
            Доступно для скачивания
          </p>
        </div>
      )}

      {item.isFree && (
        <p className="text-xs text-green-600 mt-2 text-center">
          Бесплатная загрузка
        </p>
      )}
    </div>
  );
}

