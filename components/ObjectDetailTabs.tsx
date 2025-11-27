'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface ObjectDetailTabsProps {
  objectId: number;
  userRole: string;
}

export default function ObjectDetailTabs({
  objectId,
  userRole,
}: ObjectDetailTabsProps) {
  const pathname = usePathname();
  
  // Определяем активную вкладку по текущему пути
  const getActiveTab = () => {
    if (pathname?.includes('/projects')) return 'projects';
    if (pathname?.includes('/photos')) return 'photos';
    if (pathname?.includes('/videos')) return 'videos';
    if (pathname?.includes('/panoramas')) return 'panoramas';
    if (pathname?.includes('/documents')) return 'documents';
    if (pathname?.includes('/messages')) return 'messages';
    return 'overview';
  };

  const activeTab = getActiveTab();

  const tabs = [
    { id: 'overview', label: 'Обзор', href: `/objects/${objectId}` },
    { id: 'projects', label: 'Проекты', href: `/objects/${objectId}/projects` },
    { id: 'photos', label: 'Фото', href: `/objects/${objectId}/photos` },
    { id: 'videos', label: 'Видео', href: `/objects/${objectId}/videos` },
    { id: 'panoramas', label: 'Панорамы', href: `/objects/${objectId}/panoramas` },
    { id: 'documents', label: 'Документы', href: `/objects/${objectId}/documents` },
    { id: 'messages', label: 'Сообщения', href: `/objects/${objectId}/messages` },
  ];

  return (
    <div className="glass rounded-lg">
      {/* Вкладки */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                px-6 py-4 text-sm font-medium border-b-2 transition
                ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Контент вкладок - показывается только на главной странице объекта */}
      {pathname === `/objects/${objectId}` && (
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Обзор объекта</h3>
          <p className="text-gray-600 mb-4">
            Здесь отображается общая информация об объекте, последние обновления и активность.
          </p>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <Link
              href={`/objects/${objectId}/projects`}
              className="glass rounded-lg p-4 hover:bg-white/20 transition"
            >
              <h4 className="font-semibold mb-2">Проекты</h4>
              <p className="text-sm text-gray-600">
                Просмотр и управление проектами на этом объекте
              </p>
            </Link>
            <Link
              href={`/objects/${objectId}/photos`}
              className="glass rounded-lg p-4 hover:bg-white/20 transition"
            >
              <h4 className="font-semibold mb-2">Фотографии</h4>
              <p className="text-sm text-gray-600">
                Галерея фотографий объекта
              </p>
            </Link>
            <Link
              href={`/objects/${objectId}/videos`}
              className="glass rounded-lg p-4 hover:bg-white/20 transition"
            >
              <h4 className="font-semibold mb-2">Видео</h4>
              <p className="text-sm text-gray-600">
                Видеоматериалы объекта
              </p>
            </Link>
            <Link
              href={`/objects/${objectId}/panoramas`}
              className="glass rounded-lg p-4 hover:bg-white/20 transition"
            >
              <h4 className="font-semibold mb-2">Панорамы</h4>
              <p className="text-sm text-gray-600">
                Панорамные снимки 360°
              </p>
            </Link>
            <Link
              href={`/objects/${objectId}/documents`}
              className="glass rounded-lg p-4 hover:bg-white/20 transition"
            >
              <h4 className="font-semibold mb-2">Документы</h4>
              <p className="text-sm text-gray-600">
                Проектная документация и документы
              </p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

