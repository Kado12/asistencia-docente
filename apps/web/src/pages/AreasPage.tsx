import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Card, Modal, ConfirmModal, useToast } from '../components/ui';
import { academicService, type Area } from '../api/academic.service';

export const AreasPage: React.FC = () => {
  const { addToast } = useToast();
  const [areas, setAreas] = useState<Area[]>([]);

  // Modales de área
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areaName, setAreaName] = useState('');

  // Modales de curso
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseAreaId, setCourseAreaId] = useState('');
  const [courseName, setCourseName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'area' | 'course'; id: string; name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    try {
      setAreas(await academicService.getAreas());
    } catch {
      addToast('error', 'Error al cargar áreas');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingArea) {
        await academicService.updateArea(editingArea.id, areaName);
        addToast('success', 'Área actualizada');
      } else {
        await academicService.createArea(areaName);
        addToast('success', 'Área creada');
      }
      setShowAreaModal(false);
      setAreaName('');
      setEditingArea(null);
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const saveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await academicService.createCourse(courseName, courseAreaId);
      addToast('success', 'Curso creado');
      setShowCourseModal(false);
      setCourseName('');
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      if (deleteTarget.type === 'area') await academicService.deleteArea(deleteTarget.id);
      else await academicService.deleteCourse(deleteTarget.id);
      addToast('success', 'Eliminado correctamente');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al eliminar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Áreas y Cursos</h1>
        <Button
          onClick={() => {
            setEditingArea(null);
            setAreaName('');
            setShowAreaModal(true);
          }}
        >
          + Nueva Área
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map((area) => (
          <Card key={area.id}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">{area.name}</h2>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setCourseAreaId(area.id);
                    setCourseName('');
                    setShowCourseModal(true);
                  }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + Curso
                </button>
                <button
                  onClick={() => {
                    setEditingArea(area);
                    setAreaName(area.name);
                    setShowAreaModal(true);
                  }}
                  className="text-gray-600 hover:underline text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => setDeleteTarget({ type: 'area', id: area.id, name: area.name })}
                  className="text-red-600 hover:underline text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {area.courses.length === 0 ? (
              <p className="text-sm text-gray-400">Sin cursos</p>
            ) : (
              <ul className="space-y-1">
                {area.courses.map((course) => (
                  <li key={course.id} className="flex justify-between items-center text-sm bg-gray-50 rounded px-3 py-2">
                    <span className="text-gray-700">📘 {course.name}</span>
                    <button
                      onClick={() => setDeleteTarget({ type: 'course', id: course.id, name: course.name })}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      {/* Modal área */}
      <Modal isOpen={showAreaModal} onClose={() => setShowAreaModal(false)} title={editingArea ? 'Editar Área' : 'Nueva Área'}>
        <form onSubmit={saveArea} className="space-y-4">
          <Input label="Nombre del área" value={areaName} onChange={(e) => setAreaName(e.target.value)} required />
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowAreaModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal curso */}
      <Modal isOpen={showCourseModal} onClose={() => setShowCourseModal(false)} title="Nuevo Curso">
        <form onSubmit={saveCourse} className="space-y-4">
          <Input label="Nombre del curso" value={courseName} onChange={(e) => setCourseName(e.target.value)} required />
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowCourseModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar"
        message={`¿Eliminar "${deleteTarget?.name}"?`}
        isLoading={isSaving}
      />
    </div>
  );
};