import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Modal, ConfirmModal, useToast } from '../components/ui';
import { academicService, type Sede } from '../api/academic.service';

export const SedesPage: React.FC = () => {
  const { addToast } = useToast();
  const [sedes, setSedes] = useState<Sede[]>([]);

  const [showSedeModal, setShowSedeModal] = useState(false);
  const [editingSede, setEditingSede] = useState<Sede | null>(null);
  const [sedeName, setSedeName] = useState('');

  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [classroomSedeId, setClassroomSedeId] = useState('');
  const [classroomName, setClassroomName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'sede' | 'classroom'; id: string; name: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    try {
      setSedes(await academicService.getSedes());
    } catch {
      addToast('error', 'Error al cargar sedes');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveSede = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingSede) {
        await academicService.updateSede(editingSede.id, sedeName);
        addToast('success', 'Sede actualizada');
      } else {
        await academicService.createSede(sedeName);
        addToast('success', 'Sede creada');
      }
      setShowSedeModal(false);
      setSedeName('');
      setEditingSede(null);
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const saveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await academicService.createClassroom(classroomName, classroomSedeId);
      addToast('success', 'Salón creado');
      setShowClassroomModal(false);
      setClassroomName('');
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
      if (deleteTarget.type === 'sede') await academicService.deleteSede(deleteTarget.id);
      else await academicService.deleteClassroom(deleteTarget.id);
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
        <h1 className="text-2xl font-bold text-gray-800">Sedes y Salones</h1>
        <Button
          onClick={() => {
            setEditingSede(null);
            setSedeName('');
            setShowSedeModal(true);
          }}
        >
          + Nueva Sede
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sedes.map((sede) => (
          <Card key={sede.id}>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-800">🏫 {sede.name}</h2>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    setClassroomSedeId(sede.id);
                    setClassroomName('');
                    setShowClassroomModal(true);
                  }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + Salón
                </button>
                <button
                  onClick={() => {
                    setEditingSede(sede);
                    setSedeName(sede.name);
                    setShowSedeModal(true);
                  }}
                  className="text-gray-600 hover:underline text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => setDeleteTarget({ type: 'sede', id: sede.id, name: sede.name })}
                  className="text-red-600 hover:underline text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {sede.classrooms.length === 0 ? (
              <p className="text-sm text-gray-400">Sin salones</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sede.classrooms.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1 text-sm text-gray-700">
                    🚪 {c.name}
                    <button
                      onClick={() => setDeleteTarget({ type: 'classroom', id: c.id, name: c.name })}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal isOpen={showSedeModal} onClose={() => setShowSedeModal(false)} title={editingSede ? 'Editar Sede' : 'Nueva Sede'}>
        <form onSubmit={saveSede} className="space-y-4">
          <Input label="Nombre de la sede" value={sedeName} onChange={(e) => setSedeName(e.target.value)} required />
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowSedeModal(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showClassroomModal} onClose={() => setShowClassroomModal(false)} title="Nuevo Salón">
        <form onSubmit={saveClassroom} className="space-y-4">
          <Input label="Nombre del salón" value={classroomName} onChange={(e) => setClassroomName(e.target.value)} required placeholder="Ej: Aula A1" />
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowClassroomModal(false)}>Cancelar</Button>
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