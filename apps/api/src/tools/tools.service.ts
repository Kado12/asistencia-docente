import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

interface ParsedFile {
  headers: string[];
  dniColumn: string | null;
  rows: { data: Record<string, any>; dni: string }[];
  paddedCount: number;
}

export interface CompareResult {
  summary: {
    totalA: number;
    totalB: number;
    both: number;
    onlyA: number;
    onlyB: number;
    paddedA: number;
    paddedB: number;
  };
  onlyA: { headers: string[]; rows: Record<string, any>[] };
  onlyB: { headers: string[]; rows: Record<string, any>[] };
  both: { headers: string[]; rows: Record<string, any>[] };
}

export interface ScheduleRow {
  AULA: string;
  DOCENTE: string;
  CURSO: string;
  DIA_SEMANA: string;
}

export interface ScheduleResult {
  rows: ScheduleRow[];
  aulas: string[];
  dias: string[];
  preview: ScheduleRow[]; // primeras 20 filas para la vista previa
}

const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const ORDEN_DIA: Record<string, number> = {
  LUNES: 0, MARTES: 1, MIERCOLES: 2, JUEVES: 3, VIERNES: 4,
};

// Valor de celda → string limpio (maneja null, NaN, fechas, fórmulas)
const cellStr = (v: any): string => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if ('result' in v) return String(v.result ?? '');
    if ('text' in v) return String(v.text);
    if ('richText' in v) return (v.richText || []).map((r: any) => r.text).join('');
    return '';
  }
  const s = String(v).trim();
  return s.toUpperCase() === 'NAN' ? '' : s;
};

export interface CrossRow {
  AULA: string;
  DOCENTE: string;
  DNI: string;
  CURSO: string;
  DIA_SEMANA: string;
  CONFIANZA: number;
  METODO_MATCH: string;
}

export interface CrossResult {
  summary: { total: number; exact: number; fuzzy: number; notFound: number };
  rows: CrossRow[];
  fuzzy: CrossRow[];
  notFound: CrossRow[];
}

const FUZZY_THRESHOLD = 0.85;

// ===== NORMALIZAR TEXTO (quita tildes, mayúsculas, símbolos) =====
const normalizarTexto = (v: any): string => {
  if (v === null || v === undefined) return '';
  let s = String(v);
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quita tildes
  s = s.toUpperCase().replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  return s;
};

// ===== SEQUENCE MATCHER (port de difflib de Python) =====
function findLongestMatch(
  a: string, b: string,
  alo: number, ahi: number, blo: number, bhi: number,
): [number, number, number] {
  let besti = alo, bestj = blo, bestsize = 0;
  let j2len: number[] = new Array(bhi + 1).fill(0);
  for (let i = alo; i < ahi; i++) {
    const newj2len: number[] = new Array(bhi + 1).fill(0);
    for (let j = blo; j < bhi; j++) {
      if (a[i] === b[j]) {
        const k = (newj2len[j + 1] = j2len[j] + 1);
        if (k > bestsize) {
          bestsize = k;
          besti = i - k + 1;
          bestj = j - k + 1;
        }
      }
    }
    j2len = newj2len;
  }
  return [besti, bestj, bestsize];
}

function sequenceRatio(a: string, b: string): number {
  const total = a.length + b.length;
  if (total === 0) return 1;
  const queue: [number, number, number, number][] = [[0, a.length, 0, b.length]];
  let matches = 0;
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop()!;
    const [i, j, k] = findLongestMatch(a, b, alo, ahi, blo, bhi);
    if (k === 0) continue;
    matches += k;
    if (alo < i && blo < j) queue.push([alo, i, blo, j]);
    if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
  }
  return (2 * matches) / total;
}

// ===== CLAVES DE BÚSQUEDA POR DOCENTE =====
function construirClaves(apellido: string, nombres: string): Set<string> {
  const a = apellido, n = nombres;
  const claves = new Set<string>();
  if (a && n) claves.add(`${a} ${n}`);
  if (n && a) claves.add(`${n} ${a}`);
  if (a) claves.add(a);
  if (n) claves.add(n);
  const pa = a.split(' '), pn = n.split(' ');
  if (pa[0] && pn[0]) {
    claves.add(`${pa[0]} ${pn[0]}`);
    claves.add(`${pn[0]} ${pa[0]}`);
  }
  return claves;
}

// ===== NORMALIZAR DNI (igual que tu script de Python) =====
const normalizeDni = (raw: any): { value: string; padded: boolean } => {
  let s = String(raw ?? '').trim();
  if (s.endsWith('.0')) s = s.slice(0, -2); // quita el .0 de floats
  s = s.replace(/\D/g, ''); // solo dígitos
  const padded = s.length === 7;
  if (padded) s = '0' + s; // repone el 0 inicial
  return { value: s, padded };
};

// Convierte valores de celda (fórmulas, fechas, rich text) a valor mostrable
const rawToDisplay = (v: any): any => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if ('result' in v) return v.result ?? '';
    if ('text' in v) return v.text;
    if ('richText' in v) return (v.richText || []).map((r: any) => r.text).join('');
    if ('hyperlink' in v) return v.hyperlink;
    return '';
  }
  if (v instanceof Date) return v.toISOString().split('T')[0];
  return v;
};

@Injectable()
export class ToolsService {
  /**
   * Lee un Excel: detecta encabezados, columna DNI y normaliza
   */
  private async parseWorkbook(buffer: Buffer | ArrayBuffer): Promise<ParsedFile> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as ArrayBuffer);
    const ws = workbook.worksheets[0];
    if (!ws) throw new BadRequestException('El archivo no tiene hojas');

    // Encabezados (fila 1)
    const headerValues = (ws.getRow(1).values as any[]).slice(1);
    const headers = headerValues
      .map((h) => String(rawToDisplay(h)).trim())
      .filter((h) => h !== '');

    const dniColumn = headers.find((h) => /^dni$/i.test(h) || /documento/i.test(h)) || null;

    const rows: { data: Record<string, any>; dni: string }[] = [];
    let paddedCount = 0;

    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = (row.values as any[]).slice(1);

      // Salta filas vacías
      if (!values.some((v) => String(rawToDisplay(v)).trim() !== '')) return;

      const data: Record<string, any> = {};
      headerValues.forEach((h, i) => {
        const name = String(rawToDisplay(h)).trim();
        if (name) data[name] = rawToDisplay(values[i]);
      });

      let dni = '';
      if (dniColumn) {
        const n = normalizeDni(data[dniColumn]);
        dni = n.value;
        if (n.padded) paddedCount++;
      }

      rows.push({ data, dni });
    });

    return { headers, dniColumn, rows, paddedCount };
  }

  /**
   * Comparativa por DNI normalizado (port de tu script de Python)
   */
  async compareExcel(bufferA: Buffer, bufferB: Buffer): Promise<CompareResult> {
    const a = await this.parseWorkbook(bufferA);
    const b = await this.parseWorkbook(bufferB);

    if (!a.dniColumn) {
      throw new BadRequestException(
        `El Registro Total no tiene columna DNI. Columnas: ${a.headers.join(', ')}`,
      );
    }
    if (!b.dniColumn) {
      throw new BadRequestException(
        `El Registro Parcial no tiene columna DNI. Columnas: ${b.headers.join(', ')}`,
      );
    }

    const setA = new Set(a.rows.map((r) => r.dni).filter(Boolean));
    const setB = new Set(b.rows.map((r) => r.dni).filter(Boolean));

    const onlyASet = new Set([...setA].filter((x) => !setB.has(x)));
    const onlyBSet = new Set([...setB].filter((x) => !setA.has(x)));
    const bothSet = new Set([...setA].filter((x) => setB.has(x)));

    const onlyARows = a.rows.filter((r) => onlyASet.has(r.dni)).map((r) => r.data);
    const onlyBRows = b.rows.filter((r) => onlyBSet.has(r.dni)).map((r) => r.data);

    // Columnas para EN_AMBOS: DNI + NOMBRES + APELLIDOS (si existen)
    const nameCol = a.headers.find((h) => /nombres?/i.test(h));
    const lastCol = a.headers.find((h) => /apellidos?/i.test(h));
    const bothHeaders = [a.dniColumn, ...(nameCol ? [nameCol] : []), ...(lastCol ? [lastCol] : [])];

    const bothRows = a.rows
      .filter((r) => bothSet.has(r.dni))
      .map((r) => {
        const o: Record<string, any> = {};
        bothHeaders.forEach((h) => (o[h] = r.data[h]));
        return o;
      });

    return {
      summary: {
        totalA: a.rows.length,
        totalB: b.rows.length,
        both: bothSet.size,
        onlyA: onlyASet.size,
        onlyB: onlyBSet.size,
        paddedA: a.paddedCount,
        paddedB: b.paddedCount,
      },
      onlyA: { headers: a.headers, rows: onlyARows },
      onlyB: { headers: b.headers, rows: onlyBRows },
      both: { headers: bothHeaders, rows: bothRows },
    };
  }

  /**
   * Genera el Excel de comparativa (4 hojas, igual que tu script)
   */
  async compareExportExcel(bufferA: Buffer, bufferB: Buffer): Promise<Buffer> {
    const r = await this.compareExcel(bufferA, bufferB);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Control de Asistencia Docente';

    // ===== HOJA 1: RESUMEN =====
    const resumen = wb.addWorksheet('RESUMEN');
    resumen.columns = [
      { header: 'DESCRIPCION', key: 'd', width: 48 },
      { header: 'CANTIDAD', key: 'c', width: 12 },
    ];
    resumen.getRow(1).font = { bold: true };
    resumen.addRows([
      { d: 'Total en Registro Total', c: r.summary.totalA },
      { d: 'Total en Otro Registro', c: r.summary.totalB },
      { d: 'En ambos archivos', c: r.summary.both },
      { d: 'Solo en Registro Total (faltan en Otro)', c: r.summary.onlyA },
      { d: 'Solo en Otro Registro (faltan en Total)', c: r.summary.onlyB },
      { d: 'DNI normalizados (7→8 dígitos) en Total', c: r.summary.paddedA },
      { d: 'DNI normalizados (7→8 dígitos) en Otro', c: r.summary.paddedB },
    ]);

    // ===== HOJAS DE DATOS =====
    const addDataSheet = (
      name: string,
      headers: string[],
      rows: Record<string, any>[],
    ) => {
      const ws = wb.addWorksheet(name);
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };

      if (rows.length === 0) {
        ws.addRow(['No hay alumnos exclusivos']);
        return;
      }
      rows.forEach((row) => ws.addRow(headers.map((h) => row[h] ?? '')));
    };

    addDataSheet('SOLO_EN_TOTAL', r.onlyA.headers, r.onlyA.rows);
    addDataSheet('SOLO_EN_OTRO', r.onlyB.headers, r.onlyB.rows);
    addDataSheet('EN_AMBOS', r.both.headers, r.both.rows);

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

    /**
   * Transforma un horario en formato ancho (columnas por día, pares de filas
   * curso/docente) a formato largo: AULA | DOCENTE | CURSO | DIA_SEMANA.
   */
  async transformSchedule(buffer: Buffer | ArrayBuffer): Promise<ScheduleResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as ArrayBuffer);
    const ws = workbook.worksheets[0];
    if (!ws) throw new BadRequestException('El archivo no tiene hojas');

    // Leer toda la hoja como matriz de strings
    const matrix: string[][] = [];
    ws.eachRow({ includeEmpty: true }, (row) => {
      const values = (row.values as any[]).slice(1); // quita el índice 0 vacío
      matrix.push(values.map(cellStr));
    });

    if (matrix.length === 0) {
      throw new BadRequestException('El archivo está vacío');
    }

    // Detectar la fila de encabezados (la que contiene los días de la semana)
    let headerRowIdx = -1;
    for (let i = 0; i < matrix.length; i++) {
      const upper = matrix[i].map((v) => v.toUpperCase());
      if (DIAS_SEMANA.some((d) => upper.includes(d))) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) {
      throw new BadRequestException(
        'No se detectó la fila con los días de la semana (LUNES, MARTES, ...)',
      );
    }

    const headers = matrix[headerRowIdx].map((h) => h.toUpperCase());

    // Recorrer de 2 en 2 después del encabezado: fila par = cursos, impar = docentes
    const registros: ScheduleRow[] = [];
    for (let i = headerRowIdx + 1; i < matrix.length; i += 2) {
      const filaCurso = matrix[i] || [];
      const filaDocente = matrix[i + 1] || [];
      const aula = (filaCurso[0] || '').trim();

      headers.forEach((dia, colIdx) => {
        if (DIAS_SEMANA.includes(dia)) {
          const curso = (filaCurso[colIdx] || '').trim();
          const docente = (filaDocente[colIdx] || '').trim();

          // Solo si hay curso Y docente válidos
          if (curso && docente) {
            registros.push({ AULA: aula, DOCENTE: docente, CURSO: curso, DIA_SEMANA: dia });
          }
        }
      });
    }

    // Ordenar: AULA → DÍA (L-V) → CURSO
    registros.sort((a, b) => {
      if (a.AULA !== b.AULA) return a.AULA.localeCompare(b.AULA);
      if (a.DIA_SEMANA !== b.DIA_SEMANA) {
        return ORDEN_DIA[a.DIA_SEMANA] - ORDEN_DIA[b.DIA_SEMANA];
      }
      return a.CURSO.localeCompare(b.CURSO);
    });

    const aulas = [...new Set(registros.map((r) => r.AULA))].sort();
    const dias = [...new Set(registros.map((r) => r.DIA_SEMANA))].sort(
      (a, b) => ORDEN_DIA[a] - ORDEN_DIA[b],
    );

    return {
      rows: registros,
      aulas,
      dias,
      preview: registros.slice(0, 20),
    };
  }

  /**
   * Genera el Excel del horario ordenado
   */
  async transformScheduleExport(buffer: Buffer): Promise<Buffer> {
    const result = await this.transformSchedule(buffer);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Control de Asistencia Docente';

    const ws = wb.addWorksheet('Horario Ordenado');
    ws.columns = [
      { header: 'AULA', key: 'AULA', width: 12 },
      { header: 'DOCENTE', key: 'DOCENTE', width: 28 },
      { header: 'CURSO', key: 'CURSO', width: 24 },
      { header: 'DIA_SEMANA', key: 'DIA_SEMANA', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    result.rows.forEach((r) => ws.addRow(r));

    // Bordes
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' },
        };
      });
    });

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out);
  }

    /**
   * Cruza el horario (DOCENTE) con el listado de docentes (NOMBRES/APELLIDOS/DNI)
   * usando match exacto y fuzzy matching (umbral 0.85).
   */
  async crossReference(bufferInfo: Buffer, bufferSchedule: Buffer): Promise<CrossResult> {
    const info = await this.parseWorkbook(bufferInfo);
    const schedule = await this.parseWorkbook(bufferSchedule);

    // Detectar columnas requeridas
    const nombresCol = info.headers.find((h) => /nombres?/i.test(h));
    const apellidosCol = info.headers.find((h) => /apellidos?/i.test(h));
    const dniCol = info.headers.find((h) => /^dni$/i.test(h) || /documento/i.test(h));
    if (!nombresCol || !apellidosCol || !dniCol) {
      throw new BadRequestException(
        `El archivo de docentes debe tener NOMBRES, APELLIDOS y DNI. Columnas: ${info.headers.join(', ')}`,
      );
    }
    const docenteCol = schedule.headers.find((h) => /docente/i.test(h));
    if (!docenteCol) {
      throw new BadRequestException(
        `El horario debe tener columna DOCENTE. Columnas: ${schedule.headers.join(', ')}`,
      );
    }
    const aulaCol = schedule.headers.find((h) => /aula/i.test(h));
    const cursoCol = schedule.headers.find((h) => /curso/i.test(h));
    const diaCol = schedule.headers.find((h) => /dia/i.test(h));

    // Pre-procesar docentes
    const teachers = info.rows.map((r) => {
      const a = normalizarTexto(r.data[apellidosCol]);
      const n = normalizarTexto(r.data[nombresCol]);
      return {
        dni: normalizeDni(r.data[dniCol]).value,
        a,
        n,
        recon: `${a} ${n}`.trim(),
        reconInv: `${n} ${a}`.trim(),
      };
    });

    // Diccionario de claves → índice
    const dict = new Map<string, number>();
    teachers.forEach((t, idx) => {
      for (const clave of construirClaves(t.a, t.n)) {
        if (clave) dict.set(clave, idx);
      }
    });

    // Buscar match para un nombre de docente
    const buscarMatch = (
      docenteNombre: string,
    ): { dni: string | null; confianza: number; metodo: string } => {
      const norm = normalizarTexto(docenteNombre);
      if (!norm) return { dni: null, confianza: 0, metodo: 'VACIO' };

      // 1. Exacto por claves
      if (dict.has(norm)) {
        return { dni: teachers[dict.get(norm)!].dni, confianza: 1, metodo: 'EXACTO_CLAVE' };
      }

      // 2. Exacto directo
      for (const t of teachers) {
        if (norm === t.recon) return { dni: t.dni, confianza: 1, metodo: 'EXACTO_DIRECTO' };
        if (norm === t.reconInv) return { dni: t.dni, confianza: 1, metodo: 'EXACTO_INVERSO' };
      }

      // 3. Fuzzy
      let bestSim = 0, bestIdx = -1, bestMetodo = '';
      teachers.forEach((t, idx) => {
        const s1 = sequenceRatio(norm, t.recon);
        if (s1 > bestSim) { bestSim = s1; bestIdx = idx; bestMetodo = 'FUZZY_APELLIDO_NOMBRE'; }
        const s2 = sequenceRatio(norm, t.reconInv);
        if (s2 > bestSim) { bestSim = s2; bestIdx = idx; bestMetodo = 'FUZZY_NOMBRE_APELLIDO'; }
      });

      if (bestSim >= FUZZY_THRESHOLD && bestIdx >= 0) {
        return { dni: teachers[bestIdx].dni, confianza: Math.round(bestSim * 1000) / 1000, metodo: bestMetodo };
      }
      return { dni: null, confianza: 0, metodo: 'NO_ENCONTRADO' };
    };

    // Cruzar cada fila del horario
    const rows: CrossRow[] = [];
    let exact = 0, fuzzy = 0, notFound = 0;

    for (const r of schedule.rows) {
      const docente = String(r.data[docenteCol] ?? '');
      const { dni, confianza, metodo } = buscarMatch(docente);

      if (metodo.startsWith('EXACTO')) exact++;
      else if (metodo.startsWith('FUZZY')) fuzzy++;
      else notFound++;

      rows.push({
        AULA: aulaCol ? String(r.data[aulaCol] ?? '') : '',
        DOCENTE: docente,
        DNI: dni || '',
        CURSO: cursoCol ? String(r.data[cursoCol] ?? '') : '',
        DIA_SEMANA: diaCol ? String(r.data[diaCol] ?? '') : '',
        CONFIANZA: confianza,
        METODO_MATCH: metodo,
      });
    }

    return {
      summary: { total: rows.length, exact, fuzzy, notFound },
      rows,
      fuzzy: rows.filter((r) => r.METODO_MATCH.startsWith('FUZZY')),
      notFound: rows.filter((r) => r.METODO_MATCH === 'NO_ENCONTRADO' || r.METODO_MATCH === 'VACIO'),
    };
  }

  /**
   * Excel del cruce con 3 hojas: RESULTADO, METADATOS y NO_ENCONTRADOS
   */
  async crossReferenceExport(bufferInfo: Buffer, bufferSchedule: Buffer): Promise<Buffer> {
    const r = await this.crossReference(bufferInfo, bufferSchedule);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Control de Asistencia Docente';

    // HOJA 1: resultado limpio
    const limpio = wb.addWorksheet('RESULTADO');
    limpio.columns = [
      { header: 'AULA', key: 'AULA', width: 12 },
      { header: 'DOCENTE', key: 'DOCENTE', width: 28 },
      { header: 'DNI', key: 'DNI', width: 12 },
      { header: 'CURSO', key: 'CURSO', width: 24 },
      { header: 'DIA_SEMANA', key: 'DIA_SEMANA', width: 14 },
    ];
    limpio.getRow(1).font = { bold: true };
    r.rows.forEach((row) =>
      limpio.addRow({ ...row, DNI: row.DNI || '⚠️ NO ENCONTRADO' }),
    );

    // HOJA 2: con metadatos de matching
    const meta = wb.addWorksheet('METADATOS');
    meta.columns = [
      { header: 'AULA', key: 'AULA', width: 12 },
      { header: 'DOCENTE', key: 'DOCENTE', width: 28 },
      { header: 'DNI', key: 'DNI', width: 12 },
      { header: 'CURSO', key: 'CURSO', width: 24 },
      { header: 'DIA_SEMANA', key: 'DIA_SEMANA', width: 14 },
      { header: 'CONFIANZA', key: 'CONFIANZA', width: 12 },
      { header: 'METODO_MATCH', key: 'METODO_MATCH', width: 24 },
    ];
    meta.getRow(1).font = { bold: true };
    r.rows.forEach((row) => meta.addRow(row));

    // HOJA 3: no encontrados para revisión manual
    const noEnc = wb.addWorksheet('NO_ENCONTRADOS');
    noEnc.columns = [
      { header: 'DOCENTE', key: 'DOCENTE', width: 28 },
      { header: 'AULA', key: 'AULA', width: 12 },
      { header: 'CURSO', key: 'CURSO', width: 24 },
    ];
    noEnc.getRow(1).font = { bold: true };
    if (r.notFound.length === 0) {
      noEnc.addRow({ DOCENTE: 'Todos los docentes fueron encontrados 🎉', AULA: '', CURSO: '' });
    } else {
      r.notFound.forEach((row) => noEnc.addRow(row));
    }

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out);
  }
}