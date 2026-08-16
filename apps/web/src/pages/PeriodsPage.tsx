import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Modal, ConfirmModal, useToast } from '../components/ui';
import { academicService, type Period } from '../api/academic.service';

export const PeriodsPage: React.FC = () => {
  const { addToast } = useToast();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Period | null>(null);
  const [formData, setFormData] = useState({ name: '', startDate: '', weeks: '12' });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Period | null>(null);

  const load = async () => {
    setPeriods(await academicService.getPeriods());
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', startDate: '', weeks: '12' });
    setShowForm(true);
  };

  const openEdit = (p: Period) => {
    setEditing(p);
    setFormData({ name: p.name, startDate: p.startDate.split('T')[0], weeks: String(p.weeks) });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editing) {
        await academicService.updatePeriod(editing.id, {
          name: formData.name,
          startDate: formData.startDate,
          weeks: parseInt(formData.weeks),
        });
        addToast('success', 'Período actualizado');
      } else {
        await academicService.createPeriod(formData.name, formData.startDate, parseInt(formData.weeks));
        addToast('success', 'Período creado');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (p: Period) => {
    try {
      await academicService.updatePeriod(p.id, { isActive: !p.isActive });
      addToast('success', p.isActive ? 'Período desactivado' : 'Período activado');
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await academicService.deletePeriod(deleteTarget.id);
      addToast('success', 'Período eliminado');
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
        <h1 className="text-2xl font-bold text-gray-800">Períodos de Clases</h1>
        <Button onClick={openCreate}>+ Nuevo Período</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {periods.map((p) => (
          <Card key={p.id}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-gray-800">📅 {p.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Inicio: {p.startDate.split('T')[0]} · {p.weeks} semanas
                </p>
                <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {p.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="space-x-2">
                <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-sm">Editar</button>
                <button onClick={() => toggleActive(p)} className="text-gray-600 hover:underline text-sm">
                  {p.isActive ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => setDeleteTarget(p)} className="text-red-600 hover:underline text-sm">Eliminar</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Período' : 'Nuevo Período'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: 2026-2" required />
          <Input label="Fecha de inicio (debe ser LUNES)" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
          <Input label="Semanas" type="number" min={1} max={20} value={formData.weeks} onChange={(e) => setFormData({ ...formData, weeks: e.target.value })} required />
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Período"
        message={`¿Eliminar "${deleteTarget?.name}"?`}
        isLoading={isSaving}
      />
    </div>
  );
};