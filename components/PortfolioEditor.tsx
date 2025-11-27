'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PortfolioProjectsManager from './PortfolioProjectsManager';

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
  createdAt: string;
  updatedAt: string;
}

export default function PortfolioEditor() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Форма
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bio: '',
    phone: '',
    website: '',
    linkedin: '',
    instagram: '',
    vk: '',
    telegram: '',
    avatarUrl: '',
    coverImageUrl: '',
    backgroundColor: '#ffffff',
    isPublic: false,
    showEmail: false,
    showPhone: false,
  });

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const response = await fetch('/api/portfolio');
      if (response.ok) {
        const data = await response.json();
        const portfolioData = data.portfolio;
        setPortfolio(portfolioData);
        
        // Заполнить форму
        setFormData({
          title: portfolioData.title || '',
          description: portfolioData.description || '',
          bio: portfolioData.bio || '',
          phone: portfolioData.phone || '',
          website: portfolioData.website || '',
          linkedin: portfolioData.socialLinks?.linkedin || '',
          instagram: portfolioData.socialLinks?.instagram || '',
          vk: portfolioData.socialLinks?.vk || '',
          telegram: portfolioData.socialLinks?.telegram || '',
          avatarUrl: portfolioData.avatarUrl || '',
          coverImageUrl: portfolioData.coverImageUrl || '',
          backgroundColor: portfolioData.backgroundColor || '#ffffff',
          isPublic: portfolioData.isPublic || false,
          showEmail: portfolioData.showEmail || false,
          showPhone: portfolioData.showPhone || false,
        });
      }
    } catch (err) {
      console.error('Ошибка загрузки портфолио:', err);
      setError('Ошибка загрузки портфолио');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'avatar' | 'cover') => {
    if (type === 'avatar') {
      setUploadingAvatar(true);
    } else {
      setUploadingCover(true);
    }
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch('/api/portfolio/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (type === 'avatar') {
          setFormData({ ...formData, avatarUrl: data.url });
        } else {
          setFormData({ ...formData, coverImageUrl: data.url });
        }
        setSuccess(`${type === 'avatar' ? 'Аватар' : 'Обложка'} успешно загружена`);
      } else {
        const data = await response.json();
        setError(data.error || `Ошибка загрузки ${type === 'avatar' ? 'аватара' : 'обложки'}`);
      }
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
      setError(`Ошибка загрузки ${type === 'avatar' ? 'аватара' : 'обложки'}`);
    } finally {
      if (type === 'avatar') {
        setUploadingAvatar(false);
      } else {
        setUploadingCover(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const socialLinks = {
        linkedin: formData.linkedin || undefined,
        instagram: formData.instagram || undefined,
        vk: formData.vk || undefined,
        telegram: formData.telegram || undefined,
      };

      const response = await fetch('/api/portfolio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          bio: formData.bio,
          phone: formData.phone,
          website: formData.website,
          socialLinks,
          avatarUrl: formData.avatarUrl,
          coverImageUrl: formData.coverImageUrl,
          backgroundColor: formData.backgroundColor,
          isPublic: formData.isPublic,
          showEmail: formData.showEmail,
          showPhone: formData.showPhone,
        }),
      });

      if (response.ok) {
        setSuccess('Портфолио успешно обновлено');
        router.refresh();
        await loadPortfolio();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка сохранения портфолио');
      }
    } catch (err) {
      console.error('Ошибка сохранения портфолио:', err);
      setError('Ошибка сохранения портфолио');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-lg p-12 text-center">
        <p className="text-gray-600">Загрузка портфолио...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Сообщения об ошибках и успехе */}
      {error && (
        <div className="glass rounded-lg p-4 bg-red-50 border border-red-200">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="glass rounded-lg p-4 bg-green-50 border border-green-200">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Форма редактирования портфолио */}
      <form onSubmit={handleSubmit} className="glass rounded-lg p-6 space-y-6">
        <h2 className="text-2xl font-bold mb-4">Основная информация</h2>

        {/* Заголовок */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Заголовок портфолио
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Мое портфолио"
          />
        </div>

        {/* Описание */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Описание
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Краткое описание вашего портфолио"
          />
        </div>

        {/* Биография */}
        <div>
          <label className="block text-sm font-medium mb-2">
            О себе
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Расскажите о себе, своем опыте и специализации"
          />
        </div>

        {/* Контакты */}
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold mb-4">Контакты</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Телефон
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="+7 (999) 123-45-67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Веб-сайт
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Социальные сети */}
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold mb-4">Социальные сети</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                LinkedIn
              </label>
              <input
                type="url"
                value={formData.linkedin}
                onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Instagram
              </label>
              <input
                type="url"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://instagram.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                VK
              </label>
              <input
                type="url"
                value={formData.vk}
                onChange={(e) => setFormData({ ...formData, vk: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://vk.com/username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Telegram
              </label>
              <input
                type="text"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="@username"
              />
            </div>
          </div>
        </div>

        {/* Визуальное оформление */}
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold mb-4">Визуальное оформление</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {/* Аватар */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Аватар
              </label>
              <div className="space-y-2">
                {formData.avatarUrl && (
                  <div className="mb-2">
                    <img
                      src={formData.avatarUrl}
                      alt="Аватар"
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, 'avatar');
                        }
                      }}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                    <span className={`block px-4 py-2 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      {uploadingAvatar ? 'Загрузка...' : 'Загрузить аватар'}
                    </span>
                  </label>
                </div>
                <input
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  placeholder="Или введите URL"
                />
              </div>
            </div>

            {/* Обложка */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Обложка
              </label>
              <div className="space-y-2">
                {formData.coverImageUrl && (
                  <div className="mb-2">
                    <img
                      src={formData.coverImageUrl}
                      alt="Обложка"
                      className="w-full h-32 rounded-lg object-cover border-2 border-gray-300"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, 'cover');
                        }
                      }}
                      className="hidden"
                      disabled={uploadingCover}
                    />
                    <span className={`block px-4 py-2 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition ${uploadingCover ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      {uploadingCover ? 'Загрузка...' : 'Загрузить обложку'}
                    </span>
                  </label>
                </div>
                <input
                  type="url"
                  value={formData.coverImageUrl}
                  onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  placeholder="Или введите URL"
                />
              </div>
            </div>

            {/* Цвет фона */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Цвет фона
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                  className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.backgroundColor}
                  onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Настройки видимости */}
        <div className="border-t pt-6">
          <h3 className="text-xl font-semibold mb-4">Настройки видимости</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm">Сделать портфолио публичным</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.showEmail}
                onChange={(e) => setFormData({ ...formData, showEmail: e.target.checked })}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm">Показывать email</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.showPhone}
                onChange={(e) => setFormData({ ...formData, showPhone: e.target.checked })}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm">Показывать телефон</span>
            </label>
          </div>
        </div>

        {/* Кнопка сохранения */}
        <div className="border-t pt-6">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>
        </div>
      </form>

      {/* Управление проектами */}
      {portfolio && (
        <div className="mt-8">
          <PortfolioProjectsManager portfolioId={portfolio.id} />
        </div>
      )}
    </div>
  );
}

