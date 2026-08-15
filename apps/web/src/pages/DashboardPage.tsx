import React, { useState, useEffect } from 'react';
import { Select, Card } from '../components/ui';
import { dashboardService, type DashboardSummary } from '../api/dashboard.service';
import { academicService, type Period } from '../api/academic.service';
import { useAuth } from '../context/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [periods, setPeriods] = useState<Period[]>([]);
  const [periodId, setPeriodId] = useState('');
  const [weekNumber, setWeekNumber] = useState('0'); // 0 = período completo
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    academicService.getPeriods().then((p) => {
      setPeriods(p);
      const active = p.find((x) => x.isActive);
      if (active) setPeriodId(active.id);
    });
  }, []);

  useEffect(() => {
    if (!periodId) return;
    dashboardService
      .getSummary(periodId, weekNumber === '0' ? undefined : parseInt(weekNumber))
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [periodId, weekNumber]);

  const selectedPeriod = periods.find((p) => p.id === periodId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800">
          Hola, {user?.firstName} 👋
        </h1>
        <div className="flex gap-3">
          <Select
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Select
            value={weekNumber}
            onChange={(e) => setWeekNumber(e.target.value)}
            options={[
              { value: '0', label: 'Período completo' },
              ...Array.from({ length: selectedPeriod?.weeks || 12 }, (_, i) => ({
                value: String(i + 1),
                label: `Semana ${i + 1}`,
              })),
            ]}
          />
        </div>
      </div>

      {summary && (
        <>
          {/* Tarjetas de totales */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="text-center">
              <p className="text-3xl font-bold text-blue-600">{summary.totals.hours}</p>
              <p className="text-xs text-gray-500">Horas dictadas</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-green-600">{summary.totals.presents}</p>
              <p className="text-xs text-gray-500">Asistencias</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-red-600">{summary.totals.absents}</p>
              <p className="text-xs text-gray-500">Faltas</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-orange-600">{summary.totals.lateMinutes}</p>
              <p className="text-xs text-gray-500">Min. tardanza</p>
            </Card>
            <Card className="text-center">
              <p className="text-3xl font-bold text-gray-700">{summary.totals.attendanceRate}%</p>
              <p className="text-xs text-gray-500">% Asistencia</p>
            </Card>
          </div>

          {/* Progreso de validación */}
          {summary.validationProgress && (
            <Card>
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-semibold text-gray-700">
                  🛡️ Progreso de validación ({summary.label})
                </h2>
                <span className="text-sm text-gray-500">
                  {summary.validationProgress.validated}/{summary.validationProgress.total} docentes
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{
                    width: `${
                      summary.validationProgress.total > 0
                        ? (summary.validationProgress.validated / summary.validationProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ✅ {summary.validationProgress.validated} validadas · ⚠️ {summary.validationProgress.observed} observadas
              </p>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Horas por sede */}
            <Card>
              <h2 className="font-semibold text-gray-700 mb-3">🏫 Horas por sede</h2>
              {summary.bySede.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {summary.bySede.map((s) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{s.name}</span>
                        <span className="text-blue-700 font-bold">{s.hours}h</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${
                              summary.bySede[0].hours > 0
                                ? (s.hours / summary.bySede[0].hours) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Datos generales */}
            <Card>
              <h2 className="font-semibold text-gray-700 mb-3">📋 Datos generales</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Período</span>
                  <span className="font-medium">{summary.periodName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rango</span>
                  <span className="font-medium">{summary.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Docentes activos</span>
                  <span className="font-medium">{summary.activeTeachers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Clases asignadas</span>
                  <span className="font-medium">{summary.classesCount}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};