export interface ToolInput {
  name: string;
  description: string;
  requirements: string[];
}

export interface ToolInfo {
  id: string;
  name: string;
  icon: string;
  path: string;
  shortDescription: string;
  purpose: string;
  whenToUse: string[];
  inputs: ToolInput[];
  outputs: string[];
  steps: string[];
  tips: string[];
}

// =====================================================
// REGISTRO DE HERRAMIENTAS
// Para agregar una nueva herramienta, añade una entrada aquí
// y aparecerá automáticamente en el catálogo y en su panel de ayuda.
// =====================================================

export const TOOLS: ToolInfo[] = [
  {
    id: 'compare',
    name: 'Comparar Excel por DNI',
    icon: '🔀',
    path: '/tools/compare',
    shortDescription:
      'Compara dos listados de alumnos por DNI y detecta quién falta en cada uno.',

    purpose:
      'Sirve para cruzar dos listados de alumnos (por ejemplo, el registro total del sistema ' +
      'contra un listado parcial enviado por una sede o coordinador) y detectar rápidamente ' +
      'qué alumnos están en uno pero no en el otro. Reemplaza al antiguo script de Python.',

    whenToUse: [
      'Cuando llega un listado nuevo de una sede y necesitas saber quiénes faltan en tu registro total.',
      'Cuando debes verificar que todos los alumnos del sistema aparezcan en un reporte externo (o viceversa).',
      'Antes de cerrar matrículas, para detectar ausencias o diferencias entre reportes.',
    ],

    inputs: [
      {
        name: 'Registro Total (archivo A)',
        description: 'El listado principal de alumnos.',
        requirements: [
          'Debe tener columna DNI',
          'Recomendado tener columnas NOMBRES y APELLIDOS',
        ],
      },
      {
        name: 'Registro Parcial (archivo B)',
        description: 'El listado secundario que se quiere comparar.',
        requirements: ['Debe tener columna DNI'],
      },
    ],

    outputs: [
      'Resumen con cantidades: total de cada archivo, en ambos, solo en A, solo en B.',
      'Lista de alumnos que están SOLO en el Registro Total (faltan en el parcial).',
      'Lista de alumnos que están SOLO en el Parcial (faltan en el total).',
      'Lista de alumnos que están EN AMBOS archivos.',
      'Excel descargable con 4 hojas: RESUMEN, SOLO_EN_TOTAL, SOLO_EN_OTRO y EN_AMBOS.',
    ],

    steps: [
      'Sube el Registro Total (archivo A).',
      'Sube el Registro Parcial (archivo B).',
      'Haz clic en "Comparar" y revisa las pestañas con los resultados.',
      'Si necesitas el archivo, haz clic en "Excel" para descargar la comparativa completa.',
    ],

    tips: [
      'Los DNI se normalizan solos: si vienen con 7 dígitos se les agrega el 0 inicial, y se limpia el ".0" de los números.',
      'Si un archivo no tiene columna DNI, el sistema te mostrará qué columnas sí tiene para que corrijas el archivo.',
      'En pantalla se muestran hasta 50 filas por pestaña; para ver todo, descarga el Excel.',
    ],
  },

  // 👉 Aquí se agregan las próximas herramientas, por ejemplo:
  // {
  //   id: 'otro-script',
  //   name: 'Nombre de la herramienta',
  //   ...
  // },
];

export const getTool = (id: string): ToolInfo | undefined =>
  TOOLS.find((t) => t.id === id);