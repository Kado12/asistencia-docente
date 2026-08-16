import React, { useState, useRef } from 'react';
import { Button, Select, Card, useToast } from '../components/ui';
import { importsService, IMPORT_TYPES, type ImportResult } from '../api/imports.service';

export const ImportsPage: React.FC = () => {
  const { addToast } = useToast();
  const [type, setType] = useState('sedes');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    if (!file) {
      addToast('error', 'Selecciona un archivo Excel');
      return;
    }
    setIsUploading(true);
    setResult(null);
    try {
      const res = await importsService.importFile(type, file);
      setResult(res);
      if (res.errors.length === 0) {
        addToast('success', `✅ ${res.created} creados, ${res.skipped} duplicados omitidos`);
      } else {
        addToast('error', `⚠️ ${res.created} creados, ${res.errors.length} errores`);
      }
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al importar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Importación desde Excel</h1>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Tipo de dato"
            value={type}
            onChange={(e) => { setType(e.target.value); setResult(null); }}
            options={IMPORT_TYPES}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Archivo Excel</label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={handleImport} isLoading={isUploading} className="flex-1">
              📥 Importar
            </Button>
            <Button variant="secondary" onClick={() => importsService.downloadTemplate(type)}>
              📄 Plantilla
            </Button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3 bg-blue-50 border border-blue-200 rounded p-2">
          💡 Descarga la plantilla para ver el formato exacto de columnas. Los duplicados se omiten
          automáticamente. Para <strong>Clases</strong>, el día puede ser "Lunes"..."Viernes" o 1-5,
          y se usa el período activo.
        </p>
      </Card>

      {result && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center">
            <p className="text-2xl font-bold text-green-600">{result.created}</p>
            <p className="text-xs text-gray-500">Creados</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-500">{result.skipped}</p>
            <p className="text-xs text-gray-500">Duplicados omitidos</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
            <p className="text-xs text-gray-500">Errores</p>
          </Card>
        </div>
      )}

      {result && result.errors.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-700 mb-2">❌ Errores detallados</h2>
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {result.errors.map((e, i) => (
              <li key={i} className="text-sm text-red-600 bg-red-50 rounded px-3 py-1">
                Fila {e.row}: {e.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};