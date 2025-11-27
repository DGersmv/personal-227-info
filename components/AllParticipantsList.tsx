'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PortfolioCard from './PortfolioCard';

interface User {
  id: number;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  objectCount: number;
}

export default function AllParticipantsList() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'CUSTOMER' | 'DESIGNER' | 'BUILDER'>('all');

  useEffect(() => {
    loadUsers();
    
    // Слушать события удаления назначений
    const handleAssignmentRemoved = () => {
      loadUsers();
    };
    
    window.addEventListener('assignmentRemoved', handleAssignmentRemoved);
    
    return () => {
      window.removeEventListener('assignmentRemoved', handleAssignmentRemoved);
    };
  }, [filter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?role=${filter}` : '';
      const response = await fetch(`/api/users/list${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки пользователей:', err);
    } finally {
      setLoading(false);
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

  const handleUserClick = (userId: number) => {
    router.push(`/users/${userId}/objects`);
  };

  if (loading) {
    return (
      <div className="glass rounded-lg p-6">
        <p className="text-gray-600 text-center">Загрузка участников...</p>
      </div>
    );
  }

  // Группировка по ролям
  const customers = users.filter((u) => u.role === 'CUSTOMER');
  const designers = users.filter((u) => u.role === 'DESIGNER');
  const builders = users.filter((u) => u.role === 'BUILDER');
  
  // Определить, нужно ли скрывать заказчиков (если их нет в списке, значит текущий пользователь - заказчик)
  const hideCustomers = customers.length === 0 && filter !== 'CUSTOMER';

  return (
    <div className="glass rounded-lg p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl md:text-2xl font-semibold">Все участники</h2>
        
        {/* Фильтры */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm transition ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Все
          </button>
          {!hideCustomers && (
            <button
              onClick={() => setFilter('CUSTOMER')}
              className={`px-3 py-1.5 rounded-lg text-xs md:text-sm transition ${
                filter === 'CUSTOMER'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Заказчики ({customers.length})
            </button>
          )}
          <button
            onClick={() => setFilter('DESIGNER')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm transition ${
              filter === 'DESIGNER'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Проектировщики ({designers.length})
          </button>
          <button
            onClick={() => setFilter('BUILDER')}
            className={`px-3 py-1.5 rounded-lg text-xs md:text-sm transition ${
              filter === 'BUILDER'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Строители ({builders.length})
          </button>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <p className="text-sm md:text-base">Участники не найдены</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Заказчики */}
          {!hideCustomers && customers.length > 0 && (filter === 'all' || filter === 'CUSTOMER') && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-blue-700">Заказчики</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {customers.map((user) => (
                  <PortfolioCard
                    key={user.id}
                    userId={user.id}
                    userEmail={user.email}
                    userName={user.name}
                    userRole={user.role}
                    onClick={() => handleUserClick(user.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Проектировщики */}
          {designers.length > 0 && (filter === 'all' || filter === 'DESIGNER') && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-purple-700">Проектировщики</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {designers.map((user) => (
                  <PortfolioCard
                    key={user.id}
                    userId={user.id}
                    userEmail={user.email}
                    userName={user.name}
                    userRole={user.role}
                    onClick={() => handleUserClick(user.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Строители */}
          {builders.length > 0 && (filter === 'all' || filter === 'BUILDER') && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-orange-700">Строители</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                {builders.map((user) => (
                  <PortfolioCard
                    key={user.id}
                    userId={user.id}
                    userEmail={user.email}
                    userName={user.name}
                    userRole={user.role}
                    onClick={() => handleUserClick(user.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

