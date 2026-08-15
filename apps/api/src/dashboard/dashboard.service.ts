import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const addDays = (d: Date, days: number): Date => {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
};

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(periodId: string, weekNumber?: number) {
    const period = await this.prisma.period.findUnique({ where: { id: periodId } });
    if (!period) throw new NotFoundException('Período no encontrado');

    // Rango de fechas
    let start: Date;
    let end: Date;
    let label: string;

    if (weekNumber) {
      start = addDays(period.startDate, (weekNumber - 1) * 7);
      end = addDays(start, 4);
      label = `Semana ${weekNumber}`;
    } else {
      start = period.startDate;
      end = addDays(period.startDate, period.weeks * 7 - 1);
      label = 'Período completo';
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        date: { gte: start, lte: end },
        teacherClass: { periodId },
      },
      include: {
        teacherClass: { include: { sede: true } },
      },
    });

    // Totales
    const totals = { hours: 0, presents: 0, absents: 0, lateMinutes: 0 };
    const bySedeMap = new Map<string, { name: string; hours: number; presents: number; absents: number }>();

    for (const r of records) {
      const sedeName = r.teacherClass.sede.name;
      if (!bySedeMap.has(sedeName)) {
        bySedeMap.set(sedeName, { name: sedeName, hours: 0, presents: 0, absents: 0 });
      }
      const sede = bySedeMap.get(sedeName)!;

      if (r.status === 'PRESENT') {
        totals.presents++;
        totals.hours += r.teacherClass.hours;
        totals.lateMinutes += r.lateMinutes;
        sede.presents++;
        sede.hours += r.teacherClass.hours;
      } else {
        totals.absents++;
        sede.absents++;
      }
    }

    const [activeTeachers, classesCount] = await Promise.all([
      this.prisma.teacher.count({
        where: { isActive: true, classes: { some: { periodId, isActive: true } } },
      }),
      this.prisma.teacherClass.count({ where: { periodId, isActive: true } }),
    ]);

    // Progreso de validación (solo con semana seleccionada)
    let validationProgress = {};
    if (weekNumber) {
      const [validated, observed] = await Promise.all([
        this.prisma.weekValidation.count({
          where: { periodId, weekNumber, status: 'VALIDATED' },
        }),
        this.prisma.weekValidation.count({
          where: { periodId, weekNumber, status: 'OBSERVED' },
        }),
      ]);
      validationProgress = { validated, observed, total: activeTeachers };
    }

    const totalMarks = totals.presents + totals.absents;

    return {
      label,
      periodName: period.name,
      totals: {
        ...totals,
        attendanceRate: totalMarks > 0 ? Math.round((totals.presents / totalMarks) * 100) : 0,
      },
      bySede: Array.from(bySedeMap.values()).sort((a, b) => b.hours - a.hours),
      activeTeachers,
      classesCount,
      validationProgress,
    };
  }
}