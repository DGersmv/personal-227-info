'use client';

import { useState, useEffect } from 'react';

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

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Загрузка...</div>;
  }

  return (
    <div>
      {/* Фильтр по папкам */}
      {folders.length > 0 && (
        <div className="glass rounded-lg p-4 mb-6">
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
        </div>
      )}

      {/* Галерея фото */}
      {photos.length === 0 ? (
        <div className="glass rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">
            {selectedFolder ? 'В этой папке пока нет фото' : 'Фотографии пока не загружены'}
          </p>
          {canUpload && (
            <button className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
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
              <div className="aspect-square bg-gray-200 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
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
    </div>
  );
}

