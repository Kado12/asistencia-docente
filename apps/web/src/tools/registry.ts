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

  {
    id: 'schedule',
    name: 'Transformar Horario',
    icon: '🗓️',
    path: '/tools/schedule',
    shortDescription:
      'Convierte un horario en formato ancho (columnas por día) a una tabla ordenada Aula / Docente / Curso / Día.',

    purpose:
      'Transforma el horario escolar que llega en "formato ancho" (una columna por cada día, ' +
      'con los cursos y docentes apilados en pares de filas) a un "formato largo" mucho más ' +
      'ordenado y fácil de manejar: una fila por combinación de AULA, DOCENTE, CURSO y DÍA. ' +
      'Reemplaza al antiguo script de Python.',

    whenToUse: [
      'Cuando recibes el horario del período en el formato original del sistema y necesitas verlo ordenado.',
      'Antes de cargar o verificar las clases asignadas, para tener el horario limpio y legible.',
      'Cuando necesitas cruzar el horario con otros reportes que usan el formato Aula/Docente/Curso/Día.',
    ],

    inputs: [
      {
        name: 'Horario (formato ancho)',
        description: 'El archivo Excel del horario tal como llega originalmente.',
        requirements: [
          'Debe tener una fila con los días: LUNES, MARTES, MIERCOLES, JUEVES, VIERNES',
          'La primera columna debe ser el AULA',
          'Debajo del encabezado, las filas van en pares: primero el CURSO, luego el DOCENTE',
        ],
      },
    ],

    outputs: [
      'Tabla ordenada con columnas: AULA, DOCENTE, CURSO, DIA_SEMANA.',
      'Ordenada por Aula → Día (Lunes a Viernes) → Curso.',
      'Resumen: total de registros, cantidad de aulas y días detectados.',
      'Excel descargable "horario_ordenado.xlsx" listo para usar.',
    ],

    steps: [
      'Sube el archivo de horario en formato ancho.',
      'Haz clic en "Transformar" y revisa la tabla ordenada en pantalla.',
      'Si todo se ve correcto, haz clic en "Excel" para descargar el horario ordenado.',
    ],

    tips: [
      'Se ignoran las celdas vacías y las que dicen "NaN": solo se generan filas donde hay curso Y docente.',
      'Si no encuentra la fila de días, revisa que estén escritos como LUNES, MARTES, etc. (el sistema los busca en mayúsculas).',
      'En pantalla se muestran hasta 50 registros; para ver todo, descarga el Excel.',
    ],
  },

  {
    id: 'cross',
    name: 'Cruzar Horario con Docentes',
    icon: '🔗',
    path: '/tools/cross',
    shortDescription:
      'Asigna el DNI a cada fila del horario cruzándolo con el listado de docentes (match exacto y por similitud).',

    purpose:
      'Cruza el horario ordenado (AULA | DOCENTE | CURSO | DÍA) con el listado de docentes ' +
      '(NOMBRES | APELLIDOS | DNI) para agregar el DNI a cada fila del horario. Usa coincidencia ' +
      'exacta y "fuzzy matching" (similitud 0.85) para manejar tildes, abreviaturas y distintos ' +
      'órdenes de nombres. Reemplaza al antiguo script de Python.',

    whenToUse: [
      'Después de usar "Transformar Horario", para obtener el horario con DNI de cada docente.',
      'Cuando necesitas identificar formalmente a los docentes del horario para cargarlos al sistema.',
      'Para detectar docentes del horario que NO están en tu listado (y agregarlos).',
    ],

    inputs: [
      {
        name: 'Docentes (archivo 1)',
        description: 'Listado oficial de docentes.',
        requirements: ['Columnas NOMBRES, APELLIDOS y DNI'],
      },
      {
        name: 'Horario (archivo 2)',
        description: 'Puede ser la salida de la herramienta "Transformar Horario".',
        requirements: ['Columna DOCENTE (y opcionalmente AULA, CURSO, DIA_SEMANA)'],
      },
    ],

    outputs: [
      'Resumen de matching: exactos, por similitud y no encontrados (con porcentajes).',
      'Tabla completa con DNI, método de match y confianza.',
      'Excel con 3 hojas: RESULTADO (limpio), METADATOS (con confianza) y NO_ENCONTRADOS.',
    ],

    steps: [
      'Sube el listado de docentes y el horario.',
      'Haz clic en "Cruzar" y revisa primero la pestaña "No encontrados".',
      'Revisa la pestaña "Revisar similitud" para validar los matches por fuzzy.',
      'Si todo está bien, descarga el Excel con el horario con DNI.',
    ],

    tips: [
      'Los nombres se normalizan: sin tildes, mayúsculas y sin símbolos, por eso "María" y "MARIA" coinciden.',
      'Un match FUZZY con confianza menor a 0.95 conviene revisarlo manualmente.',
      'Los "No encontrados" suelen ser docentes que faltan en tu listado: agrégalos y vuelve a cruzar.',
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