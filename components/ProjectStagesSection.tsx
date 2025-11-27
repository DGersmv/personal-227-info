'use client';

import { useState, useEffect } from 'react';
import CreateStageModal from './CreateStageModal';
import { useRouter } from 'next/navigation';

interface Stage {
  id: number;
  title: string;
  description: string | null;
  status: string;
  orderIndex: number;
  _count: {
    photos: number;
  };
}

interface ProjectStagesSectionProps {
  projectId: number;
  stages: Stage[];
  canEdit: boolean;
  userRole: string;
}

export default function ProjectStagesSection({
  projectId,
  stages: initialStages,
  canEdit,
  userRole,
}: ProjectStagesSectionProps) {
  const router = useRouter();
  const [stages, setStages] = useState(initialStages);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Обновить список этапов
  const refreshStages = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/stages`);
      if (response.ok) {
        const data = await response.json();
        setStages(data.stages);
      }
    } catch (error) {
      console.error('Ошибка загрузки этапов:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStageStatusChange = async (stageId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/stages/${stageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await refreshStages();
        router.refresh();
      }
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
    }
  };

  const handleDeleteStage = async (stageId: number) => {
    if (!confirm('Вы уверены, что хотите удалить этот этап?')) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/stages/${stageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await refreshStages();
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || 'Ошибка удаления этапа');
      }
    } catch (error) {
      console.error('Ошибка удаления этапа:', error);
      alert('Ошибка удаления этапа');
    }
  };

  return (
    <>
      <div className="glass rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Этапы проекта</h2>
          {canEdit && (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm"
            >
              + Добавить этап
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Загрузка...</div>
        ) : stages.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            <p>Этапы проекта пока не добавлены</p>
            {canEdit && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Создать первый этап
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className="glass rounded-lg p-4 flex items-center justify-between hover:bg-white/20 transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{stage.title}</h3>
                    {stage.description && (
                      <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {(userRole === 'BUILDER' || canEdit) && (
                    <select
                      value={stage.status}
                      onChange={(e) => handleStageStatusChange(stage.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="PENDING">Ожидает</option>
                      <option value="IN_PROGRESS">В работе</option>
                      <option value="COMPLETED">Завершен</option>
                    </select>
                  )}
                  {!canEdit && userRole !== 'BUILDER' && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        stage.status === 'PENDING'
                          ? 'bg-gray-100 text-gray-800'
                          : stage.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {stage.status === 'PENDING' && 'Ожидает'}
                      {stage.status === 'IN_PROGRESS' && 'В работе'}
                      {stage.status === 'COMPLETED' && 'Завершен'}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    Фото: {stage._count.photos}
                  </span>
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      className="text-gray-400 hover:text-red-500 transition"
                      title="Удалить этап"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <CreateStageModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            refreshStages();
            router.refresh();
          }}
        />
      )}
    </>
  );
}

