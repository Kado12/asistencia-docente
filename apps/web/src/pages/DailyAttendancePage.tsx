import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Select, Card, useToast } from '../components/ui';
import { attendanceService, type DailyClass } from '../api/attendance.service';
import { academicService, type Sede } from '../api/academic.service';

interface Mark {
  status: 'PRESENT' | 'ABSENT';
  lateMinutes: number;
}

// Fecha de hoy en formato YYYY-MM-DD (local)
const todayStr = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split('T')[0];
};

export const DailyAttendancePage: React.FC = () => {
  const { addToast } = useToast();

  const [date, setDate] = useState(todayStr());
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [filterSede, setFilterSede] = useState('');

  const [classes, setClasses] = useState<DailyClass[]>([]);
  const [coverage, setCoverage] = useState<{ sedeName: string; total: number; marked: number }[]>([]);
  const [dayName, setDayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Marcas locales: teacherClassId -> Mark
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    academicService.getSedes().then(setSedes).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!date) return;
    setIsLoading(true);
    try {
      const res = await attendanceService.getDaily(date, filterSede || undefined);
      setClasses(res.classes);
      setCoverage(res.coverage);
      setDayName(res.dayName);

      // Inicializar marcas desde lo ya guardado
      const initial: Record<string, Mark> = {};
      for (const c of res.classes) {
        if (c.attendance) {
          initial[c.id] = {
            status: c.attendance.status,
            lateMinutes: c.attendance.lateMinutes || 0,
          };
        }
      }
      setMarks(initial);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al cargar el día');
      setClasses([]);
      setCoverage([]);
    } finally {
      setIsLoading(false);
    }
  }, [date, filterSede, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const setMark = (id: string, mark: Partial<Mark>) => {
    setMarks((prev) => ({
      ...prev,
      [id]: { status: 'PRESENT', lateMinutes: 0, ...prev[id], ...mark },
    }));
  };

  const markAllPresent = () => {
    const next: Record<string, Mark> = { ...marks };
    for (const c of classes) {
      if (!next[c.id]) next[c.id] = { status: 'PRESENT', lateMinutes: 0 };
    }
    setMarks(next);
    addToast('success', 'Todas las clases marcadas como asistidas');
  };

  const handleSave = async () => {
    const records = Object.entries(marks)
      .filter(([id]) => classes.some((c) => c.id === id))
      .map(([teacherClassId, m]) => ({
        teacherClassId,
        status: m.status,
        lateMinutes: m.status === 'PRESENT' ? m.lateMinutes : 0,
      }));

    if (records.length === 0) {
      addToast('error', 'No hay nada que guardar. Marca al menos una clase.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await attendanceService.saveDaily(date, records);
      addToast('success', `✅ ${res.saved} registros guardados`);
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const markedCount = classes.filter((c) => marks[c.id]).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Asistencia Diaria</h1>
        <Button variant="success" onClick={handleSave} isLoading={isSaving}>
          💾 Guardar Asistencia ({markedCount}/{classes.length})
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select
            label="Sede"
            value={filterSede}
            onChange={(e) => setFilterSede(e.target.value)}
            options={[{ value: '', label: 'Todas las sedes' }, ...sedes.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <div className="flex items-end">
            <div className="w-full bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <span className="text-sm font-medium text-blue-800">📅 {dayName || '—'}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Cobertura por sede */}
      {coverage.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {coverage.map((cov) => {
            const complete = cov.marked === cov.total;
            return (
              <div
                key={cov.sedeName}
                className={`rounded-lg p-3 border text-sm ${
                  complete
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-800'
                }`}
              >
                <strong>{cov.sedeName}</strong>: {cov.marked}/{cov.total} clases marcadas
                {!complete && ' ⚠️'}
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de clases del día */}
      <Card className="p-0 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-700">Clases del día</h2>
          <Button variant="secondary" onClick={markAllPresent} className="text-xs">
            ✓ Marcar todas como asistidas
          </Button>
        </div>

        {isLoading ? (
          <p className="text-center py-8 text-gray-500">Cargando...</p>
        ) : classes.length === 0 ? (
          <p className="text-center py-8 text-gray-500">
            No hay clases programadas para este día
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {classes.map((c) => {
              const mark = marks[c.id];
              return (
                <div key={c.id} className="px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-gray-50">
                  {/* Info de la clase */}
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm font-medium text-gray-900">
                      {c.teacher.lastName}, {c.teacher.firstName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {c.course.name} · {c.sede.name}
                      {c.classroom ? ` · ${c.classroom.name}` : ''} · {c.hours}h
                    </p>
                  </div>

                  {/* Botones de estado */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMark(c.id, { status: 'PRESENT', lateMinutes: mark?.lateMinutes || 0 })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        mark?.status === 'PRESENT'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-green-100'
                      }`}
                    >
                      ✓ Asistió
                    </button>
                    <button
                      onClick={() => setMark(c.id, { status: 'ABSENT' })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        mark?.status === 'ABSENT'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-red-100'
                      }`}
                    >
                      F
                    </button>
                  </div>

                  {/* Minutos de tardanza (solo si asistió) */}
                  {mark?.status === 'PRESENT' && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={mark.lateMinutes}
                        onChange={(e) =>
                          setMark(c.id, { lateMinutes: parseInt(e.target.value) || 0 })
                        }
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                        placeholder="0"
                      />
                      <span className="text-xs text-gray-500">min tarde</span>
                    </div>
                  )}

                  {!mark && (
                    <span className="text-xs text-gray-400">Sin marcar</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};