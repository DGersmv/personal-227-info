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
  const [selectedCommentId, setSelectedCommentId] = useState<number | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);

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

  // Группа для маркеров комментариев на 3D модели
  const commentMarkersGroupRef = useRef<THREE.Group | null>(null);

  // Превью-маркер для показа точки прилипания
  const previewMarkerRef = useRef<THREE.Mesh | null>(null);
  const previewLineRef = useRef<THREE.Line | null>(null);
  const previewUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Gizmo для установки комментариев
  const gizmoGroupRef = useRef<THREE.Group | null>(null);
  const gizmoCenterRef = useRef<THREE.Mesh | null>(null);
  const gizmoAxesRef = useRef<{ x: THREE.ArrowHelper | null; y: THREE.ArrowHelper | null; z: THREE.ArrowHelper | null }>({
    x: null,
    y: null,
    z: null,
  });
  // Невидимые цилиндры для raycasting по стрелкам
  const gizmoAxisCylindersRef = useRef<{ x: THREE.Mesh | null; y: THREE.Mesh | null; z: THREE.Mesh | null }>({
    x: null,
    y: null,
    z: null,
  });
  const activeAxisRef = useRef<'x' | 'y' | 'z' | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartMouseRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartGizmoPosRef = useRef<THREE.Vector3 | null>(null);
  const originalModelOpacityRef = useRef<Map<THREE.Mesh, number>>(new Map());

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

      // 2. Очищаем маркеры комментариев
      if (commentMarkersGroupRef.current) {
        try {
          while (commentMarkersGroupRef.current.children.length > 0) {
            const child = commentMarkersGroupRef.current.children[0];
            if (child instanceof THREE.Mesh) {
              (child.geometry as THREE.BufferGeometry).dispose();
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
            commentMarkersGroupRef.current.remove(child);
          }
          // Безопасно пытаемся удалить группу из сцены
          try {
            const world = worldRef.current as any;
            if (world && world.scene && world.scene.three) {
              world.scene.three.remove(commentMarkersGroupRef.current);
            }
          } catch (e) {
            // Если сцена уже уничтожена ("No scene initialized!"), просто игнорируем
          }
        } catch (e) {
          // Игнорируем ошибки
        }
        commentMarkersGroupRef.current = null;
      }

      // 3. Dispose ThatOpen Components (останавливает рендер, очищает WebGL и т.д.)
      if (componentsRef.current) {
        try {
          componentsRef.current.dispose();
        } catch (e) {
          // Игнорируем ошибки
        }
        componentsRef.current = null;
      }
      // После dispose больше нельзя трогать World/Fragments
      worldRef.current = null;
      fragmentsRef.current = null;
      modelFragmentRef.current = null;

      // 4. Очищаем таймер превью-маркера
      if (previewUpdateTimerRef.current) {
        clearTimeout(previewUpdateTimerRef.current);
        previewUpdateTimerRef.current = null;
      }

      // 5. Удаляем превью-маркер и линию
      if (previewMarkerRef.current) {
        try {
          if (previewMarkerRef.current.geometry) {
            previewMarkerRef.current.geometry.dispose();
          }
          if (previewMarkerRef.current.material) {
            if (Array.isArray(previewMarkerRef.current.material)) {
              previewMarkerRef.current.material.forEach((mat) => mat.dispose());
            } else {
              previewMarkerRef.current.material.dispose();
            }
          }
          try {
            const world = worldRef.current as any;
            if (world && world.scene && world.scene.three) {
              world.scene.three.remove(previewMarkerRef.current);
            }
          } catch (e) {
            // Сцена уже могла быть уничтожена
          }
        } catch (e) {
          // Игнорируем ошибки
        }
        previewMarkerRef.current = null;
      }

      if (previewLineRef.current) {
        try {
          if (previewLineRef.current.geometry) {
            previewLineRef.current.geometry.dispose();
          }
          if (previewLineRef.current.material) {
            if (Array.isArray(previewLineRef.current.material)) {
              previewLineRef.current.material.forEach((mat) => mat.dispose());
            } else {
              previewLineRef.current.material.dispose();
            }
          }
          try {
            const world = worldRef.current as any;
            if (world && world.scene && world.scene.three) {
              world.scene.three.remove(previewLineRef.current);
            }
          } catch (e) {
            // Сцена уже могла быть уничтожена
          }
        } catch (e) {
          // Игнорируем ошибки
        }
        previewLineRef.current = null;
      }

      // 6. Удаляем обработчики мыши
      if (ifcHostRef.current) {
        if ((ifcHostRef.current as any)._commentClickHandler) {
          ifcHostRef.current.removeEventListener('contextmenu', (ifcHostRef.current as any)._commentClickHandler);
          delete (ifcHostRef.current as any)._commentClickHandler;
        }
        if ((ifcHostRef.current as any)._previewMouseHandler) {
          ifcHostRef.current.removeEventListener('mousemove', (ifcHostRef.current as any)._previewMouseHandler);
          delete (ifcHostRef.current as any)._previewMouseHandler;
        }
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

        // Создаем группу для маркеров комментариев
        const commentMarkersGroup = new THREE.Group();
        commentMarkersGroup.name = 'commentMarkers';
        world.scene.three.add(commentMarkersGroup);
        commentMarkersGroupRef.current = commentMarkersGroup;

        // Если комментарии уже загружены, сразу отрисуем маркеры,
        // чтобы их было видно без дополнительных кликов
        if (comments.length > 0) {
          setTimeout(() => {
            if (commentMarkersGroupRef.current && worldRef.current) {
              updateCommentMarkers();
            }
          }, 100);
        }

        // Создаем превью-маркер (сфера для показа точки прилипания)
        const previewGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const previewMaterial = new THREE.MeshBasicMaterial({
          color: 0xffaa00, // Оранжевый цвет для превью
          transparent: true,
          opacity: 0.6,
        });
        const previewMarker = new THREE.Mesh(previewGeometry, previewMaterial);
        previewMarker.visible = false;
        previewMarker.name = 'previewMarker';
        world.scene.three.add(previewMarker);
        previewMarkerRef.current = previewMarker;

        // Создаем линию от курсора до точки на поверхности
        const lineGeometry = new THREE.BufferGeometry();
        const lineMaterial = new THREE.LineBasicMaterial({
          color: 0xffaa00,
          transparent: true,
          opacity: 0.4,
          linewidth: 2,
        });
        const previewLine = new THREE.Line(lineGeometry, lineMaterial);
        previewLine.visible = false;
        previewLine.name = 'previewLine';
        world.scene.three.add(previewLine);
        previewLineRef.current = previewLine;

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

            try {
              // В режиме gizmo используем позицию gizmo
              if (gizmoGroupRef.current && gizmoGroupRef.current.position) {
                const gizmoPos = gizmoGroupRef.current.position;
                setSelectedPoint({ x: gizmoPos.x, y: gizmoPos.y, z: gizmoPos.z });
                setShowCommentForm(true);
                return;
              }

              // Fallback: используем старый метод raycasting (если gizmo не создан)
              const rect = host.getBoundingClientRect();
              mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
              mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

              // Используем камеру из world
              const camera = world.camera.three;
              if (!camera || !modelFragment || !modelFragment.object) {
                console.warn('Модель еще не загружена');
                return;
              }

              // Ограничиваем дальность луча для более предсказуемого поведения
              raycaster.far = 200; // Ограничиваем дальность поиска
              raycaster.setFromCamera(mouse, camera);
              
              // Для Fragments нужно проверять все дочерние объекты
              // modelFragment.object - это THREE.Group, который содержит все фрагменты
              // Используем try-catch для безопасной обработки ошибок геометрии
              let intersects: THREE.Intersection[] = [];
              
              try {
                // Ищем строго по направлению луча - только точные пересечения
                intersects = raycaster.intersectObject(modelFragment.object, true);
              } catch (raycastError) {
                console.warn('Ошибка при определении пересечения:', raycastError);
              }

              let selectedPoint: THREE.Vector3 | null = null;

              // Используем только точное пересечение луча с геометрией
              // Ближайшее пересечение = то, что находится строго на пути луча
              if (intersects.length > 0 && intersects[0].point) {
                selectedPoint = intersects[0].point.clone();
              } else {
                // Если пересечение не найдено, используем точку на луче на фиксированном расстоянии
                // НЕ ищем вокруг луча - это делает поведение предсказуемым
                selectedPoint = raycaster.ray.origin.clone().add(
                  raycaster.ray.direction.clone().multiplyScalar(50)
                );
              }

              if (selectedPoint) {
                setSelectedPoint({ x: selectedPoint.x, y: selectedPoint.y, z: selectedPoint.z });
                setShowCommentForm(true);
              }
            } catch (error) {
              console.error('Ошибка при обработке клика для комментария:', error);
              // В случае ошибки просто игнорируем клик
            }
          };

          // Функция для обновления превью-маркера при движении мыши
          const updatePreviewMarker = (event: MouseEvent) => {
            // Очищаем предыдущий таймер
            if (previewUpdateTimerRef.current) {
              clearTimeout(previewUpdateTimerRef.current);
            }

            // Используем ref для получения актуального значения commentMode
            // В режиме gizmo не показываем превью-маркер
            if (!commentModeRef.current || gizmoGroupRef.current) {
              if (previewMarkerRef.current) {
                previewMarkerRef.current.visible = false;
              }
              if (previewLineRef.current) {
                previewLineRef.current.visible = false;
              }
              return;
            }

            // Обновляем с небольшой задержкой для оптимизации
            previewUpdateTimerRef.current = setTimeout(() => {
              if (!commentModeRef.current || !modelFragment || !modelFragment.object) {
                return;
              }

              try {
                const rect = host.getBoundingClientRect();
                mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
                mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

                const camera = world.camera.three;
                if (!camera) {
                  return;
                }

                // Ограничиваем дальность луча для более предсказуемого поведения
                raycaster.far = 200; // Ограничиваем дальность поиска
                raycaster.setFromCamera(mouse, camera);

                let previewPoint: THREE.Vector3 | null = null;
                let intersects: THREE.Intersection[] = [];

                try {
                  // Ищем строго по направлению луча - только точные пересечения
                  intersects = raycaster.intersectObject(modelFragment.object, true);
                } catch (raycastError) {
                  // Игнорируем ошибки
                }

                // Используем только точное пересечение луча с геометрией
                // Ближайшее пересечение = то, что находится строго на пути луча
                if (intersects.length > 0 && intersects[0].point) {
                  previewPoint = intersects[0].point.clone();
                } else {
                  // Если пересечение не найдено, используем точку на луче на фиксированном расстоянии
                  // НЕ ищем вокруг луча - это делает поведение предсказуемым
                  previewPoint = raycaster.ray.origin.clone().add(
                    raycaster.ray.direction.clone().multiplyScalar(50)
                  );
                }

                if (previewPoint && previewMarkerRef.current && previewLineRef.current) {
                  // Обновляем позицию превью-маркера
                  previewMarkerRef.current.position.copy(previewPoint);
                  previewMarkerRef.current.visible = true;

                  // Обновляем линию от курсора до точки
                  // Вычисляем точку на луче для начала линии (ближе к камере)
                  const lineStart = raycaster.ray.origin.clone().add(
                    raycaster.ray.direction.clone().multiplyScalar(5)
                  );
                  
                  const positions = new Float32Array([
                    lineStart.x, lineStart.y, lineStart.z,
                    previewPoint.x, previewPoint.y, previewPoint.z,
                  ]);
                  previewLineRef.current.geometry.setAttribute(
                    'position',
                    new THREE.BufferAttribute(positions, 3)
                  );
                  previewLineRef.current.visible = true;

                  // Обновляем рендерер
                  if (fragmentsRef.current && fragmentsRef.current.core) {
                    fragmentsRef.current.core.update(true);
                  }
                } else {
                  // Скрываем превью, если точка не найдена
                  if (previewMarkerRef.current) {
                    previewMarkerRef.current.visible = false;
                  }
                  if (previewLineRef.current) {
                    previewLineRef.current.visible = false;
                  }
                }
              } catch (error) {
                // Игнорируем ошибки
                if (previewMarkerRef.current) {
                  previewMarkerRef.current.visible = false;
                }
                if (previewLineRef.current) {
                  previewLineRef.current.visible = false;
                }
              }
            }, 50); // Задержка 50мс для оптимизации
          };

          // Добавляем обработчик движения мыши для превью-маркера
          host.addEventListener('mousemove', updatePreviewMarker);

          // Добавляем обработчик правой кнопки мыши
          host.addEventListener('contextmenu', handleRightClick);

          // Сохраняем обработчики для очистки
          (host as any)._commentClickHandler = handleRightClick;
          (host as any)._previewMouseHandler = updatePreviewMarker;
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

  // Функция для поиска ближайшей точки на поверхности модели через BVH
  const findClosestPointOnSurface = (
    object: THREE.Object3D,
    rayOrigin: THREE.Vector3,
    rayDirection: THREE.Vector3
  ): THREE.Vector3 | null => {
    // Ограничиваем длину луча - ищем только в ближайшей области
    const maxRayLength = 200; // Максимальная длина луча для поиска
    const searchDistances = [20, 50, 100, 150, 200]; // Разные расстояния для поиска (в пределах maxRayLength)
    let closestPoint: THREE.Vector3 | null = null;
    let minDistanceToRay = Infinity;

    // Пробуем найти точку на разных расстояниях вдоль луча (в пределах ограничения)
    for (const dist of searchDistances) {
      if (dist > maxRayLength) break; // Не выходим за пределы ограничения
      
      const pointOnRay = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(dist));
      
      // Ищем ближайшую точку на поверхности к этой точке на луче
      object.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const geometry = child.geometry;
          const mesh = child;

          // Проверяем, есть ли BVH в геометрии
          const boundsTree = (geometry as any).boundsTree;
          if (boundsTree) {
            try {
              // Преобразуем точку на луче в локальные координаты меша
              const localPoint = pointOnRay.clone().applyMatrix4(
                new THREE.Matrix4().copy(mesh.matrixWorld).invert()
              );

              const projectedPoint = new THREE.Vector3();
              const normal = new THREE.Vector3();
              const distance = boundsTree.closestPointToPoint(
                localPoint,
                projectedPoint,
                normal,
                12 // Радиус поиска (уменьшен для более точного прицеливания)
              );

              if (distance !== null) {
                // Преобразуем обратно в мировые координаты
                projectedPoint.applyMatrix4(mesh.matrixWorld);
                
                // Вычисляем расстояние от точки на луче до найденной точки на поверхности
                const distanceToRay = pointOnRay.distanceTo(projectedPoint);
                
                // Выбираем ближайшую к лучу точку (строгое ограничение расстояния)
                if (distanceToRay < minDistanceToRay && distanceToRay < 12) {
                  minDistanceToRay = distanceToRay;
                  closestPoint = projectedPoint;
                }
              }
            } catch (e) {
              // Игнорируем ошибки BVH
            }
          } else {
            // Если BVH нет, используем простой поиск по геометрии
            try {
              const position = geometry.attributes.position;
              if (position) {
                // Ищем ближайшую вершину к точке на луче
                for (let i = 0; i < position.count; i++) {
                  const vertex = new THREE.Vector3();
                  vertex.fromBufferAttribute(position, i);
                  vertex.applyMatrix4(mesh.matrixWorld);

                  const distanceToRay = pointOnRay.distanceTo(vertex);
                  if (distanceToRay < minDistanceToRay && distanceToRay < 12) {
                    minDistanceToRay = distanceToRay;
                    closestPoint = vertex;
                  }
                }
              }
            } catch (e) {
              // Игнорируем ошибки
            }
          }
        }
      });
    }

    // Если не нашли точку, используем точку на луче в пределах ограничения
    if (!closestPoint) {
      closestPoint = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(Math.min(50, maxRayLength)));
    }

    return closestPoint;
  };

  // Функция для создания gizmo (шарик с осями)
  const createGizmo = (): void => {
    if (!worldRef.current || !worldRef.current.scene) {
      return;
    }

    // Удаляем существующий gizmo, если есть
    if (gizmoGroupRef.current) {
      worldRef.current.scene.three.remove(gizmoGroupRef.current);
      gizmoGroupRef.current = null;
    }

    const world = worldRef.current;
    const camera = world.camera.three;
    if (!camera) {
      return;
    }

    // Создаем группу для gizmo
    const gizmoGroup = new THREE.Group();
    gizmoGroup.name = 'commentGizmo';

    // Центральный шарик
    const centerGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const centerMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    const centerSphere = new THREE.Mesh(centerGeometry, centerMaterial);
    gizmoGroup.add(centerSphere);
    gizmoCenterRef.current = centerSphere;

    // Размер стрелок (фиксированный)
    const arrowLength = 1.5;
    const arrowHeadLength = 0.3;
    const arrowHeadWidth = 0.2;
    const cylinderRadius = 0.08; // Радиус цилиндра для raycasting

    // Ось X (красная)
    const dirX = new THREE.Vector3(1, 0, 0);
    const originX = new THREE.Vector3(0, 0, 0);
    const arrowX = new THREE.ArrowHelper(dirX, originX, arrowLength, 0xff0000, arrowHeadLength, arrowHeadWidth);
    arrowX.name = 'axisX';
    (arrowX.userData as any).axis = 'x';
    gizmoGroup.add(arrowX);
    gizmoAxesRef.current.x = arrowX;

    // Невидимый цилиндр для raycasting по оси X
    const cylinderX = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, arrowLength, 8);
    const materialX = new THREE.MeshBasicMaterial({ visible: false });
    const meshX = new THREE.Mesh(cylinderX, materialX);
    meshX.rotation.z = Math.PI / 2;
    meshX.position.x = arrowLength / 2;
    meshX.name = 'axisXCylinder';
    (meshX.userData as any).axis = 'x';
    gizmoGroup.add(meshX);
    gizmoAxisCylindersRef.current.x = meshX;

    // Ось Y (зеленая)
    const dirY = new THREE.Vector3(0, 1, 0);
    const originY = new THREE.Vector3(0, 0, 0);
    const arrowY = new THREE.ArrowHelper(dirY, originY, arrowLength, 0x00ff00, arrowHeadLength, arrowHeadWidth);
    arrowY.name = 'axisY';
    (arrowY.userData as any).axis = 'y';
    gizmoGroup.add(arrowY);
    gizmoAxesRef.current.y = arrowY;

    // Невидимый цилиндр для raycasting по оси Y
    const cylinderY = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, arrowLength, 8);
    const materialY = new THREE.MeshBasicMaterial({ visible: false });
    const meshY = new THREE.Mesh(cylinderY, materialY);
    meshY.position.y = arrowLength / 2;
    meshY.name = 'axisYCylinder';
    (meshY.userData as any).axis = 'y';
    gizmoGroup.add(meshY);
    gizmoAxisCylindersRef.current.y = meshY;

    // Ось Z (синяя)
    const dirZ = new THREE.Vector3(0, 0, 1);
    const originZ = new THREE.Vector3(0, 0, 0);
    const arrowZ = new THREE.ArrowHelper(dirZ, originZ, arrowLength, 0x0000ff, arrowHeadLength, arrowHeadWidth);
    arrowZ.name = 'axisZ';
    (arrowZ.userData as any).axis = 'z';
    gizmoGroup.add(arrowZ);
    gizmoAxesRef.current.z = arrowZ;

    // Невидимый цилиндр для raycasting по оси Z
    const cylinderZ = new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, arrowLength, 8);
    const materialZ = new THREE.MeshBasicMaterial({ visible: false });
    const meshZ = new THREE.Mesh(cylinderZ, materialZ);
    meshZ.rotation.x = Math.PI / 2;
    meshZ.position.z = arrowLength / 2;
    meshZ.name = 'axisZCylinder';
    (meshZ.userData as any).axis = 'z';
    gizmoGroup.add(meshZ);
    gizmoAxisCylindersRef.current.z = meshZ;

    // Позиционируем gizmo перед камерой
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const gizmoPosition = camera.position.clone().add(cameraDirection.multiplyScalar(10)); // 10 единиц перед камерой
    gizmoGroup.position.copy(gizmoPosition);

    // Добавляем в сцену
    try {
      // Можем получить ошибку "No scene initialized!", если World уже уничтожен
      if (world.scene && world.scene.three) {
        world.scene.three.add(gizmoGroup);
      }
    } catch (e) {
      // Если сцена уже уничтожена, просто не добавляем gizmo
      console.warn('Невозможно добавить gizmo: сцена уже уничтожена', e);
    }
    gizmoGroupRef.current = gizmoGroup;
  };

  // Функция для удаления gizmo
  const removeGizmo = (): void => {
    try {
      const world = worldRef.current as any;
      const gizmoGroup = gizmoGroupRef.current;
      if (gizmoGroup && world && world.scene && world.scene.three) {
        world.scene.three.remove(gizmoGroup);
      }
    } catch (e) {
      // Если World/scene уже уничтожены (при размонтировании), просто игнорируем
      console.warn('Ошибка при удалении gizmo (игнорируется при размонтировании):', e);
    }

    // В любом случае очищаем ссылки, чтобы не было утечек
    gizmoGroupRef.current = null;
    gizmoCenterRef.current = null;
    gizmoAxesRef.current.x = null;
    gizmoAxesRef.current.y = null;
    gizmoAxesRef.current.z = null;
    gizmoAxisCylindersRef.current.x = null;
    gizmoAxisCylindersRef.current.y = null;
    gizmoAxisCylindersRef.current.z = null;
    activeAxisRef.current = null;
  };

  // Функция для установки прозрачности модели
  const setModelOpacity = (opacity: number): void => {
    if (!modelFragmentRef.current || !modelFragmentRef.current.object) {
      return;
    }

    const modelObject = modelFragmentRef.current.object;
    
    // Сохраняем оригинальную прозрачность при первом вызове (для всех типов материалов с opacity)
    if (opacity < 1 && originalModelOpacityRef.current.size === 0) {
      modelObject.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat: any) => {
            if (typeof mat.opacity === 'number') {
              // Сохраняем opacity на уровне меша, чтобы потом восстановить
              if (!originalModelOpacityRef.current.has(child)) {
                originalModelOpacityRef.current.set(child, mat.opacity);
              }
            }
          });
        }
      });
    }

    // Устанавливаем новую прозрачность для всех материалов с opacity
    modelObject.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat: any) => {
          if (typeof mat.opacity === 'number') {
            mat.transparent = opacity < 1 || mat.transparent;
            mat.opacity = opacity;
          }
        });
      }
    });

    // Восстанавливаем оригинальную прозрачность
    if (opacity === 1) {
      modelObject.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh && child.material) {
          const originalOpacity = originalModelOpacityRef.current.get(child);
          if (originalOpacity !== undefined) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat: any) => {
              if (typeof mat.opacity === 'number') {
                mat.opacity = originalOpacity;
                mat.transparent = originalOpacity < 1;
              }
            });
          }
        }
      });
      originalModelOpacityRef.current.clear();
    }
  };

  // Функция для проецирования точки на поверхность модели
  const projectPointToSurface = (point: THREE.Vector3): THREE.Vector3 | null => {
    if (!modelFragmentRef.current || !modelFragmentRef.current.object) {
      return point;
    }

    const modelObject = modelFragmentRef.current.object;
    let closestPoint: THREE.Vector3 | null = null;
    let minDistance = Infinity;

    // Ищем ближайшую точку на поверхности
    modelObject.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry;
        const mesh = child;

        const boundsTree = (geometry as any).boundsTree;
        if (boundsTree) {
          try {
            // Преобразуем точку в локальные координаты меша
            const localPoint = point.clone().applyMatrix4(
              new THREE.Matrix4().copy(mesh.matrixWorld).invert()
            );

            const projectedPoint = new THREE.Vector3();
            const normal = new THREE.Vector3();
            const distance = boundsTree.closestPointToPoint(
              localPoint,
              projectedPoint,
              normal,
              5 // Максимальное расстояние для проецирования
            );

            if (distance !== null && distance < minDistance) {
              // Преобразуем обратно в мировые координаты
              projectedPoint.applyMatrix4(mesh.matrixWorld);
              minDistance = distance;
              closestPoint = projectedPoint;
            }
          } catch (e) {
            // Игнорируем ошибки
          }
        }
      }
    });

    return closestPoint || point;
  };

  // Функция для обновления визуальных маркеров комментариев на модели
  const updateCommentMarkers = () => {
    if (!commentMarkersGroupRef.current || !worldRef.current || !modelFragmentRef.current) {
      return;
    }

    const group = commentMarkersGroupRef.current;
    
    // Очищаем существующие маркеры
    while (group.children.length > 0) {
      const child = group.children[0];
      if (child instanceof THREE.Mesh) {
        (child.geometry as THREE.BufferGeometry).dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
      group.remove(child);
    }

    // Создаем маркеры для каждого комментария с координатами
    comments.forEach((comment) => {
      if (comment.x !== null && comment.y !== null && comment.z !== null) {
        // Создаем исходную точку из координат комментария
        const originalPoint = new THREE.Vector3(comment.x, comment.y, comment.z);
        
        // Проецируем точку на поверхность модели
        const surfacePoint = projectPointToSurface(originalPoint);
        
        if (surfacePoint) {
          // Создаем сферу для маркера
          const geometry = new THREE.SphereGeometry(0.2, 16, 16);
          const isSelected = selectedCommentId === comment.id;
          const material = new THREE.MeshBasicMaterial({
            color: isSelected ? 0x00ff00 : 0xff0000, // Выделенный комментарий — зелёный, остальные — красные
            transparent: true,
            opacity: 0.8,
          });
          const marker = new THREE.Mesh(geometry, material);
          
          // Устанавливаем позицию маркера на поверхности
          marker.position.copy(surfacePoint);
          marker.name = `comment_${comment.id}`;
          
          // Добавляем пользовательские данные для идентификации
          (marker.userData as any).commentId = comment.id;
          
          group.add(marker);
        }
      }
    });

    // Обновляем рендерер
    if (fragmentsRef.current && fragmentsRef.current.core) {
      fragmentsRef.current.core.update(true);
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

  // Начало редактирования комментария
  const handleStartEditComment = (comment: BimModelComment) => {
    setSelectedCommentId(comment.id);
    if (comment.x !== null && comment.y !== null && comment.z !== null) {
      setSelectedPoint({ x: comment.x, y: comment.y, z: comment.z });
    } else {
      setSelectedPoint(null);
    }
    setCommentText(comment.content);
    setEditingCommentId(comment.id);
    setShowCommentForm(true);
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
        setEditingCommentId(null);
        setSelectedCommentId(null);
        // Обновляем маркеры после создания комментария
        setTimeout(() => updateCommentMarkers(), 100);
      } else {
        alert('Ошибка создания комментария');
      }
    } catch (err: any) {
      alert('Ошибка создания комментария: ' + err.message);
    }
  };

  // Обновление (редактирование) комментария
  const handleUpdateComment = async () => {
    if (!editingCommentId || !commentText.trim()) return;

    try {
      // Бэкенд не поддерживает PUT (405), поэтому реализуем "редактирование" как
      // удаление старого комментария и создание нового с теми же координатами.

      // 1. Удаляем старый комментарий
      await fetch(
        `/api/objects/${objectId}/models/${model.id}/comments/${editingCommentId}`,
        { method: 'DELETE' }
      );

      // 2. Создаём новый комментарий с обновлённым текстом
      const response = await fetch(
        `/api/objects/${objectId}/models/${model.id}/comments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: commentText,
            x: selectedPoint?.x ?? null,
            y: selectedPoint?.y ?? null,
            z: selectedPoint?.z ?? null,
          }),
        }
      );

      if (response.ok) {
        await loadComments();
        setCommentText('');
        setShowCommentForm(false);
        setEditingCommentId(null);
        setSelectedCommentId(null);
      } else {
        alert('Ошибка обновления комментария');
      }
    } catch (err: any) {
      alert('Ошибка обновления комментария: ' + err.message);
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
        // Обновляем маркеры после удаления комментария
        setTimeout(() => updateCommentMarkers(), 100);
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

  // Обновление маркеров комментариев при изменении списка комментариев
  useEffect(() => {
    // Используем небольшую задержку, чтобы убедиться, что модель загружена
    const timer = setTimeout(() => {
      if (worldRef.current && commentMarkersGroupRef.current) {
        updateCommentMarkers();
      }
    }, 500);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, selectedCommentId]);

  // Управление режимом комментариев (gizmo, прозрачность, отключение вращения)
  useEffect(() => {
    if (!worldRef.current || !ifcHostRef.current) {
      return;
    }

    const world = worldRef.current;
    const host = ifcHostRef.current;
    const camera = world.camera;

    if (commentMode) {
      // Включаем режим комментариев
      // 1. Отключаем ВСЕ контроллеры камеры полностью
      if (camera && camera.controls) {
        const controls = camera.controls as any;
        // Сохраняем исходное состояние для восстановления
        (controls as any)._originalState = {
          enableRotate: controls.enableRotate,
          enablePan: controls.enablePan,
          enableZoom: controls.enableZoom,
          enableDamping: controls.enableDamping,
        };
        // Отключаем все взаимодействия с камерой
        if (controls.enableRotate !== undefined) {
          controls.enableRotate = false;
        }
        if (controls.enablePan !== undefined) {
          controls.enablePan = false;
        }
        if (controls.enableZoom !== undefined) {
          controls.enableZoom = false;
        }
        if (controls.enableDamping !== undefined) {
          controls.enableDamping = false;
        }
      }

      // 2. Создаем gizmo
      createGizmo();

      // 3. Устанавливаем прозрачность модели
      setModelOpacity(0.3);

      // 4. Скрываем превью-маркер
      if (previewMarkerRef.current) {
        previewMarkerRef.current.visible = false;
      }
      if (previewLineRef.current) {
        previewLineRef.current.visible = false;
      }

      // 5. Обработчики для gizmo
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const handleMouseMove = (event: MouseEvent) => {
        if (!gizmoGroupRef.current || !world.camera.three) {
          return;
        }

        const rect = host.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, world.camera.three);

        // Проверяем наведение на оси gizmo через невидимые цилиндры
        const gizmoObjects: THREE.Object3D[] = [];
        if (gizmoAxisCylindersRef.current.x) gizmoObjects.push(gizmoAxisCylindersRef.current.x);
        if (gizmoAxisCylindersRef.current.y) gizmoObjects.push(gizmoAxisCylindersRef.current.y);
        if (gizmoAxisCylindersRef.current.z) gizmoObjects.push(gizmoAxisCylindersRef.current.z);

        const intersects = raycaster.intersectObjects(gizmoObjects, false);

        // Сбрасываем цвета всех осей (делаем их ярче для лучшей видимости)
        if (gizmoAxesRef.current.x) {
          (gizmoAxesRef.current.x as any).setColor(0xff3333);
        }
        if (gizmoAxesRef.current.y) {
          (gizmoAxesRef.current.y as any).setColor(0x33ff33);
        }
        if (gizmoAxesRef.current.z) {
          (gizmoAxesRef.current.z as any).setColor(0x3333ff);
        }

        // Подсвечиваем активную ось ярким желтым
        if (intersects.length > 0 && !isDraggingRef.current) {
          const intersected = intersects[0].object;
          const axis = (intersected.userData as any).axis as 'x' | 'y' | 'z' | undefined;
          if (axis && (axis === 'x' || axis === 'y' || axis === 'z') && gizmoAxesRef.current[axis]) {
            // Подсвечиваем активную ось ярким желтым и делаем толще визуально
            (gizmoAxesRef.current[axis] as any).setColor(0xffff00);
            // Увеличиваем масштаб для лучшей видимости
            gizmoAxesRef.current[axis]!.scale.set(1.3, 1.3, 1.3);
          }
        } else {
          // Сбрасываем масштаб всех осей
          if (gizmoAxesRef.current.x) gizmoAxesRef.current.x.scale.set(1, 1, 1);
          if (gizmoAxesRef.current.y) gizmoAxesRef.current.y.scale.set(1, 1, 1);
          if (gizmoAxesRef.current.z) gizmoAxesRef.current.z.scale.set(1, 1, 1);
        }
      };

      const handleMouseDown = (event: MouseEvent) => {
        // Блокируем все события мыши, если не взаимодействуем с gizmo
        // Используем ПРАВУЮ кнопку мыши для перемещения gizmo (event.button === 2)
        if (event.button !== 2 || !gizmoGroupRef.current || !world.camera.three) {
          // Блокируем событие, чтобы оно не дошло до контроллеров камеры
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          return;
        }

        const rect = host.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, world.camera.three);

        // Используем невидимые цилиндры для raycasting
        const gizmoObjects: THREE.Object3D[] = [];
        if (gizmoAxisCylindersRef.current.x) gizmoObjects.push(gizmoAxisCylindersRef.current.x);
        if (gizmoAxisCylindersRef.current.y) gizmoObjects.push(gizmoAxisCylindersRef.current.y);
        if (gizmoAxisCylindersRef.current.z) gizmoObjects.push(gizmoAxisCylindersRef.current.z);

        const intersects = raycaster.intersectObjects(gizmoObjects, false);

        if (intersects.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation(); // Более агрессивная блокировка
          const intersected = intersects[0].object;
          const axis = (intersected.userData as any).axis as 'x' | 'y' | 'z' | undefined;
          if (axis && (axis === 'x' || axis === 'y' || axis === 'z')) {
            activeAxisRef.current = axis;
            isDraggingRef.current = true;
            dragStartMouseRef.current = { x: event.clientX, y: event.clientY };
            if (gizmoGroupRef.current) {
              dragStartGizmoPosRef.current = gizmoGroupRef.current.position.clone();
            }
            // Контроллеры уже отключены при входе в режим комментариев
            // Подсвечиваем активную ось ярким желтым и увеличиваем масштаб
            const axisArrow = gizmoAxesRef.current[axis];
            if (axisArrow) {
              (axisArrow as any).setColor(0xffff00);
              axisArrow.scale.set(1.5, 1.5, 1.5);
            }
          }
        } else {
          // Если клик не по gizmo, блокируем событие
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }
      };

      const handleMouseUp = () => {
        if (isDraggingRef.current) {
          // Контроллеры остаются отключенными в режиме комментариев
          // Сбрасываем масштаб активной оси
          if (activeAxisRef.current && gizmoAxesRef.current[activeAxisRef.current]) {
            gizmoAxesRef.current[activeAxisRef.current]!.scale.set(1, 1, 1);
          }
          activeAxisRef.current = null;
          isDraggingRef.current = false;
          dragStartMouseRef.current = null;
          dragStartGizmoPosRef.current = null;
        }
      };

      const handleMouseDrag = (event: MouseEvent) => {
        if (!isDraggingRef.current || !activeAxisRef.current || !gizmoGroupRef.current || !dragStartMouseRef.current || !dragStartGizmoPosRef.current || !world.camera.three) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation(); // Более агрессивная блокировка

        // Получаем камеру
        const camera = world.camera.three;
        
        // Контроллеры уже отключены при входе в режим комментариев

        // Вычисляем смещение мыши
        const deltaX = event.clientX - dragStartMouseRef.current.x;
        const deltaY = event.clientY - dragStartMouseRef.current.y;

        // Преобразуем смещение мыши в движение по оси
        // Используем проекцию на плоскость камеры
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        // Вычисляем направление движения по активной оси
        const axisDirection = new THREE.Vector3();
        if (activeAxisRef.current === 'x') {
          axisDirection.set(1, 0, 0);
        } else if (activeAxisRef.current === 'y') {
          axisDirection.set(0, 1, 0);
        } else if (activeAxisRef.current === 'z') {
          axisDirection.set(0, 0, 1);
        }

        // Преобразуем направление оси в пространство камеры
        const cameraRight = new THREE.Vector3();
        const cameraUp = new THREE.Vector3();
        cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        cameraUp.setFromMatrixColumn(camera.matrixWorld, 1).normalize();

        // Проецируем направление оси на плоскость камеры
        const axisOnScreen = new THREE.Vector2();
        axisOnScreen.x = axisDirection.dot(cameraRight);
        axisOnScreen.y = axisDirection.dot(cameraUp);
        axisOnScreen.normalize();

        // Вычисляем движение
        const movement = (deltaX * axisOnScreen.x + deltaY * axisOnScreen.y) * 0.1; // Коэффициент скорости

        // Обновляем позицию gizmo
        const newPosition = dragStartGizmoPosRef.current.clone();
        if (activeAxisRef.current === 'x') {
          newPosition.x += movement;
        } else if (activeAxisRef.current === 'y') {
          newPosition.y += movement;
        } else if (activeAxisRef.current === 'z') {
          newPosition.z += movement;
        }

        gizmoGroupRef.current.position.copy(newPosition);
      };

      host.addEventListener('mousemove', handleMouseMove);
      // Используем capture phase для перехвата событий до контроллеров камеры
      host.addEventListener('mousedown', handleMouseDown, true);
      host.addEventListener('mouseup', handleMouseUp, true);
      host.addEventListener('mousemove', handleMouseDrag, true);

      // Сохраняем обработчики для очистки
      (host as any)._gizmoMouseMove = handleMouseMove;
      (host as any)._gizmoMouseDown = handleMouseDown;
      (host as any)._gizmoMouseUp = handleMouseUp;
      (host as any)._gizmoMouseDrag = handleMouseDrag;

      return () => {
        // Отключаем режим комментариев
        removeGizmo();
        setModelOpacity(1);

        // Восстанавливаем ВСЕ контроллеры камеры из сохраненного состояния
        if (camera && camera.controls) {
          const controls = camera.controls as any;
          const originalState = (controls as any)._originalState;
          if (originalState) {
            if (controls.enableRotate !== undefined) {
              controls.enableRotate = originalState.enableRotate;
            }
            if (controls.enablePan !== undefined) {
              controls.enablePan = originalState.enablePan;
            }
            if (controls.enableZoom !== undefined) {
              controls.enableZoom = originalState.enableZoom;
            }
            if (controls.enableDamping !== undefined) {
              controls.enableDamping = originalState.enableDamping;
            }
            delete (controls as any)._originalState;
          }
        }

        // Удаляем обработчики
        if ((host as any)._gizmoMouseMove) {
          host.removeEventListener('mousemove', (host as any)._gizmoMouseMove);
          delete (host as any)._gizmoMouseMove;
        }
        if ((host as any)._gizmoMouseDown) {
          host.removeEventListener('mousedown', (host as any)._gizmoMouseDown, true);
          delete (host as any)._gizmoMouseDown;
        }
        if ((host as any)._gizmoMouseUp) {
          host.removeEventListener('mouseup', (host as any)._gizmoMouseUp, true);
          delete (host as any)._gizmoMouseUp;
        }
        if ((host as any)._gizmoMouseDrag) {
          host.removeEventListener('mousemove', (host as any)._gizmoMouseDrag, true);
          delete (host as any)._gizmoMouseDrag;
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentMode]);

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
                            // Скрываем превью-маркер при выходе из режима комментариев
                            if (!newMode && previewMarkerRef.current) {
                              previewMarkerRef.current.visible = false;
                            }
                            if (!newMode && previewLineRef.current) {
                              previewLineRef.current.visible = false;
                            }
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
                            Переместите gizmo по осям (наведите на стрелку и перетащите), затем нажмите правой кнопкой мыши для сохранения позиции
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Форма создания / редактирования комментария */}
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
                            onClick={editingCommentId ? handleUpdateComment : handleCreateComment}
                            disabled={!commentText.trim()}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300"
                          >
                            {editingCommentId ? 'Обновить' : 'Сохранить'}
                          </button>
                          <button
                            onClick={() => {
                              setShowCommentForm(false);
                              setSelectedPoint(null);
                              setCommentText('');
                              setEditingCommentId(null);
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
                        comments.map((comment) => {
                          const isSelected = selectedCommentId === comment.id;
                          return (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-lg border cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-blue-400'
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                            onClick={() => handleStartEditComment(comment)}
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteComment(comment.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 text-sm"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-gray-700">{comment.content}</p>
                          </div>
                        )})
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
