import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

export type GroupBy = 'teacher' | 'sede' | 'area' | 'course';
export type ReportMode = 'week' | 'month' | 'period';

export interface ConsolidatedParams {
  periodId: string;
  mode: ReportMode;
  weekNumber?: number;
  month?: string; // YYYY-MM
  groupBy: GroupBy;
  sedeId?: string;
  areaId?: string;
  courseId?: string;
  teacherId?: string;
}

export interface ConsolidatedRow {
  key: string;
  label: string;
  dni?: string;
  area?: string;
  hours: number;
  presents: number;
  absents: number;
  lateMinutes: number;
  attendanceRate: number;
}

// ===== HELPERS DE FECHAS (UTC) =====
const addDays = (d: Date, days: number): Date => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
};

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Calcula el rango de fechas según el modo
   */
  private getRange(period: { startDate: Date; weeks: number }, params: ConsolidatedParams) {
    if (params.mode === 'week') {
      const week = params.weekNumber || 1;
      const start = addDays(period.startDate, (week - 1) * 7);
      return { start, end: addDays(start, 4) };
    }

    if (params.mode === 'month' && params.month) {
      const [y, m] = params.month.split('-').map(Number);
      return {
        start: new Date(Date.UTC(y, m - 1, 1)),
        end: new Date(Date.UTC(y, m, 0)), // último día del mes
      };
    }

    // Período completo
    return {
      start: period.startDate,
      end: addDays(period.startDate, period.weeks * 7 - 1),
    };
  }

  /**
   * Consolidado agrupado con filtros
   */
  async getConsolidated(params: ConsolidatedParams): Promise<ConsolidatedRow[]> {
    const period = await this.prisma.period.findUnique({
      where: { id: params.periodId },
    });
    if (!period) throw new NotFoundException('Período no encontrado');

    const { start, end } = this.getRange(period, params);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        date: { gte: start, lte: end },
        teacherClass: {
          periodId: params.periodId,
          ...(params.teacherId ? { teacherId: params.teacherId } : {}),
          ...(params.sedeId ? { sedeId: params.sedeId } : {}),
          ...(params.courseId ? { courseId: params.courseId } : {}),
          ...(params.areaId ? { course: { areaId: params.areaId } } : {}),
        },
      },
      include: {
        teacherClass: {
          include: {
            teacher: true,
            course: { include: { area: true } },
            sede: true,
          },
        },
      },
    });

    // Agrupar
    const map = new Map<string, ConsolidatedRow>();

    for (const r of records) {
      const tc = r.teacherClass;
      let key: string;
      let label: string;
      let dni: string | undefined;
      let area: string | undefined;

      switch (params.groupBy) {
        case 'teacher':
          key = tc.teacherId;
          label = `${tc.teacher.lastName}, ${tc.teacher.firstName}`;
          dni = tc.teacher.dni;
          break;
        case 'sede':
          key = tc.sedeId;
          label = tc.sede.name;
          break;
        case 'area':
          key = tc.course.areaId;
          label = tc.course.area.name;
          break;
        case 'course':
          key = tc.courseId;
          label = tc.course.name;
          area = tc.course.area.name;
          break;
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          label,
          dni,
          area,
          hours: 0,
          presents: 0,
          absents: 0,
          lateMinutes: 0,
          attendanceRate: 0,
        });
      }

      const row = map.get(key)!;
      if (r.status === 'PRESENT') {
        row.presents++;
        row.hours += tc.hours;
        row.lateMinutes += r.lateMinutes;
      } else {
        row.absents++;
      }
    }

    // Calcular % de asistencia y ordenar
    return Array.from(map.values())
      .map((row) => ({
        ...row,
        attendanceRate:
          row.presents + row.absents > 0
            ? Math.round((row.presents / (row.presents + row.absents)) * 100)
            : 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Genera el Excel del consolidado
   */
  async exportExcel(params: ConsolidatedParams): Promise<Buffer> {
    const period = await this.prisma.period.findUnique({
      where: { id: params.periodId },
    });
    if (!period) throw new NotFoundException('Período no encontrado');

    const rows = await this.getConsolidated(params);
    const { start, end } = this.getRange(period, params);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Control de Asistencia Docente';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Consolidado', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });

    // ===== TÍTULO =====
    const modeLabel =
      params.mode === 'week'
        ? `SEMANA ${params.weekNumber}`
        : params.mode === 'month'
          ? `MES ${params.month}`
          : 'PERÍODO COMPLETO';

    const groupLabel = {
      teacher: 'POR DOCENTE',
      sede: 'POR SEDE',
      area: 'POR ÁREA',
      course: 'POR CURSO',
    }[params.groupBy];

    ws.mergeCells('A1:H1');
    ws.getCell('A1').value = `CONSOLIDADO DE ASISTENCIA DOCENTE ${groupLabel}`;
    ws.getCell('A1').font = { bold: true, size: 14 };
    ws.getCell('A1').alignment = { horizontal: 'center' };

    ws.mergeCells('A2:H2');
    ws.getCell('A2').value = `Período ${period.name} | ${modeLabel} | ${formatDate(start)} al ${formatDate(end)}`;
    ws.getCell('A2').font = { size: 10, color: { argb: 'FF6B7280' } };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    // ===== COLUMNAS =====
    const columns: any[] = [
      {
        header: { teacher: 'Docente', sede: 'Sede', area: 'Área', course: 'Curso' }[params.groupBy],
        key: 'label',
        width: 32,
      },
    ];

    if (params.groupBy === 'teacher') columns.push({ header: 'DNI', key: 'dni', width: 12 });
    if (params.groupBy === 'course') columns.push({ header: 'Área', key: 'area', width: 20 });

    columns.push(
      { header: 'Horas', key: 'hours', width: 10 },
      { header: 'Asistencias', key: 'presents', width: 12 },
      { header: 'Faltas', key: 'absents', width: 10 },
      { header: 'Tardanza (min)', key: 'lateMinutes', width: 14 },
      { header: '% Asistencia', key: 'attendanceRate', width: 12 },
    );

    ws.columns = columns;
    console.log(ws.columns)
    // Estilo del encabezado (fila 3)
    const headerRow = ws.getRow(3);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    // ===== DATOS =====
    rows.forEach((row) => {
      const r = ws.addRow(row);

      // Colorear % de asistencia
      const rateCell = r.getCell('attendanceRate');
      rateCell.numFmt = '0"%"';
      if (row.attendanceRate >= 90) {
        rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      } else if (row.attendanceRate >= 70) {
        rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      } else {
        rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      }

      // Resaltar tardanzas
      if (row.lateMinutes > 0) {
        r.getCell('lateMinutes').font = { color: { argb: 'FFEA580C' }, bold: true };
      }
    });

    // ===== FILA DE TOTALES =====
    const totals = rows.reduce(
      (acc, r) => ({
        hours: acc.hours + r.hours,
        presents: acc.presents + r.presents,
        absents: acc.absents + r.absents,
        lateMinutes: acc.lateMinutes + r.lateMinutes,
      }),
      { hours: 0, presents: 0, absents: 0, lateMinutes: 0 },
    );

    const totalRow = ws.addRow({
      label: 'TOTAL',
      ...totals,
    });
    totalRow.font = { bold: true };
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };

    // Bordes
    ws.eachRow((row, rowNumber) => {
      if (rowNumber < 3) return;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}