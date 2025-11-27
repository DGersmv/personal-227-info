'use client';

import { useState, useEffect, useRef } from 'react';

interface Video {
  id: number;
  filename: string;
  originalName: string;
  filePath: string;
  uploadedAt: string;
  isVisibleToCustomer: boolean;
  folderId: number | null;
  duration: number | null;
  width: number | null;
  height: number | null;
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

interface VideosGalleryProps {
  objectId: number;
  userRole: string;
  canUpload: boolean;
}

export default function VideosGallery({ objectId, userRole, canUpload }: VideosGalleryProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isVisibleToCustomer, setIsVisibleToCustomer] = useState(userRole === 'CUSTOMER');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVideos();
    
    // Слушать событие обновления видео
    const handleVideosUpdated = () => {
      loadVideos();
    };
    window.addEventListener('videosUpdated', handleVideosUpdated);
    
    return () => {
      window.removeEventListener('videosUpdated', handleVideosUpdated);
    };
  }, [objectId, selectedFolder]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const url = selectedFolder
        ? `/api/objects/${objectId}/videos?folderId=${selectedFolder}`
        : `/api/objects/${objectId}/videos`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setVideos(data.videos || []);
        setFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки видео:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      if (selectedFolder) {
        formData.append('folderId', selectedFolder.toString());
      }
      formData.append('isVisibleToCustomer', isVisibleToCustomer.toString());

      const response = await fetch(`/api/objects/${objectId}/videos`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        await loadVideos();
        setShowUploadModal(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorData = await response.json();
        setUploadError(errorData.error || 'Ошибка загрузки видео');
      }
    } catch (error) {
      console.error('Ошибка загрузки видео:', error);
      setUploadError('Ошибка загрузки видео');
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Загрузка...</div>;
  }

  return (
    <div>
      {/* Кнопка загрузки и фильтр по папкам */}
      <div className="glass rounded-lg p-4 mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap gap-2">
            {canUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium"
              >
                + Загрузить видео
              </button>
            )}
            {canUpload && (
              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
              >
                + Создать папку
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`px-4 py-2 rounded-lg transition text-sm ${
                selectedFolder === null
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Все видео
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
      </div>

      {/* Галерея видео */}
      {videos.length === 0 ? (
        <div className="glass rounded-lg p-12 text-center">
          <p className="text-gray-600 text-lg mb-4">
            {selectedFolder ? 'В этой папке пока нет видео' : 'Видео пока не загружены'}
          </p>
          {canUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              Загрузить первое видео
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="glass rounded-lg overflow-hidden hover:bg-white/20 transition"
            >
              <div className="aspect-video bg-gray-200 flex items-center justify-center overflow-hidden relative">
                <video
                  src={`/api/files/videos/${objectId}/${video.filename}`}
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                />
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-medium truncate flex-1">{video.originalName}</p>
                  <div className="flex items-center gap-2 ml-2">
                    {/* Переключатель видимости для заказчика */}
                    {(userRole === 'DESIGNER' || userRole === 'BUILDER' || userRole === 'ADMIN') && (
                      <label
                        className="flex items-center gap-1 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                        title={video.isVisibleToCustomer ? 'Видно заказчику' : 'Скрыто от заказчика'}
                      >
                        <input
                          type="checkbox"
                          checked={video.isVisibleToCustomer}
                          onChange={async (e) => {
                            const newVisibility = e.target.checked;
                            try {
                              const response = await fetch(`/api/videos/${video.id}/visibility`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ isVisibleToCustomer: newVisibility }),
                              });

                              if (response.ok) {
                                await loadVideos();
                              } else {
                                const errorData = await response.json();
                                alert(errorData.error || 'Ошибка изменения видимости');
                                // Откатить чекбокс
                                e.target.checked = !newVisibility;
                              }
                            } catch (error) {
                              console.error('Ошибка изменения видимости:', error);
                              alert('Ошибка изменения видимости');
                              // Откатить чекбокс
                              e.target.checked = !newVisibility;
                            }
                          }}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className={`text-xs px-2 py-1 rounded ${
                          video.isVisibleToCustomer 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {video.isVisibleToCustomer ? 'Видно' : 'Скрыто'}
                        </span>
                      </label>
                    )}
                    {canUpload && (
                      <select
                        value={video.folderId || ''}
                        onChange={async (e) => {
                          const newFolderId = e.target.value === '' ? null : parseInt(e.target.value);
                          try {
                            const response = await fetch(`/api/videos/${video.id}/move`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({ folderId: newFolderId }),
                            });

                            if (response.ok) {
                              await loadVideos();
                            } else {
                              const errorData = await response.json();
                              alert(errorData.error || 'Ошибка перемещения видео');
                            }
                          } catch (error) {
                            console.error('Ошибка перемещения видео:', error);
                            alert('Ошибка перемещения видео');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                      >
                        <option value="">Все</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(video.uploadedAt).toLocaleDateString('ru-RU')}
                </p>
                {video._count.comments > 0 && (
                  <p className="text-xs text-primary-600 mt-1">
                    {video._count.comments} {video._count.comments === 1 ? 'комментарий' : video._count.comments < 5 ? 'комментария' : 'комментариев'}
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
            <h2 className="text-xl font-bold mb-4">Загрузить видео</h2>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="video-upload"
            />
            
            <label
              htmlFor="video-upload"
              className="block w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-center cursor-pointer mb-4"
            >
              {uploading ? 'Загрузка...' : 'Выбрать видео файлы'}
            </label>
            
            <p className="text-sm text-gray-600 text-center mb-4">
              Можно выбрать несколько видео файлов. Максимальный размер: 500 MB.
            </p>

            {/* Чекбокс видимости для заказчика */}
            {(userRole === 'DESIGNER' || userRole === 'BUILDER' || userRole === 'ADMIN') && (
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisibleToCustomer}
                    onChange={(e) => setIsVisibleToCustomer(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    Видно заказчику
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Если отмечено, заказчик сможет видеть эти файлы
                </p>
              </div>
            )}

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

      {/* Модальное окно создания папки */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Создать папку</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newFolderName.trim()) return;

                setCreatingFolder(true);
                try {
                  const response = await fetch(`/api/objects/${objectId}/folders`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name: newFolderName.trim() }),
                  });

                  if (response.ok) {
                    await loadVideos(); // Перезагрузить список (включая папки)
                    setNewFolderName('');
                    setShowCreateFolderModal(false);
                  } else {
                    const errorData = await response.json();
                    alert(errorData.error || 'Ошибка создания папки');
                  }
                } catch (error) {
                  console.error('Ошибка создания папки:', error);
                  alert('Ошибка создания папки');
                } finally {
                  setCreatingFolder(false);
                }
              }}
            >
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Название папки"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                autoFocus
                disabled={creatingFolder}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {creatingFolder ? 'Создание...' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateFolderModal(false);
                    setNewFolderName('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                  disabled={creatingFolder}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

