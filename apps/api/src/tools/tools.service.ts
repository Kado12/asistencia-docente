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
}