import React, { useState } from 'react';
import { Button, Card, useToast } from '../components/ui';
import { ToolInfoPanel } from '../components/ToolsInfoPanel';
import { getTool } from '../tools/registry';
import { toolsService, type ScheduleResult } from '../api/tools.service';

const MAX_ROWS = 50;

export const SchedulePage: React.FC = () => {
  const { addToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScheduleResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleTransform = async () => {
    if (!file) {
      addToast('error', 'Sube el archivo de horario');
      return;
    }
    setIsProcessing(true);
    setResult(null);
    try {
      const res = await toolsService.transformSchedule(file);
      setResult(res);
      addToast('success', `✅ ${res.rows.length} registros generados`);
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al transformar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!file) return;
    setIsExporting(true);
    try {
      await toolsService.transformScheduleExport(file);
      addToast('success', '📥 Horario ordenado descargado');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">🗓️ Transformar Horario</h1>

      <ToolInfoPanel tool={getTool('schedule')!} />

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Archivo de horario (formato ancho)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <Button onClick={handleTransform} isLoading={isProcessing} className="flex-1">
              🔄 Transformar
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
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="text-2xl font-bold text-blue-600">{result.rows.length}</p>
              <p className="text-xs text-gray-500">Registros generados</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-purple-600">{result.aulas.length}</p>
              <p className="text-xs text-gray-500">Aulas distintas</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.dias.length}</p>
              <p className="text-xs text-gray-500">Días detectados</p>
            </Card>
          </div>

          {/* Tabla resultado */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Aula</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Curso</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {result.rows.slice(0, MAX_ROWS).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{r.AULA}</td>
                      <td className="px-3 py-2 text-gray-700">{r.DOCENTE}</td>
                      <td className="px-3 py-2 text-gray-700">{r.CURSO}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                          {r.DIA_SEMANA}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {result.rows.length > MAX_ROWS && (
              <p className="text-xs text-gray-500 px-4 py-2 border-t">
                Mostrando {MAX_ROWS} de {result.rows.length} registros. Descarga el Excel para ver todo.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};