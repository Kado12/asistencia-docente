import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { TOOLS } from '../tools/registry';

export const ToolsHomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">🧰 Herramientas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Utilidades para el trabajo diario con archivos y datos. Haz clic en una herramienta
          para abrirla; dentro encontrarás su guía de uso.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <Card key={tool.id} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{tool.icon}</span>
                <h2 className="font-semibold text-gray-800">{tool.name}</h2>
              </div>
              <p className="text-sm text-gray-600 mb-3">{tool.shortDescription}</p>

              <div className="bg-gray-50 rounded p-2 mb-3">
                <p className="text-xs font-medium text-gray-500 mb-1">📌 ¿Cuándo usarla?</p>
                <ul className="list-disc list-inside text-xs text-gray-600 space-y-1">
                  {tool.whenToUse.slice(0, 2).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <Button onClick={() => navigate(tool.path)} className="w-full">
              Abrir herramienta
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};