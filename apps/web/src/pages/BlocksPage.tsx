import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Card, Modal, ConfirmModal, useToast } from '../components/ui';
import { academicService, type Block, type Period } from '../api/academic.service';

export const BlocksPage: React.FC = () => {
  const { addToast } = useToast();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Block | null>(null);
  const [formData, setFormData] = useState({ name: '', startWeek: '1', endWeek: '6' });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Block | null>(null);

  useEffect(() => {
    academicService.getPeriods().then((p) => {
      setPeriods(p);
      const active = p.find((x) => x.isActive);
      if (active) setPeriodId(active.id);
    });
  }, []);

  useEffect(() => {
    if (periodId) academicService.getBlocks(periodId).then(setBlocks);
  }, [periodId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data = {
        name: formData.name,
        startWeek: parseInt(formData.startWeek),
        endWeek: parseInt(formData.endWeek),
      };
      if (editing) {
        await academicService.updateBlock(editing.id, data);
        addToast('success', 'Bloque actualizado');
      } else {
        await academicService.createBlock({ ...data, periodId });
        addToast('success', 'Bloque creado');
      }
      setShowForm(false);
      academicService.getBlocks(periodId).then(setBlocks);
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
      await academicService.deleteBlock(deleteTarget.id);
      addToast('success', 'Bloque eliminado');
      setDeleteTarget(null);
      academicService.getBlocks(periodId).then(setBlocks);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al eliminar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Bloques del Período</h1>
        <div className="flex gap-3">
          <Select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Button onClick={() => { setEditing(null); setFormData({ name: '', startWeek: '1', endWeek: '6' }); setShowForm(true); }}>
            + Nuevo Bloque
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
        💡 Un bloque define un rango de semanas. Las clases asignadas a un bloque solo aparecen
        en la asistencia y los reportes dentro de esas semanas. Las clases sin bloque rigen todo el período.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {blocks.map((b) => (
          <Card key={b.id}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-semibold text-gray-800">🧱 {b.name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Semanas {b.startWeek} a {b.endWeek} · {b._count?.classes || 0} clases
                </p>
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => { setEditing(b); setFormData({ name: b.name, startWeek: String(b.startWeek), endWeek: String(b.endWeek) }); setShowForm(true); }}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Editar
                </button>
                <button onClick={() => setDeleteTarget(b)} className="text-red-600 hover:underline text-sm">
                  Eliminar
                </button>
              </div>
            </div>
          </Card>
        ))}
        {blocks.length === 0 && (
          <p className="text-sm text-gray-400">Este período no tiene bloques. Las clases rigen todo el período.</p>
        )}
      </div>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Bloque' : 'Nuevo Bloque'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nombre" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Bloque 1" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Semana inicio" type="number" min={1} value={formData.startWeek} onChange={(e) => setFormData({ ...formData, startWeek: e.target.value })} required />
            <Input label="Semana fin" type="number" min={1} value={formData.endWeek} onChange={(e) => setFormData({ ...formData, endWeek: e.target.value })} required />
          </div>
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
        title="Eliminar Bloque"
        message={`¿Eliminar "${deleteTarget?.name}"?`}
        isLoading={isSaving}
      />
    </div>
  );
};