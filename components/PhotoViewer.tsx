'use client';

import { useState, useEffect, useRef } from 'react';

interface PhotoComment {
  id: number;
  content: string;
  x: number | null;
  y: number | null;
  isVisibleToCustomer: boolean;
  createdAt: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    role: string;
  };
}

interface Photo {
  id: number;
  filename: string;
  originalName: string;
  filePath: string;
  uploadedAt: string;
}

interface PhotoViewerProps {
  photo: Photo;
  objectId: number;
  userRole: string;
  userId: number;
  onClose: () => void;
}

export default function PhotoViewer({ photo, objectId, userRole, userId, onClose }: PhotoViewerProps) {
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentX, setCommentX] = useState<number | null>(null);
  const [commentY, setCommentY] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showGeneralCommentForm, setShowGeneralCommentForm] = useState(false);
  const [generalCommentContent, setGeneralCommentContent] = useState('');
  const [generalCommentVisible, setGeneralCommentVisible] = useState(true);
  const [pointCommentVisible, setPointCommentVisible] = useState(true);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComments();
  }, [photo.id]);

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/photos/${photo.id}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки комментариев:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageContextMenu = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    
    if (!imageRef.current || !containerRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Вычислить координаты относительно изображения (в процентах)
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setCommentX(x);
    setCommentY(y);
    setCommentContent('');
    setShowCommentForm(true);
    setShowGeneralCommentForm(false);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/photos/${photo.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: commentContent.trim(),
          x: commentX,
          y: commentY,
          isVisibleToCustomer: pointCommentVisible,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data.comment]);
        setCommentContent('');
        setCommentX(null);
        setCommentY(null);
        setShowCommentForm(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Ошибка создания комментария');
      }
    } catch (error) {
      console.error('Ошибка создания комментария:', error);
      alert('Ошибка создания комментария');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitGeneralComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalCommentContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/photos/${photo.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: generalCommentContent.trim(),
          x: null,
          y: null,
          isVisibleToCustomer: generalCommentVisible,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setComments([...comments, data.comment]);
        setGeneralCommentContent('');
        setShowGeneralCommentForm(false);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Ошибка создания комментария');
      }
    } catch (error) {
      console.error('Ошибка создания комментария:', error);
      alert('Ошибка создания комментария');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Удалить этот комментарий?')) return;

    try {
      const response = await fetch(`/api/photos/${photo.id}/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Ошибка удаления комментария');
      }
    } catch (error) {
      console.error('Ошибка удаления комментария:', error);
      alert('Ошибка удаления комментария');
    }
  };

  // Фильтрация комментариев: заказчик видит только видимые комментарии
  const visibleComments = userRole === 'CUSTOMER' 
    ? comments.filter((c) => c.isVisibleToCustomer)
    : comments;

  const pointComments = visibleComments.filter((c) => c.x !== null && c.y !== null);
  const generalComments = visibleComments.filter((c) => c.x === null && c.y === null);

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Заголовок */}
      <div className="flex justify-between items-center p-4 bg-black/50">
        <div>
          <h2 className="text-xl font-bold text-white">{photo.originalName}</h2>
          <p className="text-sm text-gray-300">
            {new Date(photo.uploadedAt).toLocaleDateString('ru-RU')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGeneralCommentForm(!showGeneralCommentForm)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            {showGeneralCommentForm ? 'Отменить' : 'Комментарий'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 flex overflow-hidden">
        {/* Изображение с точками */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-auto bg-gray-900 flex items-center justify-center p-4"
        >
          <div className="relative inline-block max-w-full max-h-full">
            <img
              ref={imageRef}
              src={`/api/files/photos/${objectId}/${photo.filename}`}
              alt={photo.originalName}
              className="max-w-full max-h-full object-contain"
              onContextMenu={handleImageContextMenu}
            />
            
            {/* Точки на фото */}
            {pointComments.map((comment) => (
              <div
                key={comment.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{
                  left: `${comment.x}%`,
                  top: `${comment.y}%`,
                }}
              >
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg group-hover:scale-125 transition-transform" />
                <div className="absolute left-1/2 top-6 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  {comment.user.name || comment.user.email}
                </div>
              </div>
            ))}
          </div>

          {/* Подсказка */}
          <div className="absolute bottom-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded">
            Правый клик на фото для создания точки с комментарием
          </div>
        </div>

        {/* Боковая панель с комментариями */}
        <div className="w-96 bg-gray-800 overflow-y-auto flex flex-col">
          {/* Комментарии с точками */}
          {pointComments.length > 0 && (
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold mb-3">Комментарии к точкам</h3>
              <div className="space-y-3">
                {pointComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-gray-700 rounded-lg p-3 text-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-medium">
                          {comment.user.name || comment.user.email}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(comment.createdAt).toLocaleString('ru-RU')}
                        </p>
                        <p className="text-gray-300 text-xs mt-1">
                          Точка: ({comment.x?.toFixed(1)}%, {comment.y?.toFixed(1)}%)
                        </p>
                      </div>
                      {(comment.user.id === userId || userRole === 'ADMIN') && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                    <p className="text-gray-200">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Общие комментарии */}
          <div className="p-4 flex-1">
            <h3 className="text-white font-semibold mb-3">Общие комментарии</h3>
            
            {/* Форма общего комментария */}
            {showGeneralCommentForm && (
              <form onSubmit={handleSubmitGeneralComment} className="mb-4">
                <textarea
                  value={generalCommentContent}
                  onChange={(e) => setGeneralCommentContent(e.target.value)}
                  placeholder="Введите комментарий..."
                  className="w-full bg-gray-700 text-white rounded-lg p-3 mb-2 resize-none"
                  rows={3}
                  disabled={submitting}
                />
                {/* Чекбокс видимости для заказчика (только для DESIGNER, BUILDER, ADMIN) */}
                {(userRole === 'DESIGNER' || userRole === 'BUILDER' || userRole === 'ADMIN') && (
                  <div className="mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={generalCommentVisible}
                        onChange={(e) => setGeneralCommentVisible(e.target.checked)}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-300">
                        Видно заказчику
                      </span>
                    </label>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting || !generalCommentContent.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {submitting ? 'Отправка...' : 'Отправить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGeneralCommentForm(false);
                      setGeneralCommentContent('');
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            {/* Список общих комментариев */}
            <div className="space-y-3">
              {generalComments.length === 0 ? (
                <p className="text-gray-400 text-sm">Нет общих комментариев</p>
              ) : (
                generalComments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-gray-700 rounded-lg p-3 text-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-white font-medium">
                            {comment.user.name || comment.user.email}
                          </p>
                          {!comment.isVisibleToCustomer && (userRole === 'DESIGNER' || userRole === 'BUILDER' || userRole === 'ADMIN') && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                              Скрыто
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs">
                          {new Date(comment.createdAt).toLocaleString('ru-RU')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {(comment.user.id === userId || userRole === 'ADMIN') && (userRole !== 'CUSTOMER') && (
                          <label
                            className="flex items-center gap-1 cursor-pointer"
                            title={comment.isVisibleToCustomer ? 'Видно заказчику' : 'Скрыто от заказчика'}
                          >
                            <input
                              type="checkbox"
                              checked={comment.isVisibleToCustomer}
                              onChange={async (e) => {
                                const newVisibility = e.target.checked;
                                try {
                                  const response = await fetch(`/api/photos/${photo.id}/comments/${comment.id}/visibility`, {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({ isVisibleToCustomer: newVisibility }),
                                  });

                                  if (response.ok) {
                                    await loadComments();
                                  } else {
                                    const errorData = await response.json();
                                    alert(errorData.error || 'Ошибка изменения видимости');
                                    e.target.checked = !newVisibility;
                                  }
                                } catch (error) {
                                  console.error('Ошибка изменения видимости:', error);
                                  alert('Ошибка изменения видимости');
                                  e.target.checked = !newVisibility;
                                }
                              }}
                              className="w-3 h-3 text-primary-600 rounded"
                            />
                          </label>
                        )}
                        {(comment.user.id === userId || userRole === 'ADMIN') && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-200">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модальное окно для комментария к точке */}
      {showCommentForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-white text-xl font-bold mb-4">
              Комментарий к точке
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Позиция: ({commentX?.toFixed(1)}%, {commentY?.toFixed(1)}%)
            </p>
            <form onSubmit={handleSubmitComment}>
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Введите комментарий к этой точке..."
                className="w-full bg-gray-700 text-white rounded-lg p-3 mb-4 resize-none"
                rows={4}
                autoFocus
                disabled={submitting}
              />
              {/* Чекбокс видимости для заказчика (только для DESIGNER, BUILDER, ADMIN) */}
              {(userRole === 'DESIGNER' || userRole === 'BUILDER' || userRole === 'ADMIN') && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pointCommentVisible}
                      onChange={(e) => setPointCommentVisible(e.target.checked)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-300">
                      Видно заказчику
                    </span>
                  </label>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || !commentContent.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Отправка...' : 'Отправить'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCommentForm(false);
                    setCommentContent('');
                    setCommentX(null);
                    setCommentY(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                  disabled={submitting}
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

