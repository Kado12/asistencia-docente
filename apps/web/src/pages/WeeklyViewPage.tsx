import React, { useState, useEffect } from 'react';
import { Select, Card, useToast } from '../components/ui';
import { attendanceService, type WeeklyResponse } from '../api/attendance.service';
import { teachersService, type Teacher } from '../api/teachers.service';
import { academicService, type Period } from '../api/academic.service';

export const WeeklyViewPage: React.FC = () => {
  const { addToast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  const [teacherId, setTeacherId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [weekNumber, setWeekNumber] = useState('1');

  const [weekly, setWeekly] = useState<WeeklyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, p] = await Promise.all([
          teachersService.findAll({ limit: 200 }),
          academicService.getPeriods(),
        ]);
        setTeachers(t.data);
        setPeriods(p);
        const active = p.find((x) => x.isActive);
        if (active) setPeriodId(active.id);
      } catch {
        addToast('error', 'Error al cargar datos');
      }
    })();
  }, [addToast]);

  useEffect(() => {
    if (!teacherId || !periodId) return;
    setIsLoading(true);
    attendanceService
      .getWeekly(teacherId, periodId, parseInt(weekNumber))
      .then(setWeekly)
      .catch((err) => {
        addToast('error', err.response?.data?.message || 'Error al cargar la semana');
        setWeekly(null);
      })
      .finally(() => setIsLoading(false));
  }, [teacherId, periodId, weekNumber, addToast]);

  const selectedPeriod = periods.find((p) => p.id === periodId);
  const weekOptions = Array.from({ length: selectedPeriod?.weeks || 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Semana ${i + 1} (S${i + 1})`,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Vista Semanal por Docente</h1>

      {/* Filtros */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Docente"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            options={[
              { value: '', label: 'Selecciona docente' },
              ...teachers.map((t) => ({ value: t.id, label: `${t.lastName}, ${t.firstName}` })),
            ]}
          />
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
            options={weekOptions}
          />
        </div>
      </Card>

      {isLoading && <p className="text-center py-8 text-gray-500">Cargando...</p>}

      {weekly && !isLoading && (
        <>
          {/* Tabla estilo Excel: L M M J V | T | S# */}
          <Card className="p-0 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-center">
              <thead className="bg-gray-50">
                <tr>
                  {weekly.days.map((d) => (
                    <th key={d.date} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      {d.dayName[0]}
                      <span className="block text-[10px] font-normal">{d.date.slice(5)}</span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-xs font-medium text-orange-600 uppercase">T</th>
                  <th className="px-4 py-3 text-xs font-medium text-blue-600 uppercase">
                    S{weekly.weekNumber}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="divide-x divide-gray-100">
                  {weekly.days.map((d) => (
                    <td key={d.date} className="px-4 py-4">
                      {d.records.length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-3 py-1 rounded font-bold text-lg ${
                              d.hours > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {d.hours > 0 ? d.hours : 'F'}
                          </span>
                          {d.absents > 0 && d.hours > 0 && (
                            <p className="text-[10px] text-red-600">{d.absents} falta(s)</p>
                          )}
                          {d.absents > 0 && d.hours === 0 && (
                            <p className="text-[10px] text-red-600">{d.absents} falta(s)</p>
                          )}
                        </div>
                      )}
                    </td>
                  ))}
                  {/* T: minutos de tardanza de la semana */}
                  <td className="px-4 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded font-bold text-lg ${
                        weekly.totals.lateMinutes > 0
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {weekly.totals.lateMinutes}
                    </span>
                    <p className="text-[10px] text-gray-400">min</p>
                  </td>
                  {/* S#: total de horas de la semana */}
                  <td className="px-4 py-4">
                    <span className="inline-block px-3 py-1 rounded font-bold text-lg bg-blue-100 text-blue-700">
                      {weekly.totals.hours}
                    </span>
                    <p className="text-[10px] text-gray-400">horas</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>

          {/* Resumen de la semana */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="text-center">
              <p className="text-2xl font-bold text-blue-600">{weekly.totals.hours}</p>
              <p className="text-xs text-gray-500">Horas dictadas</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-green-600">{weekly.totals.presents}</p>
              <p className="text-xs text-gray-500">Asistencias</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-red-600">{weekly.totals.absents}</p>
              <p className="text-xs text-gray-500">Faltas</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-orange-600">{weekly.totals.lateMinutes}</p>
              <p className="text-xs text-gray-500">Minutos de tardanza</p>
            </Card>
          </div>

          {/* Detalle por día */}
          <Card>
            <h2 className="font-semibold text-gray-700 mb-3">Detalle por día</h2>
            <div className="space-y-3">
              {weekly.days.map((d) => (
                <div key={d.date} className="border rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-800 mb-2">
                    {d.dayName} {d.date}
                  </p>
                  {d.records.length === 0 ? (
                    <p className="text-xs text-gray-400">Sin clases registradas</p>
                  ) : (
                    <ul className="space-y-1">
                      {d.records.map((r) => (
                        <li key={r.id} className="text-xs flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded font-medium ${
                              r.status === 'PRESENT'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {r.status === 'PRESENT' ? `✓ ${r.hours}h` : 'F'}
                          </span>
                          <span className="text-gray-600">
                            {r.courseName} · {r.sedeName}
                          </span>
                          {r.lateMinutes > 0 && (
                            <span className="text-orange-600">+{r.lateMinutes} min tarde</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Clases programadas del docente */}
          <Card>
            <h2 className="font-semibold text-gray-700 mb-3">Clases programadas del docente</h2>
            {weekly.scheduledClasses.length === 0 ? (
              <p className="text-sm text-gray-400">El docente no tiene clases asignadas en este período</p>
            ) : (
              <ul className="space-y-1">
                {weekly.scheduledClasses.map((c, i) => (
                  <li key={i} className="text-sm text-gray-600">
                    <strong>{c.dayName}</strong>: {c.courseName} · {c.sedeName} · {c.hours}h
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};