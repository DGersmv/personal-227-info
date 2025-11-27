'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PortfolioCard from './PortfolioCard';

interface Assignment {
  id: number;
  userId: number;
  objectId: number;
  role: string;
  assignedAt: string;
  user: {
    id: number;
    email: string;
    name: string | null;
    role: string;
  };
}

interface ObjectAssignmentsProps {
  objectId: number;
  userRole: string;
  isOwner: boolean;
  userId: number;
}

export default function ObjectAssignments({
  objectId,
  userRole,
  isOwner,
  userId,
}: ObjectAssignmentsProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<'DESIGNER' | 'BUILDER'>('DESIGNER');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Проверка прав на добавление
  const canAdd = isOwner || userRole === 'ADMIN' || (userRole === 'DESIGNER' && selectedRole === 'BUILDER');

  useEffect(() => {
    loadAssignments();
  }, [objectId]);

  const loadAssignments = async () => {
    try {
      const response = await fetch(`/api/objects/${objectId}/assignments`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки назначений:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=${selectedRole}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Ошибка поиска:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddAssignment = async (userId: number) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/objects/${objectId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: selectedRole,
        }),
      });

      if (response.ok) {
        setSuccess('Пользователь успешно назначен');
        setShowAddForm(false);
        setSearchQuery('');
        setSearchResults([]);
        router.refresh();
        await loadAssignments();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка назначения пользователя');
      }
    } catch (err) {
      console.error('Ошибка назначения:', err);
      setError('Ошибка назначения пользователя');
    }
  };

  const handleRemoveAssignment = async (userId: number) => {
    if (!confirm('Вы уверены, что хотите удалить это назначение?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/objects/${objectId}/assignments?userId=${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Назначение удалено');
        router.refresh();
        await loadAssignments();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка удаления назначения');
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError('Ошибка удаления назначения');
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-lg p-6">
        <p className="text-gray-600">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl md:text-2xl font-semibold">Участники проекта</h2>
        {canAdd && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm md:text-base"
          >
            {showAddForm ? 'Отмена' : '+ Добавить участника'}
          </button>
        )}
      </div>

      {/* Сообщения */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Форма добавления */}
      {showAddForm && canAdd && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Роль для назначения</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="DESIGNER"
                  checked={selectedRole === 'DESIGNER'}
                  onChange={(e) => {
                    setSelectedRole(e.target.value as 'DESIGNER');
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Проектировщик</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="BUILDER"
                  checked={selectedRole === 'BUILDER'}
                  onChange={(e) => {
                    setSelectedRole(e.target.value as 'BUILDER');
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm">Строитель</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Поиск пользователя (email или имя)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Введите email или имя..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {searching && (
              <p className="text-sm text-gray-500 mt-2">Поиск...</p>
            )}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg bg-white max-h-48 overflow-y-auto">
                {searchResults.map((user) => {
                  const isAlreadyAssigned = assignments.some((a) => a.userId === user.id);
                  return (
                    <div
                      key={user.id}
                      className={`p-3 border-b border-gray-100 last:border-b-0 ${
                        isAlreadyAssigned ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isAlreadyAssigned) {
                          handleAddAssignment(user.id);
                        }
                      }}
                    >
                      <div className="font-medium text-sm">
                        {user.name || user.email}
                      </div>
                      <div className="text-xs text-gray-600">{user.email}</div>
                      {isAlreadyAssigned && (
                        <div className="text-xs text-gray-500 mt-1">Уже назначен</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
              <p className="text-sm text-gray-500 mt-2">Пользователи не найдены</p>
            )}
          </div>
        </div>
      )}

      {/* Список назначений */}
      {assignments.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <p className="text-sm md:text-base">Участники еще не назначены</p>
          {canAdd && (
            <p className="text-xs md:text-sm text-gray-500 mt-2">
              Нажмите "Добавить участника", чтобы начать
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment) => {
            const canRemove = canAdd || assignment.userId === userId;
            
            return (
              <div key={assignment.id} className="relative">
                <PortfolioCard
                  userId={assignment.userId}
                  userEmail={assignment.user.email}
                  userName={assignment.user.name}
                  userRole={assignment.role}
                  onClick={() => router.push(`/users/${assignment.userId}/objects`)}
                />
                {canRemove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAssignment(assignment.userId);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold hover:bg-red-700 transition z-10"
                    title={
                      assignment.userId === userId
                        ? 'Удалить себя с объекта'
                        : 'Удалить назначение'
                    }
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

