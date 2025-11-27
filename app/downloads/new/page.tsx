'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Link from 'next/link';

export default function NewDownloadPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'PLUGIN',
    version: '',
    author: '',
    price: '',
    category: '',
    tags: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{
    filename: string;
    originalName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileInfo(null);
    setError('');

    // Загрузить файл
    setUploadingFile(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);

      const response = await fetch('/api/downloads/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка загрузки файла');
        setFile(null);
        setUploadingFile(false);
        return;
      }

      setFileInfo(data);
    } catch (err) {
      setError('Ошибка загрузки файла');
      setFile(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fileInfo) {
      setError('Необходимо загрузить файл');
      return;
    }

    if (!formData.name) {
      setError('Название обязательно');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/downloads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          type: formData.type,
          version: formData.version || null,
          author: formData.author || null,
          price: formData.price ? parseFloat(formData.price) : null,
          category: formData.category || null,
          tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : null,
          filename: fileInfo.filename,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Ошибка создания загрузки');
        setLoading(false);
        return;
      }

      // Успешное создание - редирект на страницу загрузок
      router.push('/downloads');
    } catch (err) {
      setError('Ошибка соединения с сервером');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              href="/downloads"
              className="text-primary-600 hover:underline mb-4 inline-block"
            >
              ← Назад к загрузкам
            </Link>
            <h1 className="text-4xl font-bold">Добавить загрузку</h1>
            <p className="text-gray-600 mt-2">
              Добавьте плагин, программу или другой файл для скачивания
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="glass rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Загрузка файла */}
              <div>
                <label htmlFor="file" className="block text-sm font-medium mb-2">
                  Файл <span className="text-red-500">*</span>
                </label>
                <input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  required
                  disabled={uploadingFile}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {uploadingFile && (
                  <p className="text-sm text-gray-600 mt-2">Загрузка файла...</p>
                )}
                {fileInfo && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded text-sm">
                    <p className="text-green-700">
                      ✓ Файл загружен: {fileInfo.originalName || fileInfo.filename}
                    </p>
                    <p className="text-gray-600">
                      Размер: {(fileInfo.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>

              {/* Название */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Например: AutoCAD Плагин для чертежей"
                />
              </div>

              {/* Описание */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-2">
                  Описание
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Описание загрузки..."
                />
              </div>

              {/* Тип и версия */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="type" className="block text-sm font-medium mb-2">
                    Тип <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="PLUGIN">Плагин</option>
                    <option value="PROGRAM">Программа</option>
                    <option value="TEMPLATE">Шаблон</option>
                    <option value="LIBRARY">Библиотека</option>
                    <option value="OTHER">Другое</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="version" className="block text-sm font-medium mb-2">
                    Версия
                  </label>
                  <input
                    id="version"
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              {/* Автор и категория */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="author" className="block text-sm font-medium mb-2">
                    Автор
                  </label>
                  <input
                    id="author"
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Имя автора или компании"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block text-sm font-medium mb-2">
                    Категория
                  </label>
                  <input
                    id="category"
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="CAD плагины, 3D плагины и т.д."
                  />
                </div>
              </div>

              {/* Цена */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium mb-2">
                  Цена (₽)
                  <span className="text-gray-500 text-xs ml-2">
                    Оставьте пустым для бесплатной загрузки
                  </span>
                </label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* Теги */}
              <div>
                <label htmlFor="tags" className="block text-sm font-medium mb-2">
                  Теги
                  <span className="text-gray-500 text-xs ml-2">
                    Через запятую
                  </span>
                </label>
                <input
                  id="tags"
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="autocad, плагин, чертежи"
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading || !fileInfo}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Создание...' : 'Создать загрузку'}
                </button>
                <Link
                  href="/downloads"
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Отмена
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

