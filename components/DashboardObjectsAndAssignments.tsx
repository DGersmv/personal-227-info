'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PortfolioCard from './PortfolioCard';

interface Object {
  id: number;
  title: string;
  address: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  user: {
    id: number;
    email: string;
    name: string | null;
  };
  assignments: Array<{
    id: number;
    role: string;
    userId: number;
    user: {
      id: number;
      email: string;
      name: string | null;
      role: string;
    };
  }>;
  _count: {
    projects: number;
    photos: number;
    panoramas: number;
    documents: number;
  };
}

interface DashboardObjectsAndAssignmentsProps {
  userRole: string;
  userId: number;
}

export default function DashboardObjectsAndAssignments({
  userRole,
  userId,
}: DashboardObjectsAndAssignmentsProps) {
  const router = useRouter();
  const [objects, setObjects] = useState<Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedObject, setExpandedObject] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<Record<number, any[]>>({});
  const [selectedRole, setSelectedRole] = useState<Record<number, 'DESIGNER' | 'BUILDER'>>({});
  const [searching, setSearching] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadObjects();
    
    // Слушать события удаления назначений
    const handleAssignmentRemoved = () => {
      loadObjects();
    };
    
    window.addEventListener('assignmentRemoved', handleAssignmentRemoved);
    
    return () => {
      window.removeEventListener('assignmentRemoved', handleAssignmentRemoved);
    };
  }, []);

  const loadObjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/objects');
      if (response.ok) {
        const data = await response.json();
        setObjects(data.objects || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки объектов:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (objectId: number, assignmentUserId: number) => {
    if (!confirm('Вы уверены, что хотите удалить это назначение?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/objects/${objectId}/assignments?userId=${assignmentUserId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Назначение удалено');
        window.dispatchEvent(new CustomEvent('assignmentRemoved', { 
          detail: { objectId, userId: assignmentUserId } 
        }));
        router.refresh();
        await loadObjects();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка удаления назначения');
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setError('Ошибка удаления назначения');
    }
  };

  const handleSearch = async (objectId: number, query: string) => {
    const role = selectedRole[objectId] || 'DESIGNER';
    
    if (query.length < 2) {
      setSearchResults((prev) => ({ ...prev, [objectId]: [] }));
      return;
    }

    setSearching((prev) => ({ ...prev, [objectId]: true }));
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&role=${role}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults((prev) => ({ ...prev, [objectId]: data.users || [] }));
      }
    } catch (err) {
      console.error('Ошибка поиска:', err);
    } finally {
      setSearching((prev) => ({ ...prev, [objectId]: false }));
    }
  };

  const handleAddAssignment = async (objectId: number, userId: number) => {
    const role = selectedRole[objectId] || 'DESIGNER';
    
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
          role,
        }),
      });

      if (response.ok) {
        setSuccess('Пользователь успешно назначен');
        setExpandedObject(null);
        setSearchQuery((prev) => ({ ...prev, [objectId]: '' }));
        setSearchResults((prev) => ({ ...prev, [objectId]: [] }));
        router.refresh();
        await loadObjects();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка назначения пользователя');
      }
    } catch (err) {
      console.error('Ошибка назначения:', err);
      setError('Ошибка назначения пользователя');
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-lg p-6">
        <p className="text-gray-600 text-center">Загрузка объектов...</p>
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="glass rounded-lg p-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">Мои объекты</h2>
        <p className="text-gray-600 text-center">У вас пока нет объектов</p>
      </div>
    );
  }

  // Показать только первые 5 объектов
  const displayedObjects = objects.slice(0, 5);

  return (
    <div className="glass rounded-lg p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-semibold">Мои объекты</h2>
        <Link
          href="/objects"
          className="text-sm md:text-base text-primary-600 hover:underline"
        >
          Все объекты →
        </Link>
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

      <div className="space-y-6">
        {displayedObjects.map((object) => {
          const designers = object.assignments.filter((a) => a.role === 'DESIGNER');
          const builders = object.assignments.filter((a) => a.role === 'BUILDER');
          const isOwner = object.user.id === userId;
          const canManage = isOwner || userRole === 'ADMIN';

          return (
            <div
              key={object.id}
              className="bg-white/50 rounded-lg p-4 md:p-6 border border-white/20"
            >
              {/* Заголовок объекта */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <Link
                    href={`/objects/${object.id}`}
                    className="text-lg md:text-xl font-semibold text-primary-600 hover:underline block mb-1"
                  >
                    {object.title}
                  </Link>
                  {object.address && (
                    <p className="text-xs md:text-sm text-gray-600">{object.address}</p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                    object.status === 'ACTIVE'
                      ? 'bg-green-100 text-green-800'
                      : object.status === 'ARCHIVED'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {object.status === 'ACTIVE' && 'Активный'}
                  {object.status === 'INACTIVE' && 'Неактивный'}
                  {object.status === 'ARCHIVED' && 'Архив'}
                </span>
              </div>

              {/* Статистика */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-xs md:text-sm">
                <div>
                  <span className="text-gray-600">Проектов:</span>{' '}
                  <span className="font-medium">{object._count.projects}</span>
                </div>
                <div>
                  <span className="text-gray-600">Фото:</span>{' '}
                  <span className="font-medium">{object._count.photos}</span>
                </div>
                <div>
                  <span className="text-gray-600">Документов:</span>{' '}
                  <span className="font-medium">{object._count.documents}</span>
                </div>
                <div>
                  <span className="text-gray-600">Панорам:</span>{' '}
                  <span className="font-medium">{object._count.panoramas}</span>
                </div>
              </div>

              {/* Участники */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm md:text-base font-semibold text-gray-700">Участники:</h3>
                  {canManage && (
                    <button
                      onClick={() => {
                        if (expandedObject === object.id) {
                          setExpandedObject(null);
                          setSearchQuery((prev) => ({ ...prev, [object.id]: '' }));
                          setSearchResults((prev) => ({ ...prev, [object.id]: [] }));
                        } else {
                          setExpandedObject(object.id);
                          setSelectedRole((prev) => ({ ...prev, [object.id]: 'DESIGNER' }));
                        }
                      }}
                      className="text-xs md:text-sm text-primary-600 hover:text-primary-800 px-2 py-1"
                    >
                      {expandedObject === object.id ? 'Отмена' : '+ Добавить участника'}
                    </button>
                  )}
                </div>

                {/* Форма добавления участника */}
                {expandedObject === object.id && canManage && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
                    <div>
                      <label className="block text-xs font-medium mb-2">Роль для назначения</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="DESIGNER"
                            checked={(selectedRole[object.id] || 'DESIGNER') === 'DESIGNER'}
                            onChange={() => {
                              setSelectedRole((prev) => ({ ...prev, [object.id]: 'DESIGNER' }));
                              setSearchQuery((prev) => ({ ...prev, [object.id]: '' }));
                              setSearchResults((prev) => ({ ...prev, [object.id]: [] }));
                            }}
                            className="text-primary-600"
                          />
                          <span className="text-xs md:text-sm">Проектировщик</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="BUILDER"
                            checked={selectedRole[object.id] === 'BUILDER'}
                            onChange={() => {
                              setSelectedRole((prev) => ({ ...prev, [object.id]: 'BUILDER' }));
                              setSearchQuery((prev) => ({ ...prev, [object.id]: '' }));
                              setSearchResults((prev) => ({ ...prev, [object.id]: [] }));
                            }}
                            className="text-primary-600"
                          />
                          <span className="text-xs md:text-sm">Строитель</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">
                        Поиск по email или имени
                      </label>
                      <input
                        type="text"
                        value={searchQuery[object.id] || ''}
                        onChange={(e) => {
                          const query = e.target.value;
                          setSearchQuery((prev) => ({ ...prev, [object.id]: query }));
                          handleSearch(object.id, query);
                        }}
                        placeholder="Введите email или имя..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      {searching[object.id] && (
                        <p className="text-xs text-gray-500 mt-1">Поиск...</p>
                      )}
                      {searchResults[object.id] && searchResults[object.id].length > 0 && (
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                          {searchResults[object.id].map((user) => {
                            const isAlreadyAssigned = object.assignments.some(
                              (a) => a.userId === user.id
                            );
                            return (
                              <button
                                key={user.id}
                                onClick={() => !isAlreadyAssigned && handleAddAssignment(object.id, user.id)}
                                disabled={isAlreadyAssigned}
                                className={`w-full text-left px-2 py-1 rounded text-xs ${
                                  isAlreadyAssigned
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white hover:bg-gray-100 border border-gray-200'
                                }`}
                              >
                                {user.name || user.email} {user.email}
                                {isAlreadyAssigned && ' (уже назначен)'}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Карточки участников */}
                <div className="space-y-3">
                  {/* Заказчик */}
                  <div>
                    <p className="text-xs font-medium text-blue-700 mb-2">Заказчик:</p>
                    <PortfolioCard
                      userId={object.user.id}
                      userEmail={object.user.email}
                      userName={object.user.name}
                      userRole="CUSTOMER"
                      onClick={() => router.push(`/users/${object.user.id}/objects`)}
                    />
                  </div>

                  {/* Проектировщики */}
                  {designers.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-purple-700 mb-2">
                        Проектировщики ({designers.length}):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {designers.map((assignment) => {
                          const canRemove = canManage || assignment.userId === userId;
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
                                    handleRemoveAssignment(object.id, assignment.userId);
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
                    </div>
                  )}

                  {/* Строители */}
                  {builders.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-orange-700 mb-2">
                        Строители ({builders.length}):
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {builders.map((assignment) => {
                          const canRemove = canManage || assignment.userId === userId;
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
                                    handleRemoveAssignment(object.id, assignment.userId);
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
                    </div>
                  )}

                  {/* Нет участников */}
                  {designers.length === 0 && builders.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">
                      Участники не назначены
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {objects.length > 5 && (
        <div className="mt-4 text-center">
          <Link
            href="/objects"
            className="text-sm md:text-base text-primary-600 hover:underline"
          >
            Показать все объекты ({objects.length})
          </Link>
        </div>
      )}
    </div>
  );
}


