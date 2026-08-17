import React, { useState } from 'react';
import { Button, Card, useToast } from '../components/ui';
import { toolsService, type CompareResult } from '../api/tools.service';
import { ToolInfoPanel } from '../components/ToolsInfoPanel';
import { getTool } from '../tools/registry';

const MAX_ROWS = 50; // límite visual por pestaña

type TabKey = 'onlyA' | 'onlyB' | 'both';

export const ComparePage: React.FC = () => {
  const { addToast } = useToast();

  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('onlyA');
  const [isComparing, setIsComparing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCompare = async () => {
    if (!fileA || !fileB) {
      addToast('error', 'Sube ambos archivos Excel');
      return;
    }
    setIsComparing(true);
    setResult(null);
    try {
      const res = await toolsService.compare(fileA, fileB);
      setResult(res);
      setActiveTab(res.onlyA.rows.length > 0 ? 'onlyA' : 'both');
      addToast('success', '✅ Comparativa generada');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al comparar');
    } finally {
      setIsComparing(false);
    }
  };

  const handleExport = async () => {
    if (!fileA || !fileB) return;
    setIsExporting(true);
    try {
      await toolsService.compareExport(fileA, fileB);
      addToast('success', '📥 Excel de comparativa descargado');
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const tabs: { key: TabKey; label: string; count: number; color: string }[] = result
    ? [
        { key: 'onlyA', label: '❌ Solo en Total', count: result.summary.onlyA, color: 'text-red-600' },
        { key: 'onlyB', label: '❌ Solo en Parcial', count: result.summary.onlyB, color: 'text-red-600' },
        { key: 'both', label: '✅ En ambos', count: result.summary.both, color: 'text-green-600' },
      ]
    : [];

  const currentData = result ? result[activeTab] : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">🔀 Comparar Excel por DNI</h1>
      <ToolInfoPanel tool={getTool('compare')!} />
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registro Total (archivo A)
            </label>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => setFileA(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Registro Parcial (archivo B)
            </label>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => setFileB(e.target.files?.[0] || null)} className="w-full text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleCompare} isLoading={isComparing} className="flex-1">
              🔍 Comparar
            </Button>
            {result && (
              <Button variant="success" onClick={handleExport} isLoading={isExporting}>
                📥 Excel
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 bg-blue-50 border border-blue-200 rounded p-2">
          💡 Ambos archivos deben tener columna <strong>DNI</strong>. Los DNI se normalizan
          automáticamente a 8 dígitos (repone el 0 inicial y quita el ".0" de los números).
        </p>
      </Card>

      {result && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="text-center">
              <p className="text-2xl font-bold text-gray-800">{result.summary.totalA}</p>
              <p className="text-xs text-gray-500">Total en A</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-gray-800">{result.summary.totalB}</p>
              <p className="text-xs text-gray-500">Total en B</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-green-600">{result.summary.both}</p>
              <p className="text-xs text-gray-500">En ambos</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-red-600">{result.summary.onlyA}</p>
              <p className="text-xs text-gray-500">Solo en A</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-red-600">{result.summary.onlyB}</p>
              <p className="text-xs text-gray-500">Solo en B</p>
            </Card>
          </div>

          {(result.summary.paddedA > 0 || result.summary.paddedB > 0) && (
            <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
              ⚠️ DNI normalizados (7→8 dígitos): {result.summary.paddedA} en A · {result.summary.paddedB} en B
            </p>
          )}

          {/* Pestañas */}
          <div className="flex gap-2 border-b">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === t.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Tabla de la pestaña activa */}
          <Card className="p-0 overflow-hidden">
            {currentData && currentData.rows.length > 0 ? (
              <>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {currentData.headers.map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {currentData.rows.slice(0, MAX_ROWS).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          {currentData.headers.map((h) => (
                            <td key={h} className="px-3 py-2 whitespace-nowrap text-gray-700">
                              {String(row[h] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {currentData.rows.length > MAX_ROWS && (
                  <p className="text-xs text-gray-500 px-4 py-2 border-t">
                    Mostrando {MAX_ROWS} de {currentData.rows.length} filas. Descarga el Excel para ver todo.
                  </p>
                )}
              </>
            ) : (
              <p className="text-center py-8 text-gray-500">No hay registros en esta categoría 🎉</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};