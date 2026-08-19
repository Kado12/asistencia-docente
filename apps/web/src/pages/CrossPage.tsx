import React, { useState } from 'react';
import { Button, Card, useToast } from '../components/ui';
import { ToolInfoPanel } from '../components/ToolsInfoPanel';
import { getTool } from '../tools/registry';
import { toolsService, type CrossResult } from '../api/tools.service';

const MAX_ROWS = 50;

const METODO_BADGE: Record<string, string> = {
  EXACTO_CLAVE: 'bg-green-100 text-green-800',
  EXACTO_DIRECTO: 'bg-green-100 text-green-800',
  EXACTO_INVERSO: 'bg-green-100 text-green-800',
  FUZZY_APELLIDO_NOMBRE: 'bg-yellow-100 text-yellow-800',
  FUZZY_NOMBRE_APELLIDO: 'bg-yellow-100 text-yellow-800',
  NO_ENCONTRADO: 'bg-red-100 text-red-800',
  VACIO: 'bg-gray-100 text-gray-600',
};

export const CrossPage: React.FC = () => {
  const { addToast } = useToast();

  const [fileInfo, setFileInfo] = useState<File | null>(null);
  const [fileSchedule, setFileSchedule] = useState<File | null>(null);
  const [result, setResult] = useState<CrossResult | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'fuzzy' | 'notfound'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCross = async () => {
    if (!fileInfo || !fileSchedule) {
      addToast('error', 'Sube ambos archivos');
      return;
    }
    setIsProcessing(true);
    setResult(null);
    try {
      const res = await toolsService.crossReference(fileInfo, fileSchedule);
      setResult(res);
      setActiveTab('all');
      addToast('success', '✅ Cruce completado');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al cruzar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!fileInfo || !fileSchedule) return;
    setIsExporting(true);
    try {
      await toolsService.crossReferenceExport(fileInfo, fileSchedule);
      addToast('success', '📥 Excel descargado (3 hojas)');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const visibleRows = result
    ? activeTab === 'all'
      ? result.rows
      : activeTab === 'fuzzy'
        ? result.fuzzy
        : result.notFound
    : [];

  const pct = (n: number) => (result && result.summary.total > 0 ? ((n / result.summary.total) * 100).toFixed(1) : '0');

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">🔗 Cruzar Horario con Docentes</h1>

      <ToolInfoPanel tool={getTool('cross')!} />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Docentes (NOMBRES | APELLIDOS | DNI)
            </label>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => setFileInfo(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Horario (AULA | DOCENTE | CURSO | DÍA)
            </label>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => setFileSchedule(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleCross} isLoading={isProcessing} className="flex-1">
              🔗 Cruzar
            </Button>
            {result && (
              <Button variant="success" onClick={handleExport} isLoading={isExporting}>
                📥 Excel
              </Button>
            )}
          </div>
        </div>
      </Card>

      {result && (
        <>
          {/* Resumen de matching */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="text-center">
              <p className="text-2xl font-bold text-gray-800">{result.summary.total}</p>
              <p className="text-xs text-gray-500">Filas del horario</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.summary.exact}</p>
              <p className="text-xs text-gray-500">Match exacto ({pct(result.summary.exact)}%)</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{result.summary.fuzzy}</p>
              <p className="text-xs text-gray-500">Por similitud ({pct(result.summary.fuzzy)}%)</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-red-600">{result.summary.notFound}</p>
              <p className="text-xs text-gray-500">No encontrados ({pct(result.summary.notFound)}%)</p>
            </Card>
          </div>

          {/* Pestañas */}
          <div className="flex gap-2 border-b">
            <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}>
              Todos ({result.rows.length})
            </button>
            <button onClick={() => setActiveTab('fuzzy')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'fuzzy' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500'}`}>
              ⚠️ Revisar similitud ({result.fuzzy.length})
            </button>
            <button onClick={() => setActiveTab('notfound')} className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'notfound' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500'}`}>
              ❌ No encontrados ({result.notFound.length})
            </button>
          </div>

          {/* Tabla */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aula</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Curso</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Confianza</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {visibleRows.slice(0, MAX_ROWS).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-700">{r.AULA}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{r.DOCENTE}</td>
                      <td className="px-3 py-2 text-gray-700">{r.DNI || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{r.CURSO}</td>
                      <td className="px-3 py-2 text-gray-700">{r.DIA_SEMANA}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${METODO_BADGE[r.METODO_MATCH] || 'bg-gray-100'}`}>
                          {r.METODO_MATCH}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">{r.CONFIANZA > 0 ? r.CONFIANZA : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visibleRows.length > MAX_ROWS && (
              <p className="text-xs text-gray-500 px-4 py-2 border-t">
                Mostrando {MAX_ROWS} de {visibleRows.length}. Descarga el Excel para ver todo.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};