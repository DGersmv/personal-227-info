'use client';

import { useState, useEffect } from 'react';
import DownloadItemCard from './DownloadItemCard';

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

interface DownloadsListProps {
  userRole: string;
}

export default function DownloadsList({ userRole }: DownloadsListProps) {
  const [items, setItems] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'catalog' | 'my'>('catalog'); // catalog - каталог, my - мои загрузки
  const [filter, setFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all'); // all, free, paid
  const [programFilter, setProgramFilter] = useState<string>('all'); // all, archicad, revit, russian
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadDownloads();
  }, [filter, priceFilter, programFilter, viewMode]);

  const loadDownloads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (viewMode === 'my') {
        params.append('my', 'true'); // Только купленные загрузки
      }
      if (filter !== 'all') {
        params.append('type', filter);
      }
      if (priceFilter !== 'all') {
        params.append('price', priceFilter);
      }
      if (programFilter !== 'all') {
        params.append('program', programFilter);
      }
      
      const url = params.toString() 
        ? `/api/downloads?${params.toString()}` 
        : '/api/downloads';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки загрузок:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    // Поиск по тексту
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        item.name.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.category?.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const typeLabels: Record<string, string> = {
    PLUGIN: 'Плагин',
    PROGRAM: 'Программа',
    TEMPLATE: 'Шаблон',
    LIBRARY: 'Библиотека',
    OTHER: 'Другое',
  };

  return (
    <div>
      {/* Переключение между Каталогом и Моими загрузками */}
      <div className="glass rounded-lg p-4 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('catalog')}
            className={`px-6 py-3 rounded-lg transition font-medium ${
              viewMode === 'catalog'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Каталог
          </button>
          <button
            onClick={() => setViewMode('my')}
            className={`px-6 py-3 rounded-lg transition font-medium ${
              viewMode === 'my'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Мои загрузки
          </button>
        </div>
        {viewMode === 'my' && (
          <p className="text-sm text-gray-600 mt-3">
            Здесь отображаются только купленные и скачанные вами загрузки
          </p>
        )}
        {viewMode === 'catalog' && (
          <p className="text-sm text-gray-600 mt-3">
            Просмотр всех доступных загрузок. Вы можете купить и скачать платные загрузки
          </p>
        )}
      </div>

      {/* Фильтры и поиск */}
      <div className="glass rounded-lg p-6 mb-6">
        {/* Поиск */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск по названию, описанию или категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Фильтры (скрыты в режиме "Мои загрузки") */}
        {viewMode === 'catalog' && (
          <div className="space-y-4">
            {/* Тип загрузки */}
            <div>
              <label className="block text-sm font-medium mb-2">Тип:</label>
              <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  filter === 'all'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setFilter('PLUGIN')}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  filter === 'PLUGIN'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Плагины
              </button>
              <button
                onClick={() => setFilter('PROGRAM')}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  filter === 'PROGRAM'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Программы
              </button>
              <button
                onClick={() => setFilter('TEMPLATE')}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  filter === 'TEMPLATE'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Шаблоны
              </button>
              <button
                onClick={() => setFilter('LIBRARY')}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  filter === 'LIBRARY'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Библиотеки
              </button>
              </div>
            </div>

            {/* Цена */}
            <div>
              <label className="block text-sm font-medium mb-2">Цена:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setPriceFilter('all')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    priceFilter === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Все
                </button>
                <button
                  onClick={() => setPriceFilter('free')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    priceFilter === 'free'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Бесплатные
                </button>
                <button
                  onClick={() => setPriceFilter('paid')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    priceFilter === 'paid'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Платные
                </button>
              </div>
            </div>

            {/* Программы */}
            <div>
              <label className="block text-sm font-medium mb-2">Программы:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setProgramFilter('all')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    programFilter === 'all'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Все
                </button>
                <button
                  onClick={() => setProgramFilter('archicad')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    programFilter === 'archicad'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Archicad
                </button>
                <button
                  onClick={() => setProgramFilter('revit')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    programFilter === 'revit'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Revit
                </button>
                <button
                  onClick={() => setProgramFilter('russian')}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    programFilter === 'russian'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Российские
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Список загрузок */}
      {loading ? (
        <div className="text-center py-12 text-gray-600">Загрузка...</div>
      ) : filteredItems.length === 0 ? (
        <div className="glass rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg">
            {search 
              ? 'Ничего не найдено' 
              : viewMode === 'my'
              ? 'У вас пока нет купленных загрузок'
              : 'Загрузки пока не добавлены'}
          </p>
          {viewMode === 'catalog' && (
            <p className="text-sm text-gray-500 mt-2">
              Перейдите в каталог, чтобы найти и купить загрузки
            </p>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <DownloadItemCard key={item.id} item={item} userRole={userRole} />
          ))}
        </div>
      )}
    </div>
  );
}

