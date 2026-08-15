import React, { useState, useEffect } from 'react';
import { Button, Select, Card, Modal, useToast } from '../components/ui';
import { validationsService, type WeekStatusRow } from '../api/validations.service';
import { academicService, type Period } from '../api/academic.service';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'bg-gray-100 text-gray-600' },
  VALIDATED: { label: 'Validada', color: 'bg-green-100 text-green-800' },
  OBSERVED: { label: 'Con observaciones', color: 'bg-orange-100 text-orange-800' },
};

export const ValidationPage: React.FC = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const canValidate = user?.role === 'COORDINADOR' || user?.role === 'ADMIN';

  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [weekNumber, setWeekNumber] = useState('1');

  const [rows, setRows] = useState<WeekStatusRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal de observación
  const [observeTarget, setObserveTarget] = useState<WeekStatusRow | null>(null);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    academicService.getPeriods().then((p) => {
      setPeriods(p);
      const active = p.find((x) => x.isActive);
      if (active) setPeriodId(active.id);
    });
  }, []);

  useEffect(() => {
    if (!periodId) return;
    setIsLoading(true);
    validationsService
      .getWeekStatus(periodId, parseInt(weekNumber))
      .then(setRows)
      .catch(() => addToast('error', 'Error al cargar'))
      .finally(() => setIsLoading(false));
  }, [periodId, weekNumber, addToast]);

  const selectedPeriod = periods.find((p) => p.id === periodId);

  const handleValidate = async (row: WeekStatusRow) => {
    setIsSaving(true);
    try {
      await validationsService.setStatus({
        teacherId: row.teacher.id,
        periodId,
        weekNumber: parseInt(weekNumber),
        status: 'VALIDATED',
      });
      addToast('success', `✅ Semana de ${row.teacher.lastName} validada`);
      const updated = await validationsService.getWeekStatus(periodId, parseInt(weekNumber));
      setRows(updated);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al validar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleObserve = async () => {
    if (!observeTarget) return;
    if (!comment.trim()) {
      addToast('error', 'Escribe el motivo de la observación');
      return;
    }
    setIsSaving(true);
    try {
      await validationsService.setStatus({
        teacherId: observeTarget.teacher.id,
        periodId,
        weekNumber: parseInt(weekNumber),
        status: 'OBSERVED',
        comment,
      });
      addToast('success', 'Observación registrada');
      setObserveTarget(null);
      setComment('');
      const updated = await validationsService.getWeekStatus(periodId, parseInt(weekNumber));
      setRows(updated);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al observar');
    } finally {
      setIsSaving(false);
    }
  };

  const validatedCount = rows.filter((r) => r.validation?.status === 'VALIDATED').length;
  const observedCount = rows.filter((r) => r.validation?.status === 'OBSERVED').length;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Validación Semanal</h1>

      <Card>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Período"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Select
            label="Semana"
            value={weekNumber}
            onChange={(e) => setWeekNumber(e.target.value)}
            options={Array.from({ length: selectedPeriod?.weeks || 12 }, (_, i) => ({
              value: String(i + 1),
              label: `Semana ${i + 1}`,
            }))}
          />
        </div>
        <div className="flex gap-3 mt-3 text-sm">
          <span className="text-green-700">✅ {validatedCount} validadas</span>
          <span className="text-orange-700">⚠️ {observedCount} observadas</span>
          <span className="text-gray-500">
            ⏳ {rows.length - validatedCount - observedCount} pendientes
          </span>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Horas</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Asist.</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Faltas</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tard.</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
              {canValidate && (
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay docentes con clases en este período</td></tr>
            ) : (
              rows.map((row) => {
                const status = row.validation?.status || 'PENDING';
                const config = STATUS_CONFIG[status];
                return (
                  <tr key={row.teacher.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {row.teacher.lastName}, {row.teacher.firstName}
                      </p>
                      <p className="text-xs text-gray-400">{row.teacher.dni}</p>
                      {status === 'OBSERVED' && row.validation?.comment && (
                        <p className="text-xs text-orange-600 mt-1">💬 {row.validation.comment}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center font-bold text-blue-700">{row.stats.hours}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-700">{row.stats.presents}</td>
                    <td className="px-4 py-3 text-sm text-center text-red-700">{row.stats.absents}</td>
                    <td className="px-4 py-3 text-sm text-center text-orange-600">{row.stats.lateMinutes}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </td>
                    {canValidate && (
                      <td className="px-4 py-3 text-right space-x-2">
                        <Button
                          variant="success"
                          className="text-xs px-2 py-1"
                          onClick={() => handleValidate(row)}
                          isLoading={isSaving}
                        >
                          ✓ Validar
                        </Button>
                        <Button
                          variant="secondary"
                          className="text-xs px-2 py-1"
                          onClick={() => {
                            setObserveTarget(row);
                            setComment(row.validation?.comment || '');
                          }}
                        >
                          ⚠ Observar
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      {/* Modal de observación */}
      <Modal
        isOpen={!!observeTarget}
        onClose={() => setObserveTarget(null)}
        title={`Observación: ${observeTarget?.teacher.lastName}, ${observeTarget?.teacher.firstName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de la observación
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ej: La tardanza del miércoles no coincide con la ficha física..."
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setObserveTarget(null)}>Cancelar</Button>
            <Button variant="primary" onClick={handleObserve} isLoading={isSaving}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};