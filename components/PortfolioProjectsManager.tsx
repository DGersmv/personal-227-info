'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PortfolioProject {
  id: number;
  portfolioId: number;
  projectId: number | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  category: string | null;
  tags: string[];
  orderIndex: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PortfolioProjectsManagerProps {
  portfolioId: number;
}

export default function PortfolioProjectsManager({ portfolioId }: PortfolioProjectsManagerProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: '',
    tags: '',
    projectId: '',
    isVisible: true,
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/portfolio/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Ошибка загрузки проектов:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((tag) => tag.trim()).filter((tag) => tag)
        : [];

      const projectData = {
        title: formData.title,
        description: formData.description || null,
        imageUrl: formData.imageUrl || null,
        category: formData.category || null,
        tags: tagsArray,
        projectId: formData.projectId ? parseInt(formData.projectId) : null,
        isVisible: formData.isVisible,
      };

      let response;
      if (editingProject) {
        // Обновление
        response = await fetch(`/api/portfolio/projects/${editingProject.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(projectData),
        });
      } else {
        // Создание
        response = await fetch('/api/portfolio/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(projectData),
        });
      }

      if (response.ok) {
        setSuccess(editingProject ? 'Проект обновлен' : 'Проект добавлен');
        setShowAddForm(false);
        setEditingProject(null);
        setFormData({
          title: '',
          description: '',
          imageUrl: '',
          category: '',
          tags: '',
          projectId: '',
          isVisible: true,
        });
        router.refresh();
        await loadProjects();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка сохранения проекта');
      }
    } catch (err) {
      console.error('Ошибка сохранения проекта:', err);
      setError('Ошибка сохранения проекта');
    }
  };

  const handleEdit = (project: PortfolioProject) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      imageUrl: project.imageUrl || '',
      category: project.category || '',
      tags: project.tags.join(', '),
      projectId: project.projectId?.toString() || '',
      isVisible: project.isVisible,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (projectId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот проект?')) {
      return;
    }

    try {
      const response = await fetch(`/api/portfolio/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Проект удален');
        router.refresh();
        await loadProjects();
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка удаления проекта');
      }
    } catch (err) {
      console.error('Ошибка удаления проекта:', err);
      setError('Ошибка удаления проекта');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingProject(null);
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      category: '',
      tags: '',
      projectId: '',
      isVisible: true,
    });
  };

  if (loading) {
    return (
      <div className="glass rounded-lg p-12 text-center">
        <p className="text-gray-600">Загрузка проектов...</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Проекты портфолио</h2>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            + Добавить проект
          </button>
        )}
      </div>

      {/* Сообщения */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Форма добавления/редактирования */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">
            {editingProject ? 'Редактировать проект' : 'Новый проект'}
          </h3>

          <div>
            <label className="block text-sm font-medium mb-2">
              Название проекта *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                URL изображения
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Категория
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Теги (через запятую)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="архитектура, дизайн, строительство"
            />
          </div>

          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isVisible}
                onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm">Видимый</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              {editingProject ? 'Сохранить' : 'Добавить'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Список проектов */}
      {projects.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <p>Проекты пока не добавлены</p>
          <p className="text-sm text-gray-500 mt-2">
            Нажмите "Добавить проект", чтобы начать
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-lg transition"
            >
              {project.imageUrl && (
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
              )}
              <h3 className="text-lg font-semibold mb-2">{project.title}</h3>
              {project.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}
              {project.category && (
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs mb-2">
                  {project.category}
                </span>
              )}
              {project.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {project.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleEdit(project)}
                  className="flex-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
                >
                  Редактировать
                </button>
                <button
                  onClick={() => handleDelete(project.id)}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


