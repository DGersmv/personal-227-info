'use client';

import { useState, useEffect, useRef } from 'react';

interface Photo {
  id: number;
  filename: string;
  originalName: string;
  filePath: string;
  uploadedAt: string;
  isVisibleToCustomer: boolean;
  folder: {
    id: number;
    name: string;
  } | null;
  stage: {
    id: number;
    title: string;
  } | null;
  _count: {
    comments: number;
  };
}

interface Folder {
  id: number;
  name: string;
}

interface PhotosGalleryProps {
  objectId: number;
  userRole: string;
  canUpload: boolean;
}

export default function PhotosGallery({ objectId, userRole, canUpload }: PhotosGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, [objectId, selectedFolder]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const url = selectedFolder
        ? `/api/objects/${objectId}/photos?folderId=${selectedFolder}`
        : `/api/objects/${objectId}/photos`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPhotos(data.photos || []);
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки фото:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedFolder) {
        formData.append('folderId', selectedFolder.toString());
      }
      formData.append('isVisibleToCustomer', userRole === 'CUSTOMER' ? 'true' : 'false');

      const response = await fetch(`/api/objects/${objectId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        await loadPhotos(); // Перезагрузить список фото
        setShowUploadModal(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await response.json();
        setUploadError(errorData.error || 'Ошибка загрузки фото');
      }
    } catch (error) {
      console.error('Ошибка загрузки фото:', error);
      setUploadError('Ошибка загрузки фото');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Загрузка...</div>;
  }

  return (
    <div>
      {/* Кнопка загрузки и фильтр по папкам */}
      <div className="glass rounded-lg p-4 mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          {canUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
            >
              + Загрузить фото
            </button>
          )}
          {folders.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  selectedFolder === null
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Все фото
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`px-4 py-2 rounded-lg transition text-sm ${
                    selectedFolder === folder.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {folder.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Галерея фото */}
      {photos.length === 0 ? (
        <div className="glass rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">
            {selectedFolder ? 'В этой папке пока нет фото' : 'Фотографии пока не загружены'}
          </p>
          {canUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Загрузить первое фото
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="glass rounded-lg overflow-hidden hover:bg-white/20 transition cursor-pointer"
            >
              <div className="aspect-square bg-gray-200 flex items-center justify-center overflow-hidden">
                <img
                  src={photo.filePath}
                  alt={photo.originalName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Если изображение не загрузилось, показать иконку
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      `;
                    }
                  }}
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{photo.originalName}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(photo.uploadedAt).toLocaleDateString('ru-RU')}
                </p>
                {photo._count.comments > 0 && (
                  <p className="text-xs text-primary-600 mt-1">
                    {photo._count.comments} {photo._count.comments === 1 ? 'комментарий' : photo._count.comments < 5 ? 'комментария' : 'комментариев'}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно загрузки */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Загрузить фото</h2>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="photo-upload"
            />
            
            <label
              htmlFor="photo-upload"
              className="block w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-center cursor-pointer mb-4"
            >
              {uploading ? 'Загрузка...' : 'Выбрать файл'}
            </label>

            {uploadError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {uploadError}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                disabled={uploading}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

