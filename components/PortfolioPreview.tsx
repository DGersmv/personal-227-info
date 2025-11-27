'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Portfolio {
  id: number;
  userId: number;
  title: string | null;
  description: string | null;
  bio: string | null;
  phone: string | null;
  website: string | null;
  socialLinks: {
    linkedin?: string;
    instagram?: string;
    vk?: string;
    telegram?: string;
  } | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  backgroundColor: string | null;
  isPublic: boolean;
  showEmail: boolean;
  showPhone: boolean;
  viewCount: number;
  projects: Array<{
    id: number;
    title: string;
    description: string | null;
    imageUrl: string | null;
    category: string | null;
    tags: string[];
  }>;
}

interface PortfolioPreviewProps {
  userId?: number;
}

export default function PortfolioPreview({ userId }: PortfolioPreviewProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPortfolio();
  }, [userId]);

  const loadPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio');
      if (response.ok) {
        const data = await response.json();
        setPortfolio(data.portfolio);
      } else {
        if (response.status !== 404) {
          setError('Ошибка загрузки портфолио');
        }
      }
    } catch (err) {
      console.error('Ошибка загрузки портфолио:', err);
      setError('Ошибка загрузки портфолио');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">Загрузка портфолио...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="glass rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm mb-4">Портфолио еще не создано</p>
          <Link
            href="/portfolio"
            className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
          >
            Создать портфолио
          </Link>
        </div>
      </div>
    );
  }

  const bgColor = portfolio.backgroundColor || '#ffffff';

  return (
    <div className="glass rounded-lg overflow-hidden" style={{ backgroundColor: bgColor }}>
      {/* Обложка */}
      {portfolio.coverImageUrl && (
        <div className="w-full h-24 md:h-32 relative">
          <img
            src={portfolio.coverImageUrl}
            alt="Обложка"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-3 md:p-4">
        {/* Аватар и заголовок */}
        <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
          {portfolio.avatarUrl ? (
            <img
              src={portfolio.avatarUrl}
              alt="Аватар"
              className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-white shadow-md flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary-100 flex items-center justify-center border-2 border-white shadow-md flex-shrink-0">
              <span className="text-primary-600 font-bold text-base md:text-xl">
                {portfolio.title?.charAt(0).toUpperCase() || 'П'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base md:text-lg mb-1 truncate">
              {portfolio.title || 'Мое портфолио'}
            </h3>
            {portfolio.description && (
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2">
                {portfolio.description}
              </p>
            )}
          </div>
        </div>

        {/* Биография */}
        {portfolio.bio && (
          <div className="mb-3 md:mb-4">
            <p className="text-xs md:text-sm text-gray-700 line-clamp-2 md:line-clamp-3">{portfolio.bio}</p>
          </div>
        )}

        {/* Контакты */}
        {(portfolio.showPhone && portfolio.phone) || portfolio.website ? (
          <div className="mb-4 space-y-1">
            {portfolio.showPhone && portfolio.phone && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Телефон:</span> {portfolio.phone}
              </div>
            )}
            {portfolio.website && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Сайт:</span>{' '}
                <a
                  href={portfolio.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:underline truncate block"
                >
                  {portfolio.website}
                </a>
              </div>
            )}
          </div>
        ) : null}

        {/* Социальные сети */}
        {portfolio.socialLinks && (
          <div className="mb-4 flex flex-wrap gap-2">
            {portfolio.socialLinks.linkedin && (
              <a
                href={portfolio.socialLinks.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                LinkedIn
              </a>
            )}
            {portfolio.socialLinks.instagram && (
              <a
                href={portfolio.socialLinks.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-pink-600 hover:underline"
              >
                Instagram
              </a>
            )}
            {portfolio.socialLinks.vk && (
              <a
                href={portfolio.socialLinks.vk}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                VK
              </a>
            )}
            {portfolio.socialLinks.telegram && (
              <a
                href={`https://t.me/${portfolio.socialLinks.telegram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline"
              >
                Telegram
              </a>
            )}
          </div>
        )}

        {/* Проекты (первые 3) */}
        {portfolio.projects && portfolio.projects.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Проекты ({portfolio.projects.length})</h4>
            <div className="space-y-2">
              {portfolio.projects.slice(0, 3).map((project) => (
                <div
                  key={project.id}
                  className="bg-white/50 rounded-lg p-2 border border-white/20"
                >
                  {project.imageUrl && (
                    <img
                      src={project.imageUrl}
                      alt={project.title}
                      className="w-full h-20 object-cover rounded mb-2"
                    />
                  )}
                  <h5 className="text-sm font-medium truncate">{project.title}</h5>
                  {project.category && (
                    <span className="text-xs text-gray-600">{project.category}</span>
                  )}
                </div>
              ))}
            </div>
            {portfolio.projects.length > 3 && (
              <p className="text-xs text-gray-500 mt-2">
                +{portfolio.projects.length - 3} еще
              </p>
            )}
          </div>
        )}

        {/* Статус публичности */}
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                portfolio.isPublic ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-xs text-gray-600">
              {portfolio.isPublic ? 'Публичное' : 'Приватное'}
            </span>
          </div>
        </div>

        {/* Кнопка редактирования */}
        <Link
          href="/portfolio"
          className="block w-full text-center px-3 md:px-4 py-1.5 md:py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-xs md:text-sm"
        >
          Редактировать портфолио
        </Link>
      </div>
    </div>
  );
}

