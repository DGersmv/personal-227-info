import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// Динамический импорт web-ifc (работает только на сервере)
let IfcAPI: any = null;
let isIfcAPILoaded = false;

async function loadIfcAPI() {
  if (isIfcAPILoaded) return;
  
  try {
    const webIfc = await import('web-ifc');
    IfcAPI = webIfc.IfcAPI;
    isIfcAPILoaded = true;
  } catch (error) {
    console.error('Ошибка загрузки web-ifc:', error);
    throw new Error('Не удалось загрузить web-ifc. Убедитесь, что библиотека установлена.');
  }
}

export async function generateIFCTree(
  objectId: number,
  modelId: number,
  ifcFilePath: string
): Promise<any> {
  try {
    await loadIfcAPI();

    const fullIfcPath = join(process.cwd(), ifcFilePath);

    if (!existsSync(fullIfcPath)) {
      throw new Error('IFC файл не найден на диске');
    }

    // Инициализация IfcAPI
    const ifcAPI = new IfcAPI();

    // Чтение IFC файла
    const ifcBuffer = await readFile(fullIfcPath);
    const ifcArrayBuffer = ifcBuffer.buffer.slice(
      ifcBuffer.byteOffset,
      ifcBuffer.byteOffset + ifcBuffer.byteLength
    );

    // Открытие модели
    const modelID = ifcAPI.OpenModel(ifcArrayBuffer);

    try {
      // Получение пространственной структуры
      const spatialStructure = ifcAPI.GetSpatialStructure(modelID);

      // Рекурсивная функция для построения дерева
      const buildTreeNode = async (node: any, parentId: string = 'root'): Promise<any> => {
        if (!node) return null;

        const expressID = node.expressID;
        const type = node.type;

        // Получение свойств элемента
        let displayName = 'Без названия';
        try {
          const props = ifcAPI.GetItemProperties(modelID, expressID, true);
          
          // Поиск названия в различных полях
          if (props.Name?.value) {
            displayName = String(props.Name.value);
          } else if (props.LongName?.value) {
            displayName = String(props.LongName.value);
          } else if (props.ObjectType?.value) {
            displayName = String(props.ObjectType.value);
          } else if (props.Description?.value) {
            displayName = String(props.Description.value);
          }
        } catch (error) {
          console.warn(`Не удалось получить свойства для expressID=${expressID}:`, error);
        }

        // Форматирование категории для читаемости
        let categoryName = type;
        if (type && type.startsWith('IFC')) {
          categoryName = type.replace(/^IFC/, '').replace(/([A-Z])/g, ' $1').trim();
        }

        const nodeId = `${parentId}_${expressID}`;

        // Рекурсивная обработка дочерних узлов
        const children: any[] = [];
        if (node.children && Array.isArray(node.children)) {
          for (const child of node.children) {
            const childNode = await buildTreeNode(child, nodeId);
            if (childNode) {
              children.push(childNode);
            }
          }
        }

        return {
          id: nodeId,
          expressID: expressID,
          name: displayName,
          category: type,
          categoryName: categoryName,
          children: children,
          visible: true,
          expanded: parentId === 'root', // Только корневой узел раскрыт по умолчанию
        };
      };

      // Построение дерева
      const tree = await buildTreeNode(spatialStructure);

      // Закрытие модели
      ifcAPI.CloseModel(modelID);

      if (!tree) {
        throw new Error('Не удалось построить дерево параметров');
      }

      // Сохранение дерева в JSON файл
      const treeDir = join(
        process.cwd(),
        'uploads',
        'objects',
        objectId.toString(),
        'models',
        modelId.toString()
      );

      // Создание директории, если не существует
      await mkdir(treeDir, { recursive: true });

      const treePath = join(treeDir, 'tree.json');
      await writeFile(treePath, JSON.stringify(tree, null, 2), 'utf-8');

      return tree;
    } catch (error) {
      // Закрытие модели в случае ошибки
      try {
        ifcAPI.CloseModel(modelID);
      } catch (closeError) {
        console.error('Ошибка при закрытии модели:', closeError);
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Ошибка генерации дерева параметров:', error);
    throw error;
  }
}

