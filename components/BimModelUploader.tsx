'use client';

import { useState } from 'react';

interface BimModelUploaderProps {
  objectId: number;
  projectId?: number | null;
  stageId?: number | null;
  onUploadSuccess: () => void;
  onCancel: () => void;
}

export default function BimModelUploader({
  objectId,
  projectId,
  stageId,
  onUploadSuccess,
  onCancel,
}: BimModelUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '',
    isVisibleToCustomer: false,
  });
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [viewableFile, setViewableFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    if (!originalFile) {
      setError('Пожалуйста, выберите исходный файл');
      setUploading(false);
      return;
    }

    if (!formData.name.trim()) {
      setError('Пожалуйста, введите название модели');
      setUploading(false);
      return;
    }

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('originalFile', originalFile);
      if (viewableFile) {
        uploadFormData.append('viewableFile', viewableFile);
      }
      uploadFormData.append('name', formData.name);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('version', formData.version);
      uploadFormData.append('isVisibleToCustomer', formData.isVisibleToCustomer.toString());
      if (projectId) {
        uploadFormData.append('projectId', projectId.toString());
      }
      if (stageId) {
        uploadFormData.append('stageId', stageId.toString());
      }

      const response = await fetch(`/api/objects/${objectId}/models`, {
        method: 'POST',
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки модели');
      }

      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки модели');
    } finally {
      setUploading(false);
    }
  };

  const handleOriginalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalFile(file);
    }
  };

  const handleViewableFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext !== 'ifc' && ext !== 'gltf' && ext !== 'glb') {
        setError('Файл для просмотра должен быть в формате IFC или glTF/glB');
        return;
      }
      setViewableFile(file);
      setError('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Загрузить 3D модель</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Исходный файл (обязательный) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Исходный файл <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".skp,.rvt,.pln,.pla,.ifc,.gltf,.glb,.obj,.3ds"
              onChange={handleOriginalFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Поддерживаемые форматы: SketchUp (.skp), Revit (.rvt), ArchiCAD (.pln, .pla), IFC, glTF, OBJ, 3DS
            </p>
            {originalFile && (
              <p className="mt-1 text-sm text-gray-700">
                Выбран: {originalFile.name} ({(originalFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Файл для просмотра (опциональный) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Файл для просмотра (опционально)
            </label>
            <input
              type="file"
              accept=".ifc,.gltf,.glb"
              onChange={handleViewableFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              IFC или glTF/glB файл для просмотра в браузере. Если не указан, модель можно будет только скачать.
            </p>
            {viewableFile && (
              <p className="mt-1 text-sm text-gray-700">
                Выбран: {viewableFile.name} ({(viewableFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Название */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название модели <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Например: Модель дома v1.0"
              required
            />
          </div>

          {/* Описание */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Описание модели..."
            />
          </div>

          {/* Версия */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Версия
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Например: v1.0, v2.1"
            />
          </div>

          {/* Видимость для заказчика */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isVisibleToCustomer"
              checked={formData.isVisibleToCustomer}
              onChange={(e) => setFormData({ ...formData, isVisibleToCustomer: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isVisibleToCustomer" className="ml-2 block text-sm text-gray-700">
              Видно заказчику
            </label>
          </div>

          {/* Кнопки */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              disabled={uploading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

