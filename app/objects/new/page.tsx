'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
}

interface Assignment {
  userId: number;
  role: string;
  user: User;
}

export default function NewObjectPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
  });
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'DESIGNER' | 'BUILDER' | 'CUSTOMER'>('DESIGNER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Поиск пользователей
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedRole]);

  const searchUsers = async () => {
    setSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}&role=${selectedRole}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Ошибка поиска пользователей:', err);
    } finally {
      setSearching(false);
    }
  };

  const addAssignment = (user: User) => {
    // Проверить, не добавлен ли уже этот пользователь
    if (assignments.some(a => a.userId === user.id)) {
      setError('Этот пользователь уже добавлен');
      return;
    }
    setAssignments([...assignments, { userId: user.id, role: selectedRole, user }]);
    setSearchQuery('');
    setSearchResults([]);
    setError('');
  };

  const removeAssignment = (userId: number) => {
    setAssignments(assignments.filter(a => a.userId !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/objects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          assignments: assignments.map(a => ({ userId: a.userId, role: a.role })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка создания объекта');
        setLoading(false);
        return;
      }

      // Успешное создание - редирект на страницу объекта
      // Используем window.location для надежного редиректа
      window.location.href = `/objects/${data.object.id}`;
    } catch (err) {
      setError('Ошибка соединения с сервером');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              href="/objects"
              className="text-primary-600 hover:underline mb-4 inline-block"
            >
              ← Назад к объектам
            </Link>
            <h1 className="text-4xl font-bold">Создать новый объект</h1>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="glass rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-2">
                  Название объекта <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                  }}
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  placeholder="Например: Дом на участке №15"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium mb-2">
                  Адрес
                </label>
                <input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => {
                    setFormData({ ...formData, address: e.target.value });
                  }}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  placeholder="Адрес объекта"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Описание
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                  }}
                  rows={4}
                  autoComplete="off"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  placeholder="Описание объекта..."
                />
              </div>

              {/* Добавление участников */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Участники проекта (опционально)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Добавьте проектировщиков, строителей или заказчиков к объекту
                </p>

                {/* Поиск пользователей */}
                <div className="mb-3">
                  <div className="flex gap-2 mb-2">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as 'DESIGNER' | 'BUILDER' | 'CUSTOMER')}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="DESIGNER">Проектировщик</option>
                      <option value="BUILDER">Строитель</option>
                      <option value="CUSTOMER">Заказчик</option>
                    </select>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                      }}
                      autoComplete="off"
                      data-lpignore="true"
                      data-form-type="other"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      placeholder="Поиск по email или имени..."
                    />
                  </div>

                  {/* Результаты поиска */}
                  {searchResults.length > 0 && (
                    <div className="border border-gray-300 rounded-lg bg-white max-h-40 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => addAssignment(user)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-sm">{user.name || user.email}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Список добавленных участников */}
                {assignments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Добавленные участники:</p>
                    {assignments.map((assignment) => (
                      <div
                        key={assignment.userId}
                        className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-sm">
                            {assignment.user.name || assignment.user.email}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            ({assignment.role === 'DESIGNER' ? 'Проектировщик' : assignment.role === 'BUILDER' ? 'Строитель' : 'Заказчик'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAssignment(assignment.userId)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Создание...' : 'Создать объект'}
                </button>
                <Link
                  href="/objects"
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Отмена
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}



