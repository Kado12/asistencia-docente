import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveDailyAttendanceDto } from './dto/attendance.dto';
import { AttendanceStatus } from '@control/database';

export const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// ===== HELPERS DE FECHAS (UTC) =====

const parseDate = (s: string): Date => new Date(`${s}T00:00:00Z`);

const formatDate = (d: Date): string => d.toISOString().split('T')[0];

const sameDay = (a: Date, b: Date): boolean =>
  a.toISOString().split('T')[0] === b.toISOString().split('T')[0];

// ✅ AGREGAR ESTE:
const addDays = (d: Date, days: number): Date => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
};

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Busca el período activo que contiene la fecha
  */
  private async getPeriodForDate(date: Date) {
    const periods = await this.prisma.period.findMany({ where: { isActive: true } });
    return periods.find((p) => {
       const end = addDays(p.startDate, p.weeks * 7 - 1);
      return date >= p.startDate && date <= end;
    });
  }

    /**
   * Calcula el número de semana (1..N) de una fecha dentro del período
   */
  private getWeekNumber(period: { startDate: Date; weeks: number }, date: Date): number | null {
    const diffMs = date.getTime() - period.startDate.getTime();
    const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    if (week < 1 || week > period.weeks) return null;
    return week;
  }

  /**
   * Filtro de bloques: clases sin bloque (todo el período) O clases cuyo bloque contiene la semana
   */
  private blockFilter(week: number) {
    return {
      OR: [
        { blockId: null },
        { block: { startWeek: { lte: week }, endWeek: { gte: week } } },
      ],
    };
  }

  /**
   * Vista diaria: clases programadas para la fecha + registros existentes
  */
  async getDaily(dateStr: string, sedeId?: string) {
    
    const date = parseDate(dateStr);
    const dow = date.getUTCDay(); // 1=Lunes ... 5=Viernes

    if (dow < 1 || dow > 5) {
      throw new BadRequestException('La fecha cae en fin de semana. La semana es de Lunes a Viernes.');
    }
    
    // La fecha debe estar dentro de un período activo
    const period = await this.getPeriodForDate(date);
    if (!period) {
      throw new BadRequestException('La fecha está FUERA del período de clases.');
    }

    const week = this.getWeekNumber(period, date);

    const classes = await this.prisma.teacherClass.findMany({
      where: {
        isActive: true,
        dayOfWeek: dow,
        periodId: period?.id,
        ...this.blockFilter(week!),
        ...(sedeId ? { sedeId } : {}),
      },
      include: {
        teacher: true,
        course: { include: { area: true } },
        sede: true,
        classroom: true,
        attendances: { where: { date } },
      },
      orderBy: [
        { sede: { name: 'asc' } },
        { teacher: { lastName: 'asc' } },
      ],
    });

    // Cobertura por sede (para detectar salones/clases saltadas)
    const coverageMap = new Map<string, { sedeName: string; total: number; marked: number }>();
    for (const c of classes) {
      if (!coverageMap.has(c.sedeId)) {
        coverageMap.set(c.sedeId, { sedeName: c.sede.name, total: 0, marked: 0 });
      }
      const group = coverageMap.get(c.sedeId)!;
      group.total++;
      if (c.attendances[0]) group.marked++;
    }

    return {
      date: dateStr,
      dayOfWeek: dow,
      dayName: DAY_NAMES[dow],
      classes: classes.map((c) => ({
        id: c.id,
        hours: c.hours,
        teacher: c.teacher,
        course: c.course,
        sede: c.sede,
        classroom: c.classroom,
        attendance: c.attendances[0] || null,
      })),
      coverage: Array.from(coverageMap.values()),
    };
  }

  /**
   * Guardar asistencia del día (upsert masivo)
   */
  async saveDaily(dto: SaveDailyAttendanceDto) {
    const date = parseDate(dto.date);
    const dow = date.getUTCDay();
    // La fecha debe estar dentro de un período activo
        const period = await this.getPeriodForDate(date);
    if (!period) {
      throw new BadRequestException('La fecha está fuera del período de clases');
    }

    const week = this.getWeekNumber(period, date); // ← NUEVO

    // Validar que las clases pertenezcan al bloque de la semana
    const validClasses = await this.prisma.teacherClass.findMany({
      where: { periodId: period.id, ...this.blockFilter(week!) },
      select: { id: true },
    });
    const validIds = new Set(validClasses.map((c) => c.id));

    for (const record of dto.records) {
      if (!validIds.has(record.teacherClassId)) {
        throw new BadRequestException(
          `Una de las clases no corresponde a la semana ${week} (bloque inactivo)`,
        );
      }
    }

    if (dow < 1 || dow > 5) {
      throw new BadRequestException('No se puede registrar asistencia en fin de semana');
    }

    let saved = 0;
    for (const record of dto.records) {
      // Si está ausente, los minutos de tardanza no aplican
      const lateMinutes = record.status === AttendanceStatus.ABSENT ? 0 : (record.lateMinutes || 0);

      await this.prisma.attendanceRecord.upsert({
        where: {
          teacherClassId_date: {
            teacherClassId: record.teacherClassId,
            date,
          },
        },
        update: {
          status: record.status,
          lateMinutes,
          notes: record.notes,
        },
        create: {
          teacherClassId: record.teacherClassId,
          date,
          status: record.status,
          lateMinutes,
          notes: record.notes,
        },
      });
      saved++;
    }

    return { saved, date: dto.date };
  }

  /**
   * Vista semanal de un docente (como tu Excel: L M M J V | T | S#)
   */
  async getWeekly(teacherId: string, periodId: string, weekNumber: number) {
    const period = await this.prisma.period.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Período no encontrado');

    if (weekNumber < 1 || weekNumber > period.weeks) {
      throw new BadRequestException(`La semana debe estar entre 1 y ${period.weeks}`);
    }

    // Calcular los 5 días de la semana
    const weekStart = new Date(period.startDate);
    weekStart.setUTCDate(weekStart.getUTCDate() + (weekNumber - 1) * 7);

    const days: Date[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      days.push(d);
    }

    // Clases del docente en el período con sus asistencias de esa semana
    const classes = await this.prisma.teacherClass.findMany({
      where: { teacherId, periodId, ...this.blockFilter(weekNumber) },
      include: {
        course: { include: { area: true } },
        sede: true,
        attendances: {
          where: { date: { gte: days[0], lte: days[4] } },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }],
    });

    // Construir filas por día
    const dayRows = days.map((d, i) => {
      const records = classes.flatMap((c) =>
        c.attendances
          .filter((a) => sameDay(a.date, d))
          .map((a) => ({
            id: a.id,
            status: a.status,
            lateMinutes: a.lateMinutes,
            courseName: c.course.name,
            sedeName: c.sede.name,
            hours: c.hours,
          })),
      );

      const presents = records.filter((r) => r.status === 'PRESENT');
      const absents = records.filter((r) => r.status === 'ABSENT');

      
      
      return {
        date: formatDate(d),
        dayName: DAY_NAMES[i + 1],
        hours: presents.reduce((sum, r) => sum + r.hours, 0),
        lateMinutes: presents.reduce((sum, r) => sum + r.lateMinutes, 0),
        presents: presents.length,
        absents: absents.length,
        records,
      };
    });
    
    // Totales de la semana
    const totals = dayRows.reduce(
      (acc, d) => ({
        hours: acc.hours + d.hours,
        lateMinutes: acc.lateMinutes + d.lateMinutes,
        presents: acc.presents + d.presents,
        absents: acc.absents + d.absents,
      }),
      { hours: 0, lateMinutes: 0, presents: 0, absents: 0 },
    );

    return {
      weekNumber,
      periodName: period.name,
      teacher: classes[0] ? undefined : undefined,
      days: dayRows,
      totals,
      scheduledClasses: classes.map((c) => ({
        dayName: DAY_NAMES[c.dayOfWeek],
        courseName: c.course.name,
        sedeName: c.sede.name,
        hours: c.hours,
      })),
    };
  }
}