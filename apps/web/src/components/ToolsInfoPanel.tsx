import React, { useState } from 'react';
import type { ToolInfo } from '../tools/registry';

export const ToolInfoPanel: React.FC<{ tool: ToolInfo }> = ({ tool }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-blue-700">
          ❓ ¿Para qué sirve esta herramienta y cómo se usa?
        </span>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 text-sm text-gray-700 border-t pt-4">
          {/* Para qué sirve */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">🎯 ¿Para qué sirve?</h3>
            <p>{tool.purpose}</p>
          </div>

          {/* Cuándo usarla */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">📌 ¿Cuándo usarla?</h3>
            <ul className="list-disc list-inside space-y-1">
              {tool.whenToUse.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>

          {/* Archivos necesarios */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">📥 Archivos que necesitas</h3>
            <div className="space-y-2">
              {tool.inputs.map((inp, i) => (
                <div key={i} className="bg-gray-50 rounded p-2">
                  <p className="font-medium">{inp.name}</p>
                  <p className="text-gray-500">{inp.description}</p>
                  <ul className="list-disc list-inside text-xs text-gray-500 mt-1">
                    {inp.requirements.map((r, j) => (
                      <li key={j}>{r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Qué obtienes */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">📤 ¿Qué obtienes?</h3>
            <ul className="list-disc list-inside space-y-1">
              {tool.outputs.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>

          {/* Pasos */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-1">📋 Pasos de uso</h3>
            <ol className="list-decimal list-inside space-y-1">
              {tool.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>

          {/* Notas */}
          {tool.tips.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <h3 className="font-semibold text-yellow-800 mb-1">💡 Notas importantes</h3>
              <ul className="list-disc list-inside space-y-1 text-yellow-800">
                {tool.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};