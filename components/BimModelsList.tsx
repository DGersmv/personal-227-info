'use client';

import { useState, useEffect } from 'react';
import BimModelUploader from './BimModelUploader';
import BimModelViewer from './BimModelViewer';

interface BimModel {
  id: number;
  name: string;
  description: string | null;
  version: string | null;
  originalFilename: string;
  originalFormat: string;
  viewableFilename: string | null;
  viewableFormat: string | null;
  isVisibleToCustomer: boolean;
  uploadedAt: string;
  uploadedByUser: {
    id: number;
    name: string | null;
    email: string;
  } | null;
  project: {
    id: number;
    title: string;
  } | null;
  stage: {
    id: number;
    title: string;
  } | null;
  _count: {
    comments: number;
  };
}

interface BimModelsListProps {
  objectId: number;
  userRole: string;
  userId: number;
  canUpload: boolean;
}

export default function BimModelsList({
  objectId,
  userRole,
  userId,
  canUpload,
}: BimModelsListProps) {
  const [models, setModels] = useState<BimModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<BimModel | null>(null);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/objects/${objectId}/models`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки моделей');
      }

      setModels(data.models || []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки моделей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, [objectId]);

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    loadModels();
  };

  const handleModelClick = (model: BimModel) => {
    setSelectedModel(model);
  };

  const handleDelete = () => {
    loadModels();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getFormatIcon = (format: string) => {
    const icons: Record<string, string> = {
      SKETCHUP: '📐',
      REVIT: '🏗️',
      ARCHICAD: '🏛️',
      IFC: '📦',
      GLTF: '🎨',
      OBJ: '📊',
      THREE_DS: '🎯',
      OTHER: '📄',
    };
    return icons[format] || '📄';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка моделей...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Заголовок и кнопка загрузки */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">3D Модели</h2>
          <p className="text-gray-600 mt-1">
            {models.length} {models.length === 1 ? 'модель' : models.length < 5 ? 'модели' : 'моделей'}
          </p>
        </div>
        {canUpload && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + Загрузить модель
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Список моделей */}
      {models.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">Пока нет загруженных моделей</p>
          {canUpload && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Загрузить первую модель
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.map((model) => (
            <div
              key={model.id}
              onClick={() => handleModelClick(model)}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{getFormatIcon(model.originalFormat)}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{model.name}</h3>
                    {model.version && (
                      <p className="text-xs text-gray-500">v{model.version}</p>
                    )}
                  </div>
                </div>
                {model.viewableFormat && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    {model.viewableFormat}
                  </span>
                )}
              </div>

              {model.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {model.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500">
                <div>
                  <p>{formatDate(model.uploadedAt)}</p>
                  {model.uploadedByUser && (
                    <p className="mt-1">
                      {model.uploadedByUser.name || model.uploadedByUser.email}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">{model.originalFormat}</p>
                  {model._count.comments > 0 && (
                    <p className="mt-1">💬 {model._count.comments}</p>
                  )}
                </div>
              </div>

              {model.project && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Проект: {model.project.title}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно загрузки */}
      {showUploadModal && (
        <BimModelUploader
          objectId={objectId}
          onUploadSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadModal(false)}
        />
      )}

      {/* Модальное окно просмотра */}
      {selectedModel && (
        <BimModelViewer
          model={selectedModel}
          objectId={objectId}
          onClose={() => setSelectedModel(null)}
          canDelete={canUpload && selectedModel.uploadedByUser?.id === userId}
          onDelete={handleDelete}
          userRole={userRole}
        />
      )}
    </div>
  );
}

