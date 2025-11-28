'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as OBC from '@thatopen/components';

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
  userRole?: string;
}

// Интерфейс для узла дерева IFC
interface IFCTreeNode {
  id: string;
  name: string;
  category: string | null;
  localId: number | null;
  localIds: number[]; // Все элементы этого узла и его детей
  children: IFCTreeNode[];
  visible: boolean;
  expanded: boolean;
}

// Интерфейс для комментария к BIM модели
interface BimModelComment {
  id: number;
  content: string;
  x: number | null;
  y: number | null;
  z: number | null;
  userId: number;
  user: {
    id: number;
    name: string | null;
    email: string;
  };
  createdAt: string;
  isVisibleToCustomer: boolean;
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

  // Состояние для дерева параметров IFC
  const [ifcTree, setIfcTree] = useState<IFCTreeNode | null>(null);
  const [showTree, setShowTree] = useState(false);
  const [treeAvailable, setTreeAvailable] = useState(false);

  // Состояние для комментариев
  const [comments, setComments] = useState<BimModelComment[]>([]);
  const [showComments, setShowComments] = useState(true);
  const [commentMode, setCommentMode] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number; z: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);

  // Синхронизируем ref с состоянием
  useEffect(() => {
    commentModeRef.current = commentMode;
  }, [commentMode]);

  // Внешние контейнеры, которыми управляет React (рамка + оверлей)
  const ifcContainerRef = useRef<HTMLDivElement | null>(null);
  const gltfContainerRef = useRef<HTMLDivElement | null>(null);

  // Внутренние host-контейнеры для движка (canvas / model-viewer)
  const ifcHostRef = useRef<HTMLDivElement | null>(null);
  const gltfHostRef = useRef<HTMLDivElement | null>(null);

  // ThatOpen Components
  const componentsRef = useRef<OBC.Components | null>(null);
  const workerUrlRef = useRef<string | null>(null);
  const fragmentsRef = useRef<any>(null);
  const worldRef = useRef<any>(null);
  const modelFragmentRef = useRef<any>(null); // Сохраняем ссылку на загруженную модель

  // Mapping для быстрого доступа к localIds по узлам дерева
  const nodeToLocalIdsRef = useRef<Map<string, number[]>>(new Map());

  // Ref для commentMode, чтобы обработчик клика всегда видел актуальное значение
  const commentModeRef = useRef(false);

  // Функция для построения иерархического дерева из Fragments schema
  const buildIFCTree = async (modelFragment: any): Promise<IFCTreeNode | null> => {
    try {
      const spatialStructure = await modelFragment.getSpatialStructure();

      // Рекурсивная функция для преобразования узла в IFCTreeNode
      const convertNode = async (node: any, parentId: string = 'root'): Promise<IFCTreeNode | null> => {
        if (!node) return null;

        const localId =
          node.local_id !== null && node.local_id !== undefined
            ? node.local_id
            : node.localId !== null && node.localId !== undefined
            ? node.localId
            : null;

        const nodeId =
          localId !== null
            ? `${parentId}_${localId}`
            : `${parentId}_${Date.now()}_${Math.random()}`;

        // Функция для рекурсивного поиска значения в объекте
        const findValueInObject = (obj: any, searchKeys: string[]): string | null => {
          if (!obj || typeof obj !== 'object') return null;

          // Прямой поиск по ключам
          for (const key of searchKeys) {
            if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
              const value = String(obj[key]).trim();
              if (value) return value;
            }
          }

          // Рекурсивный поиск во вложенных объектах
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const value = obj[key];
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                const found = findValueInObject(value, searchKeys);
                if (found) return found;
              }
            }
          }

          return null;
        };

        // Список ключей для поиска названия (приоритет: русские варианты, затем английские)
        const nameSearchKeys = [
          'Name_ru',
          'name_ru',
          'Имя',
          'имя',
          'Название',
          'название',
          'LongName_ru',
          'longName_ru',
          'ДлинноеИмя',
          'длинноеИмя',
          'DisplayName_ru',
          'displayName_ru',
          'Name',
          'name',
          'LongName',
          'longName',
          'DisplayName',
          'displayName',
          'description',
          'Description',
          'Описание',
          'описание',
        ];

        // Пытаемся найти название в разных полях (поддержка разных форматов IFC)
        let nodeName = findValueInObject(node, nameSearchKeys);

        // Если название не найдено, пробуем получить из атрибутов
        if (!nodeName && node.attributes) {
          nodeName = findValueInObject(node.attributes, nameSearchKeys);
        }

        // Если всё ещё нет названия и есть localId, пытаемся получить свойства через Fragments API
        if (!nodeName && localId !== null) {
          try {
            // Пробуем получить свойства элемента
            const properties = await modelFragment.getProperties([localId]);
            if (properties) {
              // === ПРИОРИТЕТНЫЙ ПОИСК В PSET'АХ (Property Sets) ===
              // Русские названия обычно находятся в Pset'ах, а не в базовых полях
              const psets =
                (properties as any).psets ||
                (properties as any).Psets ||
                (properties as any).PropertySets ||
                (properties as any).propertySets;

              if (psets && Array.isArray(psets)) {
                for (const pset of psets) {
                  if (!pset || typeof pset !== 'object') continue;

                  // Проверяем название самого Pset'а (может содержать "name", "имя", "identity", "classification")
                  const psetName = pset.Name || pset.name || pset.Name || '';
                  const isRelevantPset =
                    psetName &&
                    (psetName.toLowerCase().includes('name') ||
                      psetName.toLowerCase().includes('имя') ||
                      psetName.toLowerCase().includes('identity') ||
                      psetName.toLowerCase().includes('classification') ||
                      psetName.toLowerCase().includes('common') ||
                      psetName.toLowerCase().includes('revit') ||
                      psetName.toLowerCase().includes('archicad'));

                  // Ищем свойства в Pset'е
                  const psetProperties =
                    pset.Properties ||
                    pset.properties ||
                    pset.Property ||
                    pset.property ||
                    [];

                  if (Array.isArray(psetProperties)) {
                    for (const prop of psetProperties) {
                      if (!prop || typeof prop !== 'object') continue;

                      const propKey =
                        prop.Name ||
                        prop.name ||
                        prop.Key ||
                        prop.key ||
                        '';
                      const propValue =
                        prop.Value ||
                        prop.value ||
                        prop.NominalValue ||
                        prop.nominalValue ||
                        prop.DataValue ||
                        prop.dataValue ||
                        prop.Data ||
                        prop.data;

                      if (!propKey || !propValue) continue;

                      const keyLower = String(propKey).toLowerCase();
                      const valueStr = String(propValue).trim();

                      // Проверяем, является ли это свойство названием
                      if (
                        valueStr &&
                        (keyLower.includes('name') ||
                          keyLower.includes('имя') ||
                          keyLower.includes('название') ||
                          (isRelevantPset &&
                            (keyLower.includes('description') ||
                              keyLower.includes('описание'))))
                      ) {
                        // Приоритет русским названиям
                        if (
                          keyLower.includes('_ru') ||
                          keyLower.includes('ru') ||
                          keyLower.includes('имя') ||
                          keyLower.includes('название')
                        ) {
                          nodeName = valueStr;
                          break;
                        } else if (!nodeName) {
                          // Если русское название ещё не найдено, сохраняем английское как запасной вариант
                          nodeName = valueStr;
                        }
                      }
                    }

                    // Если нашли название в этом Pset'е, прекращаем поиск
                    if (nodeName) break;
                  }
                }
              }

              // Если не нашли в Pset'ах, ищем в обычных свойствах
              if (!nodeName) {
                // Обрабатываем разные форматы ответа
                let propsArray: any[] = [];
                if (Array.isArray(properties)) {
                  propsArray = properties;
                } else if (typeof properties === 'object') {
                  // Если это объект, пробуем найти массив свойств
                  if (properties.properties && Array.isArray(properties.properties)) {
                    propsArray = properties.properties;
                  } else if (properties.data && Array.isArray(properties.data)) {
                    propsArray = properties.data;
                  } else {
                    // Пробуем найти название прямо в объекте
                    nodeName = findValueInObject(properties, nameSearchKeys);
                  }
                }

                // Ищем свойство Name в массиве свойств
                if (!nodeName && propsArray.length > 0) {
                  for (const prop of propsArray) {
                    if (prop && typeof prop === 'object') {
                      // Прямой поиск в свойстве
                      const found = findValueInObject(prop, nameSearchKeys);
                      if (found) {
                        nodeName = found;
                        break;
                      }

                      // Также проверяем стандартные поля
                      const propName =
                        prop.name ||
                        prop.Name ||
                        prop.key ||
                        prop.Key ||
                        prop.attributeName ||
                        prop.attribute;
                      const propValue =
                        prop.value ||
                        prop.Value ||
                        prop.data ||
                        prop.Data ||
                        prop.attributeValue;

                      // Проверяем, является ли это свойство названием
                      if (
                        propName &&
                        (propName.toLowerCase().includes('name') ||
                          propName.toLowerCase().includes('имя'))
                      ) {
                        if (propValue && String(propValue).trim()) {
                          nodeName = String(propValue).trim();
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (propError) {
            // Игнорируем ошибки получения свойств
          }
        }

        // Если всё ещё нет названия, используем категорию или генерируем
        if (!nodeName) {
          if (node.category) {
            // Форматируем категорию для читаемости
            nodeName = node.category
              .replace(/^IFC/, '')
              .replace(/([A-Z])/g, ' $1')
              .trim();
          } else {
            nodeName = 'Без названия';
          }
        }

        // Гарантируем, что nodeName всегда строка
        nodeName = nodeName || 'Без названия';

        const category = node.category || null;

        // Собираем все localIds этого узла и его детей
        const allLocalIds: number[] = [];

        // Если есть localId, добавляем его
        if (localId !== null) {
          allLocalIds.push(localId);

          // Получаем прямых детей через getItemsChildren
          try {
            const childrenIds = await modelFragment.getItemsChildren([localId]);
            if (Array.isArray(childrenIds)) {
              childrenIds.forEach((childId: number) => {
                if (
                  childId !== null &&
                  childId !== undefined &&
                  !allLocalIds.includes(childId)
                ) {
                  allLocalIds.push(childId);
                }
              });
            }
          } catch (error) {
            // Игнорируем ошибки получения детей
          }
        }

        // Рекурсивно обрабатываем дочерние узлы
        const children: IFCTreeNode[] = [];
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            const childNode = await convertNode(child, nodeId);
            if (childNode) {
              children.push(childNode);
              // Добавляем localIds детей к родителю
              childNode.localIds.forEach((id) => {
                if (!allLocalIds.includes(id)) {
                  allLocalIds.push(id);
                }
              });
            }
          }
        }

        const treeNode: IFCTreeNode = {
          id: nodeId,
          name: nodeName,
          category,
          localId,
          localIds: allLocalIds,
          children,
          visible: true,
          expanded: false, // По умолчанию свернуто (виден только заголовок)
        };

        // Сохраняем mapping для быстрого доступа
        nodeToLocalIdsRef.current.set(nodeId, allLocalIds);

        return treeNode;
      };

      const rootNode = await convertNode(spatialStructure);
      if (rootNode) {
        return rootNode;
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  // Старая функция extractFiltersFromFragments - оставляем для совместимости, но переименуем
  const extractFiltersFromFragments = async (modelFragment: any) => {
    try {
      const tree = await buildIFCTree(modelFragment);
      if (tree) {
        setIfcTree(tree);
        setTreeAvailable(true);
        setShowTree(true);
      } else {
        setTreeAvailable(false);
      }
    } catch (error) {
      setTreeAvailable(false);
    }
  };

  // Функция для обновления видимости узла в дереве
  const updateTreeNodeVisibility = (nodeId: string, visible: boolean) => {
    const updateNode = (node: IFCTreeNode): IFCTreeNode => {
      if (node.id === nodeId) {
        return { ...node, visible };
      }
      return {
        ...node,
        children: node.children.map(updateNode),
      };
    };

    if (ifcTree) {
      setIfcTree(updateNode(ifcTree));
    }
  };

  // Функция для переключения раскрытия/сворачивания узла
  const toggleTreeNodeExpanded = (nodeId: string) => {
    const updateNode = (node: IFCTreeNode): IFCTreeNode => {
      if (node.id === nodeId) {
        return { ...node, expanded: !node.expanded };
      }
      return {
        ...node,
        children: node.children.map(updateNode),
      };
    };

    if (ifcTree) {
      setIfcTree(updateNode(ifcTree));
    }
  };

  // Функция для управления видимостью элементов в 3D модели через дерево
  const toggleTreeNodeVisibility = async (nodeId: string, visible: boolean) => {
    try {
      // Обновляем UI
      updateTreeNodeVisibility(nodeId, visible);

      // Получаем localIds для этого узла
      const localIdsToToggle = nodeToLocalIdsRef.current.get(nodeId) || [];

      if (localIdsToToggle.length === 0) {
        return;
      }

      // Применяем видимость к элементам модели
      if (modelFragmentRef.current && fragmentsRef.current) {
        try {
          await modelFragmentRef.current.setVisible(localIdsToToggle, visible);

          // Обновляем рендерер после изменения видимости
          if (fragmentsRef.current.core) {
            fragmentsRef.current.core.update(true);
          }
        } catch (visibilityError) {
          // Игнорируем ошибки изменения видимости
        }
      }
    } catch (error) {
      // Игнорируем ошибки
    }
  };

  // Callback-refs для внешних контейнеров
  const ifcContainerCallbackRef = (node: HTMLDivElement | null) => {
    ifcContainerRef.current = node;
    if (node && viewerType === 'ifc' && !containerReady) {
      setContainerReady(true);
    }
  };

  const gltfContainerCallbackRef = (node: HTMLDivElement | null) => {
    gltfContainerRef.current = node;
    if (node && viewerType === 'gltf' && !containerReady) {
      setContainerReady(true);
    }
  };

  // Определяем тип viewer по модели
  useEffect(() => {
    setContainerReady(false);

    if (!model.viewableFilePath || !model.viewableFormat) {
      setViewerType('none');
      setLoading(false);
      return;
    }

    if (model.viewableFormat === 'IFC') {
      setViewerType('ifc');
    } else if (model.viewableFormat === 'GLTF') {
      setViewerType('gltf');
    } else {
      setViewerType('none');
      setLoading(false);
    }
  }, [model.id, model.viewableFilePath, model.viewableFormat]);

  // Загружаем viewer после появления контейнера
  useEffect(() => {
    if (viewerType === 'none' || !containerReady) return;

    if (viewerType === 'ifc') {
      loadIFCViewer();
    } else if (viewerType === 'gltf') {
      loadGLTFViewer();
    }

    // Очистка при размонтировании / смене типа
    return () => {
      // 1. Освобождаем worker URL (если был создан)
      if (workerUrlRef.current) {
        try {
          URL.revokeObjectURL(workerUrlRef.current);
          workerUrlRef.current = null;
        } catch (e) {
          // Игнорируем ошибки
        }
      }

      // 2. Dispose ThatOpen Components (останавливает рендер, очищает WebGL и т.д.)
      if (componentsRef.current) {
        try {
          componentsRef.current.dispose();
        } catch (e) {
          // Игнорируем ошибки
        }
        componentsRef.current = null;
      }

      // 3. Удаляем обработчик правой кнопки мыши для комментариев
      if (ifcHostRef.current && (ifcHostRef.current as any)._commentClickHandler) {
        ifcHostRef.current.removeEventListener('contextmenu', (ifcHostRef.current as any)._commentClickHandler);
        delete (ifcHostRef.current as any)._commentClickHandler;
      }

      // 4. Чистим только host-контейнеры (внутренние), НЕ трогая внешние контейнеры с React-оверлеем
      if (ifcHostRef.current) {
        try {
          ifcHostRef.current.replaceChildren();
        } catch (e) {
          ifcHostRef.current.innerHTML = '';
        }
      }

      if (gltfHostRef.current) {
        try {
          gltfHostRef.current.replaceChildren();
        } catch (e) {
          gltfHostRef.current.innerHTML = '';
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerType, containerReady]);

  const loadIFCViewer = async () => {
    try {
      setLoading(true);
      setError('');

      const container = ifcContainerRef.current;
      const host = ifcHostRef.current;

      if (!container || !host) {
        setLoading(false);
        return;
      }

      const modelUrl = `/api/objects/${objectId}/models/${model.id}/view`;

      // Проверяем доступность файла
      const fileCheckResponse = await fetch(modelUrl, { method: 'HEAD' });

      if (!fileCheckResponse.ok) {
        throw new Error(
          `Файл недоступен для загрузки (${fileCheckResponse.status})`
        );
      }

      // Готовим размеры контейнера (внешнего), host используем для рендера
      container.style.width = '100%';
      container.style.height = '600px';
      container.style.minHeight = '600px';

      // Чистим только host (в нём будут canvas и прочие элементы движка)
      try {
        host.replaceChildren();
      } catch (e) {
        host.innerHTML = '';
      }

      // Старые Components — удалить
      if (componentsRef.current) {
        try {
          componentsRef.current.dispose();
        } catch (e) {
          // Игнорируем ошибки
        }
        componentsRef.current = null;
      }

      // === 1. Создаем Components ===
      const components = new OBC.Components();
      componentsRef.current = components;

      // === 2. World (scene/camera/renderer) через Worlds ===
      const worlds = components.get(OBC.Worlds);
      const world = worlds.create<
        OBC.SimpleScene,
        OBC.OrthoPerspectiveCamera,
        OBC.SimpleRenderer
      >();

      // Сцена
      world.scene = new OBC.SimpleScene(components);
      world.scene.setup();
      if (world.scene.three) {
        world.scene.three.background = new THREE.Color(0xf5f5f5);
      }

      // Рендерер: в качестве контейнера даём host, а не внешний React-контейнер
      world.renderer = new OBC.SimpleRenderer(components, host);

      // Камера
      world.camera = new OBC.OrthoPerspectiveCamera(components);
      
      // === 3. Инициализация Components ===
      components.init();

      // Устанавливаем позицию камеры после инициализации
      if (world.camera.three) {
        world.camera.three.position.set(10, 10, 10);
        world.camera.three.lookAt(0, 0, 0);
      }

      // Сетка по желанию
      components.get(OBC.Grids).create(world);

      // === 4. FragmentsManager + worker (только для геометрии, без IFC API) ===
      const githubUrl =
        'https://thatopen.github.io/engine_fragment/resources/worker.mjs';

      const fetchedUrl = await fetch(githubUrl);
      const workerBlob = await fetchedUrl.blob();
      const workerFile = new File([workerBlob], 'worker.mjs', {
        type: 'text/javascript',
      });
      const workerUrl = URL.createObjectURL(workerFile);
      workerUrlRef.current = workerUrl;

      const fragments = components.get(OBC.FragmentsManager);
      fragments.init(workerUrl);
      fragmentsRef.current = fragments;
      worldRef.current = world;

      world.camera.controls.addEventListener('rest', () =>
        fragments.core.update(true)
      );

      fragments.list.onItemSet.add(async ({ value: modelFragment }) => {
        modelFragment.useCamera(world.camera.three);
        world.scene.three.add(modelFragment.object);
        fragments.core.update(true);

        // Сохраняем ссылку на модель для управления видимостью
        modelFragmentRef.current = modelFragment;

        // Добавляем обработчик правой кнопки мыши для создания комментариев
        if (host && world.camera) {
          const raycaster = new THREE.Raycaster();
          const mouse = new THREE.Vector2();

          const handleRightClick = (event: MouseEvent) => {
            // Используем ref для получения актуального значения commentMode
            if (!commentModeRef.current) {
              return;
            }

            // Предотвращаем стандартное контекстное меню
            event.preventDefault();
            event.stopPropagation();

            const rect = host.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Используем камеру из world
            const camera = world.camera.three;
            if (!camera) {
              return;
            }

            raycaster.setFromCamera(mouse, camera);
            
            // Для Fragments нужно проверять все дочерние объекты
            // modelFragment.object - это THREE.Group, который содержит все фрагменты
            const intersects = raycaster.intersectObject(modelFragment.object, true);

            if (intersects.length > 0) {
              const point = intersects[0].point;
              setSelectedPoint({ x: point.x, y: point.y, z: point.z });
              setShowCommentForm(true);
            }
          };

          // Добавляем обработчик правой кнопки мыши
          host.addEventListener('contextmenu', handleRightClick);

          // Сохраняем обработчик для очистки
          (host as any)._commentClickHandler = handleRightClick;
        }

        // Извлекаем фильтры из Fragments schema (spatial_structure, categories, attributes)
        setTimeout(async () => {
          try {
            await extractFiltersFromFragments(modelFragment);
          } catch (filterError) {
            setTreeAvailable(false);
          }
        }, 1000); // Даем время модели полностью загрузиться
      });

      // === 5. Грузим IFC-файл ===
      const fileResponse = await fetch(modelUrl);

      if (!fileResponse.ok) {
        throw new Error(
          `Не удалось загрузить файл: ${fileResponse.status} ${fileResponse.statusText}`
        );
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const ifcLoader = components.get(OBC.IfcLoader);
      await ifcLoader.setup({
        autoSetWasm: false,
        wasm: {
          path:
            typeof window !== 'undefined'
              ? `${window.location.origin}/wasm/`
              : '/wasm/',
          absolute: true,
        },
      });

      try {
        await ifcLoader.load(buffer, false, model.name);
      } catch (loadError: any) {
        throw new Error(
          `Не удалось загрузить модель: ${loadError?.message || 'Неизвестная ошибка'}`
        );
      }

      // Дерево параметров будет извлечено автоматически через extractFiltersFromFragments
      // после загрузки модели через fragments.list.onItemSet

      setLoading(false);
    } catch (err: any) {
      setError(
        err?.message ||
          'Не удалось загрузить модель. Возможно, файл поврежден или слишком большой.'
      );
      setLoading(false);

      if (ifcHostRef.current) {
        const modelUrl = `/api/objects/${objectId}/models/${model.id}/view`;
        const downloadButton = isCustomer
          ? ''
          : `<a href="${modelUrl}" download style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 4px; margin: 10px;">
              Скачать IFC файл
            </a>`;

        const customerMessage = isCustomer
          ? `<p style="margin-bottom: 20px; color: #666;">
              К сожалению, не удалось загрузить модель для просмотра в браузере. Скачивание файлов недоступно для заказчиков.
            </p>`
          : `<p style="margin-bottom: 20px; color: #666;">
              Не удалось загрузить модель в браузере. Вы можете скачать файл и открыть в специализированном ПО.
            </p>`;

        ifcHostRef.current.innerHTML = `
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

      const host = gltfHostRef.current;
      if (!host) return;

      const modelUrl = `/api/objects/${objectId}/models/${model.id}/view`;

      // Чистим только host, React-оверлей не трогаем
      try {
        host.replaceChildren();
      } catch (e) {
        host.innerHTML = '';
      }

      const modelViewer = document.createElement('model-viewer') as any;
      modelViewer.src = modelUrl;
      modelViewer.alt = model.name;
      modelViewer.setAttribute('auto-rotate', '');
      modelViewer.setAttribute('camera-controls', '');
      modelViewer.setAttribute(
        'style',
        'width: 100%; height: 600px; background-color: #f0f0f0;'
      );

      host.appendChild(modelViewer);

      if (!document.querySelector('script[src*="model-viewer"]')) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src =
          'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
        document.head.appendChild(script);
      }

      setLoading(false);
    } catch (err: any) {
      setError('Не удалось загрузить модель.');
      setLoading(false);
    }
  };

  const handleDownloadOriginal = () => {
    window.open(
      `/api/objects/${objectId}/models/${model.id}/download?type=original`,
      '_blank'
    );
  };

  const handleDownloadViewable = () => {
    if (model.viewableFilePath) {
      window.open(
        `/api/objects/${objectId}/models/${model.id}/download?type=viewable`,
        '_blank'
      );
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить эту модель?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/objects/${objectId}/models/${model.id}`,
        {
          method: 'DELETE',
        }
      );

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

  // Загрузка комментариев
  const loadComments = async () => {
    try {
      const response = await fetch(
        `/api/objects/${objectId}/models/${model.id}/comments`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (err) {
      // Игнорируем ошибки загрузки комментариев
    }
  };

  // Создание комментария
  const handleCreateComment = async () => {
    if (!commentText.trim() || !selectedPoint) return;

    try {
      const response = await fetch(
        `/api/objects/${objectId}/models/${model.id}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: commentText,
            x: selectedPoint.x,
            y: selectedPoint.y,
            z: selectedPoint.z,
          }),
        }
      );

      if (response.ok) {
        await loadComments();
        setCommentText('');
        setSelectedPoint(null);
        setShowCommentForm(false);
        setCommentMode(false);
      } else {
        alert('Ошибка создания комментария');
      }
    } catch (err: any) {
      alert('Ошибка создания комментария: ' + err.message);
    }
  };

  // Удаление комментария
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/objects/${objectId}/models/${model.id}/comments/${commentId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        await loadComments();
      } else {
        alert('Ошибка удаления комментария');
      }
    } catch (err: any) {
      alert('Ошибка удаления комментария: ' + err.message);
    }
  };

  // Загрузка комментариев при открытии модели
  useEffect(() => {
    if (model.id) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.id]);

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

        {/* Ошибка */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Просмотрщик с панелью фильтров */}
        {viewerType === 'ifc' && (
          <div className="flex gap-4 mb-4">
            {/* Viewer слева - 3/4 окна */}
            <div className="w-3/4 min-w-0">
              <div
                ref={ifcContainerCallbackRef}
                className="w-full border border-gray-300 rounded-lg relative"
                style={{ minHeight: '600px', height: '600px' }}
              >
                {/* host для движка */}
                <div ref={ifcHostRef} className="w-full h-full" />

                {/* оверлей загрузки управляет React, мы его не трогаем из JS */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Загрузка модели...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Панель дерева параметров и комментариев справа - 1/4 окна */}
            {(showTree || showComments) && (
              <div
                className="w-1/4 border border-gray-300 rounded-lg bg-white overflow-hidden flex flex-col"
                style={{ maxHeight: '600px' }}
              >
                {/* Вкладки */}
                <div className="flex border-b">
                  <button
                    onClick={() => {
                      setShowTree(true);
                      setShowComments(false);
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${
                      showTree
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Параметры
                  </button>
                  <button
                    onClick={() => {
                      setShowComments(true);
                      setShowTree(false);
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium relative ${
                      showComments
                        ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Комментарии
                    {comments.length > 0 && (
                      <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                        {comments.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowTree(false);
                      setShowComments(false);
                    }}
                    className="px-3 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>

                {/* Содержимое вкладки Параметры */}
                {showTree && ifcTree && (
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold">Дерево параметров</h3>
                    </div>

                {/* Компонент для отображения узла дерева */}
                {(() => {
                  const TreeNode = ({
                    node,
                    level = 0,
                  }: {
                    node: IFCTreeNode;
                    level?: number;
                  }) => {
                    const hasChildren = node.children.length > 0;
                    const indent = level * 20;

                    return (
                      <div className="select-none">
                        <div
                          className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
                          style={{ paddingLeft: `${indent}px` }}
                        >
                          {/* Кнопка раскрытия/сворачивания */}
                          {hasChildren ? (
                            <button
                              onClick={() => toggleTreeNodeExpanded(node.id)}
                              className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700"
                            >
                              {node.expanded ? '▼' : '▶'}
                            </button>
                          ) : (
                            <span className="w-4 h-4"></span>
                          )}

                          {/* Чекбокс видимости */}
                          <input
                            type="checkbox"
                            checked={node.visible}
                            onChange={(e) =>
                              toggleTreeNodeVisibility(
                                node.id,
                                e.target.checked
                              )
                            }
                            className="rounded"
                            onClick={(e) => e.stopPropagation()}
                          />

                          {/* Название узла */}
                          <span
                            className="text-sm flex-1 truncate"
                            title={node.name}
                          >
                            {node.name}
                          </span>

                          {/* Категория и количество элементов */}
                          {node.category && (
                            <span className="text-xs text-gray-400">
                              {node.category.replace(/^IFC/, '')}
                            </span>
                          )}
                          {node.localIds.length > 0 && (
                            <span className="text-xs text-gray-500">
                              ({node.localIds.length})
                            </span>
                          )}
                        </div>

                        {/* Дочерние узлы */}
                        {hasChildren && node.expanded && (
                          <div>
                            {node.children.map((child) => (
                              <TreeNode
                                key={child.id}
                                node={child}
                                level={level + 1}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return <TreeNode node={ifcTree} />;
                })()}
                  </div>
                )}

                {/* Содержимое вкладки Комментарии */}
                {showComments && (
                  <div className="p-4 overflow-y-auto flex-1">
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">Комментарии</h3>
                        <button
                          onClick={() => {
                            const newMode = !commentMode;
                            setCommentMode(newMode);
                            setShowCommentForm(false);
                            setSelectedPoint(null);
                            console.log('Режим комментариев:', newMode ? 'включен' : 'выключен');
                          }}
                          className={`px-3 py-1 text-sm rounded ${
                            commentMode
                              ? 'bg-red-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {commentMode ? 'Отменить' : 'Добавить'}
                        </button>
                      </div>
                      {commentMode && (
                        <div className="mb-2 p-2 bg-yellow-100 border border-yellow-400 rounded">
                          <p className="text-xs text-yellow-800 font-semibold">
                            ⚠️ Режим комментариев активен
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Нажмите правой кнопкой мыши по модели, чтобы выбрать точку для комментария
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Форма создания комментария */}
                    {showCommentForm && selectedPoint && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="mb-2">
                          <p className="text-xs text-gray-600 mb-1">
                            Точка: ({selectedPoint.x.toFixed(2)}, {selectedPoint.y.toFixed(2)}, {selectedPoint.z.toFixed(2)})
                          </p>
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Введите комментарий..."
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateComment}
                            disabled={!commentText.trim()}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={() => {
                              setShowCommentForm(false);
                              setSelectedPoint(null);
                              setCommentText('');
                            }}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Список комментариев */}
                    <div className="space-y-3">
                      {comments.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Комментариев пока нет
                        </p>
                      ) : (
                        comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {comment.user.name || comment.user.email}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(comment.createdAt).toLocaleString('ru-RU')}
                                </p>
                                {comment.x !== null && comment.y !== null && comment.z !== null && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    Точка: ({comment.x.toFixed(2)}, {comment.y.toFixed(2)}, {comment.z.toFixed(2)})
                                  </p>
                                )}
                              </div>
                              {!isCustomer && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Кнопки показа панелей */}
            {!showTree && !showComments && (
              <div className="flex flex-col gap-2">
                {treeAvailable && (
                  <button
                    onClick={() => setShowTree(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    title="Показать дерево параметров"
                  >
                    Параметры
                  </button>
                )}
                <button
                  onClick={() => setShowComments(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  title="Показать комментарии"
                >
                  Комментарии
                  {comments.length > 0 && (
                    <span className="ml-2 bg-white text-green-600 text-xs rounded-full px-2 py-0.5">
                      {comments.length}
                    </span>
                  )}
                </button>
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
            {/* host для model-viewer */}
            <div ref={gltfHostRef} className="w-full h-full" />

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
            {!isCustomer && (
              <>
                <button
                  onClick={handleDownloadOriginal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Скачать исходный файл
                </button>
                {model.viewableFilePath && (
                  <button
                    onClick={handleDownloadViewable}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    Скачать для просмотра ({model.viewableFormat})
                  </button>
                )}
              </>
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
