import React, { useState, useEffect } from 'react';
import { Button, Select, Card, useToast } from '../components/ui';
import { reportsService, type ConsolidatedRow, type ReportParams } from '../api/reports.service';
import { academicService, type Area, type Sede, type Period } from '../api/academic.service';
import { teachersService, type Teacher } from '../api/teachers.service';

export const ReportsPage: React.FC = () => {
  const { addToast } = useToast();

  // Datos base
  const [periods, setPeriods] = useState<Period[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);

  // Parámetros del reporte
  const [params, setParams] = useState<ReportParams>({
    periodId: '',
    mode: 'week',
    weekNumber: 1,
    month: '',
    groupBy: 'teacher',
    sedeId: '',
    areaId: '',
    courseId: '',
    teacherId: '',
  });

  const [rows, setRows] = useState<ConsolidatedRow[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [p, s, a, t] = await Promise.all([
          academicService.getPeriods(),
          academicService.getSedes(),
          academicService.getAreas(),
          teachersService.findAll({ limit: 200 }),
        ]);
        setPeriods(p);
        setSedes(s);
        setAreas(a);
        setTeachers(t.data);
        const active = p.find((x) => x.isActive);
        if (active) setParams((prev) => ({ ...prev, periodId: active.id }));
      } catch {
        addToast('error', 'Error al cargar datos base');
      }
    })();
  }, [addToast]);

  const setParam = (key: keyof ReportParams, value: any) => {
    setParams((prev) => ({ ...prev, [key]: value }));
    setHasLoaded(false);
  };

  const selectedPeriod = periods.find((p) => p.id === params.periodId);
  const weekOptions = Array.from({ length: selectedPeriod?.weeks || 12 }, (_, i) => ({
    value: String(i + 1),
    label: `Semana ${i + 1}`,
  }));

  const allCourses = areas.flatMap((a) =>
    a.courses.map((c) => ({ ...c, areaName: a.name })),
  );

  const canLoad = !!params.periodId;

  const handleLoad = async () => {
    if (!canLoad) return;
    setIsLoading(true);
    try {
      const data = await reportsService.getConsolidated(params);
      setRows(data);
      setHasLoaded(true);
      if (data.length === 0) addToast('error', 'No hay datos para los filtros seleccionados');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al generar el consolidado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!canLoad) return;
    setIsExporting(true);
    try {
      await reportsService.exportExcel(params);
      addToast('success', '📥 Excel descargado');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const totals = rows.reduce(
    (acc, r) => ({
      hours: acc.hours + r.hours,
      presents: acc.presents + r.presents,
      absents: acc.absents + r.absents,
      lateMinutes: acc.lateMinutes + r.lateMinutes,
    }),
    { hours: 0, presents: 0, absents: 0, lateMinutes: 0 },
  );

  const groupLabel = {
    teacher: 'Docente',
    sede: 'Sede',
    area: 'Área',
    course: 'Curso',
  }[params.groupBy];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Consolidados y Reportes</h1>
        <Button variant="success" onClick={handleExport} isLoading={isExporting} disabled={!canLoad}>
          📥 Exportar Excel
        </Button>
      </div>

      {/* ===== CONFIGURACIÓN DEL REPORTE ===== */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Select
            label="Período"
            value={params.periodId}
            onChange={(e) => setParam('periodId', e.target.value)}
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Select
            label="Modo"
            value={params.mode}
            onChange={(e) => setParam('mode', e.target.value)}
            options={[
              { value: 'week', label: 'Semanal' },
              { value: 'month', label: 'Mensual' },
              { value: 'period', label: 'Período completo' },
            ]}
          />
          {params.mode === 'week' && (
            <Select
              label="Semana"
              value={String(params.weekNumber || 1)}
              onChange={(e) => setParam('weekNumber', parseInt(e.target.value))}
              options={weekOptions}
            />
          )}
          {params.mode === 'month' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <input
                type="month"
                value={params.month}
                onChange={(e) => setParam('month', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}
          <Select
            label="Agrupar por"
            value={params.groupBy}
            onChange={(e) => setParam('groupBy', e.target.value)}
            options={[
              { value: 'teacher', label: '👨‍ Docente' },
              { value: 'sede', label: '🏫 Sede' },
              { value: 'area', label: '📚 Área' },
              { value: 'course', label: '📘 Curso' },
            ]}
          />
        </div>

        {/* Filtros adicionales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <Select
            label="Filtrar sede"
            value={params.sedeId || ''}
            onChange={(e) => setParam('sedeId', e.target.value || undefined)}
            options={[{ value: '', label: 'Todas' }, ...sedes.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <Select
            label="Filtrar área"
            value={params.areaId || ''}
            onChange={(e) => {
              setParam('areaId', e.target.value || undefined);
              setParam('courseId', undefined);
            }}
            options={[{ value: '', label: 'Todas' }, ...areas.map((a) => ({ value: a.id, label: a.name }))]}
          />
          <Select
            label="Filtrar curso"
            value={params.courseId || ''}
            onChange={(e) => setParam('courseId', e.target.value || undefined)}
            options={[
              { value: '', label: 'Todos' },
              ...allCourses
                .filter((c) => !params.areaId || c.areaId === params.areaId)
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            label="Filtrar docente"
            value={params.teacherId || ''}
            onChange={(e) => setParam('teacherId', e.target.value || undefined)}
            options={[
              { value: '', label: 'Todos' },
              ...teachers.map((t) => ({ value: t.id, label: `${t.lastName}, ${t.firstName}` })),
            ]}
          />
        </div>

        <div className="mt-4">
          <Button onClick={handleLoad} isLoading={isLoading} disabled={!canLoad} className="w-full">
            🔍 Generar Consolidado
          </Button>
        </div>
      </Card>

      {/* ===== RESULTADOS ===== */}
      {hasLoaded && (
        <>
          <Card className="p-0 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{groupLabel}</th>
                  {params.groupBy === 'teacher' && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                  )}
                  {params.groupBy === 'course' && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Horas</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Asist.</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Faltas</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Tard. (min)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">% Asist.</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((r) => (
                  <tr key={r.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.label}</td>
                    {params.groupBy === 'teacher' && (
                      <td className="px-4 py-3 text-sm text-gray-500">{r.dni}</td>
                    )}
                    {params.groupBy === 'course' && (
                      <td className="px-4 py-3 text-sm text-gray-500">{r.area}</td>
                    )}
                    <td className="px-4 py-3 text-sm text-center font-bold text-blue-700">{r.hours}</td>
                    <td className="px-4 py-3 text-sm text-center text-green-700">{r.presents}</td>
                    <td className="px-4 py-3 text-sm text-center text-red-700">{r.absents}</td>
                    <td className={`px-4 py-3 text-sm text-center ${r.lateMinutes > 0 ? 'text-orange-600 font-bold' : 'text-gray-400'}`}>
                      {r.lateMinutes}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          r.attendanceRate >= 90
                            ? 'bg-green-100 text-green-800'
                            : r.attendanceRate >= 70
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.attendanceRate}%
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      Sin datos para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-blue-50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">TOTAL</td>
                    {params.groupBy === 'teacher' && <td />}
                    {params.groupBy === 'course' && <td />}
                    <td className="px-4 py-3 text-sm text-center font-bold text-blue-700">{totals.hours}</td>
                    <td className="px-4 py-3 text-sm text-center font-bold text-green-700">{totals.presents}</td>
                    <td className="px-4 py-3 text-sm text-center font-bold text-red-700">{totals.absents}</td>
                    <td className="px-4 py-3 text-sm text-center font-bold text-orange-600">{totals.lateMinutes}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </Card>
        </>
      )}
    </div>
  );
};