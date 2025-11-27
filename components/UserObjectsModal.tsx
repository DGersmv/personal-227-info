'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  assignmentRole?: string; // Роль на этом объекте (для проектировщиков/строителей)
}

interface UserObjectsModalProps {
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserObjectsModal({
  userId,
  userName,
  userEmail,
  userRole,
  isOpen,
  onClose,
}: UserObjectsModalProps) {
  const [objects, setObjects] = useState<Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      loadUserObjects();
    }
  }, [isOpen, userId]);

  const loadUserObjects = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/users/${userId}/objects`);
      if (response.ok) {
        const data = await response.json();
        setObjects(data.objects || []);
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка загрузки объектов');
      }
    } catch (err) {
      console.error('Ошибка загрузки объектов пользователя:', err);
      setError('Ошибка загрузки объектов');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      DESIGNER: 'Проектировщик',
      BUILDER: 'Строитель',
      CUSTOMER: 'Заказчик',
    };
    return labels[role] || role;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Активный',
      INACTIVE: 'Неактивный',
      ARCHIVED: 'Архивный',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-yellow-100 text-yellow-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="glass rounded-lg p-4 md:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">
              Объекты пользователя
            </h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {userName || userEmail}
              {userName && <span className="text-gray-500"> ({userEmail})</span>}
            </p>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Роль: {getRoleLabel(userRole)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Загрузка объектов...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : objects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">У пользователя пока нет объектов</p>
          </div>
        ) : (
          <div className="space-y-4">
            {objects.map((object) => {
              const designers = object.assignments.filter((a) => a.role === 'DESIGNER');
              const builders = object.assignments.filter((a) => a.role === 'BUILDER');
              const isOwner = object.user.id === userId;
              const userAssignment = object.assignments.find((a) => a.user.id === userId);
              const userRoleOnObject = object.assignmentRole || (isOwner ? 'CUSTOMER' : userAssignment?.role);

              return (
                <Link
                  key={object.id}
                  href={`/objects/${object.id}`}
                  onClick={onClose}
                  className="block bg-white/50 rounded-lg p-4 hover:bg-white/70 transition border border-white/20"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-base md:text-lg flex-1 pr-2">
                      {object.title}
                    </h3>
                    <div className="flex gap-2 flex-shrink-0">
                      <span
                        className={`px-2 py-1 rounded text-xs ${getStatusColor(object.status)}`}
                      >
                        {getStatusLabel(object.status)}
                      </span>
                      {userRoleOnObject && (
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {getRoleLabel(userRoleOnObject)}
                        </span>
                      )}
                    </div>
                  </div>

                  {object.address && (
                    <p className="text-xs md:text-sm text-gray-600 mb-2">
                      {object.address}
                    </p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3 text-xs md:text-sm">
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

                  <div className="border-t pt-2 space-y-1 text-xs md:text-sm">
                    <div>
                      <span className="font-medium text-blue-700">Заказчик:</span>{' '}
                      <span className="text-gray-700">
                        {object.user.name || object.user.email}
                      </span>
                    </div>
                    {designers.length > 0 && (
                      <div>
                        <span className="font-medium text-purple-700">Проектировщики:</span>{' '}
                        <span className="text-gray-700">
                          {designers.map((d) => d.user.name || d.user.email).join(', ')}
                        </span>
                      </div>
                    )}
                    {builders.length > 0 && (
                      <div>
                        <span className="font-medium text-orange-700">Строители:</span>{' '}
                        <span className="text-gray-700">
                          {builders.map((b) => b.user.name || b.user.email).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


