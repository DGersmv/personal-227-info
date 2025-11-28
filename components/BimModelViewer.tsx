'use client';

import { useState, useEffect, useRef } from 'react';
import { IfcViewerAPI } from 'web-ifc-viewer';

interface BimModel {
  id: number;
  name: string;
  description: string | null;
  version: string | null;
  originalFilename: string;
  originalFormat: string;
  viewableFilename: string | null;
  viewableFormat: string | null;
  viewableFilePath: string | null;
  isVisibleToCustomer: boolean;
  uploadedAt: string;
  uploadedByUser: {
    id: number;
    name: string | null;
    email: string;
  } | null;
}

interface BimModelViewerProps {
  model: BimModel;
  objectId: number;
  onClose: () => void;
  canDelete: boolean;
  onDelete?: () => void;
  userRole?: string; // Роль пользователя для определения прав
}

export default function BimModelViewer({
  model,
  objectId,
  onClose,
  canDelete,
  onDelete,
  userRole,
}: BimModelViewerProps) {
  const isCustomer = userRole === 'CUSTOMER';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerType, setViewerType] = useState<'ifc' | 'gltf' | 'none'>('none');
  const [containerReady, setContainerReady] = useState(false);
  const ifcContainerRef = useRef<HTMLDivElement>(null);
  const gltfContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  // Callback ref для отслеживания появления контейнера
  const ifcContainerCallbackRef = (node: HTMLDivElement | null) => {
    ifcContainerRef.current = node;
    if (node && viewerType === 'ifc' && !containerReady) {
      console.log('[IFC] Контейнер появился в DOM через callback ref');
      setContainerReady(true);
    }
  };

  const gltfContainerCallbackRef = (node: HTMLDivElement | null) => {
    gltfContainerRef.current = node;
    if (node && viewerType === 'gltf' && !containerReady) {
      console.log('[GLTF] Контейнер появился в DOM через callback ref');
      setContainerReady(true);
    }
  };

  // Устанавливаем тип viewer при изменении модели
  useEffect(() => {
    console.log('BimModelViewer useEffect triggered', {
      viewableFilePath: model.viewableFilePath,
      viewableFormat: model.viewableFormat,
      modelId: model.id,
    });

    setContainerReady(false); // Сбрасываем флаг готовности контейнера

    if (!model.viewableFilePath || !model.viewableFormat) {
      console.log('Нет файла для просмотра');
      setViewerType('none');
      setLoading(false);
      return;
    }

    // Устанавливаем тип viewer сразу
    if (model.viewableFormat === 'IFC') {
      console.log('Загрузка IFC viewer');
      setViewerType('ifc');
    } else if (model.viewableFormat === 'GLTF') {
      console.log('Загрузка GLTF viewer');
      setViewerType('gltf');
    } else {
      console.log('Неизвестный формат:', model.viewableFormat);
      setViewerType('none');
      setLoading(false);
    }
  }, [model.id, model.viewableFilePath, model.viewableFormat]);

  // Загружаем viewer после того, как контейнер отрендерился
  useEffect(() => {
    if (viewerType === 'none' || !containerReady) return;

    console.log('Контейнер готов, запуск загрузки для типа:', viewerType);
    if (viewerType === 'ifc') {
      loadIFCViewer();
    } else if (viewerType === 'gltf') {
      loadGLTFViewer();
    }

    // Cleanup при размонтировании
    return () => {
      if (viewerRef.current) {
        console.log('Очистка viewer');
        try {
          viewerRef.current.dispose?.();
        } catch (e) {
          console.warn('Ошибка при очистке viewer:', e);
        }
        viewerRef.current = null;
      }
    };
  }, [viewerType, containerReady]);

  const loadIFCViewer = async () => {
    try {
      console.log('[IFC] Начало загрузки viewer');
      setLoading(true);
      setError('');

      if (!ifcContainerRef.current) {
        console.error('[IFC] Контейнер не найден');
        return;
      }

      const modelUrl = `/api/objects/${objectId}/models/${model.id}/view`;
      console.log('[IFC] URL модели:', modelUrl);
      
      // Очищаем контейнер
      ifcContainerRef.current.innerHTML = '';
      console.log('[IFC] Контейнер очищен');
      
      // Проверяем доступность файла
      console.log('[IFC] Проверка доступности файла...');
      const fileCheckResponse = await fetch(modelUrl, { method: 'HEAD' });
      console.log('[IFC] Ответ проверки файла:', fileCheckResponse.status, fileCheckResponse.ok);
      if (!fileCheckResponse.ok) {
        throw new Error(`Файл недоступен для загрузки (${fileCheckResponse.status})`);
      }

      // Убеждаемся, что контейнер имеет размеры
      if (!ifcContainerRef.current) {
        throw new Error('Контейнер для просмотра не найден');
      }

      // Устанавливаем минимальные размеры контейнера
      ifcContainerRef.current.style.width = '100%';
      ifcContainerRef.current.style.height = '600px';
      ifcContainerRef.current.style.minHeight = '600px';
      console.log('[IFC] Размеры контейнера установлены');

      // Инициализируем viewer (создаем новый каждый раз для надежности)
      if (viewerRef.current) {
        console.log('[IFC] Очистка предыдущего viewer');
        try {
          viewerRef.current.dispose?.();
        } catch (e) {
          console.warn('[IFC] Ошибка при очистке предыдущего viewer:', e);
        }
        viewerRef.current = null;
      }

      console.log('[IFC] Создание нового IfcViewerAPI...');
      viewerRef.current = new IfcViewerAPI({
        container: ifcContainerRef.current,
        backgroundColor: [0.97, 0.97, 0.97], // Светло-серый фон
      });
      console.log('[IFC] IfcViewerAPI создан');

      // Настройка viewer
      console.log('[IFC] Настройка viewer...');
      // Используем абсолютный путь для WASM файлов из public/wasm
      // Это важно, чтобы избежать проблем с относительными путями на динамических маршрутах
      const wasmPath = typeof window !== 'undefined' 
        ? `${window.location.origin}/wasm/`
        : '/wasm/';
      
      // Проверяем доступность WASM файлов перед установкой пути
      console.log('[IFC] Проверка доступности WASM файлов...');
      const wasmCheckUrl = `${wasmPath}web-ifc.wasm`;
      try {
        const wasmCheckResponse = await fetch(wasmCheckUrl, { method: 'HEAD' });
        console.log('[IFC] Проверка WASM файла:', wasmCheckResponse.status, wasmCheckResponse.ok);
        if (!wasmCheckResponse.ok) {
          console.warn('[IFC] WASM файл недоступен по пути:', wasmCheckUrl);
        }
      } catch (wasmError) {
        console.warn('[IFC] Ошибка проверки WASM файла:', wasmError);
      }
      
      viewerRef.current.IFC.setWasmPath(wasmPath);
      console.log('[IFC] WASM путь установлен (абсолютный):', wasmPath);
      
      viewerRef.current.clipper.active = true;
      viewerRef.current.axes.setAxes();
      viewerRef.current.grid.setGrid();
      console.log('[IFC] Viewer настроен (clipper, axes, grid)');

      // Загружаем модель
      console.log('[IFC] Начало загрузки модели из:', modelUrl);
      console.log('[IFC] Viewer инициализирован, контейнер:', ifcContainerRef.current);
      
      // Попробуем загрузить файл через fetch, а затем передать в viewer
      console.log('[IFC] Загрузка файла через fetch...');
      const fileResponse = await fetch(modelUrl);
      console.log('[IFC] Ответ fetch получен, статус:', fileResponse.status);
      
      if (!fileResponse.ok) {
        throw new Error(`Не удалось загрузить файл: ${fileResponse.status} ${fileResponse.statusText}`);
      }
      
      const fileBlob = await fileResponse.blob();
      console.log('[IFC] Файл загружен, размер:', fileBlob.size, 'байт');
      
      // Создаем URL для blob
      const blobUrl = URL.createObjectURL(fileBlob);
      console.log('[IFC] Blob URL создан:', blobUrl);
      
      // Добавляем таймаут для отладки
      console.log('[IFC] Загрузка модели в viewer через blob URL...');
      const loadPromise = viewerRef.current.IFC.loadIfcUrl(blobUrl);
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Таймаут загрузки модели (60 секунд)')), 60000);
      });
      
      const modelId = await Promise.race([loadPromise, timeoutPromise]) as number;
      console.log('[IFC] Модель загружена успешно, modelId:', modelId);
      
      // Проверяем, что модель действительно загрузилась
      if (modelId === null || modelId === undefined) {
        throw new Error('Модель не загрузилась (modelId is null)');
      }
      
      // Освобождаем blob URL после загрузки
      URL.revokeObjectURL(blobUrl);
      console.log('[IFC] Blob URL освобожден');
      
      // Настраиваем камеру для показа всей модели
      // Селектор может быть недоступен, если модель не загрузилась правильно
      try {
        console.log('[IFC] Настройка селектора...');
        if (viewerRef.current.IFC?.selector) {
          if (typeof viewerRef.current.IFC.selector.prepickIfcItems === 'function') {
            viewerRef.current.IFC.selector.prepickIfcItems();
          }
          if (typeof viewerRef.current.IFC.selector.highlightIfcItems === 'function') {
            viewerRef.current.IFC.selector.highlightIfcItems();
          }
          console.log('[IFC] Селектор настроен');
        } else {
          console.warn('[IFC] Селектор недоступен');
        }
      } catch (selectorError) {
        console.warn('[IFC] Ошибка настройки селектора:', selectorError);
      }
      
      // Показываем всю модель (если метод доступен)
      try {
        console.log('[IFC] Попытка настроить камеру...');
        if (viewerRef.current.camera?.controls?.fitToBox) {
          viewerRef.current.camera.controls.fitToBox();
        } else if (viewerRef.current.camera?.controls?.fitToSphere) {
          viewerRef.current.camera.controls.fitToSphere();
        }
        console.log('[IFC] Камера настроена');
      } catch (cameraError) {
        console.warn('[IFC] Не удалось настроить камеру:', cameraError);
      }
      
      console.log('[IFC] Viewer полностью настроен, модель должна быть видна');
      setLoading(false);
    } catch (err: any) {
      console.error('Ошибка загрузки IFC просмотрщика:', err);
      setError(err.message || 'Не удалось загрузить модель. Возможно, файл поврежден или слишком большой.');
      setLoading(false);
      
      // Показываем альтернативный вариант с информацией
      if (ifcContainerRef.current) {
        const modelUrl = `/api/objects/${objectId}/models/${model.id}/view`;
        const downloadButton = isCustomer ? '' : `
          <a href="${modelUrl}" download style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin: 10px;">
            Скачать IFC файл
          </a>
        `;
        const customerMessage = isCustomer ? `
          <p style="margin-bottom: 20px; color: #666;">
            К сожалению, не удалось загрузить модель для просмотра в браузере.
            Скачивание файлов недоступно для заказчиков.
          </p>
        ` : `
          <p style="margin-bottom: 20px; color: #666;">
            Не удалось загрузить модель в браузере. Вы можете скачать файл и открыть в специализированном ПО.
          </p>
        `;
        
        ifcContainerRef.current.innerHTML = `
          <div style="padding: 40px; text-align: center; background: #f0f0f0; border-radius: 8px; min-height: 400px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
            ${customerMessage}
            ${downloadButton}
            <p style="margin-top: 20px; color: #999; font-size: 12px;">
              Рекомендуемые программы: BIM Vision, FZK Viewer, Autodesk Viewer
            </p>
          </div>
        `;
      }
    }
  };

  const loadGLTFViewer = async () => {
    try {
      setLoading(true);
      setError('');

      // Используем model-viewer от Google
      if (!gltfContainerRef.current) return;

      const modelUrl = `/api/objects/${objectId}/models/${model.id}/view`;
      
      // Создаем model-viewer элемент
      const modelViewer = document.createElement('model-viewer');
      modelViewer.src = modelUrl;
      modelViewer.alt = model.name;
      modelViewer.setAttribute('auto-rotate', '');
      modelViewer.setAttribute('camera-controls', '');
      modelViewer.setAttribute('style', 'width: 100%; height: 600px; background-color: #f0f0f0;');
      
      gltfContainerRef.current.innerHTML = '';
      gltfContainerRef.current.appendChild(modelViewer);

      // Загружаем скрипт model-viewer, если еще не загружен
      if (!document.querySelector('script[src*="model-viewer"]')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
        document.head.appendChild(script);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('Ошибка загрузки glTF просмотрщика:', err);
      setError('Не удалось загрузить модель.');
      setLoading(false);
    }
  };

  const handleDownloadOriginal = () => {
    window.open(`/api/objects/${objectId}/models/${model.id}/download?type=original`, '_blank');
  };

  const handleDownloadViewable = () => {
    if (model.viewableFilePath) {
      window.open(`/api/objects/${objectId}/models/${model.id}/download?type=viewable`, '_blank');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить эту модель?')) {
      return;
    }

    try {
      const response = await fetch(`/api/objects/${objectId}/models/${model.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка удаления модели');
      }

      if (onDelete) {
        onDelete();
      }
      onClose();
    } catch (err: any) {
      alert('Ошибка удаления модели: ' + err.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold">{model.name}</h2>
            {model.version && (
              <p className="text-sm text-gray-500">Версия: {model.version}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Информация о модели */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Формат исходного файла:</span>{' '}
              {model.originalFormat}
            </div>
            <div>
              <span className="font-medium">Файл для просмотра:</span>{' '}
              {model.viewableFormat || 'Не загружен'}
            </div>
            <div>
              <span className="font-medium">Загружено:</span>{' '}
              {new Date(model.uploadedAt).toLocaleDateString('ru-RU')}
            </div>
            {model.uploadedByUser && (
              <div>
                <span className="font-medium">Автор:</span>{' '}
                {model.uploadedByUser.name || model.uploadedByUser.email}
              </div>
            )}
          </div>
          {model.description && (
            <div className="mt-2 text-sm">
              <span className="font-medium">Описание:</span> {model.description}
            </div>
          )}
        </div>

        {/* Просмотрщик */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Рендерим контейнер сразу, когда viewerType установлен, чтобы callback ref мог сработать */}
        {viewerType === 'ifc' && (
          <div 
            ref={ifcContainerCallbackRef} 
            className="w-full border border-gray-300 rounded-lg mb-4 relative"
            style={{ minHeight: '600px', height: '600px' }}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Загрузка модели...</p>
                </div>
              </div>
            )}
          </div>
        )}
        {viewerType === 'gltf' && (
          <div 
            ref={gltfContainerCallbackRef} 
            className="w-full border border-gray-300 rounded-lg mb-4 relative"
            style={{ minHeight: '600px', height: '600px' }}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Загрузка модели...</p>
                </div>
              </div>
            )}
          </div>
        )}
        {viewerType === 'none' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center mb-4">
            <p className="text-yellow-800 mb-2">
              Файл для просмотра не загружен. Модель можно только скачать.
            </p>
            <p className="text-sm text-yellow-600">
              Загрузите IFC или glTF файл для просмотра модели в браузере.
            </p>
          </div>
        )}

        {/* Кнопки действий */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex space-x-3">
            {/* Заказчик не может скачивать файлы */}
            {!isCustomer && (
              <>
                <button
                  onClick={handleDownloadOriginal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  📥 Скачать исходный файл
                </button>
                {model.viewableFilePath && (
                  <button
                    onClick={handleDownloadViewable}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    📥 Скачать для просмотра ({model.viewableFormat})
                  </button>
                )}
              </>
            )}
            {isCustomer && (
              <p className="text-sm text-gray-500 italic">
                Заказчик может только просматривать модели. Скачивание недоступно.
              </p>
            )}
          </div>
          {canDelete && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

