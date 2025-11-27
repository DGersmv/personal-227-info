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
}

export default function DashboardObjectsList() {
  const [objects, setObjects] = useState<Object[]>([]);
  const [loading, setLoading] = useState(true);

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
        <h2 className="text-xl font-semibold mb-4">Мои объекты</h2>
        <p className="text-gray-600 text-center">У вас пока нет объектов</p>
      </div>
    );
  }

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

      <div className="space-y-4">
        {objects.slice(0, 5).map((object) => {
          const designers = object.assignments.filter((a) => a.role === 'DESIGNER');
          const builders = object.assignments.filter((a) => a.role === 'BUILDER');

          return (
            <Link
              key={object.id}
              href={`/objects/${object.id}`}
              className="block bg-white/50 rounded-lg p-4 hover:bg-white/70 transition border border-white/20"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-base md:text-lg flex-1 pr-2">
                  {object.title}
                </h3>
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

              <div className="border-t pt-2 space-y-1">
                <div className="text-xs md:text-sm">
                  <span className="font-medium text-blue-700">Заказчик:</span>{' '}
                  <span className="text-gray-700">
                    {object.user.name || object.user.email}
                  </span>
                </div>
                {designers.length > 0 && (
                  <div className="text-xs md:text-sm">
                    <span className="font-medium text-purple-700">Проектировщики:</span>{' '}
                    <span className="text-gray-700">
                      {designers.map((d) => d.user.name || d.user.email).join(', ')}
                    </span>
                  </div>
                )}
                {builders.length > 0 && (
                  <div className="text-xs md:text-sm">
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

