'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Portfolio {
  id: number;
  userId: number;
  title: string | null;
  description: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  backgroundColor: string | null;
  isPublic: boolean;
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
  };
  projects: Array<{
    id: number;
    title: string;
    description: string | null;
    imageUrl: string | null;
  }>;
}

interface PortfolioCardProps {
  userId: number;
  userEmail?: string;
  userName?: string | null;
  userRole?: string;
  onClick?: () => void;
  className?: string;
}

export default function PortfolioCard({
  userId,
  userEmail,
  userName,
  userRole,
  onClick,
  className = '',
}: PortfolioCardProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortfolio();
  }, [userId]);

  const loadPortfolio = async () => {
    try {
      const response = await fetch(`/api/portfolio/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data.portfolio);
      }
    } catch (err) {
      console.error('Ошибка загрузки портфолио:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      DESIGNER: 'Проектировщик',
      BUILDER: 'Строитель',
      CUSTOMER: 'Заказчик',
      ADMIN: 'Администратор',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      DESIGNER: 'bg-purple-100 text-purple-800',
      BUILDER: 'bg-orange-100 text-orange-800',
      CUSTOMER: 'bg-blue-100 text-blue-800',
      ADMIN: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className={`bg-white/50 rounded-lg p-4 border border-white/20 ${className}`}>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded mb-3"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Если портфолио нет, показываем красивую карточку по умолчанию
  if (!portfolio) {
    const displayName = userName || userEmail || 'Пользователь';
    const displayRole = userRole || '';
    
    // Цвета для разных ролей
    const roleGradients: Record<string, string> = {
      DESIGNER: 'from-purple-100 to-purple-200',
      BUILDER: 'from-orange-100 to-orange-200',
      CUSTOMER: 'from-blue-100 to-blue-200',
      ADMIN: 'from-gray-100 to-gray-200',
    };
    
    const gradient = roleGradients[displayRole] || 'from-gray-100 to-gray-200';

    return (
      <div
        className={`bg-white rounded-lg overflow-hidden border border-white/20 hover:shadow-lg transition cursor-pointer ${className}`}
        onClick={onClick}
      >
        {/* Обложка по умолчанию */}
        <div className={`h-32 w-full bg-gradient-to-br ${gradient}`}></div>

        <div className="p-4">
          {/* Аватар и имя */}
          <div className="flex items-start gap-3 -mt-12 relative z-10">
            <div className="relative">
              <div className={`w-16 h-16 rounded-full border-4 border-white bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-lg shadow-md`}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="flex-1 pt-8">
              <div className="font-semibold text-base md:text-lg">{displayName}</div>
              {userEmail && displayName !== userEmail && (
                <div className="text-xs md:text-sm text-gray-600">{userEmail}</div>
              )}
              {displayRole && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${getRoleColor(displayRole)}`}>
                  {getRoleLabel(displayRole)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayName = portfolio.title || portfolio.user.name || portfolio.user.email;
  const bgColor = portfolio.backgroundColor || '#f3f4f6';

  return (
    <div
      className={`bg-white rounded-lg overflow-hidden border border-white/20 hover:shadow-lg transition cursor-pointer ${className}`}
      onClick={onClick}
      style={{ backgroundColor: portfolio.backgroundColor || undefined }}
    >
      {/* Обложка */}
      {portfolio.coverImageUrl ? (
        <div className="relative h-32 w-full">
          <Image
            src={portfolio.coverImageUrl}
            alt={displayName}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-32 w-full bg-gradient-to-br from-blue-100 to-indigo-200"></div>
      )}

      <div className="p-4">
        {/* Аватар и имя */}
        <div className="flex items-start gap-3 -mt-12 relative z-10">
          <div className="relative">
            {portfolio.avatarUrl ? (
              <div className="w-16 h-16 rounded-full border-4 border-white overflow-hidden bg-white">
                <Image
                  src={portfolio.avatarUrl}
                  alt={displayName}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-gray-500 font-semibold text-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 pt-8">
            <div className="font-semibold text-base md:text-lg">{displayName}</div>
            {portfolio.user.name && portfolio.user.name !== displayName && (
              <div className="text-xs md:text-sm text-gray-600">{portfolio.user.email}</div>
            )}
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${getRoleColor(portfolio.user.role)}`}>
              {getRoleLabel(portfolio.user.role)}
            </span>
          </div>
        </div>

        {/* Описание */}
        {portfolio.description && (
          <div className="mt-3 text-xs md:text-sm text-gray-700 line-clamp-2">
            {portfolio.description}
          </div>
        )}

        {/* Проекты */}
        {portfolio.projects.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium text-gray-600 mb-2">Проекты:</div>
            <div className="grid grid-cols-3 gap-2">
              {portfolio.projects.slice(0, 3).map((project) => (
                <div key={project.id} className="relative aspect-square rounded overflow-hidden bg-gray-100">
                  {project.imageUrl ? (
                    <Image
                      src={project.imageUrl}
                      alt={project.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      {project.title.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

