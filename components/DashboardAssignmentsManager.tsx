'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PortfolioCard from './PortfolioCard';

interface Assignment {
  id: number;
  userId: number;
  objectId: number;
  role: string;
  assignedAt: string;
  object: {
    id: number;
    title: string;
    address: string | null;
    user: {
      id: number;
      email: string;
      name: string | null;
    };
  };
  user: {
    id: number;
    email: string;
    name: string | null;
    role: string;
  };
}

interface DashboardAssignmentsManagerProps {
  userRole: string;
  userId: number;
}

export default function DashboardAssignmentsManager({
  userRole,
  userId,
}: DashboardAssignmentsManagerProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedObject, setExpandedObject] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<Record<number, any[]>>({});
  const [selectedRole, setSelectedRole] = useState<Record<number, 'DESIGNER' | 'BUILDER'>>({});
  const [searching, setSearching] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      // Получить все объекты пользователя
      const objectsResponse = await fetch('/api/objects');
      if (objectsResponse.ok) {
        const objectsData = await objectsResponse.json();
        const objects = objectsData.objects || [];

        // Для каждого объекта получить назначения
        const allAssignments: Assignment[] = [];
        for (const object of objects) {
          const assignmentsResponse = await fetch(`/api/objects/${object.id}/assignments`);
          if (assignmentsResponse.ok) {
            const assignmentsData = await assignmentsResponse.json();
            const objectAssignments = (assignmentsData.assignments || []).map((a: any) => ({
              ...a,
              object: {
                id: object.id,
                title: object.title,
                address: object.address,
                user: object.user,
              },
            }));
            allAssignments.push(...objectAssignments);
          }
        }

        setAssignments(allAssignments);
      }
    } catch (err) {
      console.error('Ошибка загрузки назначений:', err);
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
        // Уведомить другие компоненты об обновлении
        window.dispatchEvent(new CustomEvent('assignmentRemoved', { 
          detail: { objectId, userId: assignmentUserId } 
        }));
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      DESIGNER: 'Проектировщик',
      BUILDER: 'Строитель',
      CUSTOMER: 'Заказчик',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      DESIGNER: 'bg-purple-100 text-purple-800',
      BUILDER: 'bg-orange-100 text-orange-800',
      CUSTOMER: 'bg-blue-100 text-blue-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="glass rounded-lg p-6">
        <p className="text-gray-600 text-center">Загрузка назначений...</p>
      </div>
    );
  }

  // Фильтровать назначения в зависимости от роли
  let filteredAssignments = assignments;

  if (userRole === 'CUSTOMER') {
    // Заказчик видит назначения только на своих объектах
    filteredAssignments = assignments.filter((a) => a.object.user.id === userId);
  } else if (userRole === 'DESIGNER' || userRole === 'BUILDER') {
    // Проектировщик/Строитель видит назначения на объектах, где он назначен
    // Показываем только те объекты, где текущий пользователь является участником
    const userObjectIds = new Set(
      assignments
        .filter((a) => a.userId === userId)
        .map((a) => a.objectId)
    );
    filteredAssignments = assignments.filter((a) => userObjectIds.has(a.objectId));
  }

  if (filteredAssignments.length === 0) {
    return (
      <div className="glass rounded-lg p-4 md:p-6">
        <h2 className="text-xl md:text-2xl font-semibold mb-4">Управление назначениями</h2>
        <p className="text-gray-600 text-center">
          {userRole === 'CUSTOMER'
            ? 'У вас пока нет назначений на ваших объектах'
            : 'У вас пока нет назначений'}
        </p>
        {userRole === 'CUSTOMER' && (
          <p className="text-sm text-gray-500 text-center mt-2">
            Перейдите на страницу объекта, чтобы добавить участников
          </p>
        )}
      </div>
    );
  }

  // Группировать по объектам
  const assignmentsByObject = filteredAssignments.reduce((acc, assignment) => {
    const objectId = assignment.object.id;
    if (!acc[objectId]) {
      acc[objectId] = {
        object: assignment.object,
        assignments: [],
      };
    }
    acc[objectId].assignments.push(assignment);
    return acc;
  }, {} as Record<number, { object: any; assignments: Assignment[] }>);

  return (
    <div className="glass rounded-lg p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl md:text-2xl font-semibold">Управление назначениями</h2>
        {userRole === 'CUSTOMER' && (
          <Link
            href="/objects"
            className="text-sm md:text-base text-primary-600 hover:underline"
          >
            Управлять объектами →
          </Link>
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

      <div className="space-y-4">
        {Object.values(assignmentsByObject).map(({ object, assignments: objectAssignments }) => {
          const isOwner = object.user.id === userId;
          const canManage = isOwner || userRole === 'ADMIN';

          return (
            <div
              key={object.id}
              className="bg-white/50 rounded-lg p-4 border border-white/20"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <Link
                    href={`/objects/${object.id}`}
                    className="text-lg md:text-xl font-semibold text-primary-600 hover:underline"
                  >
                    {object.title}
                  </Link>
                  {object.address && (
                    <p className="text-xs md:text-sm text-gray-600 mt-1">{object.address}</p>
                  )}
                  <p className="text-xs md:text-sm text-gray-500 mt-1">
                    Заказчик: {object.user.name || object.user.email}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs md:text-sm font-medium text-gray-700">
                    Участники:
                  </div>
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
                      {expandedObject === object.id ? 'Отмена' : '+ Добавить'}
                    </button>
                  )}
                </div>

                {/* Форма добавления участника */}
                {expandedObject === object.id && canManage && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
                    <div>
                      <label className="block text-xs font-medium mb-2">Роль для назначения</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            value="DESIGNER"
                            checked={(selectedRole[object.id] || 'DESIGNER') === 'DESIGNER'}
                            onChange={(e) => {
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
                            onChange={(e) => {
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
                            const isAlreadyAssigned = objectAssignments.some(
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {objectAssignments.map((assignment) => {
                    const canRemove =
                      canManage || // Владелец или админ может удалять
                      assignment.userId === userId; // Или участник может удалить себя

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
            </div>
          );
        })}
      </div>
    </div>
  );
}

